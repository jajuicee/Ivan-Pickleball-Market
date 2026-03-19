package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pb.market.entity.Product;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    
    // This 'JOIN FETCH' tells Hibernate to get Products and Variants in 1 trip!
    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.variants")
    List<Product> findAllWithVariants();
}