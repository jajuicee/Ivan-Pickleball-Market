package pb.market.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pb.market.entity.Supplier;
import pb.market.repository.SupplierRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierRepository supplierRepository;
    private final pb.market.repository.TransactionRepository transactionRepository;

    @GetMapping
    public List<Supplier> getAll() {
        return supplierRepository.findAll();
    }

    @GetMapping("/reports/consignment")
    public List<pb.market.dto.SupplierConsignmentDTO> getConsignmentReport(
            @RequestParam("start") String startStr,
            @RequestParam("end") String endStr) {
        
        java.time.LocalDateTime start = java.time.LocalDateTime.parse(startStr);
        java.time.LocalDateTime end = java.time.LocalDateTime.parse(endStr);
        
        List<Supplier> suppliers = supplierRepository.findAll();
        Map<Long, Long> counts = transactionRepository.countSoldConsignedBySupplierInRange(start, end).stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> (Long) row[1]
                ));
        
        return suppliers.stream().map(s -> new pb.market.dto.SupplierConsignmentDTO(
                s.getId(),
                s.getName(),
                counts.getOrDefault(s.getId(), 0L)
        )).collect(Collectors.toList());
    }

    @PostMapping
    public Supplier create(@RequestBody Supplier supplier) {
        return supplierRepository.save(supplier);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Supplier update) {
        return supplierRepository.findById(id).map(existing -> {
            existing.setName(update.getName());
            existing.setContactInfo(update.getContactInfo());
            existing.setNotes(update.getNotes());
            return ResponseEntity.ok(supplierRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!supplierRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        supplierRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Supplier deleted"));
    }
}
