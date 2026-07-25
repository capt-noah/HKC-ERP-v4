# HKC Trading - System, Modules & Design Documentation

Welcome to the comprehensive system, modules, and design documentation for **HKC Trading**. This document serves as the single source of truth for the styling, architecture, typography, layouts, and page-by-page component patterns used across the application.

---

## 🎨 Design Philosophy & Theme System

HKC Trading is built around a distinct, high-end **Glassmorphism** visual language inspired by iOS 26 style ergonomics. It values generous negative space, sophisticated typography pairing, subtle background organic motion, and responsive layout dynamics over standard block-style dashboards.

### 1. Typography Selection
- **Primary / Display UI Font:** `Outfit` (sans-serif) paired with `Inter` to provide a premium, modern, tech-forward aesthetic.
- **Data / Code Font:** `JetBrains Mono` for technical data, code snippets, numbers, and system readouts.
- **Configuration (Tailwind CSS v4 inline config inside `src/index.css`):**
  ```css
  --font-sans: "Outfit", "Inter", ui-sans-serif, system-ui, sans-serif;
  ```

### 2. Color Space (OKLCH)
We utilize modern high-gamut `oklch()` color definitions to ensure smooth gradient rendering and outstanding contrast in both light and dark modes. The brand color is an organic forest green (hue 145).

| Variable Name | Light Mode (OKLCH) | Dark Mode (OKLCH) |
| :--- | :--- | :--- |
| `--background` | `oklch(0.99 0 0)` | `oklch(0.1 0 0)` |
| `--foreground` | `oklch(0.1 0 0)` | `oklch(0.99 0 0)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.14 0 0)` |
| `--primary` | `oklch(0.48 0.16 145)` (Organic Forest Green) | `oklch(0.68 0.16 145)` (Vibrant Mint Green) |
| `--secondary` | `oklch(0.96 0 0)` | `oklch(0.2 0 0)` |
| `--accent` | `oklch(0.96 0.02 145)` (Soft Tint Green) | `oklch(0.22 0.06 145)` (Deep Muted Green) |
| `--destructive` | `oklch(0.15 0 0)` | `oklch(0.99 0 0)` |
| `--border` | `oklch(0.9 0 0)` | `oklch(1 0 0 / 10%)` |

---

## 💎 Custom Classes & Special Visual Styles

### 1. iOS 26 Glass Card (`.glass-card`)
A premium container styled with saturation filters, fine-border borders, and translucent background overlays.
- **Light Mode:**
  - Background: `rgba(255, 255, 255, 0.35)`
  - Backdrop Filter: `blur(40px) saturate(240%)`
  - Border: `1px solid rgba(255, 255, 255, 0.65)`
  - Shadow: Subtle bottom shadow + top-inset white highlight for bevel feeling.
- **Dark Mode (`.dark .glass-card`):**
  - Background: `rgba(20, 20, 22, 0.38)`
  - Backdrop Filter: `blur(40px) saturate(240%)`
  - Border: `1px solid rgba(255, 255, 255, 0.06)`
  - Shadow: Beveled inset highlight with safe dark occlusion shadow.

### 2. Premium Organic Page Gradients (`.page-gradient` & `.page-gradient-dark`)
A layered background that establishes a distinct brand atmosphere.
- **Light Theme Gradient:** Combines a clean white/grey canvas with subtle organic green accents:
  - Background radial gradients feature subtle green aura points (`rgba(34, 197, 94, 0.08)` and `rgba(34, 197, 94, 0.04)`) layered over a clean 135deg linear gradient sliding from `#ffffff` through `#f4f4f5` to `#e4e4e7`.
  - **Dotted Grid Overlay:** A high-end radial-pattern dot grid layout (`opacity: 0.15`, space `24px`) provides a clean structural blueprint aesthetic.
  - **Animated Line Circle:** A dashed rotating cosmic vector line circle (`animation: slow-spin 120s linear infinite`, size `500px x 500px`) sits off-screen at the top-right.
- **Dark Theme Gradient:** Swaps to a rich dark charcoal canvas (`#09090b` through `#18181b`) featuring delicate glowing organic green accents (`rgba(34, 197, 94, 0.06)` and `rgba(34, 197, 94, 0.02)`) with a white dot blueprint overlay (`opacity: 0.08`).

---

## 🗺️ Application Architecture & Routes

The system uses a full-screen layout split into five main operational domains:

```
/ (Root Redirect) ──► /sales
                      ├── /sales (Sales Revenue Analytics & Conversion Pipeline)
                      ├── /sales/purchase-orders (Purchase Orders & Supplier Procurement)
                      └── /sales/sales-orders (Sales Orders & Order Fulfillment)

/inventory ─────────► /inventory (Inventory & Storage Operations Dashboard)
                      ├── /inventory/stock (Stock & Products Registry, Store Transfers)
                      └── /inventory/reports (Inventory Movement & Valuation Analytics)

/finance ───────────► /finance (Overview Charts & Financial Ratios)
                      ├── /finance/ledger (General Ledger, Journal Entries, COA, Periods, Forex Revaluation)
                      ├── /finance/invoices (Invoicing Engine)
                      ├── /finance/expenses (Expense Ledger, Recurring Schedules & Fleet)
                      ├── /finance/banking (Bank Accounts & Reconciliations)
                      ├── /finance/assets (Fixed Assets Register & Depreciation Schedule)
                      ├── /finance/taxes (Tax Templates & Rates)
                      └── /finance/reports (Financial Statements, Trial Balance & AR/AP Aging)

/hr ────────────────► /hr (Overview & Team KPIs)
                      ├── /hr/employees (Staff Roster)
                      ├── /hr/payroll (Disbursement Dashboard)
                      ├── /hr/attendance-leave (Attendance & Leave Matrix)
                      ├── /hr/recruitment (Recruitment & Talent Pipeline)
                      └── /hr/onboarding-separation (Onboarding & Separation Workflows)

/admin ─────────────► /admin (Module Control Center)
                      ├── /admin/users (Access Controls)
                      └── /admin/settings (System Configurations)
```

Navigation labels and child routes are defined in `src/lib/nav-config.ts`. All routed pages are registered in `src/App.tsx`.

---

## 🏗️ Technical Architecture & Data Layer

**Stack:** React 19, TypeScript, Vite, React Router 7, Tailwind CSS v4, Framer Motion, Recharts, shadcn/ui primitives.

**Current persistence model:** Frontend-only. Business logic and state live in TypeScript stores seeded from JSON files in `/data/`. A backend API is planned after all module logic is finalized.

| Store / Context | Path | Scope |
| :--- | :--- | :--- |
| `useFinanceStore()` | `src/lib/financeStore.ts` | Finance module — COA, journal entries, invoices, payments, expenses, fixed assets, tax rules, accounting periods, forex revaluation |
| `useErpStore()` | `src/lib/erpStore.ts` | Sales & Inventory module — products, multi-warehouse tracking, stock movements audit log, inter-warehouse transfers, sales orders, purchase orders with GL accruals, customers, suppliers |
| `useFeedback()` | `src/context/FeedbackContext.tsx` | Global toasts and confirmation dialogs (wraps the app in `main.tsx`) |
| Static HR seed | `src/lib/hrData.ts` | HR dashboard and employee roster mock data |

**Design intent:** Module workflows and GL posting rules are modeled after ERPNext concepts (double-entry vouchers, COA hierarchy, AR/AP aging, etc.) but implemented as original code — not a fork or copy of ERPNext — so the system can be licensed and sold as a standalone product.

**Removed legacy files:** `AssetsAndTax.tsx` (superseded by `Assets.tsx` + `Taxes.tsx`), `SharedNav.tsx`, `Toast.tsx`, and `PlaceholderPage.tsx`.

---

## 🧭 Page-by-Page Deep Dive & Visualizations

This section details the functional purpose, database/state contents, and specific frontend visualizers utilized on every page of the application.

---

### 🛍️ Sales Section

#### 1. Sales Dashboard (`/sales`)
- **Functional Purpose:** Offers top-line executive sales performance tracking, revenue growth charts, sales order pipeline metrics, and commercial contract execution. Features a clean header title and concise description ("Overview of sales pipelines, contracts, stock dispatch, and credit.") without redundant engine pills. Data sourced from `useErpStore()`.
- **Contents (Data & States):**
  - **Commercial Sales KPIs:** Total Sales Revenue, Purchase Capital Commitments, Active Sales Orders, and Revenue Growth Rates.
  - **Revenue & Capital Trajectory:** Historical monthly sales revenue performance compared against procurement capital outflow.
  - **Pipeline Overview:** Active sales quotes, confirmed orders, and fulfillment conversions.
- **How it is Showed (Visualizations):**
  - **Interactive Area Charts:** Revenue vs. Purchase Capital curves rendered with Recharts API.
  - **Executive Metric Cards:** High-contrast glass cards with trend icons and quick action triggers.

#### 2. Purchase Orders (`/sales/purchase-orders`)
- **Functional Purpose:** Tracks incoming supply chain procurement orders, complete PO lifecycle (`DRAFT` → `IN TRANSIT` → `RECEIVED`), supplier delivery tracking, and automated GL asset accruals (`ACC-1300` Stock in Hand / `ACC-2100` Accounts Payable) via `useErpStore()`.
- **Contents (Data & States):**
  - **Procurement KPIs:** Draft POs, In Transit POs, Delayed POs.
  - **Purchase Order List:** Supplier partners, transit state (`DRAFT`, `IN TRANSIT`, `RECEIVED`), document dates, itemized procurement lines, total capital allocations, and billing status.
- **How it is Showed (Visualizations):**
  - **Split-Panel Workspace & Table View:** Journal-entry aligned sortable, resizable data table mode on the left with search and status filters, and a detailed document inspector view on the right with print capabilities, "Dispatch Order (Mark In Transit)", "Receive Goods & Update Inventory Stock" (auto-posts GL journal entries), and "Generate AP Vendor Invoice" buttons.

#### 3. Sales Orders (`/sales/sales-orders`)
- **Functional Purpose:** Manages the customer conversion pipeline from initial quotation to picking, packing, and shipment with clean tab descriptions for Sales Orders, Pro-Forma Quotations, and Delivery Notes. Fully integrated with `useErpStore()`.
- **Contents (Data & States):**
  - **Order Pipeline Stages:** Quotes, Confirmed, Picking, Shipped.
  - **Client Records:** Order reference codes, client details, total amounts, assignee avatars, picking progression percentages, and document attachments.
- **How it is Showed (Visualizations):**
  - **Interactive Kanban & Resizable Table Views:** Four-stage pipeline Kanban board with spring animations alongside sortable, resizable data table mode matching the clean, high-contrast table design of Journal Entries.

---

### 📦 Inventory Section

#### 1. Inventory Dashboard (`/inventory`)
- **Functional Purpose:** Offers real-time overview telemetry of warehouse performance, product allocations, batch QA approvals, and critical stock events.
- **Contents (Data & States):**
  - **Inventory KPIs:** Total SKUs (12,482), Low-Stock alerts (48), Near Expiry alerts (12), Open Stock Movements.
  - **Stock Allocation:** Category percentage breakdowns (*Medical Supplies*, *Food & Nutrition*, *General Goods*).
  - **Storage Activity & Role Workspaces:** Overview, Goods Reception, and QA Technical Inspection modes.
- **How it is Showed (Visualizations):**
  - **Storage Activity Matrix:** Stair-step dot matrix grid depicting warehouse slot utilization in amber and dark gray.
  - **Translucent Progress Trackers:** Category allocation loading bars and proximity alert badges.
  - **Role Mode Selector:** Interactive toggle between Stock Overview, Goods Reception, and QA Technical Inspection.

#### 2. Stock Registry (`/inventory/stock`)
- **Functional Purpose:** Catalog of active inventory products with SKU tracking, reorder levels, valuation rates, multi-warehouse distribution breakdowns, regulatory compliance documentation (Certificates of Analysis), inter-warehouse Store Transfers with GL voucher generation, and real-time automated Stock Movement Audit Logs.
- **Contents (Data & States):**
  - **Active Products:** Product codes, SKUs, categories, warehouse allocations, reorder levels, valuation rates, physical stock, active batch tags, and expiry horizons.
  - **Store Transfers:** Material Transfer Note tracking ledger with issue/receipt workflows that automatically log stock movements and post double-entry GL journal vouchers (`ACC-1300`).
  - **Stock Movements Audit Log:** Automated real-time log tracking receipts, transfers, sales dispatches, and inventory audit adjustments with linked journal entry IDs.
  - **Regulatory Docs:** Official CoAs and laboratory compliance licenses.
- **How it is Showed (Visualizations):**
  - **Registry Toggle Tabs:** Active Products, Store Transfers, Stock Movements Log, and Regulatory Docs.
  - **Interactive Quick Peek & Stock Adjuster:** Slide-in panel to adjust warehouse quantities, creating an automated stock movement audit log entry and double-entry accounting GL voucher.
  - **MTN Document & Stamp:** Letterhead layout with digital signature blocks and green circular company stamp.

#### 3. Inventory Reports (`/inventory/reports`)
- **Functional Purpose:** Provides inventory valuation reports, turnover velocity analysis, category movement trends, and reorder point alerts.
- **Contents (Data & States):** Total stock valuation (ETB), turnover ratios, movement logs, and stock aging analysis.
- **How it is Showed (Visualizations):** Exportable analytical charts, category pie charts, and tabular movement summaries.

---

### 💵 Finance Section

#### 1. Finance Overview (`/finance`)
- **Functional Purpose:** Treasury-focused executive dashboard for receivables health, cash position, and near-term billing schedule — driven live from `useFinanceStore()`.
- **Contents (Data & States):**
  - **Treasury KPIs:** Overdue AR Amount, Due This Month (open receivable balance), Cash Position (derived from GL cash account lines).
  - **Invoice Due Dates Timeline:** Horizontally scrollable cards for every non-void invoice sorted by due date, color-coded by status (Overdue, Paid, Open).
  - **Unpaid Invoices List:** Sidebar of outstanding customer balances with quick link to `/finance/invoices`.
  - **Cash Flow Trends Chart:** Monthly Revenue vs Expenses area chart (Recharts); trend series is static demo data, KPI figures are store-derived.
- **How it is Showed (Visualizations):**
  - **JetBrains Mono KPI Cards:** Three top-row glass cards for overdue, due-this-month, and cash position figures in ETB.
  - **Timeline Strip & Area Chart:** Invoice due-date pills plus revenue/expense dual-area chart with export button in header.
  - **SubPageNav:** Finance submodule pills aligned top-right per design guideline #6.

#### 2. General Ledger (`/finance/ledger`)
- **Functional Purpose:** Core double-entry general ledger engine — journal vouchers, chart of accounts, fiscal period locking, and forex revaluation. All data flows through `useFinanceStore()`.
- **Active Sub-Tabs (4):** *Journal Entries*, *Chart of Accounts*, *Accounting Periods*, *Forex Revaluation*.
- **Contents (Data & States):**
  - **Chart of Accounts (COA):** Standard 5-root hierarchical tree (1000 Assets, 2000 Liabilities, 3000 Equity, 4000 Revenue, 5000/6000 Expenses) with parent-child account nodes, account types (Asset, Liability, Equity, Revenue, Expense), and group vs. ledger flags.
  - **Journal Entries (JE):** Double-entry posting ledger with source types (`Sales Invoice`, `Payment`, `Manual Adjustment`, `Reversal`, `Exchange Revaluation`, etc.), debit/credit lines, party tracking, and auto-balancing validation (`Total Debit == Total Credit`).
  - **Accounting Periods:** Period open/close status with resizable table UI; closed periods block new postings.
  - **Forex Revaluation:** Multi-currency rate revaluation runs posting unrealized gains/losses to the foreign exchange GL account.
- **How it is Showed (Visualizations):**
  - **Hierarchical COA Tree View:** Collapsible account tree with color-coded root badges, running balances, and account creation/edit modals.
  - **Journal Entry Table & Self-Balancing Modal:** Monospace debit/credit columns, live imbalance alerts, multi-line entry composer, and `FinanceTableToolbar` integration.
  - **ResizableTable & FinanceTableToolbar:** Accounting periods grid uses the shared `ResizableTable` hook for column resize/sort and `FinanceTableToolbar` for integrated search, status filtering, and action buttons.

#### 3. Banking & Reconciliations (`/finance/banking`)
- **Functional Purpose:** Bank statement line reconciliation and payment allocation against open invoices.
- **Active Sub-Tabs (2):** *Bank Reconciliation*, *Payment & Account Allocation*.
- **Contents (Data & States):**
  - **Bank Statement Lines:** Date, bank reference, payee, deposit/withdrawal type, amount, cleared status, and cleared date. Lines can be marked cleared individually or imported via simulated statement upload.
  - **Payment Allocation:** Unallocated customer receipts matched against open AR invoices from `useFinanceStore()` with one-click allocate actions.
- **How it is Showed (Visualizations):**
  - **Resizable Statement Table:** Sortable, column-resizable bank line grid with clear/match actions and status chips.
  - **Split Allocation Cards:** Side-by-side unallocated receipts and open invoice list with allocate buttons and toast feedback.

#### 4. Fixed Assets Register (`/finance/assets`)
- **Functional Purpose:** Capital asset lifecycle — registration, straight-line depreciation posting, schedule tracking, edit, delete, and disposal with GL impact.
- **Active Sub-Tabs (2):** *Asset Registry*, *Depreciation Schedule*.
- **Contents (Data & States):**
  - **Fixed Assets Registry:** Categories (Vehicles, Machinery, IT Hardware, Buildings, Office Equipment), acquisition cost, salvage value, useful life, accumulated depreciation, net book value, location, serial number, linked GL accounts (asset, accumulated depreciation, depreciation expense), and status (`Active`, `Draft`, `Fully Depreciated`, `Disposed`).
  - **Depreciation Schedule:** Per-asset period entries with pending vs. posted status; one-click GL posting for pending depreciation runs.
  - **KPI Banner:** Total Gross Value, Net Book Value, Active Assets count, Pending Depreciations count.
- **How it is Showed (Visualizations):**
  - **Expandable Asset Cards:** Per-asset progress bars, NBV readouts, edit/dispose/delete actions, and depreciation posting controls.
  - **Register Asset Modal:** Full acquisition form with GL account selectors and depreciation start date.

#### 5. Tax Templates & Rates (`/finance/taxes`)
- **Functional Purpose:** Configure tax rules linked to GL accounts for automatic invoice and expense tax computation.
- **Contents (Data & States):**
  - **Tax Rules:** Name, rate %, type (`VAT/GST`, `Withholding Tax (TDS)`, `Import Duty`), GL account code, inclusive/exclusive flag, and description. Full CRUD via `useFinanceStore()`.
  - **KPI Banner:** Count of active rules per tax type (VAT, WHT, Import Duty).
- **How it is Showed (Visualizations):**
  - **Resizable Tax Rules Table:** Sortable columns with type badge pills, inclusive/exclusive chips, and edit/delete row actions.
  - **Add / Edit Tax Rule Modals:** Form dialogs for rate, type, account mapping, and inclusive toggle.

#### 6. Financial Statements & Reports (`/finance/reports`)
- **Functional Purpose:** Enterprise financial reporting engine generating live account-wise General Ledger reports, AR/AP aging subledgers, trial balance worksheet, and standalone official financial statements (Balance Sheet, Profit & Loss, Cash Flow) directly from GL postings.
- **Active Sub-Tabs (6):** *General Ledger*, *AR / AP Aging Analysis*, *Trial Balance*, *Balance Sheet*, *Profit & Loss*, *Cash Flow*.
- **Contents (Data & States):**
  - **Account-Wise General Ledger (GL):** ERPNext-standard transaction ledger report with multi-criteria filtering (Account Code, Voucher Type, Party Name, Date Range, Keyword Search), against-account tracking, opening balance calculations, and cumulative line-by-line running balances.
  - **Trial Balance Worksheet:** Comprehensive 5-category trial balance statement verifying fundamental accounting equality (`Total Debits == Total Credits`). Features separate account code and account name columns, category filtering across all 5 account types (*Assets*, *Liabilities*, *Equity*, *Revenue*, *Expenses*), balance status filters (*All*, *Non-Zero*, *Debit Only*, *Credit Only*), and keyword search.
  - **Balance Sheet Tab:** Live **Balance Sheet** featuring a clean 3-card top summary strip (**Assets**, **Liabilities**, **Equity**), dedicated account category subledgers, and a clean **Balance Sheet Summary Banner** (`Assets = Liabilities + Equity`).
  - **Profit & Loss Tab:** ERPNext-aligned **Income Statement (Profit & Loss)** featuring interactive trend graphs (Monthly Revenue vs COGS vs Expenses BarChart and Operating Expense Donut Allocation) alongside structured account group ledgers (4000 Revenue, 5000 COGS, Gross Profit Margin %, 6000 Operating Expenses, and Net Operating Income EBIT).
  - **Cash Flow Tab:** ERPNext-aligned **Statement of Cash Flows (Direct Method)** featuring interactive liquidity graphs (Monthly Cash Activity BarChart and Cumulative Cash Reserve Growth AreaChart) alongside operating, investing, and financing cash movement tables.
  - **Accounts Receivable & Payable Aging:** Detailed customer and supplier sub-ledgers with aging buckets (Current, 1-30 days, 31-60 days, 61-90 days, 90+ days) and dunning notice dispatch tracking.
- **How it is Showed (Visualizations):**
  - **Trial Balance Table & Resizing Engine:** Full-featured interactive table with draggable column resizing handles, popover column sorting (ascending/descending per column), category badge pills, balance status chips, search input, and real-time grand totals footer.
  - **General Ledger Account Report Tab:** Tabular transaction view displaying Posting Date, Account Code & Name, Voucher Type & Reference, Party / Remarks, Contra Against-Account, Debit, Credit, and Running Balance with live KPI metric strip.
  - **Separated Balance Sheet Layout:** Three distinct cards separating Assets (1000 Series), Liabilities (2000 Series), and Shareholder Equity (3000 Series), with real-time balance totals and an executive glassmorphism Balance Sheet status check banner (`Assets = Liabilities + Equity`).
  - **ERPNext Analytics Graphs:** Interactive Recharts visualizers including Revenue vs Cost bar charts, expense pie distributions, cash activity bars, and cumulative cash reserve gradient area charts.
  - **Interactive Report Views:** Standalone top-level tabs for Balance Sheet, Profit & Loss, and Cash Flow with expandable account subtotals, net profit calculations, and one-click PDF/CSV export triggers.
  - **Aging Heatmap & FinanceTableToolbar Integration:** Color-coded aging buckets highlighting overdue receivables, live search bar via `FinanceTableToolbar`, and one-click dunning notice generation.

#### 7. Invoices Engine (`/finance/invoices`)
- **Functional Purpose:** Full-lifecycle invoicing management for customer Accounts Receivable (AR) Invoices, integrated with tax templates, payment terms, discount structures, draft status handling, and automatic GL journal entry posting via `useFinanceStore()`.
- **Contents (Data & States):**
  - **AR Executive Summary KPIs:** Total AR Exposure (uncollected receivables balance), Total Collections Received (cash/bank), Overdue AR Amount (past due date), and Active Invoices Count.
  - **Invoice Directory:** Customer invoices with identifier codes (`INV-2026-XXX`), party details, issue dates, due dates, payment terms, tax amounts, discount amounts, and status (`Draft`, `Sent`, `Partially Paid`, `Paid`, `Overdue`, `Void`, `Cancelled`).
  - **Line Item Catalog:** Itemized product entries, quantities, unit prices, line item totals, and automatically calculated tax/discount breakdowns.
- **How it is Showed (Visualizations):**
  - **Invoice Document & Slide-In Audit Panel:** Formatted letterhead layout displaying customer details, payment terms, itemized line items, subtotal, discount, tax, balance due, and a dedicated **GL Posting Impact Audit** breakdown (Debit ACC-1200 AR, Credit ACC-4000 Sales Revenue, Credit ACC-2210 Tax Liability).
  - **Void / Cancel Invoice Action:** Allows cancelling active invoices, automatically posting an opposing GL reversal journal entry (`Debit ACC-4000`, `Debit ACC-2210`, `Credit ACC-1200`) and updating invoice status to `Cancelled`.
  - **Interactive Creation Drawer:** Full-height slide-over drawer with line-item management, tax template selector, payment terms, discount input, real-time calculation readout, and dual submission modes (**Save Draft** vs. **Issue & Post Invoice**).
  - **Status Badge Filters & Quick Payments:** Color-coded status pills with single-click payment recording modals that immediately update uncollected balances and post bank receipt GL entries.

#### 8. Expenses & Recurring Schedules (`/finance/expenses`)
- **Functional Purpose:** Handles employee expense claims with cost center allocation, operational vendor expenses, recurring expense schedules with status toggling, and corporate vehicle fleet maintenance with automated GL posting via `useFinanceStore()`.
- **Active Sub-Tabs (3):** *One-off Expenses*, *Recurring Schedules*, *Fleet Vehicles*.
- **Contents (Data & States):**
  - **Expenses Executive Summary KPIs:** Approved Expenses YTD, Pending Claims Audit Count & Value, Monthly Recurring Commitment, and Total Fleet Maintenance Expense.
  - **Expense Claim Registry:** Expense ID (`EXP-2026-XXX`), merchant/vendor, claimant employee, cost center (`CC-100 Corporate HQ`, `CC-200 Logistics & Warehouse`, `CC-300 Sales & Field Ops`), expense GL account head (`ACC-5100 Rent`, `ACC-5200 SaaS/Utilities`, `ACC-5300 R&D`, `ACC-5400 Vehicle Fleet`, `ACC-5010 Payroll`), tax reclaim portion (15%), voucher/receipt reference, amount, and approval status (`PENDING`, `APPROVED`, `REJECTED`).
  - **Recurring Expense Schedules:** Automated recurring payment rules (Monthly, Quarterly, Annual) with cost center allocation, linked contract references, next due dates, auto-generation simulation, and Pause/Activate status toggling.
  - **Fleet Vehicle Registry & Maintenance Logs:** Corporate vehicles (trucks, vans) assigned to warehouses, driver details, repair logs, and automated GL entry posting to `ACC-5400` Vehicle Fleet Repairs upon logging maintenance.
- **How it is Showed (Visualizations):**
  - **Right-Aligned Tab Control Options:** Active tab action buttons (Log Claim, Add Schedule, Register Vehicle) are placed on the right side of the tab switcher bar for clear separation.
  - **Active CRUD Modals:** Edit & Delete forms available for one-off expenses and recurring schedules, alongside vehicle deletion options on each fleet card.
  - **Approval Pipeline & GL Auto-Posting:** One-click approval/rejection action buttons. Approving a claim automatically posts a double-entry GL journal debiting the designated Expense GL Account & Tax Reclaim Account and crediting Cash/Bank (`ACC-1000`).
  - **Recurring Schedule Builder & Status Control:** Modal interface to define frequency, amount, cost center, next due date, and vendor references, alongside quick Pause/Activate toggle buttons on table rows.
  - **Fleet Maintenance Log Modal:** Allows logging repairs per vehicle registration number with immediate GL entry creation and service history logging.
  - **Vehicle Registration Drawer:** Modal to register new vehicles directly from the fleet dashboard.

#### 9. Cost Center Budgeting *(planned — not yet routed)*
- **Status:** UI prototype exists in legacy `AssetsAndTax.tsx` and unreachable code in `Ledger.tsx`, but there is no active route or store integration yet.
- **Intended Scope:** Departmental cost center budgets (Operations, Sales, R&D, Executive) with YTD actual spend, variance percentages, and policy enforcement (`Warn` vs. `Stop`) blocking or warning on GL postings over budget.

---

### 👥 Human Resources Section

#### 1. HR Dashboard (`/hr`)
- **Functional Purpose:** Visualizes personnel metrics, interviews, weekly calendar schedules, and staff rosters.
- **Contents (Data & States):**
  - **HR KPIs:** Employee counts, active hirings, active leaves, interview pipelines, and placement progress numbers.
  - **Schedule Agenda:** Daily events, team coordinates, and interview calendar schedules.
- **How it is Showed (Visualizations):**
  - **Asymmetric Grid Layout:** Features a calendar grid on the left containing clickable day slots, a middle column visualizing overall attendance, and a staff search bar list on the right.

#### 2. Employees Staff Roster (`/hr/employees`)
- **Functional Purpose:** Houses the official personnel directory, staff department assignments, and salary records.
- **Contents (Data & States):**
  - Staff rosters showing role names, emails, active/on-leave statuses, and departments.
- **How it is Showed (Visualizations):**
  - **Department Filter Bar:** A series of modern pill buttons allowing instantaneous roster filtering.
  - **New Hire Modal:** Pop-up registration form supporting email validation.

#### 3. Payroll Disbursement (`/hr/payroll`)
- **Functional Purpose:** Manages monthly salary dispersals, tax withholdings, allowances, and payment states.
- **Contents (Data & States):**
  - Employee list showing base salary, allowance numbers, tax deductions, and payment state (Paid vs. Pending).
- **How it is Showed (Visualizations):**
  - **Bulk Disburse Controller:** Features a prominent **Process Bulk Payroll button** that triggers state updates with quick confirmation notifications.

#### 4. Attendance & Leave Matrix (`/hr/attendance-leave`)
- **Functional Purpose:** Logs employee day-to-day attendance and vacation/sick leave approvals.
- **Contents (Data & States):**
  - **Attendance Calendar:** 14-day timeline matrix indicating present/absent/leave status for every employee.
  - **Active Leave Requests:** Sick leave, medical, or holiday applications awaiting approval.
- **How it is Showed (Visualizations):**
  - **Attendance Dot Matrix:** Interactive matrix using green dots for present, red for absent, and amber for active leaves.
  - **Approval Pipeline & Leave Log:** Interactive table with search, leave type filters, column sorting, column width resizing, approval/rejection triggers, and "Apply Leave" application modal.

#### 5. Recruitment Pipeline (`/hr/recruitment`)
- **Functional Purpose:** Tracks open requisitions, candidate application pipelines across hiring stages, interview schedules, and referral logs.
- **Contents (Data & States):** Open job positions, candidate records with stage status (*Applied*, *Screening*, *Interview*, *Offer*, *Hired*), application dates, and hiring manager tags.
- **How it is Showed (Visualizations):**
  - **Pipeline Kanban & Candidate Table:** Stage-based candidate pipeline view paired with filterable talent roster grids.

#### 6. Onboarding & Separation (`/hr/onboarding-separation`)
- **Functional Purpose:** Manages new employee onboarding task checklists and departing staff offboarding clearances.
- **Contents (Data & States):** Employee onboarding tasks (IT setup, compliance, badge issuing), separation clearance logs (asset return, exit interview, final settlement), and completion percentages.
- **How it is Showed (Visualizations):**
  - **Progress Step Lists & Clearance Dashboards:** Checklist task trackers with progress indicators and status toggle controls.

---

### ⚙️ Admin Section

#### 1. Admin Control Center (`/admin`)
- **Functional Purpose:** The primary administrative control deck tracking general revenue, system audit logs, and quick user accesses.
- **Contents (Data & States):**
  - KPI charts, active orders, and live system log updates.
- **How it is Showed (Visualizations):**
  - Includes user tables and a chronological event feed highlighted with color-coded dot severity indicators (e.g., Red for stock alerts, Amber for PO status updates, Green for sales orders).

#### 2. User Management (`/admin/users`)
- **Functional Purpose:** Administers internal accounts, edits security privileges, and invites new users.
- **Contents (Data & States):**
  - User names, roles (Admin, HR Manager, Finance Auditor, Staff), and status (Active, Suspended, Invited).
- **How it is Showed (Visualizations):**
  - High-end security matrix list with actions to suspend, delete, or promote profiles.

#### 3. System Settings (`/admin/settings`)
- **Functional Purpose:** Controls enterprise configurations, currency preferences, backup policies, and API keys.
- **Contents (Data & States):**
  - Timezones, currency settings, API key parameters, and backup archives.
- **How it is Showed (Visualizations):**
  - Tabbed glass console separating settings categories, with instant rollbacks and success toasts.

---

## 🧱 Core Shared Components

### 1. `FloatingNav` (`/src/components/FloatingNav.tsx`)
The primary fixed navigation bar floating gracefully at `top-4`. It consists of three standalone glass pill sections aligned horizontally:
- **Left Pill (Brand):** Renders the HKC Trading brand mark, logo, or icon.
- **Middle Pill (Menu Navigation):** Centered router tabs containing active slide indications and interactive hover styling.
- **Right Pill (Actions):** Quick controls (Settings button, real-time Pulsing Notifications bell, User profile shortcut).

### 2. `SubPageNav` (`/src/components/SubPageNav.tsx`)
A local page submenu controller automatically fed by children endpoints defined in `src/lib/nav-config.ts`. Rendered as clear inline pill links (`px-4 py-2 text-xs md:text-sm font-semibold rounded-full`) with active state (`bg-green-700 text-white font-bold shadow-xs`) and inactive glass states, sized for comfortable readability and touch interaction across all viewports.

### 3. `GlassCard` (`/src/components/GlassCard.tsx`)
A modular wrapper around `framer-motion`'s `motion.div`. By default:
- It includes smooth scale and fade-in entries (`opacity: 0 -> 1`, `scale: 0.95 -> 1`).
- Implements a subtle hover lifting effect (`y: -2`) using spring easing.
- Configurable via `variant="light"` or `"dark"`.

### 4. `HRTable` Utilities & Toolbar (`/src/components/HRTable.tsx`)
Shared table components and custom React hooks powering enterprise tables across HR (Employees roster, Attendance & Leave logs):
- `<HRTableToolbar />`: Standardized top toolbar with section title, subtitle counter, search bar (`h-[38px] rounded-full bg-black/[0.04]`), filter select dropdowns (`h-[38px] bg-black/[0.04] rounded-full`), and primary/secondary action buttons.
- `<ResizableTableHeader />`: Resizable, sortable `<thead>` header component with column drag-resize handles and popover sort menus.
- `useColumnWidths()`: Custom hook managing pixel widths per column and mouse-drag events (`onResizeStart`).
- `useTableSort()`: Custom hook handling multi-column sorting (ascending, descending, clear sort) for numeric and string data types.

### 5. `ResizableTable` (`/src/components/ResizableTable.tsx`)
Shared hook (`useResizableTable`) and `<ResizableTh>` header cell for Finance tables requiring draggable column resizing and popover sort controls. Used across Ledger periods, Banking statements, Taxes, Expenses, Assets, and Financial Reports.

### 6. `FinanceTableToolbar` (`/src/components/FinanceTableToolbar.tsx`)
Standardized header toolbar component for Finance domain tables (`/finance/taxes`, `/finance/banking`, `/finance/assets`, `/finance/expenses`, `/finance/ledger`, `/finance/reports`). Provides a unified header containing:
- **Left Side:** Card title (`h3`) and subtitle (`p`).
- **Right Side:** Translucent search input (`bg-black/[0.04] rounded-2xl h-[38px]`), status/type filter dropdowns (`bg-black/[0.03] rounded-xl h-[38px]`), and action buttons (`rounded-full bg-black h-[38px]`).

### 7. `FeedbackContext` (`/src/context/FeedbackContext.tsx`)
Global feedback layer providing `showToast(message, type, description?)` and `confirm({ title, message, onConfirm, ... })`. Renders animated toast stack and confirmation modal. All pages should use `useFeedback()` — not the legacy unused `Toast.tsx` component.

---

## 📊 Table Design Specification

To maintain a consistent, high-end data grid experience across HR, Finance, Inventory, and Sales modules, all tables follow a strict architectural and styling specification:

### 1. Frame & Container Layout
- **Glass Panel Wrapping:** Tables sit inside a `<GlassCard>` with padding removed (`p-0`), overflow hidden (`overflow-hidden`), subtle border (`border border-black/5`), and soft shadow (`shadow-xs`).
- **Fixed Table Layout:** Tables use `table-fixed w-full border-collapse` to enforce deterministic column sizing and avoid reflow jumps.
- **Horizontal Scrolling:** Wrapped in `<div className="overflow-x-auto">` to preserve layout integrity on small screens or high column counts.

### 2. Integrated Table Toolbar (`HRTableToolbar` / `FinanceTableToolbar`)
- **Header Alignment:** Placed in a distinct top toolbar band (`px-5 pt-5 pb-3 bg-black/[0.01] border-b border-black/5`).
- **Left Column:** Displays section title (`h3 font-extrabold text-sm md:text-base text-black uppercase tracking-tight`) and subtitle/count (`text-xs text-zinc-500 font-medium`).
- **Right Column Controls:** Flex layout with uniform element height (`h-[38px]`) containing:
  - **Minimalist Search Input:** Rounded pill (`rounded-full bg-black/[0.04] px-3.5 h-[38px]`) with search icon and placeholder text (`text-xs font-medium text-black`).
  - **Filter Select Dropdowns:** Pill dropdowns (`bg-black/[0.04] text-xs font-bold px-3.5 h-[38px] rounded-full text-zinc-800 border border-transparent hover:border-black/10`).
  - **Action Buttons:** Pill action triggers (`h-[38px] px-4 rounded-full text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-zinc-800 transition-all shadow-2xs active:scale-95`).

### 3. Header Cells & Interactive Resizing (`ResizableTableHeader`)
- **Typography & Styling:** Header row styled with `bg-black/[0.03] text-[11px] font-extrabold text-zinc-600 uppercase tracking-wider select-none border-b border-black/10`.
- **Column Width Management (`useColumnWidths`):** Widths set explicitly as inline pixel styles (`style={{ width: `${colWidths[key]}px`, minWidth: `${colWidths[key]}px` }}`).
- **Draggable Drag Handles:** Every column header cell includes a right-aligned handle (`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-emerald-500/60 active:bg-emerald-600 z-10 transition-colors`) enabling real-time column width dragging down to a 50px safety minimum.
- **Column Sort Popover (`useTableSort`):** Column labels feature a hover sort button triggering a floating popover menu containing:
  - `Sort Ascending` (with `ArrowUp` icon)
  - `Sort Descending` (with `ArrowDown` icon)
  - `Clear Sort` (with `RotateCcw` icon)
  - Active sorted columns display an `emerald` indicator badge on the header cell.

### 4. Data Row & Cell Formatting
- **Subtle Row Interactivity:** Rows feature gentle hover states (`hover:bg-black/[0.02] transition-colors`) and subtle bottom dividers (`divide-y divide-black/5`).
- **Data Type Alignment Rules:**
  - **Text / Names / Descriptions:** Left-aligned (`text-left`), truncated (`truncate`) with `min-w-0` to avoid layout breaks.
  - **Numerical Data & Currency:** Right-aligned (`text-right`), styled with monospace font (`font-mono text-xs font-black text-black`).
  - **Dates & Codes / IDs:** Styled in monospace font (`font-mono text-xs font-medium text-zinc-600` or `text-[10px] text-zinc-400 font-bold`).
  - **Status Badges:** Center-aligned (`text-center`), rendered as rounded pills (`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border`) featuring a tiny color indicator dot (`size-1.5 rounded-full`). Common status color tokens:
    - *Active / Approved / Paid:* Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`)
    - *Pending / In Review / Draft:* Amber (`bg-amber-50 text-amber-700 border-amber-200`)
    - *Rejected / Overdue / Inactive:* Rose/Red (`bg-rose-50 text-rose-700 border-rose-200`)
  - **Row Action Buttons:** Right-aligned (`text-right`), using compact icon buttons or pill badges with smooth active feedback (`active:scale-90`).

### 5. Empty States
- When filtered data yields 0 results, tables display a centered empty state cell (`colSpan={columns.length} className="py-12 text-center text-zinc-400 font-medium text-xs"`) with clean descriptive text.

---

## 🛠️ Code Style & Design Guidelines for Developers

Adhere to these guidelines to preserve the design fidelity:

1. **Keep Imports Safe:** Always import motion properties from standard `"framer-motion"`.
2. **Never Overpopulate the Screen:** Respect negative space. Each dashboard card should have ample margins (`mb-6`, `gap-5`, `p-6`).
3. **Use the `GlassCard` Component:** Do not manually create cards with plain tailwind classes; wrap them in `<GlassCard>` to benefit from standard entry animations, interactive hovers, and custom backdrop filters.
4. **Icons:** Exclusively use the `lucide-react` library. Do not embed raw SVG nodes.
5. **No Clutter:** Avoid raw text status logs, simulated network coordinates, or artificial loading telemetry. Keep titles human, clean, and literal.
6. **Unified Subpage Navigation Layout:** Sub-navigation pills (Dashboard, Employees, Payroll) must always be placed on the far right of the top-level page header block using the shared `<SubPageNav />` component to ensure absolute size, style, and placement consistency across all views.
7. **Minimalist Controls Alignment:** Search and filter bars must be styled with compact rounded-full minimalist designs and placed directly on the right side (immediately to the left of the main action buttons like Add Employee or Process Payroll). Both must match the exact height (`h-[38px]`) of the action buttons.
8. **Maximizing Grid Visibility:** Intermediary statistics and metrics cards right above lists or tables must be avoided or kept extremely minimal to maximize data list focus and maintain clean white space.
9. **Update this Documentation:** If you add new pages, color variables, or new common components, update this file immediately.
10. **Use `useFeedback()` for toasts:** Do not import the legacy `Toast.tsx` component; all user feedback goes through `FeedbackContext`.
11. **Concise Page Headers:** Keep page descriptions under main titles very short, crisp, and direct across all pages (5–10 words max). Do not clutter title headers with redundant engine badges or long explanations.
