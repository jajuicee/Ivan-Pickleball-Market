package pb.market.controller;

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

    // ── Create a new transaction + deduct 1 from stock ───────────────────────
    @Transactional
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Transaction transaction) {
        Long variantId = transaction.getVariant().getId();
        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        if (variant.getStockQuantity() <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "This item is out of stock."));
        }

        // Deduct stock first

        // Find oldest stock batch for FIFO (ONLY RECEIVED!)
        List<StockBatch> batches = stockBatchRepository.findByVariantIdAndStatusAndRemainingQuantityGreaterThanOrderByConsignedAscRestockedAtAsc(variantId, "RECEIVED", 0);
        if (!batches.isEmpty()) {
            StockBatch oldestBatch = batches.get(0);
            oldestBatch.setRemainingQuantity(oldestBatch.getRemainingQuantity() - 1);
            stockBatchRepository.save(oldestBatch);
            
            transaction.setCostPrice(oldestBatch.getAcquisitionPrice());
            transaction.setSupplier(oldestBatch.getSupplier());
            transaction.setConsigned(oldestBatch.isConsigned());
            transaction.setStockBatch(oldestBatch);
        } else {
            // Fallback if no valid batches
            transaction.setCostPrice(variant.getAcquisitionPrice());
        }

        // Save the transaction
        Transaction saved = transactionRepository.save(transaction);
        
        // Reload with JOIN FETCH so lazy relations are initialized before JSON serialization
        return ResponseEntity.ok(transactionRepository.findByIdWithDetails(saved.getId()).orElse(saved));
    }


    // ── Get all transactions (newest first, with variant + product eagerly loaded)
    @GetMapping
    public List<Transaction> getAll() {
        return transactionRepository.findAllWithDetails();
    }

    // ── Mark a PARTIAL transaction as FULL once remaining balance is paid ─────
    @Transactional
    @PatchMapping("/{id}/complete")
    public ResponseEntity<?> complete(@PathVariable Long id) {
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
            @PathVariable String transactionId,
            @RequestBody Map<String, String> body) {

        String newMethod = body.get("paymentMethod");
        if (newMethod == null || newMethod.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "paymentMethod is required."));
        }

        List<Transaction> group;
        if (transactionId.startsWith("LEGACY-")) {
            Long id = Long.parseLong(transactionId.replace("LEGACY-", ""));
            group = transactionRepository.findById(id).map(List::of).orElse(Collections.emptyList());
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

    @Transactional
    @PostMapping("/cancel/{transactionId}")
    public ResponseEntity<?> cancelOrder(@PathVariable String transactionId) {
        List<Transaction> group;
        if (transactionId.startsWith("LEGACY-")) {
            Long id = Long.parseLong(transactionId.replace("LEGACY-", ""));
            group = transactionRepository.findById(id).map(List::of).orElse(Collections.emptyList());
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
                // Restore to the most recently restocked RECEIVED batch for that variant.
                ProductVariant variant = tx.getVariant();
                List<StockBatch> batches = stockBatchRepository
                    .findByVariantIdAndStatusOrderByRestockedAtDesc(variant.getId(), "RECEIVED");
                if (!batches.isEmpty()) {
                    StockBatch mostRecent = batches.get(0);
                    mostRecent.setRemainingQuantity(mostRecent.getRemainingQuantity() + 1);
                    stockBatchRepository.save(mostRecent);
                }
            }

            // 2. Delete the transaction row entirely (user wants deletion, not 'CANCELLED' status)
            transactionRepository.delete(tx);
        }

        return ResponseEntity.ok(Map.of("message", "Order completely erased and stock restored.", "transactionId", transactionId));
    }
}