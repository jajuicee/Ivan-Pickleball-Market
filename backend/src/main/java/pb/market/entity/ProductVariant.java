package pb.market.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.Formula;
import java.math.BigDecimal;

@Entity
@Table(name = "product_variants")
@Data
public class ProductVariant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String sku;

    private String color;
    private Integer thicknessMm;
    private String shape;

    private BigDecimal acquisitionPrice;
    private BigDecimal sellingPrice;
    @Formula("(SELECT COALESCE(SUM(s.remaining_quantity), 0) FROM stock_batches s WHERE s.variant_id = id AND s.status = 'RECEIVED')")
    private Integer stockQuantity;

    
    // Virtual fields using subqueries (formula) to count all-time additions and sales.
    // POPULATED MANUALLY IN ProductService
    @Transient
    private Long totalAdded = 0L;

    @Transient
    private Long totalSold = 0L;

    // Whether this variant is consigned (affects default for new batches)
    @Column(columnDefinition = "boolean default false")
    private boolean consigned = false;

    // Serialize the parent product (brand/model/category) but not its variants list
    // to avoid circular reference, and ignore Hibernate proxy handlers to prevent 500 errors on lazy loads.
    @JsonIgnoreProperties({"variants", "hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    // Default supplier for this paddle variant
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_supplier_id")
    private Supplier defaultSupplier;
}