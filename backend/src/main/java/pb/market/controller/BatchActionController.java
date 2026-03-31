package pb.market.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pb.market.dto.BatchAddRequest;
import pb.market.entity.Expense;
import pb.market.entity.ProductVariant;
import pb.market.entity.StockBatch;
import pb.market.entity.Supplier;
import pb.market.repository.ExpenseRepository;
import pb.market.repository.StockBatchRepository;
import pb.market.repository.SupplierRepository;
import pb.market.repository.VariantRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/batch-actions")
@CrossOrigin(origins = "*")
public class BatchActionController {

    @Autowired private StockBatchRepository stockBatchRepository;
    @Autowired private VariantRepository variantRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private ExpenseRepository expenseRepository;

    @PostMapping("/receive")
    @Transactional
    public ResponseEntity<?> receiveBatch(@RequestBody BatchAddRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Batch must contain items."));
        }

        Supplier supplier = null;
        if (request.getSupplierId() != null) {
            supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new RuntimeException("Supplier not found"));
        }

        // Calculate total items
        int totalItems = request.getItems().stream().mapToInt(BatchAddRequest.BatchItem::getQuantity).sum();
        if (totalItems <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Total quantity must be greater than 0."));
        }

        BigDecimal grandTotal = request.getTotalExpense() != null ? request.getTotalExpense() : BigDecimal.ZERO;
        String batchId = UUID.randomUUID().toString();

        for (BatchAddRequest.BatchItem item : request.getItems()) {
            ProductVariant variant = variantRepository.findById(item.getVariantId())
                    .orElseThrow(() -> new RuntimeException("Variant not found: " + item.getVariantId()));

             // 1. Update total stock ONLY if RECEIVED
            String status = request.getStatus() != null && request.getStatus().equals("INCOMING") ? "INCOMING" : "RECEIVED";
            if ("RECEIVED".equals(status)) {
                variant.setStockQuantity((variant.getStockQuantity() == null ? 0 : variant.getStockQuantity()) + item.getQuantity());
                variantRepository.save(variant);
            }

            // 2. Create StockBatch
            BigDecimal itemBaseCost = item.getBaseCost() != null ? item.getBaseCost() : BigDecimal.ZERO;

            StockBatch batch = new StockBatch();
            batch.setVariant(variant);
            batch.setQuantity(item.getQuantity());
            // Fix: remainingQuantity should match quantity if RECEIVED, else 0 if INCOMING
            batch.setRemainingQuantity("RECEIVED".equals(status) ? item.getQuantity() : 0); 
            batch.setAcquisitionPrice(itemBaseCost);
            batch.setSupplier(supplier);
            batch.setConsigned(request.isConsigned());
            batch.setStatus(status);
            batch.setEta(request.getEta());
            batch.setBatchId(batchId);
            stockBatchRepository.save(batch);
        }

        // 3. Log Expense
        Expense expense = new Expense();
        expense.setName(supplier != null ? "Paddles from " + supplier.getName() : "Paddles Batch Purchase");
        expense.setCategory("Business");
        expense.setCost(grandTotal);
        expense.setBatchId(batchId);
        expense.setNote("Auto-generated from Batch " + (request.getStatus() != null ? request.getStatus() : "RECEIVED") + ". Total items: " + totalItems + ".");
        expenseRepository.save(expense);

        return ResponseEntity.ok(Map.of(
            "message", "Batch received successfully", 
            "batchId", batchId,
            "grandTotal", grandTotal
        ));
    }

    @DeleteMapping("/revert/{batchId}")
    @Transactional
    public ResponseEntity<?> revertBatch(@PathVariable String batchId) {
        // Find expense
        List<Expense> expenses = expenseRepository.findAll().stream()
                .filter(e -> batchId.equals(e.getBatchId()))
                .collect(Collectors.toList());
        expenseRepository.deleteAll(expenses);

        // Find stock batches
        List<StockBatch> stockBatches = stockBatchRepository.findAll().stream()
                .filter(b -> batchId.equals(b.getBatchId()))
                .collect(Collectors.toList());

        for (StockBatch batch : stockBatches) {
            ProductVariant variant = batch.getVariant();
            // Try to deduct the quantity, but floor at 0 (ONLY if it was RECEIVED)
            if ("RECEIVED".equals(batch.getStatus())) {
                int originalQty = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
                variant.setStockQuantity(Math.max(0, originalQty - batch.getQuantity()));
                variantRepository.save(variant);
            }
        }

        stockBatchRepository.deleteAll(stockBatches);

        return ResponseEntity.ok(Map.of("message", "Batch " + batchId + " has been reverted successfully."));
    }

    @GetMapping("/history")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getBatchHistory() {
        List<StockBatch> batches = stockBatchRepository.findAll();
        Map<String, List<StockBatch>> grouped = batches.stream()
                .filter(b -> b.getBatchId() != null)
                .collect(Collectors.groupingBy(StockBatch::getBatchId));

        List<Expense> expenses = expenseRepository.findAll();
        Map<String, Expense> expenseMap = expenses.stream()
                .filter(e -> e.getBatchId() != null)
                .collect(Collectors.toMap(Expense::getBatchId, e -> e, (e1, e2) -> e1));

        List<Map<String, Object>> result = grouped.entrySet().stream().map(entry -> {
            String batchId = entry.getKey();
            List<StockBatch> items = entry.getValue();
            StockBatch first = items.get(0);
            
            Expense exp = expenseMap.get(batchId);
            BigDecimal totalExpense = exp != null ? exp.getCost() : BigDecimal.ZERO;
            
            // Collect item details
            List<Map<String, Object>> itemDtos = items.stream().map(item -> {
                Map<String, Object> i = new java.util.HashMap<>();
                i.put("variantId", item.getVariant().getId());
                i.put("sku", item.getVariant().getSku());
                i.put("name", item.getVariant().getProduct().getBrandName() + " " + item.getVariant().getProduct().getModelName() + " (" + item.getVariant().getColor() + ")");
                i.put("quantity", item.getQuantity());
                i.put("baseCost", item.getAcquisitionPrice());
                return i;
            }).collect(Collectors.toList());

            int totalQty = items.stream().mapToInt(StockBatch::getQuantity).sum();

            Map<String, Object> batchMap = new java.util.HashMap<>();
            batchMap.put("batchId", batchId);
            batchMap.put("date", first.getRestockedAt() != null ? first.getRestockedAt() : java.time.LocalDateTime.MIN);
            batchMap.put("eta", first.getEta());
            batchMap.put("supplier", first.getSupplier() != null ? first.getSupplier().getName() : "Unknown");
            batchMap.put("status", first.getStatus() != null ? first.getStatus() : "RECEIVED");
            batchMap.put("totalQuantity", totalQty);
            batchMap.put("totalExpense", totalExpense);
            batchMap.put("items", itemDtos);
            return batchMap;
        })
        .sorted((a, b) -> {
            java.time.LocalDateTime dateA = (java.time.LocalDateTime) a.get("date");
            java.time.LocalDateTime dateB = (java.time.LocalDateTime) b.get("date");
            return dateB.compareTo(dateA);
        })
        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PostMapping("/{batchId}/mark-received")
    @Transactional
    public ResponseEntity<?> markBatchReceived(@PathVariable String batchId) {
        List<StockBatch> batches = stockBatchRepository.findAll().stream()
                .filter(b -> batchId.equals(b.getBatchId()))
                .collect(Collectors.toList());
        
        boolean updated = false;
        for (StockBatch batch : batches) {
            if ("INCOMING".equals(batch.getStatus())) {
                batch.setStatus("RECEIVED");
                ProductVariant variant = batch.getVariant();
                variant.setStockQuantity((variant.getStockQuantity() == null ? 0 : variant.getStockQuantity()) + batch.getQuantity());
                variantRepository.save(variant);
                stockBatchRepository.save(batch);
                updated = true;
            }
        }
        
        if (updated) {
            // Also update expense note
            expenseRepository.findAll().stream()
                .filter(e -> batchId.equals(e.getBatchId()))
                .findFirst()
                .ifPresent(e -> {
                    e.setNote(e.getNote().replace("INCOMING", "RECEIVED"));
                    expenseRepository.save(e);
                });
        }

        return ResponseEntity.ok(Map.of("message", "Batch marked as received."));
    }
}
