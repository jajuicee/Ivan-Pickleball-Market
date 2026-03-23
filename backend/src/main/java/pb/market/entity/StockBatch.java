package pb.market.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_batches")
@Data
public class StockBatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    private ProductVariant variant;

    private BigDecimal acquisitionPrice; // price paid for THIS batch
    private Integer quantity; // units in this batch
    private Integer remainingQuantity; // units not yet sold
    private LocalDateTime restockedAt;

    @PrePersist
    public void prePersist() {
        this.restockedAt = LocalDateTime.now();
        this.remainingQuantity = this.quantity;
    }
}