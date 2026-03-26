package pb.market.controller;

import pb.market.entity.Product;
import pb.market.entity.ProductVariant;
import pb.market.repository.VariantRepository;
import pb.market.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;
    private final VariantRepository variantRepository;

    @GetMapping
    public List<Product> getAll() {
        return productService.getAllProducts();
    }

    @PostMapping
    public Product create(@RequestBody Product product) {
        return productService.saveProduct(product);
    }

    @PostMapping("/bulk")
    public List<Product> createMultipleProducts(@RequestBody List<Product> products) {
        return products.stream()
                .map(productService::saveProduct)
                .toList();
    }

    @PatchMapping("/variants/{id}/add-stock")
    public ResponseEntity<Map<String, Object>> addStock(
            @PathVariable Long id, 
            @RequestParam int quantity, 
            @RequestParam(required = false) BigDecimal acquisitionPrice) {
        ProductVariant updated = productService.addStock(id, quantity, acquisitionPrice);
        return ResponseEntity.ok(Map.of(
            "id", updated.getId(),
            "sku", updated.getSku(),
            "stockQuantity", updated.getStockQuantity(),
            "message", "Stock updated successfully"
        ));
    }

    @PatchMapping("/variants/{id}/deduct-stock")
    @Transactional
    public ResponseEntity<Map<String, Object>> deductStock(
            @PathVariable Long id,
            @RequestParam int quantity) {
        ProductVariant variant = variantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Variant not found"));
        int current = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
        if (quantity > current) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot deduct more than current stock (" + current + ")."));
        }
        variant.setStockQuantity(current - quantity);
        variantRepository.save(variant);
        return ResponseEntity.ok(Map.of(
            "id", variant.getId(),
            "sku", variant.getSku(),
            "stockQuantity", variant.getStockQuantity(),
            "message", "Stock deducted successfully"
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDuplicateKey(DataIntegrityViolationException ex) {
        String message = "A product variant with this SKU already exists.";
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", message));
    }
}