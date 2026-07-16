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
- **Consignment Management (`ConsigneesPage.jsx`)**: 
  - This dedicated tab manages partial payments and returns for consigned stock.
  - **Returns**: Returning a paddle via `/api/transactions/{id}/return` permanently deletes that single transaction row and uses `Pessimistic Write Locks` to safely restore exactly +1 to the `remainingQuantity` of the original `StockBatch` it was deducted from.
  - **Partial/Custom Payments**: A custom `/pay-selected` endpoint allows applying partial lump-sum payments to specific selected paddles. The backend loops through the selected items and applies the payment amount, marking them `FULL` or `PARTIAL` until the budget is exhausted. The frontend prevents submitting custom amounts that exceed the total balance of the selected paddles to prevent lost funds.
  - **Safe Deletion**: Deleting a consignee is blocked if they have any associated past transactions, to preserve business records and prevent orphaned data.

## 3. Database Reconciliations (Warning)
- If the user physically counts stock and wants to update the database manually via Supabase, they **must** update `stock_batches.remaining_quantity`. 
- DO NOT run scripts to force `stock_batches` to match the old `product_variants.stock_quantity` column, as that column is frozen and obsolete.

## 4. Payment Types
- Transactions support `FULL`, `PARTIAL`, and `UNPAID` statuses. 
- Partial payments are handled by tracking the `downpayment` compared to the `finalPrice`. 
- **Payment Logs**: Every time a payment is made (whether immediately at checkout, or days later), a `PaymentLog` is created. This allows the system to accurately track *when* money was received.
- **Timeline Integration**: In `OrderHistory.jsx`, orders and their associated payments are visually interleaved using a combined timeline logic. If an order from last week is paid today, the payment record "pops up" in today's view for easy accounting verification.
- **Credit Card** has been integrated natively into checkout forms and filter lists, alongside GCash, Cash, BDO, etc.
- `OrderHistory.jsx` groups individual `Transaction` rows by their `transactionId` (UUID) to display them as a single unified receipt. Legacy orders that didn't have UUIDs are grouped by `LEGACY-{id}`.

## 5. Running the App

### Production Mode (Multi-Device — Recommended)
In production, **everything runs from one machine on one port (8080)**. The built frontend is bundled inside Spring Boot's static resources, so there is no separate frontend server.

1. **Build the frontend** (only needed after frontend code changes):
   ```
   cd frontend
   npm run build
   ```
   Or just double-click `deploy.bat` in the project root — it builds and copies automatically.

2. **Start the backend** on your host machine:
   ```
   cd backend
   mvnw spring-boot:run
   ```
   Requires Java 17+.

3. **Connect from any device** on the same WiFi/LAN:
   ```
   http://<host-machine-ip>:8080
   ```
   Example: `http://192.168.254.109:8080`

All devices (phones, tablets, laptops) connect to the same URL. The backend serves both the website and the API. WebSocket real-time sync works across all connected devices.

> **Windows Firewall:** If other devices can't connect, make sure port 8080 is allowed through Windows Firewall. Search "Windows Defender Firewall" → "Allow an app" → add Java or allow port 8080.

### Development Mode (Single Developer)
For local development with hot-reload:

1. Start the **backend**:
   ```
   cd backend
   mvnw spring-boot:run
   ```
2. Start the **frontend** dev server:
   ```
   cd frontend
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

Vite's proxy (`vite.config.js`) automatically forwards `/api/*` and `/ws/*` requests to the backend on port 8080 — no CORS issues.

### Redeploying After Frontend Changes
After editing any frontend code (JSX, CSS, etc.), run `deploy.bat` or manually:
```
cd frontend
npm run build
xcopy /e /i /q dist ..\backend\src\main\resources\static
```
Then restart Spring Boot.

### Database
- Hosted on **Supabase PostgreSQL** (Transaction Mode on port 6543, with `prepareThreshold=0` in `application.properties` to prevent prepared statement limits).
- Connection pool is set to 5 (Supabase Free Tier limit) via HikariCP in `application.properties`.

