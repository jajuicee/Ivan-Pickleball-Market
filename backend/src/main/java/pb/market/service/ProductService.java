package pb.market.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pb.market.entity.Product;
import pb.market.entity.ProductVariant;
import pb.market.entity.StockBatch;
import pb.market.entity.Supplier;
import pb.market.repository.ProductRepository;
import pb.market.repository.StockBatchRepository;
import pb.market.repository.SupplierRepository;
import pb.market.repository.TransactionRepository;
import pb.market.repository.VariantRepository;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final VariantRepository variantRepository;
    private final StockBatchRepository stockBatchRepository;
    private final SupplierRepository supplierRepository;
    private final TransactionRepository transactionRepository;

    public List<Product> getAllProducts() {
        List<Product> products = productRepository.findAllWithVariants();
        if (products.isEmpty()) return products;

        // Fetch aggregates with robust numeric casting
        Map<Long, Long> addedMap = stockBatchRepository.sumQuantityByVariantId().stream()
                .collect(Collectors.toMap(
                    row -> ((Number) row[0]).longValue(), 
                    row -> row[1] != null ? ((Number) row[1]).longValue() : 0L
                ));

        Map<Long, Long> soldMap = transactionRepository.countByVariantId().stream()
                .collect(Collectors.toMap(
                    row -> ((Number) row[0]).longValue(), 
                    row -> row[1] != null ? ((Number) row[1]).longValue() : 0L
                ));

        // Populate variants
        for (Product product : products) {
            if (product.getVariants() != null) {
                for (ProductVariant v : product.getVariants()) {
                    v.setTotalAdded(addedMap.getOrDefault(v.getId(), 0L));
                    v.setTotalSold(soldMap.getOrDefault(v.getId(), 0L));
                }
            }
        }

        return products;
    }

    @Transactional
    public Product saveProduct(Product product) {
        if (product.getVariants() != null) {
            for (ProductVariant v : product.getVariants()) {
                v.setProduct(product);
            }
        }
        Product saved = productRepository.save(product);
        
        // After saving product (and variants), create the actual batch records
        if (saved.getVariants() != null) {
            for (ProductVariant v : saved.getVariants()) {
                if (v.getStockQuantity() != null && v.getStockQuantity() > 0) {
                    StockBatch initialBatch = new StockBatch();
                    initialBatch.setVariant(v);
                    initialBatch.setQuantity(v.getStockQuantity());
                    initialBatch.setRemainingQuantity(v.getStockQuantity());
                    initialBatch.setAcquisitionPrice(v.getAcquisitionPrice());
                    initialBatch.setSupplier(v.getDefaultSupplier());
                    initialBatch.setConsigned(v.isConsigned());
                    initialBatch.setBatchId("INITIAL-" + v.getSku());
                    stockBatchRepository.save(initialBatch);
                }
            }
        }
        return saved;
    }

    @Transactional
    public ProductVariant addStock(Long variantId, int quantity, BigDecimal acquisitionPrice,
                                   Long supplierId, boolean consigned) {
        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found with id: " + variantId));


        // Resolve the supplier if provided
        Supplier supplier = null;
        if (supplierId != null) {
            supplier = supplierRepository.findById(supplierId).orElse(null);
        }

        StockBatch batch = new StockBatch();
        batch.setVariant(variant);
        batch.setQuantity(quantity);
        batch.setRemainingQuantity(quantity); // Fix #3: explicitly set so it's never relying solely on @PrePersist
        batch.setAcquisitionPrice(acquisitionPrice);
        batch.setSupplier(supplier);
        batch.setConsigned(consigned);
        batch.setBatchId(UUID.randomUUID().toString()); // Fix: Add batchId so it shows in Supply History
        stockBatchRepository.save(batch);

        return variantRepository.save(variant);
    }

    @Transactional
    public ProductVariant deductStock(Long variantId, int quantity) {
        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found with id: " + variantId));
        
        int current = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
        if (quantity > current) {
            throw new IllegalArgumentException("Cannot deduct more than current stock (" + current + ").");
        }
        

        int remainingToDeduct = quantity;
        List<StockBatch> batches = stockBatchRepository
            .findByVariantIdAndStatusAndRemainingQuantityGreaterThanOrderByConsignedAscRestockedAtAsc(variantId, "RECEIVED", 0);
            
        for (StockBatch batch : batches) {
            if (remainingToDeduct <= 0) break;
            int available = batch.getRemainingQuantity() != null ? batch.getRemainingQuantity() : 0;
            if (available >= remainingToDeduct) {
                batch.setRemainingQuantity(available - remainingToDeduct);
                remainingToDeduct = 0;
            } else {
                batch.setRemainingQuantity(0);
                remainingToDeduct -= available;
            }
            stockBatchRepository.save(batch);
        }

        return variantRepository.save(variant);
    }
}