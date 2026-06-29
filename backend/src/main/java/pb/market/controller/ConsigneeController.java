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

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<?> deleteConsignee(@PathVariable("id") Long id) {
        if (!consigneeRepository.existsById(id)) {
            return org.springframework.http.ResponseEntity.status(404).body(java.util.Map.of("error", "Consignee not found."));
        }
        try {
            consigneeRepository.deleteById(id);
            return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Consignee deleted successfully."));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return org.springframework.http.ResponseEntity.badRequest().body(java.util.Map.of("error", "Cannot delete consignee because it has associated transactions."));
        }
    }
}
