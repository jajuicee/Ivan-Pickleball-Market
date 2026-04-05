package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pb.market.entity.Product;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    
    // JOIN FETCH variants AND their defaultSupplier eagerly to avoid LazyInitialization errors
    // (open-in-view=false means the session closes before Jackson serializes the response)
    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.variants v LEFT JOIN FETCH v.defaultSupplier ORDER BY p.id DESC")
    List<Product> findAllWithVariants();
}