package pb.market.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SupplierWithStatsDTO {
    private Long id;
    private String name;
    private String contactInfo;
    private String phone;
    private String email;
    private String address;
    private String notes;

    // Aggregates over the active date range
    private long totalBatches;
    private long totalUnits;
    private BigDecimal ownedSpend;     // sum(qty * price) for non-consigned batches
    private BigDecimal consignedOwed;  // sum(qty * price) for consigned batches (potential payout)
    private LocalDateTime lastPurchaseAt;
    private long consignedSold;        // sold consigned units in range
}
