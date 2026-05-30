package pb.market.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SupplierPurchaseDTO {
    private Long batchId;
    private String batchUuid;        // groups items added in a single Batch Add action
    private LocalDateTime restockedAt;
    private LocalDate eta;
    private String status;           // PENDING / INCOMING / RECEIVED
    private boolean consigned;

    private Long variantId;
    private String sku;
    private String color;
    private String brandName;
    private String modelName;
    private String category;

    private Integer quantity;
    private Integer remainingQuantity;
    private BigDecimal acquisitionPrice;
    private BigDecimal totalCost;    // quantity * acquisitionPrice
}
