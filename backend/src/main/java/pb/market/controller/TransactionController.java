package pb.market.controller;

import jakarta.persistence.EntityManager;
import pb.market.config.StockWebSocketHandler;
import pb.market.entity.ProductVariant;
import pb.market.entity.StockBatch;
import pb.market.entity.Transaction;
import pb.market.repository.StockBatchRepository;
import pb.market.repository.TransactionRepository;
import pb.market.repository.VariantRepository;
import pb.market.repository.ConsigneeRepository;
import pb.market.entity.Consignee;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {
    private final TransactionRepository transactionRepository;
    private final VariantRepository variantRepository;
    private final StockBatchRepository stockBatchRepository;
    private final EntityManager entityManager;
    private final StockWebSocketHandler stockWebSocketHandler;
    private final ConsigneeRepository consigneeRepository;

    // ── Create a new transaction + deduct 1 from stock ───────────────────────
    @Transactional
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Transaction transaction) {
        if (transaction.getVariant() == null || transaction.getVariant().getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Variant ID is required."));
        }
        Long variantId = transaction.getVariant().getId();
        var variantOpt = variantRepository.findById(variantId);
        if (variantOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Variant not found with id: " + variantId));
        }
        ProductVariant variant = variantOpt.get();

        // Find oldest stock batch for FIFO using a PESSIMISTIC WRITE lock.
        // This prevents two concurrent sales from both reading remainingQuantity > 0
        // and both deducting, which would allow overselling the last unit.
        List<StockBatch> batches = stockBatchRepository.findReceivableByVariantIdForUpdate(variantId);
        if (batches.isEmpty()) {
            // No sellable stock — reject the transaction
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "This item is out of stock."));
        }

        // Deduct 1 from the oldest batch (FIFO)
        StockBatch oldestBatch = batches.get(0);
        oldestBatch.setRemainingQuantity(oldestBatch.getRemainingQuantity() - 1);
        stockBatchRepository.save(oldestBatch);
        
        transaction.setCostPrice(oldestBatch.getAcquisitionPrice());
        transaction.setSupplier(oldestBatch.getSupplier());
        transaction.setConsigned(oldestBatch.isConsigned());
        transaction.setStockBatch(oldestBatch);

        if ("CONSIGNMENT".equals(transaction.getTransactionType()) && transaction.getConsignee() != null && transaction.getConsignee().getId() != null) {
            Consignee consignee = consigneeRepository.findById(transaction.getConsignee().getId()).orElse(null);
            transaction.setConsignee(consignee);
        }

        // Save the transaction
        Transaction saved = transactionRepository.save(transaction);
        
        // Reload with JOIN FETCH so lazy relations are initialized before JSON serialization
        ResponseEntity<?> response = ResponseEntity.ok(transactionRepository.findByIdWithDetails(saved.getId()).orElse(saved));
        // Notify all connected clients that stock has changed
        stockWebSocketHandler.broadcastStockUpdate();
        return response;
    }


    // ── Get transactions with optional date-range filter ─────────────────────
    // Preset limits: TODAY=300, 1W=1500, 1M=5000, 1Y=10000, ALL=100000
    @GetMapping
    public List<Transaction> getAll(
            @RequestParam(value = "from", required = false) String fromStr,
            @RequestParam(value = "to",   required = false) String toStr,
            @RequestParam(value = "limit", required = false, defaultValue = "100000") int limit) {
        if (fromStr != null && toStr != null) {
            java.time.LocalDateTime from = java.time.LocalDateTime.parse(fromStr);
            java.time.LocalDateTime to   = java.time.LocalDateTime.parse(toStr);
            return transactionRepository.findAllWithDetailsInRange(from, to,
                    org.springframework.data.domain.PageRequest.of(0, limit));
        }
        return transactionRepository.findAllWithDetails(
                org.springframework.data.domain.PageRequest.of(0, limit));
    }

    // ── Get only CONSIGNMENT transactions (for ConsigneesPage) ───────────────
    @GetMapping("/consignment")
    public List<Transaction> getConsignmentAll() {
        // Fetch all, then filter — consignment records are a small fraction
        return transactionRepository.findAllWithDetails(
                org.springframework.data.domain.PageRequest.of(0, 100000))
                .stream()
                .filter(t -> "CONSIGNMENT".equals(t.getTransactionType()))
                .collect(java.util.stream.Collectors.toList());
    }

    // ── Mark a PARTIAL transaction as FULL once remaining balance is paid ─────
    @Transactional
    @PatchMapping("/{id}/complete")
    public ResponseEntity<?> complete(@PathVariable("id") Long id) {
        Transaction t = transactionRepository.findById(id).orElse(null);
        if (t == null) {
            return ResponseEntity.notFound().build();
        }
        if ("FULL".equalsIgnoreCase(t.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Transaction is already completed."));
        }
        t.setStatus("FULL");
        transactionRepository.save(t);
        return ResponseEntity.ok(Map.of("message", "Transaction marked as completed.", "transactionId", id));
    }

    // ── Update payment method for an entire order group ───────────────────────
    @Transactional
    @PatchMapping("/group/{transactionId}/payment")
    public ResponseEntity<?> updatePaymentMethod(
            @PathVariable("transactionId") String transactionId,
            @RequestBody Map<String, String> body) {

        String newMethod = body.get("paymentMethod");
        if (newMethod == null || newMethod.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "paymentMethod is required."));
        }

        List<Transaction> group;
        if (transactionId.startsWith("LEGACY-")) {
            try {
                Long id = Long.parseLong(transactionId.replace("LEGACY-", ""));
                group = transactionRepository.findById(id).map(List::of).orElse(Collections.emptyList());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid transaction ID format: " + transactionId));
            }
        } else {
            group = transactionRepository.findByTransactionId(transactionId);
        }

        if (group.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        for (Transaction tx : group) {
            tx.setPaymentMethod(newMethod);
            transactionRepository.save(tx);
        }

        return ResponseEntity.ok(Map.of("message", "Payment method updated.", "transactionId", transactionId));
    }

    // ── Mark all PARTIAL/UNPAID items in a group as FULL ──────────────────────
    @Transactional
    @PatchMapping("/group/{transactionId}/complete")
    public ResponseEntity<?> completeGroup(@PathVariable("transactionId") String transactionId) {
        List<Transaction> group;
        if (transactionId.startsWith("LEGACY-")) {
            try {
                Long id = Long.parseLong(transactionId.replace("LEGACY-", ""));
                group = transactionRepository.findById(id).map(List::of).orElse(Collections.emptyList());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid transaction ID format: " + transactionId));
            }
        } else {
            group = transactionRepository.findByTransactionId(transactionId);
        }

        if (group.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        boolean updated = false;
        for (Transaction tx : group) {
            if (!"FULL".equalsIgnoreCase(tx.getStatus())) {
                tx.setStatus("FULL");
                transactionRepository.save(tx);
                updated = true;
            }
        }

        if (!updated) {
            return ResponseEntity.badRequest().body(Map.of("error", "All items are already fully paid."));
        }

        return ResponseEntity.ok(Map.of("message", "All items in the order marked as paid.", "transactionId", transactionId));
    }

    // ── Apply a lump sum partial payment across an order group ────────────────────
    @Transactional
    @PatchMapping("/group/{transactionId}/pay-partial")
    public ResponseEntity<?> payPartialGroup(
            @PathVariable("transactionId") String transactionId,
            @RequestBody Map<String, Object> body) {
        
        if (!body.containsKey("amount")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Amount is required."));
        }
        
        java.math.BigDecimal amount;
        try {
            amount = new java.math.BigDecimal(body.get("amount").toString());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid amount format."));
        }

        if (amount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Amount must be greater than zero."));
        }

        List<Transaction> group;
        if (transactionId.startsWith("LEGACY-")) {
            try {
                Long id = Long.parseLong(transactionId.replace("LEGACY-", ""));
                group = transactionRepository.findById(id).map(List::of).orElse(Collections.emptyList());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid transaction ID format."));
            }
        } else {
            group = transactionRepository.findByTransactionId(transactionId);
        }

        if (group.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        java.math.BigDecimal remainingPayment = amount;
        boolean updated = false;

        for (Transaction tx : group) {
            if ("FULL".equalsIgnoreCase(tx.getStatus())) {
                continue;
            }

            java.math.BigDecimal finalPrice = tx.getFinalPrice() != null ? tx.getFinalPrice() : java.math.BigDecimal.ZERO;
            java.math.BigDecimal downpayment = tx.getDownpayment() != null ? tx.getDownpayment() : java.math.BigDecimal.ZERO;
            java.math.BigDecimal balance = finalPrice.subtract(downpayment);

            if (balance.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                tx.setStatus("FULL");
                transactionRepository.save(tx);
                continue;
            }

            if (remainingPayment.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                break; // Payment amount exhausted
            }

            if (remainingPayment.compareTo(balance) >= 0) {
                // Fully pay this item
                tx.setDownpayment(finalPrice);
                tx.setStatus("FULL");
                remainingPayment = remainingPayment.subtract(balance);
                updated = true;
            } else {
                // Partially pay this item
                tx.setDownpayment(downpayment.add(remainingPayment));
                tx.setStatus("PARTIAL");
                remainingPayment = java.math.BigDecimal.ZERO;
                updated = true;
            }
            transactionRepository.save(tx);
        }

        if (!updated) {
            return ResponseEntity.badRequest().body(Map.of("error", "Order is already fully paid or no balance to pay."));
        }

        return ResponseEntity.ok(Map.of("message", "Payment applied successfully.", "transactionId", transactionId));
    }

    // ── Apply a partial payment to a specific list of selected items ────────────
    @Transactional
    @PatchMapping("/pay-selected")
    public ResponseEntity<?> paySelectedItems(@RequestBody Map<String, Object> body) {
        if (!body.containsKey("amount") || !body.containsKey("itemIds")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Amount and itemIds are required."));
        }
        
        java.math.BigDecimal amount;
        try {
            amount = new java.math.BigDecimal(body.get("amount").toString());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid amount format."));
        }

        @SuppressWarnings("unchecked")
        List<Number> itemIds = (List<Number>) body.get("itemIds");
        if (itemIds == null || itemIds.isEmpty() || amount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid input."));
        }

        List<Transaction> itemsToPay = transactionRepository.findAllById(
            itemIds.stream().map(Number::longValue).collect(java.util.stream.Collectors.toList())
        );

        // Sort by final price ascending to ensure the cheapest paddles are fully paid first, matching the frontend's greedy logic
        itemsToPay.sort(java.util.Comparator.comparing(t -> 
            t.getFinalPrice() != null ? t.getFinalPrice() : java.math.BigDecimal.ZERO
        ));

        java.math.BigDecimal remainingPayment = amount;
        boolean updated = false;

        for (Transaction tx : itemsToPay) {
            if ("FULL".equalsIgnoreCase(tx.getStatus())) {
                continue;
            }

            java.math.BigDecimal finalPrice = tx.getFinalPrice() != null ? tx.getFinalPrice() : java.math.BigDecimal.ZERO;
            java.math.BigDecimal downpayment = tx.getDownpayment() != null ? tx.getDownpayment() : java.math.BigDecimal.ZERO;
            java.math.BigDecimal balance = finalPrice.subtract(downpayment);

            if (balance.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                tx.setStatus("FULL");
                transactionRepository.save(tx);
                continue;
            }

            if (remainingPayment.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                break; // Payment amount exhausted
            }

            if (remainingPayment.compareTo(balance) >= 0) {
                // Fully pay this item
                tx.setDownpayment(finalPrice);
                tx.setStatus("FULL");
                remainingPayment = remainingPayment.subtract(balance);
                updated = true;
            } else {
                // Partially pay this item
                tx.setDownpayment(downpayment.add(remainingPayment));
                tx.setStatus("PARTIAL");
                remainingPayment = java.math.BigDecimal.ZERO;
                updated = true;
            }
            transactionRepository.save(tx);
        }

        return ResponseEntity.ok(Map.of("message", "Payment applied successfully."));
    }

    // ── Return a single consignment item (restore stock, delete transaction row) ─
    @Transactional
    @DeleteMapping("/{id}/return")
    public ResponseEntity<?> returnItem(@PathVariable("id") Long id) {
        Transaction tx = transactionRepository.findByIdWithDetails(id).orElse(null);
        if (tx == null) {
            return ResponseEntity.notFound().build();
        }
        if (!"CONSIGNMENT".equals(tx.getTransactionType())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only CONSIGNMENT items can be returned."));
        }
        if ("FULL".equalsIgnoreCase(tx.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot return an already-paid item."));
        }

        // Restore stock to the original batch
        StockBatch batch = tx.getStockBatch();
        if (batch != null) {
            batch.setRemainingQuantity(batch.getRemainingQuantity() + 1);
            stockBatchRepository.save(batch);
        } else {
            // Fallback: restore to any existing batch for this variant
            ProductVariant variant = tx.getVariant();
            List<StockBatch> batches = stockBatchRepository.findByVariantIdAndStatusReceivedForUpdate(variant.getId());
            if (!batches.isEmpty()) {
                StockBatch target = batches.get(0);
                target.setRemainingQuantity(target.getRemainingQuantity() + 1);
                stockBatchRepository.save(target);
            }
        }

        transactionRepository.delete(tx);
        stockWebSocketHandler.broadcastStockUpdate();
        return ResponseEntity.ok(Map.of("message", "Item returned and stock restored.", "transactionId", id));
    }

    @Transactional
    @PostMapping("/cancel/{transactionId}")
    public ResponseEntity<?> cancelOrder(@PathVariable("transactionId") String transactionId) {
        List<Transaction> group;
        if (transactionId.startsWith("LEGACY-")) {
            try {
                Long id = Long.parseLong(transactionId.replace("LEGACY-", ""));
                group = transactionRepository.findById(id).map(List::of).orElse(Collections.emptyList());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid transaction ID format: " + transactionId));
            }
        } else {
            group = transactionRepository.findByTransactionId(transactionId);
        }

        if (group.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        for (Transaction tx : group) {
            // 1. Restore the stock batch accurately
            StockBatch batch = tx.getStockBatch();
            
            if (batch != null) {
                // Ideal case: we know exactly which batch this unit came from.
                batch.setRemainingQuantity(batch.getRemainingQuantity() + 1);
                stockBatchRepository.save(batch);
            } else {
                // Fallback for legacy transactions (null stockBatch):
                // Prefer a batch that actually had items consumed (remaining < quantity)
                // so we restore to the right cost/supplier context. Use PESSIMISTIC_WRITE
                // lock to prevent two concurrent cancels from double-restoring.
                ProductVariant variant = tx.getVariant();
                List<StockBatch> batches = stockBatchRepository
                    .findByVariantIdAndStatusReceivedForUpdate(variant.getId());
                
                StockBatch targetBatch = null;
                // First: find a batch that had items sold from it (remaining < quantity)
                for (StockBatch b : batches) {
                    int orig = b.getQuantity() != null ? b.getQuantity() : 0;
                    int rem  = b.getRemainingQuantity() != null ? b.getRemainingQuantity() : 0;
                    if (rem < orig) { targetBatch = b; break; }
                }
                // Second: fall back to the most recent batch if none were consumed
                if (targetBatch == null && !batches.isEmpty()) {
                    targetBatch = batches.get(0);
                }
                if (targetBatch != null) {
                    targetBatch.setRemainingQuantity(targetBatch.getRemainingQuantity() + 1);
                    stockBatchRepository.save(targetBatch);
                }
            }

            // 2. Delete the transaction row entirely (user wants deletion, not 'CANCELLED' status)
            transactionRepository.delete(tx);
        }

        stockWebSocketHandler.broadcastStockUpdate();
        return ResponseEntity.ok(Map.of("message", "Order completely erased and stock restored.", "transactionId", transactionId));
    }

    // ── Broadcast helper — called after order cancel to push stock refresh ────
    private void broadcastAfterCancel() {
        stockWebSocketHandler.broadcastStockUpdate();
    }
}