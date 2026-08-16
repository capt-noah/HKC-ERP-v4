### 🛍️ Sales Section

#### 1. Sales Dashboard (`/sales`)
- **Functional Purpose:** Offers top-line executive sales performance tracking, revenue growth charts, sales order pipeline metrics, and commercial contract execution. Data sourced from `useErpStore()`.
- **Contents (Data & States):**
  - **Commercial Sales KPIs:** Total Sales Revenue, Purchase Capital Commitments, Active Sales Orders, and Revenue Growth Rates.
  - **Revenue & Capital Trajectory:** Historical monthly sales revenue performance compared against procurement capital outflow.
  - **Pipeline Overview:** Active sales quotes, confirmed orders, and fulfillment conversions.
- **How it is Showed (Visualizations):**
  - **Interactive Area Charts:** Revenue vs. Purchase Capital curves rendered with Recharts API.
  - **Executive Metric Cards:** High-contrast glass cards with trend icons and quick action triggers.

#### 2. Purchase Orders (`/sales/purchase-orders`)
- **Functional Purpose:** Tracks incoming supply chain procurement orders, complete PO lifecycle (`DRAFT` → `IN TRANSIT` → `RECEIVED`), supplier delivery tracking, and automated GL asset accruals (`ACC-1010` Stock in Hand / `ACC-2000` Accounts Payable) via `useErpStore()`.
- **Contents (Data & States):**
  - **Procurement KPIs:** Draft POs, In Transit POs, Delayed POs.
  - **Purchase Order List:** Supplier partners, transit state (`DRAFT`, `IN TRANSIT`, `RECEIVED`), document dates, itemized procurement lines, total capital allocations, and billing status.
- **How it is Showed (Visualizations):**
  - **Split-Panel Workspace & Table View:** Journal-entry aligned sortable, resizable data table mode on the left with search and status filters, and a detailed document inspector view on the right with print capabilities.

#### 3. Sales Orders (`/sales/sales-orders`)
- **Functional Purpose:** Manages sales contracts, customer commitments, fulfillment, and invoicing. Enforces strict architectural separation of duties: Sales Orders represent sales contracts (0 stock deducted), while physical stock dispatch is exclusively executed on Sales Issued (`/sales/issued`). Unneeded Quotations and Delivery Notes tabs have been removed to keep the workspace 100% focused on sales contract execution.
- **Document Requirements & HKC Docs Sync:** Sales Orders enforce exactly two mandatory trade document attachments: **Trade License** and **Payment Advice** (the Business Permit requirement was removed to eliminate redundancy). The **Trade License** is inherited from the customer registry profile or uploaded directly, syncing back to the **Partner Registry** customer profile for future orders. The **Payment Advice** is strictly order-specific (for one transaction only) and is persisted under `shipment_documents` in the Supabase DB rather than stored on the default customer profile. A unified document resolution engine ensures consistent hydration across **Sales Orders**, **HKC Docs**, and the **Partner Registry**.
- **Table & Modal Action Standards:** Inline X/delete buttons and eye buttons are removed from table rows. Edit modal headers use `<EditModalHeader>` with a 3-dot (`···`) dropdown containing "Delete Record". Delete confirmation is handled by `<RecordDeleteModal>` configured at `z-[200]` to overlay open edit modals cleanly.

#### 4. Sales Issued & Warehouse Stock Dispatch (`/sales/issued`)
- **Functional Purpose:** Physical warehouse dispatch document module. Handles stock issue creation, consolidated multi-sales-order contract pulling, physical inventory deduction from product batches, COGS journal posting, and delivery note generation.
- **Key Architectural Rules & Engine Behaviors:**
  - **Single-Row Toolbar Alignment:** The table header, search input, status filters, and `+ Add Sales Issue` primary action button are positioned cleanly on a single row inside `<FinanceTableToolbar />`. Repetitive filters ("All Items", start date, end date, "Newest First") have been eliminated.
  - **1-Click Multi-Sales-Order Pull:** Interactive picker card displaying all pending Sales Orders (`deliveryStatus !== "Fully Delivered"`). Selecting multiple orders automatically aggregates customer info, warehouse location, contract line items, and quantities into the Sales Issue form state. Toggling an order off cleanly resets autofill state.
  - **Streamlined Item Grid:** Displays clean 6-column item selector, quantity, unit price, and total amount. Redundant item names, packaging units, available quantities, MFG dates, and expiry dates are omitted from the form grid. Batch dropdown displays clean batch numbers (`b.batch_no`).
  - **Exclusive Inventory Stock Deduction Rule:**
    - **Draft Sales Issue:** 0 stock deducted. Draft records can be edited (`PATCH /api/sales-issues/:id`), deleted, or cancelled at any time without affecting inventory balances.
    - **Posting Sales Issue (`POST /api/sales-issues/:id/post`):** The exclusive trigger that decrements physical warehouse stock (`quantity`), warehouse breakdown (`stockBreakdown`), and batch balances (`batches`) in `inventory_products` in Supabase DB, updates issue status to `Posted`, and posts COGS General Ledger journal entries.
    - Line items stored in `sales_issue_items` table with foreign key `sales_issue_id` (`id`, `sales_issue_id`, `item_id`, `item_name`, `batch_id`, `batch_no`, `quantity`, `unit_price`, `amount`).
  - **Stock Register Table Design System:** Uses `<GlassCard className="p-0 border border-white/65 shadow-md">`, `<FinanceTableToolbar />` with the `Add Sales Issue` primary action button positioned in the toolbar header, `useResizableTable`, and `<ResizableTh />` column resizers matching the core Stock Register (`/inventory/stock`).
- **Express Backend API Endpoints:**
  - `GET /api/sales-issues` – List sales issues with relational items join.
  - `POST /api/sales-issues` – Create draft sales issue in relational DB.
  - `GET /api/sales-issues/:id` – Fetch single sales issue header and line items.
  - `PATCH /api/sales-issues/:id` & `PUT /api/sales-issues/:id` – Update draft sales issue header and line items.
  - `DELETE /api/sales-issues/:id` – Delete draft sales issue and associated items.
  - `POST /api/sales-issues/:id/post` – Post sales issue and deduct physical stock from `inventory_products`.
  - `POST /api/sales-issues/:id/cancel` – Update status to Cancelled.

#### 5. Shipment Documents & Hard-Block Action Gates Engine (`src/lib/shipmentDocumentEngine.ts`)
- **Functional Purpose:** Shipment-level trade & compliance document checklist engine. Evaluates mandatory import/export paperwork (Purchase Orders require 5 documents; Sales Orders require 2: Trade License and Payment Advice; Processing Services require 1: Processing Contract).
- **Key Features & Behavior:**
  - **Shared Evaluation Engine:** Compares attached files against active compliance rules (`shipment_document_rules`) dynamically conditioned by supplier origin country, destination region, and record type.
  - **Piecemeal File Attachments (`<ShipmentDocChecklist />`):** Dedicated **Import Docs** tab on Purchase Orders and **Shipping Docs** tab on Sales Orders. Paperwork can be attached piecemeal as it arrives, even while records are in `DRAFT` status.
  - **Glass Status Badges:** Displays `Complete` (Green) or `Incomplete (N Missing)` (Amber) directly on Purchase Order and Sales Order list cards / rows.
  - **Hard-Block Action Gates:**
    - Intercepts **Mark as Received** on Purchase Orders. Blocked if required import documents are missing, triggering an alert naming the missing items.
    - Intercepts **Mark as Shipped** on Sales Orders. Blocked if required shipping documents are missing.
- **Backend Persistence API:**
  - `GET /api/shipment-documents/rules` – Fetch active compliance rules.
  - `GET /api/shipment-documents` – List attached documents for a record.
  - `POST /api/shipment-documents` – Upload and attach a shipment document.

## Store and Context Dependencies
The sales operations are managed primarily via:
- `useErpStore` (`src/lib/erpStore.ts`): Provides data arrays for Quotations, Purchase Orders, and Sales Orders.
- `useFinanceStore` (`src/lib/financeStore.ts`): Automatically triggered to generate AR Invoices when Sales are posted.
- API endpoints prefixed with `API_BASE` for robust deployment operation.
