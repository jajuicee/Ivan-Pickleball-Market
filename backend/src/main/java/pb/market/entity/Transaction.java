package pb.market.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Data
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Internal DB Primary Key

    private String transactionId; // Shared ID for all items purchased in a single checkout event

    // Include variant data (sku, color, sellingPrice) + its parent product (brandName, modelName)
    // when this Transaction is serialized. 'variants' is ignored to prevent circular reference.
    @JsonIgnoreProperties({"variants", "stockQuantity"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", nullable = false)
    private ProductVariant variant;

    private String customerName;
    private String paymentMethod; // GCash, Bank Transfer, GoTyme
    private String status;        // FULL or PARTIAL
    
    private BigDecimal downpayment;
    private BigDecimal finalPrice; // The price you agreed on for this sale
    private LocalDateTime transactionDate;

    @PrePersist
    protected void onCreate() {
        this.transactionDate = LocalDateTime.now();
        if (this.downpayment == null) this.downpayment = BigDecimal.ZERO;
    }
}