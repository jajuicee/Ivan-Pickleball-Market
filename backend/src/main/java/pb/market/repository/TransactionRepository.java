package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pb.market.entity.Transaction;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // Eager-load variant + product + defaultSupplier in one SQL trip, newest first
    // LEFT JOIN FETCH on defaultSupplier prevents LazyInitializationException (open-in-view=false)
    @Query("SELECT t FROM Transaction t JOIN FETCH t.variant v JOIN FETCH v.product LEFT JOIN FETCH v.defaultSupplier ORDER BY t.transactionDate DESC")
    List<Transaction> findAllWithDetails();

    @Query("SELECT t.variant.id, COUNT(t) FROM Transaction t WHERE t.status != 'UNPAID' AND t.status != 'CANCELLED' GROUP BY t.variant.id")
    List<Object[]> countByVariantId();
}