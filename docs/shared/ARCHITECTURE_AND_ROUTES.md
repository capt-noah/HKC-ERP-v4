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
                      ├── /sales/sales-orders (Sales Orders & Order Fulfillment)
                      └── /sales/issued (Sales Issues & Stock Dispatch Vouchers)

/inventory ─────────► /inventory (Inventory & Storage Operations Dashboard)
                      ├── /inventory/reports (Inventory Movement & Valuation Analytics)
                      ├── /inventory/stock (Stock & Products Registry, Store Transfers)
                      └── /inventory/processing-services (Warehouse 1 Processing Services)

/finance ───────────► /finance (Overview Charts & Financial Ratios)
                      ├── /finance/ledger (General Ledger, Journal Entries, COA, Periods, Forex Revaluation)
                      ├── /finance/invoices (Invoicing Engine)
                      ├── /finance/expenses (Expense Ledger, Recurring Schedules & Fleet)
                      ├── /finance/banking (Bank Accounts & Reconciliations)
                      ├── /finance/assets (Fixed Assets Register & Depreciation Schedule)
                      ├── /finance/taxes (Tax Templates & Rates)
                      └── /finance/reports (Financial Statements, General Ledger & Trial Balance)

/hr ────────────────► /hr (Overview & Team KPIs)
                      ├── /hr/employees (Staff Roster)
                      ├── /hr/payroll (Disbursement Dashboard)
                      ├── /hr/attendance-leave (Attendance & Leave Matrix)
                      ├── /hr/recruitment (Recruitment & Talent Pipeline)
                      └── /hr/onboarding-separation (Onboarding & Separation Workflows)
