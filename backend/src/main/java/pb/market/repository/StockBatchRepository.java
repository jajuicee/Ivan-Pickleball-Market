package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pb.market.entity.StockBatch;
import java.util.List;

public interface StockBatchRepository extends JpaRepository<StockBatch, Long> {
    List<StockBatch> findByVariantIdAndRemainingQuantityGreaterThanOrderByRestockedAtAsc(Long variantId, int remainingQuantity);
}
