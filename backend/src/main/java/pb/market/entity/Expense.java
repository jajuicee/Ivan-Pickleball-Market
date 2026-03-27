package pb.market.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
@Data
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String category; // Miscellaneous, Bills, Supplies, Salary

    private BigDecimal cost;

    private String note;

    private LocalDateTime expenseDate;

    @PrePersist
    protected void onCreate() {
        if (this.expenseDate == null) {
            this.expenseDate = LocalDateTime.now();
        }
    }
}
