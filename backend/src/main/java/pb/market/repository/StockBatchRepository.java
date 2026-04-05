package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pb.market.entity.StockBatch;
import java.util.List;

public interface StockBatchRepository extends JpaRepository<StockBatch, Long> {
    // Used by StockBatchController to display ALL batches for a variant (all statuses)
    List<StockBatch> findByVariantIdOrderByConsignedAscRestockedAtAsc(Long variantId);

    List<StockBatch> findByVariantIdAndStatusAndRemainingQuantityGreaterThanOrderByConsignedAscRestockedAtAsc(Long variantId, String status, int remainingQuantity);
    
    // For refunding stock, we want the most recently RECEIVED batch (so we order by restockedAt DESC)
    List<StockBatch> findByVariantIdAndStatusOrderByRestockedAtDesc(Long variantId, String status);

    @Query("SELECT s.variant.id, SUM(s.quantity) FROM StockBatch s WHERE s.status = 'RECEIVED' GROUP BY s.variant.id")
    List<Object[]> sumQuantityByVariantId();

    // Eagerly loads variant → product and supplier in ONE query to avoid N+1 loops
    @Query("SELECT b FROM StockBatch b JOIN FETCH b.variant v JOIN FETCH v.product LEFT JOIN FETCH b.supplier WHERE b.batchId IS NOT NULL")
    List<StockBatch> findAllWithVariantAndProduct();
}
