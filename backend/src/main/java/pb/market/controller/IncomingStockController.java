package pb.market.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pb.market.entity.IncomingStock;
import pb.market.entity.ProductVariant;
import pb.market.entity.StockBatch;
import pb.market.repository.IncomingStockRepository;
import pb.market.repository.VariantRepository;
import pb.market.repository.StockBatchRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incoming-stocks")
@CrossOrigin(origins = "*") // Allows requests from React frontend
public class IncomingStockController {

    @Autowired
    private IncomingStockRepository incomingStockRepository;

    @Autowired
    private VariantRepository variantRepository;

    @Autowired
    private StockBatchRepository stockBatchRepository;

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
        // Safe mapping to avoid Jackson proxy errors
        return Map.of(
                "id", inc.getId(),
                "quantity", inc.getQuantity(),
                "expectedPrice", inc.getExpectedPrice() != null ? inc.getExpectedPrice() : "",
                "status", inc.getStatus(),
                "createdAt", inc.getCreatedAt(),
                "variant", Map.of(
                        "id", inc.getVariant().getId(),
                        "sku", inc.getVariant().getSku(),
                        "product", Map.of(
                                "brandName",
                                inc.getVariant().getProduct() != null ? inc.getVariant().getProduct().getBrandName()
                                        : "",
                                "modelName",
                                inc.getVariant().getProduct() != null ? inc.getVariant().getProduct().getModelName()
                                        : "")));
    }

    // Create a new incoming stock schedule
    @PostMapping
    public ResponseEntity<?> createIncomingStock(@RequestBody IncomingStock incomingStock) {
        if (incomingStock.getVariant() == null || incomingStock.getVariant().getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Variant ID is required"));
        }

        ProductVariant variant = variantRepository.findById(incomingStock.getVariant().getId())
                .orElse(null);

        if (variant == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Variant not found"));
        }

        incomingStock.setVariant(variant);
        incomingStock.setStatus("PENDING");
        incomingStock.setCreatedAt(LocalDateTime.now());

        IncomingStock saved = incomingStockRepository.save(incomingStock);
        return ResponseEntity.ok(Map.of("message", "Incoming stock scheduled", "id", saved.getId()));
    }

    // Receive incoming stock (Convert to physical StockBatch and increase Inventory
    // count)
    @Transactional
    @PostMapping("/{id}/receive")
    public ResponseEntity<?> receiveIncomingStock(@PathVariable Long id) {
        IncomingStock incomingStock = incomingStockRepository.findById(id).orElse(null);
        if (incomingStock == null) {
            return ResponseEntity.notFound().build();
        }

        if (!"PENDING".equals(incomingStock.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Stock is not pending"));
        }

        ProductVariant variant = incomingStock.getVariant();

        // 1. Mark as received
        incomingStock.setStatus("RECEIVED");
        incomingStockRepository.save(incomingStock);

        // 2. Increase the physical stock quantity
        variant.setStockQuantity(variant.getStockQuantity() + incomingStock.getQuantity());

        // Update the global acquisition price if one was provided
        if (incomingStock.getExpectedPrice() != null) {
            variant.setAcquisitionPrice(incomingStock.getExpectedPrice());
        }
        variantRepository.save(variant);

        // 3. Create the physical StockBatch
        StockBatch batch = new StockBatch();
        batch.setVariant(variant);
        batch.setQuantity(incomingStock.getQuantity());
        batch.setAcquisitionPrice(incomingStock.getExpectedPrice() != null ? incomingStock.getExpectedPrice()
                : variant.getAcquisitionPrice());
        stockBatchRepository.save(batch);

        return ResponseEntity.ok(Map.of("message", "Stock received successfully", "id", incomingStock.getId()));
    }

    // Cancel an incoming stock schedule
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelIncomingStock(@PathVariable Long id) {
        IncomingStock incomingStock = incomingStockRepository.findById(id).orElse(null);
        if (incomingStock == null) {
            return ResponseEntity.notFound().build();
        }

        if (!"PENDING".equals(incomingStock.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Stock cannot be cancelled"));
        }

        incomingStock.setStatus("CANCELLED");
        incomingStockRepository.save(incomingStock);

        return ResponseEntity.ok(Map.of("message", "Stock cancelled successfully", "id", incomingStock.getId()));
    }
}
