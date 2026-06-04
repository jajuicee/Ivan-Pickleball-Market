package pb.market.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import pb.market.entity.Consignee;
import pb.market.repository.ConsigneeRepository;

import java.util.List;

@RestController
@RequestMapping("/api/consignees")
@RequiredArgsConstructor
@CrossOrigin
public class ConsigneeController {

    private final ConsigneeRepository consigneeRepository;

    @GetMapping
    public List<Consignee> getAllConsignees() {
        return consigneeRepository.findAll();
    }

    @PostMapping
    public Consignee addConsignee(@RequestBody Consignee consignee) {
        if (consignee.getName() == null || consignee.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Consignee name is required.");
        }
        return consigneeRepository.save(consignee);
    }
}
