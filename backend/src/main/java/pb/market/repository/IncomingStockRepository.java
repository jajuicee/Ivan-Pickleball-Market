package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pb.market.entity.IncomingStock;

import java.util.List;

public interface IncomingStockRepository extends JpaRepository<IncomingStock, Long> {
    List<IncomingStock> findByStatusOrderByCreatedAtDesc(String status);
    List<IncomingStock> findByVariantIdAndStatus(Long variantId, String status);
}
