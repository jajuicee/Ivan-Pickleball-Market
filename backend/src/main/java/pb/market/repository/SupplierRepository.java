package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pb.market.entity.Supplier;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
}
