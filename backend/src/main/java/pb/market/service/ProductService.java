package pb.market.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pb.market.entity.Product;
import pb.market.entity.ProductVariant;
import pb.market.repository.ProductRepository;
import pb.market.repository.VariantRepository; // Using the consistent name

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final VariantRepository variantRepository;

    public List<Product> getAllProducts() {
        // This relies on the custom @Query we added to your Repository
        return productRepository.findAllWithVariants();
    }

    @Transactional
    public Product saveProduct(Product product) {
        if (product.getVariants() != null) {
            product.getVariants().forEach(v -> v.setProduct(product));
        }
        return productRepository.save(product);
    }

    @Transactional
    public ProductVariant addStock(Long variantId, int quantity) {
        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found with id: " + variantId));
        
        variant.setStockQuantity(variant.getStockQuantity() + quantity);
        return variantRepository.save(variant);
    }
}