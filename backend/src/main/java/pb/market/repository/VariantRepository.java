package pb.market.repository;

import pb.market.entity.Product;
import pb.market.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface VariantRepository extends JpaRepository<ProductVariant, Long> {
    @Query("SELECT v FROM ProductVariant v JOIN FETCH v.product")
    List<ProductVariant> findAllWithProduct();
    
    Optional<ProductVariant> findBySku(String sku);
}