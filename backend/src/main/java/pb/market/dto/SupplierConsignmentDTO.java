package pb.market.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SupplierConsignmentDTO {
    private Long id;
    private String name;
    private Long soldConsignedCount;
}
