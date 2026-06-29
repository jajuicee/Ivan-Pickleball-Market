package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pb.market.entity.StockAdjustment;

import java.util.List;

public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Long> {
    @Query("SELECT a.variant.id, a.quantity, a.adjustedAt FROM StockAdjustment a WHERE a.variant IS NOT NULL AND a.quantity IS NOT NULL")
    List<Object[]> findAllVariantIdsQuantitiesAndDates();

    @Query("SELECT a FROM StockAdjustment a JOIN FETCH a.variant v JOIN FETCH v.product")
    List<StockAdjustment> findAllWithDetails();

    List<StockAdjustment> findByVariantIdOrderByAdjustedAtDesc(Long variantId);

    // Total units removed via manual adjustments per variant (damaged, returned to supplier, etc.)
    @Query("SELECT a.variant.id, COALESCE(SUM(a.quantity), 0) FROM StockAdjustment a GROUP BY a.variant.id")
    List<Object[]> sumQuantityByVariantId();
}
