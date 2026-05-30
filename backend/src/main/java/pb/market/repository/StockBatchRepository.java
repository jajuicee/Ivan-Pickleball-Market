package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    List<StockBatch> findByBatchId(String batchId);

    List<StockBatch> findBySupplierId(Long supplierId);

    // Purchase history for a supplier — newest first, with variant+product eagerly loaded
    @Query("SELECT b FROM StockBatch b JOIN FETCH b.variant v JOIN FETCH v.product " +
           "WHERE b.supplier.id = :supplierId AND b.restockedAt >= :start AND b.restockedAt <= :end " +
           "ORDER BY b.restockedAt DESC")
    List<StockBatch> findPurchasesBySupplierInRange(@Param("supplierId") Long supplierId,
                                                   @Param("start") java.time.LocalDateTime start,
                                                   @Param("end") java.time.LocalDateTime end);

    // Per-supplier rollup of batches in a date range, split by consigned vs owned.
    // Returns: supplier_id, consigned (boolean), count, total_units, total_cost, last_restocked_at
    @Query("SELECT b.supplier.id, b.consigned, COUNT(b), SUM(b.quantity), " +
           "SUM(b.quantity * b.acquisitionPrice), MAX(b.restockedAt) " +
           "FROM StockBatch b " +
           "WHERE b.supplier.id IS NOT NULL " +
           "AND b.restockedAt >= :start AND b.restockedAt <= :end " +
           "GROUP BY b.supplier.id, b.consigned")
    List<Object[]> sumPurchasesBySupplierInRange(@Param("start") java.time.LocalDateTime start,
                                                 @Param("end") java.time.LocalDateTime end);

    // All-time last purchase date per supplier (used when no date filter is applied)
    @Query("SELECT b.supplier.id, MAX(b.restockedAt) FROM StockBatch b " +
           "WHERE b.supplier.id IS NOT NULL GROUP BY b.supplier.id")
    List<Object[]> findLastPurchaseDateBySupplier();
}
