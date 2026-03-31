package pb.market.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "incoming_stocks")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class IncomingStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "variant_id", nullable = false)
    private ProductVariant variant;

    @Column(nullable = false)
    private Integer quantity;

    @Column(precision = 10, scale = 2)
    private BigDecimal expectedPrice;

    private LocalDate expectedArrival;

    @Column(nullable = false, length = 20)
    private String status = "PENDING"; // PENDING, RECEIVED, CANCELLED

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Supplier that is sending this shipment
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Supplier supplier;

    // Whether this incoming batch is consigned (not purchased outright)
    @Column(columnDefinition = "boolean default false")
    private boolean consigned = false;

    // Default constructor for JPA
    public IncomingStock() {
    }

    public IncomingStock(ProductVariant variant, Integer quantity, BigDecimal expectedPrice, LocalDate expectedArrival, String status) {
        this.variant = variant;
        this.quantity = quantity;
        this.expectedPrice = expectedPrice;
        this.expectedArrival = expectedArrival;
        this.status = status;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ProductVariant getVariant() { return variant; }
    public void setVariant(ProductVariant variant) { this.variant = variant; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getExpectedPrice() { return expectedPrice; }
    public void setExpectedPrice(BigDecimal expectedPrice) { this.expectedPrice = expectedPrice; }

    public LocalDate getExpectedArrival() { return expectedArrival; }
    public void setExpectedArrival(LocalDate expectedArrival) { this.expectedArrival = expectedArrival; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Supplier getSupplier() { return supplier; }
    public void setSupplier(Supplier supplier) { this.supplier = supplier; }

    public boolean isConsigned() { return consigned; }
    public void setConsigned(boolean consigned) { this.consigned = consigned; }
}
