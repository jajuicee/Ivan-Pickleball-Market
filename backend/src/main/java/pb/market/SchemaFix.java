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
        log.info("Checking database schema for missing columns...");
        try {
            // Add 'consigned' column to 'transactions' table if it doesn't exist
            jdbcTemplate.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS consigned BOOLEAN DEFAULT FALSE");
            log.info("Column 'consigned' checked/added to 'transactions' table.");

            // Add 'cost_price' column if missing (just in case)
            jdbcTemplate.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cost_price DECIMAL(19,2)");
            log.info("Column 'cost_price' checked/added to 'transactions' table.");

            // Add 'supplier_id' column if missing
            jdbcTemplate.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS supplier_id BIGINT");
            log.info("Column 'supplier_id' checked/added to 'transactions' table.");
            
        } catch (Exception e) {
            log.warn("Could not execute schema fix: " + e.getMessage());
        }
    }
}
