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
    private final pb.market.repository.TransactionRepository transactionRepository;

    @GetMapping
    public List<Product> getAll() {
        return productService.getAllProducts();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Product product) {
        if (product.getBrandName() == null || product.getBrandName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Brand name is required."));
        }
        if (product.getModelName() == null || product.getModelName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Model name is required."));
        }
        if (product.getVariants() == null || product.getVariants().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "At least one variant is required."));
        }
        for (ProductVariant v : product.getVariants()) {
            if (v.getSku() == null || v.getSku().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Each variant must have a SKU."));
            }
        }
        return ResponseEntity.ok(productService.saveProduct(product));
    }

    @PostMapping("/bulk")
    public List<Product> createMultipleProducts(@RequestBody List<Product> products) {
        return products.stream()
                .map(productService::saveProduct)
                .toList();
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Product update) {
        return productService.findById(id).map(existing -> {
            if (update.getBrandName() != null) existing.setBrandName(update.getBrandName());
            if (update.getModelName() != null) existing.setModelName(update.getModelName());
            if (update.getCategory() != null) existing.setCategory(update.getCategory());
            return ResponseEntity.ok(productService.saveProductOnly(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id) {
        var productOpt = productService.findById(id);
        if (productOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Product product = productOpt.get();
        // Check if any variant under this product has transactions
        if (product.getVariants() != null) {
            for (ProductVariant v : product.getVariants()) {
                if (!transactionRepository.findByVariantId(v.getId()).isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "error", "Cannot delete product: variant '" + v.getSku() + "' has existing transactions."
                    ));
                }
            }
        }
        productService.deleteProduct(id);
        return ResponseEntity.ok(Map.of("message", "Product deleted successfully."));
    }

    @PatchMapping("/variants/{id}/add-stock")
    public ResponseEntity<Map<String, Object>> addStock(
            @PathVariable Long id,
            @RequestParam int quantity,
            @RequestParam(required = false) BigDecimal acquisitionPrice,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false, defaultValue = "false") boolean consigned) {
        ProductVariant updated = productService.addStock(id, quantity, acquisitionPrice, supplierId, consigned);
        return ResponseEntity.ok(Map.of(
            "id", updated.getId(),
            "sku", updated.getSku(),
            "stockQuantity", updated.getStockQuantity(),
            "message", "Stock updated successfully"
        ));
    }

    @PatchMapping("/variants/{id}/deduct-stock")
    public ResponseEntity<Map<String, Object>> deductStock(
            @PathVariable Long id,
            @RequestParam int quantity) {
        try {
            ProductVariant variant = productService.deductStock(id, quantity);
            return ResponseEntity.ok(Map.of(
            "id", variant.getId(),
            "sku", variant.getSku(),
            "stockQuantity", variant.getStockQuantity(),
            "message", "Stock deducted successfully"
        ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDuplicateKey(DataIntegrityViolationException ex) {
        String message = "A product variant with this SKU already exists.";
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", message));
    }
}