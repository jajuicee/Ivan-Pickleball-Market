package pb.market.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "suppliers")
@Data
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // Legacy free-text contact — kept for backward compatibility with rows
    // created before contact info was split into phone/email/address.
    private String contactInfo;

    private String phone;
    private String email;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
