package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pb.market.entity.Transaction;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // Eager-load variant + product in one SQL trip, newest first
    @Query("SELECT t FROM Transaction t JOIN FETCH t.variant v JOIN FETCH v.product ORDER BY t.transactionDate DESC")
    List<Transaction> findAllWithDetails();
}