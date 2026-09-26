# StockSense - Modular Inventory Management System

StockSense is a modular, real-time Inventory Management System (IMS) designed to digitize and streamline warehouse stock operations, replace manual ledgers and Excel spreadsheets, and provide centralized tracking for inventory managers and warehouse staff.

> **Stage 1 Implementation Status:**  
> This build contains **Stage 1 (Core Foundations, Catalogue Management, and Multi-Warehouse Settings)**.  
> Authentication, JWT sessions, OTP password reset, and atomic operation execution workflows (Receipts, Deliveries, Internal Transfers, Cycle Count Adjustments) will be activated in Stage 2. This stage is intended for local development use.

---

## 1. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, Zod
- **Database / ORM**: SQLite with Prisma ORM
- **Concurrency & Tooling**: Concurrently, tsx, typescript

---

## 2. Quantity Precision Policy & Fixed-Point Representation

To eliminate IEEE 754 floating-point drift in warehouse calculations (e.g. fractional kg, meters, liters):
- All stock balances, transfer demand lines, and ledger transactions support a **4-decimal place standard precision** (`0.0001`).
- Precision helpers in `backend/src/utils/quantity.ts` (`roundQuantity`, `addQuantities`, `subtractQuantities`, `isValidQuantity`) enforce rounding using epsilon arithmetic.
- Quantities are strictly non-negative for physical stock on hand.

---

## 3. Database Architecture & Models

The Prisma schema defines the complete domain model for the IMS:

1. **`User`**: System actors, roles (`ADMIN`, `INVENTORY_MANAGER`, `WAREHOUSE_STAFF`), auditing.
2. **`Warehouse`**: Facility containers with unique identification codes (e.g., `WH-MAIN`, `WH-PROD`).
3. **`Location`**: Storage zones, input receipt bays, shipping docks, racks, and scrap/quarantine areas within warehouses.
4. **`Category`**: Hierarchical product classification (e.g., Raw Materials, Electronics, Hardware, Finished Goods).
5. **`Product`**: Catalogue items with unique SKU, unit of measure (UOM), category relation, and reorder warning thresholds.
6. **`StockBalance`**: Unique `(productId, locationId)` pairs recording on-hand inventory levels.
7. **`Operation`**: Operation documents supporting 4 types (`RECEIPT`, `DELIVERY`, `INTERNAL_TRANSFER`, `ADJUSTMENT`) across 5 statuses (`DRAFT`, `WAITING`, `READY`, `DONE`, `CANCELED`).
8. **`OperationLine`**: Line-item demands and validated quantities linked to operations and locations.
9. **`StockLedger`**: Immutable chronological audit ledger logging every stock mutation delta (+/&minus;), snapshot balance after, document reference, and actor.

---

## 4. Future Stock Validation Design (Stage 2)

The database schema and architectural contracts are designed to enforce:
- **Atomic Execution**: Balance updates, ledger records, and operation status transitions will occur inside Prisma interactive transactions (`prisma.$transaction`).
- **Concurrency & Double Validation Prevention**: Optimistic locking and operation status checks will reject duplicate or concurrent validation requests on the same document.
- **Insufficient Stock Guard**: Deliveries and transfers will verify that available on-hand balance at the source location is greater than or equal to the requested quantity before committing.
- **Stock Conservation Invariant**: Internal transfers will atomically credit the destination location and debit the source location by identical quantities, guaranteeing total company stock remains unchanged.
- **Signed Delta Logging**: Adjustments will compute and log signed variances from physical cycle counts rather than performing un-audited overwrites.
- **Document Immutability**: Completed (`DONE`) or `CANCELED` operations are locked against edits.

---

## 5. Deployment Notice: Local SQLite Storage Limitation

StockSense uses SQLite via Prisma for zero-config local development.  
**Important Deployment Constraint:**  
SQLite writes to a local file (`dev.db`). Deploying to ephemeral container platforms (e.g. standard Heroku dynos, stateless serverless functions) will cause database changes to be lost on restart unless attached to a **persistent volume / persistent block storage**. For multi-instance production environments, switch the datasource provider in `prisma/schema.prisma` to PostgreSQL or MySQL.

---

## 6. Windows PowerShell Setup & Run Instructions

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)

### Step 1: Clone and Navigate to Directory
```powershell
cd c:\Users\Home\Desktop\stocksense\StockSense
```

### Step 2: Install Dependencies
Run the root script to install all workspace dependencies:
```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
```

### Step 3: Environment Configuration
Create the environment files from examples (if not already present):
```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
```

### Step 4: Run Database Migrations
Initialize the SQLite schema:
```powershell
npm run prisma:migrate
```

### Step 5: Seed Initial Development Data
Execute the seed script to populate default users, warehouses, storage locations, categories, and products with 0 opening stock:
```powershell
npm run seed
```
*(Note: Database is seeded only when running this command; the server will never reset or reseed on startup).*

### Step 6: Start Development Servers
Run both backend and frontend concurrently:
```powershell
npm run dev
```

- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Backend Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Frontend App**: [http://localhost:5173](http://localhost:5173)

---

## 7. Individual Service Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Run backend and frontend concurrently |
| `npm run dev:backend` | Run backend with hot reloading (`tsx watch`) |
| `npm run dev:frontend` | Run frontend with Vite dev server |
| `npm run build` | Build backend and frontend production bundles |
| `npm run typecheck` | Run TypeScript type checks across backend & frontend |
| `npm run seed` | Seed initial development database |
| `npm run prisma:studio` | Open Prisma Studio GUI for database inspection |

---

## 8. Verification & Acceptance Testing

1. **Health Check**:
   ```powershell
   Invoke-RestMethod -Uri http://localhost:5000/api/health
   ```
   *Expected Response:* `status: ok, app: StockSense, stage: Stage 1`.
2. **Product Management**:
   - Navigate to `/` &rarr; click **New Product**.
   - Create a product (e.g. `SKU: TEST-001`, `Name: Copper Cable`, `Category: Raw Materials`, `UOM: m`, `Threshold: 10`).
   - Notice zero initial stock in location breakdown modal.
   - Attempt to create duplicate SKU `TEST-001` &rarr; server returns 409 Conflict with descriptive error.
   - Edit product name or threshold &rarr; verify persistence across backend restart.
   - Search by name or SKU, filter by category.
3. **Warehouse & Location Management**:
   - Go to **Warehouse Settings** &rarr; **Add Warehouse** (e.g. `WH-NORTH`, `North Distribution Center`).
   - Go to **Locations** tab &rarr; **Add Location** (e.g. `WH-NORTH/BAY-1`).
   - Edit warehouse / location and verify unique code constraints.
