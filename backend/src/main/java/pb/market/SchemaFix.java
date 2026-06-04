package pb.market;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SchemaFix implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        log.info("Checking database schema for missing columns and constraints...");

        // ── Column migrations (idempotent) ─────────────────────────────────────
        safeExecute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS consigned BOOLEAN DEFAULT FALSE",
                "Column 'consigned' checked/added to 'transactions' table.");

        safeExecute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cost_price DECIMAL(19,2)",
                "Column 'cost_price' checked/added to 'transactions' table.");

        safeExecute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS supplier_id BIGINT",
                "Column 'supplier_id' checked/added to 'transactions' table.");

        safeExecute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(255) DEFAULT 'REGULAR'",
                "Column 'transaction_type' checked/added to 'transactions' table.");

        safeExecute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS consignee_id BIGINT",
                "Column 'consignee_id' checked/added to 'transactions' table.");

        // Backfill old transactions
        safeExecute("UPDATE transactions SET transaction_type = 'REGULAR' WHERE transaction_type IS NULL",
                "Backfilled existing transactions with 'REGULAR' type.");

        // ── Data integrity fixes ───────────────────────────────────────────────
        // Fix any existing negative remaining_quantity (could happen from old race conditions)
        safeExecute("UPDATE stock_batches SET remaining_quantity = 0 WHERE remaining_quantity < 0",
                "Fixed any negative remaining_quantity rows in stock_batches.");

        // ── Database constraints (safe for concurrent backend instances) ───────
        // CHECK: remaining_quantity can never go negative at the DB level
        safeExecute("ALTER TABLE stock_batches ADD CONSTRAINT chk_remaining_non_negative CHECK (remaining_quantity >= 0)",
                "CHECK constraint chk_remaining_non_negative added to stock_batches.");

        // FK: transactions.stock_batch_id → ON DELETE SET NULL (prevents 500 on batch deletion)
        safeExecute("ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_tx_stock_batch",
                "Dropped old FK constraint fk_tx_stock_batch (if any).");
        safeExecute("ALTER TABLE transactions ADD CONSTRAINT fk_tx_stock_batch " +
                    "FOREIGN KEY (stock_batch_id) REFERENCES stock_batches(id) ON DELETE SET NULL",
                "FK constraint fk_tx_stock_batch with ON DELETE SET NULL added.");

        log.info("Schema check complete.");
    }

    /** Execute SQL silently — if it fails (e.g. constraint already exists), just log and move on. */
    private void safeExecute(String sql, String successMsg) {
        try {
            jdbcTemplate.execute(sql);
            log.info(successMsg);
        } catch (Exception e) {
            log.info("Skipped (already applied or not needed): " + e.getMessage());
        }
    }
}
