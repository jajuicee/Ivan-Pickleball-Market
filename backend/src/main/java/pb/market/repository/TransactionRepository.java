package pb.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pb.market.entity.Transaction;
import java.time.LocalDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // Eager-load variant + product + defaultSupplier in one SQL trip, newest first
    // LEFT JOIN FETCH on defaultSupplier prevents LazyInitializationException (open-in-view=false)
    @Query("SELECT t FROM Transaction t JOIN FETCH t.variant v JOIN FETCH v.product LEFT JOIN FETCH v.defaultSupplier LEFT JOIN FETCH t.supplier LEFT JOIN FETCH t.stockBatch ORDER BY t.transactionDate DESC")
    List<Transaction> findAllWithDetails();

    @Query("SELECT t.variant.id, COUNT(t) FROM Transaction t WHERE t.status != 'UNPAID' GROUP BY t.variant.id")
    List<Object[]> countByVariantId();

    List<Transaction> findByTransactionId(String transactionId);

    @Query("SELECT t FROM Transaction t JOIN FETCH t.variant v JOIN FETCH v.product LEFT JOIN FETCH v.defaultSupplier LEFT JOIN FETCH t.supplier LEFT JOIN FETCH t.stockBatch WHERE t.id = :id")
    java.util.Optional<Transaction> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT t.supplier.id, COUNT(t) FROM Transaction t " +
           "WHERE t.consigned = true AND t.status != 'UNPAID' " +
           "AND t.transactionDate >= :start AND t.transactionDate <= :end " +
           "GROUP BY t.supplier.id")
    List<Object[]> countSoldConsignedBySupplierInRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}