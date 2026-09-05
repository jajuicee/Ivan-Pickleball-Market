package pb.market.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pb.market.entity.StockBatch;
import pb.market.entity.Transaction;
import pb.market.repository.StockBatchRepository;
import pb.market.repository.TransactionRepository;

import java.util.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/stock-batches")
@RequiredArgsConstructor
public class StockBatchController {

    private final StockBatchRepository stockBatchRepository;
    private final TransactionRepository transactionRepository;

    /** Returns ALL batches for a variant (FIFO order) */
    @Transactional(readOnly = true)
    @GetMapping("/variant/{variantId}")
    public ResponseEntity<?> getBatchesForVariant(@PathVariable("variantId") Long variantId) {
        List<StockBatch> batches = stockBatchRepository.findByVariantIdOrderByConsignedAscRestockedAtAsc(variantId);
        var result = batches.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("quantity", b.getQuantity());
            m.put("remainingQuantity", b.getRemainingQuantity());
            m.put("acquisitionPrice", b.getAcquisitionPrice());
            m.put("consigned", b.isConsigned());
            m.put("restockedAt", b.getRestockedAt());
            m.put("batchId", b.getBatchId());
            if (b.getSupplier() != null) {
                m.put("supplier", Map.of("id", b.getSupplier().getId(), "name", b.getSupplier().getName()));
            } else {
                m.put("supplier", null);
            }
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Returns sale records for every batch of a given variant, grouped by the batch's DB id.
     * Each record represents one unit sold from that batch.
     *
     * Response shape:
     * {
     *   "123": [                          // batch DB id (Long → String key)
     *     {
     *       "transactionId": "abc-uuid",  // order UUID (or "LEGACY-{id}" for old orders)
     *       "internalId": 42,             // transaction row PK
     *       "type": "REGULAR",            // REGULAR or CONSIGNMENT
     *       "status": "FULL",             // FULL, PARTIAL, UNPAID
     *       "customerName": "Jane",
     *       "consigneeName": null,        // null for REGULAR, consignee name for CONSIGNMENT
     *       "date": "2025-03-06T10:00:00"
     *     },
     *     ...
     *   ],
     *   "124": [ ... ]
     * }
     */
    @Transactional(readOnly = true)
    @GetMapping("/variant/{variantId}/sales")
    public ResponseEntity<?> getSalesForVariantBatches(@PathVariable("variantId") Long variantId) {
        List<StockBatch> batches = stockBatchRepository.findByVariantIdOrderByConsignedAscRestockedAtAsc(variantId);
        if (batches.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyMap());
        }

        List<Transaction> txns = transactionRepository.findByStockBatchInWithConsignee(batches);

        // Group transactions by batch DB id
        Map<Long, List<Map<String, Object>>> result = new LinkedHashMap<>();
        for (Transaction t : txns) {
            if (t.getStockBatch() == null) continue;
            Long batchDbId = t.getStockBatch().getId();
            result.computeIfAbsent(batchDbId, k -> new ArrayList<>()).add(buildSaleMap(t));
        }

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> buildSaleMap(Transaction t) {
        Map<String, Object> m = new LinkedHashMap<>();
        // Use shared UUID if available, fall back to LEGACY-{id} for old rows
        String orderId = (t.getTransactionId() != null && !t.getTransactionId().isBlank())
                ? t.getTransactionId()
                : "LEGACY-" + t.getId();
        m.put("transactionId", orderId);
        m.put("internalId", t.getId());
        m.put("type", t.getTransactionType() != null ? t.getTransactionType() : "REGULAR");
        m.put("status", t.getStatus());
        m.put("customerName", t.getCustomerName());
        m.put("consigneeName", t.getConsignee() != null ? t.getConsignee().getName() : null);
        m.put("date", t.getTransactionDate());
        return m;
    }
}
