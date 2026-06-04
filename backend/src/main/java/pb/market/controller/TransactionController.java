package pb.market.controller;

import jakarta.persistence.EntityManager;
import pb.market.config.StockWebSocketHandler;
import pb.market.entity.ProductVariant;
import pb.market.entity.StockBatch;
import pb.market.entity.Transaction;
import pb.market.repository.StockBatchRepository;
import pb.market.repository.TransactionRepository;
import pb.market.repository.VariantRepository;
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

        // Save the transaction
        Transaction saved = transactionRepository.save(transaction);
        
        // Reload with JOIN FETCH so lazy relations are initialized before JSON serialization
        ResponseEntity<?> response = ResponseEntity.ok(transactionRepository.findByIdWithDetails(saved.getId()).orElse(saved));
        // Notify all connected clients that stock has changed
        stockWebSocketHandler.broadcastStockUpdate();
        return response;
    }


    // ── Get all transactions (newest first, with variant + product eagerly loaded)
    @GetMapping
    public List<Transaction> getAll() {
        return transactionRepository.findAllWithDetails();
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
        // Reload with JOIN FETCH so lazy relations are initialized before JSON serialization
        return ResponseEntity.ok(transactionRepository.findByIdWithDetails(id).orElse(t));
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