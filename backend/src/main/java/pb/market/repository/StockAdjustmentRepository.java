package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pb.market.entity.StockAdjustment;

import java.util.List;

public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Long> {
    List<StockAdjustment> findByVariantIdOrderByAdjustedAtDesc(Long variantId);
}
