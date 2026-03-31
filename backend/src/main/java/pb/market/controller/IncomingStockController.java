package pb.market.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pb.market.entity.IncomingStock;
import pb.market.entity.ProductVariant;
import pb.market.entity.StockBatch;
import pb.market.entity.Supplier;
import pb.market.repository.IncomingStockRepository;
import pb.market.repository.SupplierRepository;
import pb.market.repository.VariantRepository;
import pb.market.repository.StockBatchRepository;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incoming-stocks")
@CrossOrigin(origins = "*")
public class IncomingStockController {

    @Autowired private IncomingStockRepository incomingStockRepository;
    @Autowired private VariantRepository variantRepository;
    @Autowired private StockBatchRepository stockBatchRepository;
    @Autowired private SupplierRepository supplierRepository;

    // Get all pending incoming shipments
    @Transactional(readOnly = true)
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingStocks() {
        List<IncomingStock> list = incomingStockRepository.findByStatusOrderByCreatedAtDesc("PENDING");
        var response = list.stream().map(this::mapToDTO).toList();
        return ResponseEntity.ok(response);
    }

    // Get all incoming shipments (history)
    @Transactional(readOnly = true)
    @GetMapping
    public ResponseEntity<?> getAllStocks() {
        List<IncomingStock> list = incomingStockRepository.findAll();
        var response = list.stream().map(this::mapToDTO).toList();
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> mapToDTO(IncomingStock inc) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", inc.getId());
        map.put("quantity", inc.getQuantity());
        map.put("expectedPrice", inc.getExpectedPrice() != null ? inc.getExpectedPrice() : "");
        map.put("status", inc.getStatus());
        map.put("createdAt", inc.getCreatedAt());
        map.put("consigned", inc.isConsigned());

        // Supplier info (nullable)
        if (inc.getSupplier() != null) {
            map.put("supplier", Map.of("id", inc.getSupplier().getId(), "name", inc.getSupplier().getName()));
        } else {
            map.put("supplier", null);
        }

        // Variant details
        map.put("variant", Map.of(
                "id", inc.getVariant().getId(),
                "sku", inc.getVariant().getSku(),
                "product", Map.of(
                        "brandName", inc.getVariant().getProduct() != null ? inc.getVariant().getProduct().getBrandName() : "",
                        "modelName", inc.getVariant().getProduct() != null ? inc.getVariant().getProduct().getModelName() : ""
                )
        ));
        return map;
    }

    // Create a new incoming stock schedule
    @PostMapping
    public ResponseEntity<?> createIncomingStock(@RequestBody IncomingStock incomingStock) {
        if (incomingStock.getVariant() == null || incomingStock.getVariant().getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Variant ID is required"));
        }

        ProductVariant variant = variantRepository.findById(incomingStock.getVariant().getId()).orElse(null);
        if (variant == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Variant not found"));
        }
        incomingStock.setVariant(variant);
        incomingStock.setStatus("PENDING");
        incomingStock.setCreatedAt(LocalDateTime.now());

        // Resolve supplier if provided
        if (incomingStock.getSupplier() != null && incomingStock.getSupplier().getId() != null) {
            Supplier supplier = supplierRepository.findById(incomingStock.getSupplier().getId()).orElse(null);
            incomingStock.setSupplier(supplier);
        } else {
            incomingStock.setSupplier(null);
        }

        IncomingStock saved = incomingStockRepository.save(incomingStock);
        return ResponseEntity.ok(Map.of("message", "Incoming stock scheduled", "id", saved.getId()));
    }

    // Receive incoming stock → convert to physical StockBatch and increase inventory count
    @Transactional
    @PostMapping("/{id}/receive")
    public ResponseEntity<?> receiveIncomingStock(@PathVariable Long id) {
        IncomingStock incomingStock = incomingStockRepository.findById(id).orElse(null);
        if (incomingStock == null) return ResponseEntity.notFound().build();
        if (!"PENDING".equals(incomingStock.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Stock is not pending"));
        }

        ProductVariant variant = incomingStock.getVariant();

        // 1. Mark as received
        incomingStock.setStatus("RECEIVED");
        incomingStockRepository.save(incomingStock);

        // 2. Increase physical stock quantity
        variant.setStockQuantity(variant.getStockQuantity() + incomingStock.getQuantity());
        if (incomingStock.getExpectedPrice() != null) {
            variant.setAcquisitionPrice(incomingStock.getExpectedPrice());
        }
        variantRepository.save(variant);

        // 3. Create physical StockBatch — carry over supplier + consigned from incoming stock
        StockBatch batch = new StockBatch();
        batch.setVariant(variant);
        batch.setQuantity(incomingStock.getQuantity());
        batch.setAcquisitionPrice(
                incomingStock.getExpectedPrice() != null
                        ? incomingStock.getExpectedPrice()
                        : variant.getAcquisitionPrice());
        batch.setSupplier(incomingStock.getSupplier());           // <- carry supplier
        batch.setConsigned(incomingStock.isConsigned());           // <- carry consigned
        stockBatchRepository.save(batch);

        return ResponseEntity.ok(Map.of("message", "Stock received successfully", "id", incomingStock.getId()));
    }

    // Cancel an incoming stock schedule
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelIncomingStock(@PathVariable Long id) {
        IncomingStock incomingStock = incomingStockRepository.findById(id).orElse(null);
        if (incomingStock == null) return ResponseEntity.notFound().build();
        if (!"PENDING".equals(incomingStock.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Stock cannot be cancelled"));
        }
        incomingStock.setStatus("CANCELLED");
        incomingStockRepository.save(incomingStock);
        return ResponseEntity.ok(Map.of("message", "Stock cancelled successfully", "id", incomingStock.getId()));
    }
}
