# 🧠 SYSTEM NOTES FOR AI CONTEXT
*To the AI reading this in the future: read this entire document before making any changes to stock, transactions, or the database!*

## 1. Inventory Architecture (The "Batches" System)
- **Single Source of Truth:** `StockBatch` is the ONLY source of truth for inventory. 
- **DO NOT TRUST `product_variants.stock_quantity` IN THE DATABASE.** We previously abandoned that database column. The `ProductVariant.java` entity uses a `@Transient` field for `stockQuantity`, meaning the Java backend computes the stock dynamically on-the-fly by summing up all active batches.
- **FIFO Deduction:** When a sale occurs, the system finds the oldest batch (`restockedAt` or `id`) with `remainingQuantity > 0` and deducts from it.
- **Race Conditions:** `TransactionController` uses `Pessimistic Write Locks` (`findReceivableByVariantIdForUpdate`) during checkout. This forms a strict queue to prevent double-selling if two users check out at the exact same millisecond. 

## 2. Consignment Feature
- We introduced Consignees. 
- In `Transaction.java`, there is a polymorphic `transactionType` (can be `REGULAR` or `CONSIGNMENT`) and a `consignee` foreign key.
- A consignment sale *still* deducts from the normal `StockBatch` inventory using the exact same FIFO logic.
- Consignment sales do NOT appear in the general "Analytics" revenue/profit charts (they are filtered out so they don't skew actual business revenue), but they DO appear in `OrderHistory` with a purple `CONSIGNMENT` badge.

## 3. Database Reconciliations (Warning)
- If the user physically counts stock and wants to update the database manually via Supabase, they **must** update `stock_batches.remaining_quantity`. 
- DO NOT run scripts to force `stock_batches` to match the old `product_variants.stock_quantity` column, as that column is frozen and obsolete.

## 4. Payment Types
- Transactions support `FULL`, `PARTIAL`, and `UNPAID` statuses. 
- Partial payments are handled by tracking the `downpayment` compared to the `finalPrice`. 
- `OrderHistory.jsx` groups individual `Transaction` rows by their `transactionId` (UUID) to display them as a single unified receipt. Legacy orders that didn't have UUIDs are grouped by `LEGACY-{id}`.

## 5. Development 
- Start the frontend with `npm run dev`.
- Start the backend with `mvnw spring-boot:run` (Requires Java 17+). 
- Database is hosted on Supabase PostgreSQL (Transaction Mode on port 6543, with `prepareThreshold=0` set in `application.properties` to prevent prepared statement limits).
