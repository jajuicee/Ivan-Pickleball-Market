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
    @Query("SELECT t FROM Transaction t JOIN FETCH t.variant v JOIN FETCH v.product LEFT JOIN FETCH v.defaultSupplier LEFT JOIN FETCH t.supplier LEFT JOIN FETCH t.stockBatch LEFT JOIN FETCH t.consignee ORDER BY t.transactionDate DESC")
    List<Transaction> findAllWithDetails(org.springframework.data.domain.Pageable pageable);

    @Query("SELECT t FROM Transaction t JOIN FETCH t.variant v JOIN FETCH v.product LEFT JOIN FETCH v.defaultSupplier LEFT JOIN FETCH t.supplier LEFT JOIN FETCH t.stockBatch LEFT JOIN FETCH t.consignee WHERE t.transactionDate >= :from AND t.transactionDate <= :to ORDER BY t.transactionDate DESC")
    List<Transaction> findAllWithDetailsInRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to, org.springframework.data.domain.Pageable pageable);


    @Query("SELECT t.variant.id, COUNT(t) FROM Transaction t WHERE t.status != 'UNPAID' GROUP BY t.variant.id")
    List<Object[]> countByVariantId();

    @Query("SELECT t FROM Transaction t JOIN FETCH t.variant v JOIN FETCH v.product LEFT JOIN FETCH v.defaultSupplier LEFT JOIN FETCH t.supplier LEFT JOIN FETCH t.stockBatch LEFT JOIN FETCH t.consignee WHERE t.transactionId = :transactionId")
    List<Transaction> findByTransactionId(@Param("transactionId") String transactionId);

    @Query("SELECT t FROM Transaction t JOIN FETCH t.variant v JOIN FETCH v.product LEFT JOIN FETCH v.defaultSupplier LEFT JOIN FETCH t.supplier LEFT JOIN FETCH t.stockBatch LEFT JOIN FETCH t.consignee WHERE t.id = :id")
    java.util.Optional<Transaction> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT t.supplier.id, COUNT(t) FROM Transaction t " +
           "WHERE t.consigned = true AND t.status != 'UNPAID' " +
           "AND t.transactionDate >= :start AND t.transactionDate <= :end " +
           "GROUP BY t.supplier.id")
    List<Object[]> countSoldConsignedBySupplierInRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<Transaction> findBySupplierId(Long supplierId);

    List<Transaction> findByVariantId(Long variantId);

    boolean existsByVariantId(Long variantId);

    List<Transaction> findByStockBatchIn(List<pb.market.entity.StockBatch> batches);
}