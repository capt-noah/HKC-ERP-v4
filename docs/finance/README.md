    - Modal layout follows strict ordered sections: **1. Details Form**, **2. Stage Progression Checkboxes**, **3. Document Attachment**.
    - Removed row `onClick` so clicking table rows does not trigger popups. Table Action column uses a light-green Edit button (`bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80`).
    - Edit modal header features `<EditModalHeader>` with 3-dot dropdown menu containing "Delete Service Order", triggering a top-level confirmation modal (`<RecordDeleteModal>` with `z-[200]`).
- **Express Backend API Endpoints:**
  - `GET /api/processing-services` – List processing service orders.
  - `POST /api/processing-services` – Create processing service order.
  - `PATCH /api/processing-services/:id` – Update processing service order details and stage.
  - `DELETE /api/processing-services/:id` – Delete processing service order.
  - `POST /api/processing-services/:id/upload-contract` – Upload service contract PDF.

---

### 💵 Finance Section

#### 1. Finance Overview (`/finance`)
- **Functional Purpose:** Treasury-focused executive dashboard for receivables health, cash position, and near-term billing schedule — driven live from `useFinanceStore()`.
- **Contents (Data & States):**
  - **Treasury KPIs:** Overdue AR Amount, Due This Month (open receivable balance), Cash Position (derived from GL cash account lines).
  - **Invoice Due Dates Timeline:** Horizontally scrollable cards for every non-void invoice sorted by due date, color-coded by status (Overdue, Paid, Open).
- **How it is Showed (Visualizations):**
  - **JetBrains Mono KPI Cards:** Three top-row glass cards for overdue, due-this-month, and cash position figures in ETB.
  - **Timeline Strip & Area Chart:** Invoice due-date pills plus revenue/expense dual-area chart with export button in header.

#### 2. General Ledger (`/finance/ledger`)
- **Functional Purpose:** Core double-entry general ledger engine — journal vouchers, chart of accounts, fiscal period locking, and forex revaluation. All data flows through `useFinanceStore()`.
- **Active Sub-Tabs (4):** *Journal Entries*, *Chart of Accounts*, *Accounting Periods*, *Forex Revaluation*.
- **Contents (Data & States):**
  - **Chart of Accounts (COA):** Standard 5-root hierarchical tree (1000 Assets, 2000 Liabilities, 3000 Equity, 4000 Revenue, 5000/6000 Expenses).
  - **Journal Entries (JE):** Double-entry posting ledger with source types (`Sales Invoice`, `Payment`, `Manual Adjustment`, `Reversal`, `Exchange Revaluation`, etc.), debit/credit lines, party tracking, and auto-balancing validation (`Total Debit == Total Credit`).

#### 3. Banking & Reconciliations (`/finance/banking`)
- **Functional Purpose:** Bank statement line reconciliation and payment allocation against open invoices.
- **Active Sub-Tabs (2):** *Bank Reconciliation*, *Payment & Account Allocation*.

#### 4. Fixed Assets Register (`/finance/assets`)
- **Functional Purpose:** Capital asset lifecycle — registration, straight-line depreciation posting, schedule tracking, edit, delete, and disposal with GL impact.

#### 5. Tax Templates & Rates (`/finance/taxes`)
- **Functional Purpose:** Configure tax rules linked to GL accounts for automatic invoice and expense tax computation.

#### 6. Financial Statements & Reports (`/finance/reports`)
- **Functional Purpose:** Enterprise financial reporting engine generating live account-wise General Ledger reports, trial balance worksheet, and standalone official financial statements (Balance Sheet, Profit & Loss, Cash Flow) directly from GL postings.
- **Active Sub-Tabs (5):** *General Ledger*, *Trial Balance*, *Balance Sheet*, *Profit & Loss*, *Cash Flow*.

#### 7. Invoices Engine (`/finance/invoices`)
- **Functional Purpose:** Full-lifecycle invoicing management for customer Accounts Receivable (AR) Invoices, integrated with tax templates, payment terms, discount structures, draft status handling, and automatic GL journal entry posting via `useFinanceStore()`.

#### 8. Expenses & Recurring Schedules (`/finance/expenses`)

## Store and Context Dependencies
- `useFinanceStore` (`src/lib/financeStore.ts`): The primary state manager for all ledger, journal entry, and invoice data in this section.
