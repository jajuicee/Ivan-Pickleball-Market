package pb.market.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pb.market.entity.*;
import pb.market.repository.ProductRepository;
import pb.market.repository.StockAdjustmentRepository;
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
    private final StockAdjustmentRepository stockAdjustmentRepository;

/*
    @PostConstruct
    @Transactional
    public void migrateLegacyTransactions() {
        // Find all transactions where supplier is null
        List<Transaction> legacy = transactionRepository.findAll().stream()
                .filter(t -> t.getSupplier() == null)
                .collect(Collectors.toList());

        if (!legacy.isEmpty()) {
            for (Transaction t : legacy) {
                ProductVariant v = t.getVariant();
                if (v != null) {
                    t.setSupplier(v.getDefaultSupplier());
                    t.setConsigned(v.isConsigned());
                }
            }
            transactionRepository.saveAll(legacy);
        }
    }
*/

    public java.util.Optional<Product> findById(Long id) {
        return productRepository.findById(id);
    }

    /** Save product fields only (no initial batch creation). Used for updates. */
    @Transactional
    public Product saveProductOnly(Product product) {
        return productRepository.save(product);
    }

    @Transactional
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

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
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero.");
        }
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
    public ProductVariant deductStock(Long variantId, int quantity, String reason, String note) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero.");
        }
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

        // Persist the adjustment so the "Reason" the user picked is no longer thrown away.
        StockAdjustment adj = new StockAdjustment();
        adj.setVariant(variant);
        adj.setQuantity(quantity);
        adj.setReason(reason == null || reason.isBlank() ? "Manual Adjustment" : reason);
        adj.setNote(note);
        stockAdjustmentRepository.save(adj);

        return variantRepository.save(variant);
    }

    /** Partial edit of a variant — only non-null fields are applied. */
    @Transactional
    public ProductVariant updateVariant(Long variantId, ProductVariant patch) {
        ProductVariant existing = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found with id: " + variantId));

        if (patch.getSku() != null && !patch.getSku().isBlank()) existing.setSku(patch.getSku().trim());
        if (patch.getColor() != null)            existing.setColor(patch.getColor());
        if (patch.getThicknessMm() != null)      existing.setThicknessMm(patch.getThicknessMm());
        if (patch.getShape() != null)            existing.setShape(patch.getShape());
        if (patch.getAcquisitionPrice() != null) existing.setAcquisitionPrice(patch.getAcquisitionPrice());
        if (patch.getSellingPrice() != null)     existing.setSellingPrice(patch.getSellingPrice());
        if (patch.getLowStockThreshold() != null) existing.setLowStockThreshold(patch.getLowStockThreshold());
        // Boolean is primitive, so always carries a value — only treat the request's value as authoritative
        // when the JSON actually carried supplier or ownership info. The patch object is built from JSON
        // so consigned will reflect the submitted value; we accept it.
        existing.setConsigned(patch.isConsigned());

        // Supplier replacement: accept null (clear) or a {id} reference
        if (patch.getDefaultSupplier() != null && patch.getDefaultSupplier().getId() != null) {
            Supplier s = supplierRepository.findById(patch.getDefaultSupplier().getId()).orElse(null);
            existing.setDefaultSupplier(s);
        }
        return variantRepository.save(existing);
    }

    @Transactional
    public void deleteVariant(Long variantId) {
        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found with id: " + variantId));
        variantRepository.delete(variant);
    }

    public List<StockAdjustment> getAdjustments(Long variantId) {
        return stockAdjustmentRepository.findByVariantIdOrderByAdjustedAtDesc(variantId);
    }
}