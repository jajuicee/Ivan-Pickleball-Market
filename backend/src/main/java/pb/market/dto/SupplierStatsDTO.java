package pb.market.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SupplierStatsDTO {
    // Stat-card aggregates for the Suppliers page header
    private long totalSuppliers;        // all-time
    private long activeSuppliers;       // suppliers with >=1 batch in range
    private BigDecimal ownedSpend;      // sum across all suppliers in range (paid upfront)
    private BigDecimal consignedOwed;   // sum across all suppliers in range (owed if sold)
    private String topSupplierName;     // highest owned+consigned in range
    private BigDecimal topSupplierTotal;
}
