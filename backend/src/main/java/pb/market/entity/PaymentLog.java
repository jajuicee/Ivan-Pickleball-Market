package pb.market.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_logs")
@Data
public class PaymentLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The specific transaction item this payment is for
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    @JsonIgnore
    private Transaction transaction;

    // The group order ID (transactionId string) for easy querying
    private String orderId;

    // How much was paid in this event
    private BigDecimal amount;

    // The cost portion attributable to this payment (for profit calculation)
    private BigDecimal costPortion;

    // When this payment happened
    private LocalDateTime paymentDate;

    // Payment method used for this specific payment
    private String paymentMethod;

    @PrePersist
    protected void onCreate() {
        if (this.paymentDate == null) {
            this.paymentDate = LocalDateTime.now();
        }
    }
}
