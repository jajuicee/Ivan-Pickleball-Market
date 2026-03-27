package pb.market.controller;

import pb.market.entity.Expense;
import pb.market.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {
    private final ExpenseRepository expenseRepository;

    @GetMapping
    public List<Expense> getAll() {
        return expenseRepository.findAllByOrderByExpenseDateDesc();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Expense expense) {
        if (expense.getName() == null || expense.getName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Expense name is required."));
        }
        if (expense.getCost() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cost is required."));
        }
        Expense saved = expenseRepository.save(expense);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!expenseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        expenseRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Expense deleted."));
    }
}
