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
        variant.setStockQuantity(variant.getStockQuantity() - 1);
        variantRepository.save(variant);

        // Find oldest stock batch for FIFO
        List<StockBatch> batches = stockBatchRepository.findByVariantIdAndRemainingQuantityGreaterThanOrderByRestockedAtAsc(variantId, 0);
        if (!batches.isEmpty()) {
            StockBatch oldestBatch = batches.get(0);
            oldestBatch.setRemainingQuantity(oldestBatch.getRemainingQuantity() - 1);
            stockBatchRepository.save(oldestBatch);
            transaction.setCostPrice(oldestBatch.getAcquisitionPrice());
        } else {
            // Fallback if no valid batches
            transaction.setCostPrice(variant.getAcquisitionPrice());
        }

        // Save the transaction
        Transaction saved = transactionRepository.save(transaction);
        return ResponseEntity.ok(saved);
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
        return ResponseEntity.ok(transactionRepository.findAllWithDetails()
                .stream()
                .filter(tx -> tx.getId().equals(id))
                .findFirst()
                .orElse(t));
    }

    // ── Cancel an entire order group (by transactionId) + restock items ────────
    @Transactional
    @PostMapping("/cancel/{transactionId}")
    public ResponseEntity<?> cancelOrder(@PathVariable String transactionId) {
        List<Transaction> group = transactionRepository.findAllWithDetails()
                .stream()
                .filter(tx -> transactionId.equals(tx.getTransactionId()))
                .toList();

        if (group.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        for (Transaction tx : group) {
            // 1. Restore the variant's summary stock count (each tx = 1 unit sold)
            ProductVariant variant = tx.getVariant();
            int currentQty = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
            variant.setStockQuantity(currentQty + 1);
            variantRepository.save(variant);

            // 2. Restore the FIFO batch — add 1 unit back to the most recently consumed batch
            List<StockBatch> batches = stockBatchRepository
                    .findByVariantIdAndRemainingQuantityGreaterThanOrderByRestockedAtAsc(variant.getId(), -1);
            if (!batches.isEmpty()) {
                StockBatch batch = batches.get(batches.size() - 1);
                batch.setRemainingQuantity(batch.getRemainingQuantity() + 1);
                stockBatchRepository.save(batch);
            }

            // 3. Delete the transaction row entirely
            transactionRepository.delete(tx);
        }

        return ResponseEntity.ok(Map.of("message", "Order deleted and stock restored.", "transactionId", transactionId));
    }
}