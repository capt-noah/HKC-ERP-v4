
/admin ─────────────► /admin (Module Control Center)
                      ├── /admin/users (Access Controls)
                      └── /admin/settings (System Configurations)
```

Navigation labels and child routes are defined in `src/lib/nav-config.ts`. All routed pages are registered in `src/App.tsx`.

---

## 🧱 Master Modular Full-Stack ERP Architecture ("Lego Blocks")

The application is structured according to the **Master Full-Stack Modular Architecture Plan**. Business logic is separated into standalone headless engines (`src/core/`), domain backend services (`server/modules/`), PostgREST client wrappers (`server/db/`), and Express sub-routers (`server/router/`).

```
server/
├── config.js                       (Environment & Port configuration)
├── index.js                        (Express Server Entrypoint with Request Logger)
├── logger.js                       (Production Request & Error Logging Subsystem)
├── README.md                       (Server documentation)
│
├── db/                             (Database Abstraction & SQL Schemas)
│   ├── supabaseClient.js           (PostgREST REST API Client abstraction)
│   ├── resourceRegistry.js         (50+ Entity Resource Definitions mapping tables and storage modes)
│   └── schemas/                    (Grouped SQL DDL Schemas & Seed Scripts)
│       ├── supabase.schema.sql
│       ├── sales_issues.schema.sql
│       ├── hr_module.schema.sql
│       └── finance_seed.sql
│
├── modules/                        (Domain Business Services)
│   ├── common/
│   │   └── crudService.js          (Generic Entity REST CRUD service)
│   ├── sales/
│   │   ├── salesService.js         (Sales domain service wrapper)
│   │   ├── salesIssues.js          (Sales Issue PostgREST service & RPC triggers)
│   │   ├── salesIssueLogic.js      (Pure batch allocation & FIFO stock logic)
│   │   └── salesIssueLogic.test.js (Unit test suite for sales issue logic)
│   ├── finance/
│   │   ├── financeService.js       (Finance RPC service wrapper)
│   │   └── payrollFinance.js       (Payroll RPC disbursement handler)
│   ├── inventory/
│   │   └── inventoryService.js     (Inter-warehouse stock audit service)
│   └── hr/
│       └── hrService.js            (Employee onboarding & attendance service)
│
└── router/                         (Modular Express Sub-Routers)
    ├── index.js                    (Master router mounting all domain sub-routers)
    ├── salesRouter.js              (Express router for /api/sales-issues & /api/sales_issues)
    ├── financeRouter.js            (Express router for /api/payroll-records/:id/pay)
    └── crudRouter.js               (Generic Express router for /api/:resource)

src/core/                           (Frontend Headless Pure Business Engines)
├── finance/
│   ├── ledgerEngine.ts             (Double-entry validation & party reference rules)
│   ├── reportGenerator.ts          (Trial Balance, Balance Sheet, Income Statement, Cash Flow math)
│   └── taxEngine.ts                (VAT 15% & WHT 2% calculations)
├── inventory/
│   ├── stockEngine.ts              (Multi-warehouse stock quantity evaluation & reorder alerts)
│   └── transferEngine.ts           (Store transfer validation)
├── sales/
│   └── orderPipeline.ts            (Quote & Sales Order stage progression)
└── hr/
    ├── payrollEngine.ts            (Ethiopian progressive tax & pension calculations)
    └── attendanceEngine.ts         (Attendance percentage & matrix evaluation)
```

---

## ⚡ Real-Time Cross-Module Finance Integration

The application features a **Real-Time Cross-Module Live Sync Engine** inside `src/lib/financeStore.ts`. When the application hydrates or when records are created in external modules, transactions automatically map to Finance records:

1. **Sales Issues (Dispatch Notes):** Automatically synced as AR Invoices (`invoices`) and posted to General Ledger (`JE-SI-xxxx`) with **Debit 1200 AR, Credit 4000 Sales Revenue, Credit 2210 Tax Liability**.
2. **Sales Orders:** Automatically synced as AR Invoices (`invoices`) and posted to General Ledger (`JE-SO-xxxx`).
3. **Purchase Orders:** Automatically posted as Procurement GL Accrual Entries (`JE-PO-xxxx`) with **Debit 1010 Inventory Asset, Credit 2000 Accounts Payable**.
4. **Expense Claims:** Automatically synced into `/finance/expenses` and posted to General Ledger (`JE-EXP-xxxx`).
5. **Payroll Records:** Automatically posted as Payroll Disbursement GL Entries (`JE-PAY-xxxx`).

---

## 📡 Server Request & Error Logging Subsystem

The Express server features a standard production logging module ([`server/logger.js`](file:///Users/Noah/Documents/React/HKC-ERP-v4/server/logger.js)):

- **Console Live Output (Render Dashboard):** Formats colorized HTTP request logs directly to `stdout` and `stderr` for live monitoring on Render.
- **Log File Persistence:** Automatically creates `server/logs/` and appends clean structured logs:
  - `server/logs/access.log`: Single-line standard access logs (`[TIMESTAMP] METHOD URL STATUS DURATIONms - IP`).
  - `server/logs/error.log`: Isolates HTTP 4xx/5xx errors and unhandled server exceptions with User-Agent and stack traces.

---

## 🏗️ Technical Architecture & Data Layer

**Stack:** React 19, TypeScript, Vite, React Router 7, Tailwind CSS v4, Framer Motion, Recharts, shadcn/ui primitives.

**Current persistence model:** All business modules hydrate from Supabase through the Node API. The browser must not seed Finance, Sales, Inventory, HR, or Admin records from local JSON files. Dashboards may show skeletons and empty states, but they must not invent records, balances, overdue amounts, warehouses, users, notifications, products, invoices, or payroll rows.

### Non-Negotiable Data Rules for Future Work

1. **Do not add business seed JSON back into `data/`.** The old JSON records were removed intentionally. If a page needs data, load it through `/api/:resource` and let Supabase be the source of truth.
2. **Do not hardcode fallback records in React components or stores.** Empty Supabase tables must render clean empty states with loading skeletons, not placeholder customers, invoices, HR employees, warehouses, stock items, or admin users.
3. **Use Glassmorphism Loading Skeletons (`Skeleton`).** All domain pages (Finance, Inventory, Sales, HR) must check `store.isLoading()` and render pulse skeleton states (`import { Skeleton } from "@/components/ui/skeleton"`) while hydrating from Supabase.
4. **Do not add default Supabase project credentials in code or docs.** Configure `SUPABASE_REST_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` through `.env` only. Never commit service-role keys, database passwords, or generated credential notes.
5. **Do not bypass the Node API from the browser for privileged writes.** The browser calls local app routes like `/api/invoices`; the Node server owns Supabase REST calls and keeps service-role credentials server-side.
6. **Atomic Bulk Upserts (`resolution=merge-duplicates`).** All resource batch replacements in `server/db/supabaseClient.js` issue an atomic single `POST` request with PostgREST `resolution=merge-duplicates` header to prevent multi-tab or concurrent user race conditions.
7. **Mandatory Party References on AR/AP/Payroll Accounts:** Any double-entry GL journal entry touching Accounts Receivable (`1200`), Accounts Payable (`2000`/`2100`), or Payroll Payable (`2210`/`2300`) must specify a party reference (`party_id` or `party_name`) for sub-ledger audit compliance.
8. **Finance screens are derived screens.** Cash position, reports, unpaid invoices, invoice timelines, banking, and GL views must derive from persisted invoices, payments, accounts, and journal-entry lines.
9. **When a persistence write fails, do not keep optimistic fake state.** Reload from Supabase or show a safe error state.

| Store / Context | Path | Scope |
| :--- | :--- | :--- |
| `useFinanceStore()` | `src/lib/financeStore.ts` | Finance module — COA, journal entries, invoices, payments, expenses, fixed assets, tax rules, accounting periods, forex revaluation |
| `useErpStore()` | `src/lib/erpStore.ts` | Sales & Inventory module — products, multi-warehouse tracking, stock movements audit log, inter-warehouse transfers, sales orders, purchase orders with GL accruals, customers, suppliers |
| `useFeedback()` | `src/context/FeedbackContext.tsx` | Global toasts and confirmation dialogs (wraps the app in `main.tsx`) |

---

## 🧭 Page-by-Page Deep Dive & Visualizations


## Store and Context Dependencies
- `useErpStore` (`src/lib/erpStore.ts`): Exposes product definitions, stock limits, and movement logs for rendering on these pages.
