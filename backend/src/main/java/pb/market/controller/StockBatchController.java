package pb.market.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pb.market.entity.StockBatch;
import pb.market.repository.StockBatchRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/stock-batches")
@RequiredArgsConstructor
public class StockBatchController {

    private final StockBatchRepository stockBatchRepository;

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
}
