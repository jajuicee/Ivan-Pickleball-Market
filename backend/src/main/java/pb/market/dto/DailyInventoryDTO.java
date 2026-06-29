package pb.market.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyInventoryDTO {
    private Long variantId;
    private String productName;
    private String category;
    private String color;
    
    private int startingStock;
    private int restocked;
    private int sold;
    private int adjusted;
    private int closingStock;
}
