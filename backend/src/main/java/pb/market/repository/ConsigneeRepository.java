package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pb.market.entity.Consignee;

public interface ConsigneeRepository extends JpaRepository<Consignee, Long> {
}
