package pb.market.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryMovementDTO {
    private LocalDateTime date;
    private String type; // RESTOCK, SALE, ADJUSTMENT
    private Long variantId;
    private String productName; // e.g., "KAM XPINK"
    private String color; // e.g., "Pink"
    private int quantityChange; // Positive for restock, negative for sale/adjustment
    private String relatedId; // Transaction ID, Batch ID, or Adjustment ID for traceability
    private Integer currentStock; // Current total stock remaining for this variant
}
