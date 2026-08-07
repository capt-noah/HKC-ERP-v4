import { useState, useEffect } from "react"
import { deleteResource, loadResource, persistResources } from "./apiPersistence"
import { validateJournalVoucher } from "../core/finance/ledgerEngine"

export interface AccountItem {
  id: string
  code: string
  name: string
  account_type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"
  parent_account_id: string | null
  is_active: boolean
  is_group?: boolean
}

export interface JournalEntry {
  id: string
  entry_date: string
  description: string
  source_type:
    | "Sales Invoice"
    | "Purchase Invoice"
    | "Payment"
    | "Payroll Run"
    | "Payroll Accrual"
    | "Payroll Payment"
    | "Exchange Revaluation"
    | "Warehouse Transfer"
    | "Manual Adjustment"
    | "Recurring Expense"
    | "Round Off"
    | "Reversal"
  source_id: string | null
  created_by: string
  currency: string
  exchange_rate: number
  is_reversal_of: string | null
}

export interface JournalEntryLine {
  id: string
  journal_entry_id: string
  account_id: string
  debit_amount: number
  credit_amount: number
  currency: string
  exchange_rate_at_time: number
  warehouse_id: string | null
  party_type?: "Customer" | "Supplier" | "Employee" | null
  party_id?: string | null
  party_name?: string | null
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Invoice {
  id: string
  invoice_number: string
  sales_order_id?: string
  customer_name: string
  issue_date: string
  due_date: string
  currency: string
  line_items: InvoiceLineItem[]
  subtotal: number
  tax_amount: number
  discount_amount?: number
  payment_terms?: string
  total: number
  amount_paid: number
  balance_due: number
  status: "Draft" | "Sent" | "Paid" | "Partially Paid" | "Overdue" | "Void" | "Cancelled"
}

export interface Payment {
  id: string
  direction: "Received" | "Made"
  linked_invoice_id: string | null
  amount: number
  currency: string
  date: string
  method: string
  reference: string
}

export interface RecurringExpenseSchedule {
  id: string
  expense_type: "Office Rent" | "Warehouse Rent" | "Petty Cash" | "Vehicle Cost" | "Software & SaaS" | "Other"
  amount: number
  currency: string
  frequency: "Monthly" | "Quarterly" | "Annually"
  next_due_date: string
  linked_resource_id: string | null
  cost_center?: string
  auto_generate: boolean
  status: "Active" | "Paused"
}

export interface OneOffExpense {
  id: string
  merchant: string
  category: string
  date: string
  employee: string
  amount: number
  currency: string
  status: "APPROVED" | "PENDING" | "REJECTED"
  cost_center?: string
  gl_account_id?: string
  receipt_ref?: string
  tax_amount?: number
}

export interface VehicleMaintenance {
  date: string
  description: string
  amount: number
}

export interface Vehicle {
  id: string
  registration_number: string
  type: string
  assigned_warehouse: string
  driver_name: string
  maintenance_cost_history: VehicleMaintenance[]
  status: "Active" | "In Repair" | "Retired"
}

export interface AccountingPeriod {
  id: string
  period_label: string
  start_date: string
  end_date: string
  is_closed: boolean
}

export interface CompanySettings {
  company_name: string
  base_currency: string
  exchange_rates: Record<string, number>
  unrealized_exchange_gain_loss_account_id: string
  payroll_expense_account_id: string
  payroll_payable_account_id: string
  tax_payable_account_id: string
  cash_account_id?: string
}

export interface PayrollDeduction {
  type: string
  amount: number
}

export interface PayrollEmployee {
  employee_id: string
  employee_name: string
  gross_pay: number
  deductions: PayrollDeduction[]
  net_pay: number
}

export interface PayrollRun {
  id: string
  period_label: string
  period_start: string
  period_end: string
  status: "Draft" | "Accrued" | "Paid"
  employees: PayrollEmployee[]
  total_gross: number
  total_deductions: number
  total_net: number
  accrual_journal_entry_id: string | null
  payment_journal_entry_id: string | null
}

export interface Revaluation {
  id: string
  revaluation_date: string
  currency: string
  target_account_id: string
  original_balance: number
  current_rate: number
  new_balance_in_base: number
  unrealized_gain_loss: number
  journal_entry_id: string | null
  status: "Draft" | "Posted" | "Cancelled"
}

export interface TaxRule {
  id: string
  name: string
  ratePercent: number
  type: "VAT/GST" | "Withholding Tax (TDS)" | "Import Duty"
  accountCode: string
  isInclusive: boolean
  description?: string
}

export interface DepreciationScheduleItem {
  id: string
  depreciation_date: string
  depreciation_amount: number
  journal_entry_id: string | null
  status: "Pending" | "Posted"
}

export interface FixedAsset {
  id: string
  name: string
  category: "Vehicles" | "Machinery" | "IT Hardware" | "Buildings" | "Office Equipment"
  purchaseDate: string
  depreciationStartDate: string
  cost: number
  salvageValue: number
  usefulLifeYears: number
  accumulatedDepreciation: number
  status: "Draft" | "Active" | "Disposed" | "Fully Depreciated"
  depreciation_schedule: DepreciationScheduleItem[]
  asset_account_id: string
  depreciation_expense_account_id: string
  accumulated_depreciation_account_id: string
  location?: string
  serialNumber?: string
}

export function helperGenerateDeprSchedule(
  cost: number,
  salvage: number,
  lifeYears: number,
  startDateStr: string,
  accumulatedDepreciation: number
): DepreciationScheduleItem[] {
  const schedule: DepreciationScheduleItem[] = []
  const totalMonths = lifeYears * 12
  const deprPerMonth = Math.round(((cost - salvage) / totalMonths) * 100) / 100
  let currentDate = new Date(startDateStr)
  if (isNaN(currentDate.getTime())) {
    currentDate = new Date()
  }
  
  const postedCount = deprPerMonth > 0 ? Math.round(accumulatedDepreciation / deprPerMonth) : 0
  
  for (let i = 1; i <= totalMonths; i++) {
    const dateStr = currentDate.toISOString().split("T")[0]
    schedule.push({
      id: `DEP-SCH-${i}`,
      depreciation_date: dateStr,
      depreciation_amount: deprPerMonth,
      journal_entry_id: i <= postedCount ? "JE-SYSTEM-PREV" : null,
      status: i <= postedCount ? "Posted" : "Pending",
    })
    // Increment month safely
    currentDate.setMonth(currentDate.getMonth() + 1)
  }
  return schedule
}

const emptyCompanySettings: CompanySettings = {
  company_name: "",
  base_currency: "ETB",
  exchange_rates: {},
  unrealized_exchange_gain_loss_account_id: "",
  payroll_expense_account_id: "",
  payroll_payable_account_id: "",
  tax_payable_account_id: "",
}

// Finance starts empty and is hydrated exclusively from the Finance API.
class FinanceStore {
  private accounts: AccountItem[] = []
  private entries: JournalEntry[] = []
  private lines: JournalEntryLine[] = []
  private invoices: Invoice[] = []
  private payments: Payment[] = []
  private recurringSchedules: RecurringExpenseSchedule[] = []
  private expenses: OneOffExpense[] = []
  private vehicles: Vehicle[] = []
  private periods: AccountingPeriod[] = []
  private companySettings: CompanySettings = emptyCompanySettings
  private payrollRuns: PayrollRun[] = []
  private revaluations: Revaluation[] = []
  private fixedAssets: FixedAsset[] = []
  private taxRules: TaxRule[] = []

  private listeners = new Set<() => void>()
  private _isLoading = true
  private _loadError: string | null = null

  constructor() {
    void this.loadFromApi()
  }

  private clearFinanceState() {
    this.accounts = []
    this.entries = []
    this.lines = []
    this.invoices = []
    this.payments = []
    this.recurringSchedules = []
    this.expenses = []
    this.vehicles = []
    this.periods = []
    this.companySettings = emptyCompanySettings
    this.payrollRuns = []
    this.revaluations = []
    this.fixedAssets = []
    this.taxRules = []
  }

  private async loadFromApi() {
    this._isLoading = true
    this._loadError = null
    this.listeners.forEach((l) => l())
    try {
      const [
        accounts,
        entries,
        lines,
        invoices,
        payments,
        recurringSchedules,
        expenses,
        vehicles,
        periods,
        companySettingsRows,
        payrollRuns,
        revaluations,
        fixedAssets,
        taxRules,
      ] = await Promise.all([
        loadResource<AccountItem>("chart_of_accounts"),
        loadResource<JournalEntry>("journal_entries"),
        loadResource<JournalEntryLine>("journal_entry_lines"),
        loadResource<Invoice>("invoices"),
        loadResource<Payment>("payments"),
        loadResource<RecurringExpenseSchedule>("recurring_expense_schedules"),
        loadResource<OneOffExpense>("expenses"),
        loadResource<Vehicle>("vehicles"),
        loadResource<AccountingPeriod>("accounting_periods"),
        loadResource<CompanySettings & { id?: string }>("company_settings"),
        loadResource<PayrollRun>("payroll_runs"),
        loadResource<Revaluation>("revaluations"),
        loadResource<FixedAsset>("fixed_assets"),
        loadResource<TaxRule>("tax_rules"),
      ])

      this.accounts = accounts
      this.entries = entries.map((e: any) => ({
        ...e,
        entry_number: e.entry_number || e.id,
        posting_status: e.posting_status || "POSTED",
        source_type: e.source_type || "MANUAL",
        currency: e.currency || "ETB",
      }))
      this.lines = lines.map((l: any) => ({
        ...l,
        debit_amount: Number(l.debit_amount ?? l.debit ?? 0),
        credit_amount: Number(l.credit_amount ?? l.credit ?? 0),
        currency: l.currency || "ETB",
        exchange_rate_at_time: Number(l.exchange_rate_at_time || 1.0),
      }))
      this.invoices = invoices.map((inv: any) => ({
        ...inv,
        subtotal: Number(inv.subtotal ?? inv.amount ?? 0),
        total_amount: Number(inv.total_amount ?? inv.total ?? inv.amount ?? 0),
        balance_due: Number(inv.balance_due ?? inv.total_amount ?? 0),
        status: inv.status || "Draft",
      }))
      this.payments = payments
      this.recurringSchedules = recurringSchedules
      this.expenses = expenses.map((exp: any) => ({
        ...exp,
        amount: Number(exp.amount ?? 0),
        status: exp.status || "Approved",
      }))
      this.vehicles = vehicles
      this.periods = periods
      const { id: _settingsId, ...companySettings } = companySettingsRows[0] || { id: "default", ...emptyCompanySettings }
      this.companySettings = companySettings as CompanySettings
      this.payrollRuns = payrollRuns
      this.revaluations = revaluations
      this.fixedAssets = fixedAssets.map((fa: any) => ({
        ...fa,
        cost: Number(fa.cost ?? 0),
        accumulatedDepreciation: Number(fa.accumulatedDepreciation ?? fa.accumulated_depreciation ?? 0),
        netBookValue: Number(fa.netBookValue ?? fa.cost ?? 0),
      }))
      this.taxRules = taxRules

      // CROSS-MODULE LIVE FINANCE SYNC ENGINE:
      // Fetch source module records and ensure all Sales Issues, Sales Orders, Purchase Orders, Expense Claims, and Payroll Records appear in Finance
      try {
        const [, , purchaseOrders, expenseClaims, payrollRecords] = await Promise.all([
          loadResource<any>("sales_issues").catch(() => []),
          loadResource<any>("sales_orders").catch(() => []),
          loadResource<any>("purchase_orders").catch(() => []),
          loadResource<any>("expense_claims").catch(() => []),
          loadResource<any>("payroll_records").catch(() => []),
        ])

        let hasNewSync = false

        // Background sync for invoices disabled to prevent duplicate invoice generation.
        // Invoices are created strictly on-demand via financeStore.createInvoice().

        // C. Sync Purchase Orders -> Procurement GL Entries
        purchaseOrders.forEach((po: any, idx: number) => {
          const jeId = `JE-PO-${po.id || idx + 1}`
          const poAmt = Number(po.amount || po.total_amount || 20000)

          if (!this.entries.some((e) => e.id === jeId || e.source_id === po.id)) {
            const stockAcc = this.accounts.find((a) => a.code === "1010" || a.code === "1410" || a.id === "acc-1010") || this.accounts[0]
            const apAcc = this.accounts.find((a) => a.code === "2000" || a.code === "2100" || a.id === "acc-2000") || this.accounts[0]

            this.entries.push({
              id: jeId,
              entry_date: po.date || new Date().toISOString().split("T")[0],
              source_type: "Purchase Invoice",
              source_id: po.id,
              created_by: "Supply Chain Manager",
              currency: "ETB",
              exchange_rate: 1.0,
              description: `Supplier Procurement Accrual PO ${po.id} for ${po.supplier || "Supplier"}`,
              is_reversal_of: null,
            })

            if (stockAcc && apAcc) {
              this.lines.push(
                { id: `${jeId}-1`, journal_entry_id: jeId, account_id: stockAcc.id, debit_amount: poAmt, credit_amount: 0, currency: "ETB", exchange_rate_at_time: 1.0, warehouse_id: null },
                { id: `${jeId}-2`, journal_entry_id: jeId, account_id: apAcc.id, debit_amount: 0, credit_amount: poAmt, currency: "ETB", exchange_rate_at_time: 1.0, warehouse_id: null, party_type: "Supplier", party_id: po.supplierId || "SUPP-001", party_name: po.supplier || "Supplier" }
              )
            }
            hasNewSync = true
          }
        })

        // D. Sync Expense Claims -> Expenses & GL Entries
        expenseClaims.forEach((ec: any, idx: number) => {
          const expId = `EXP-${ec.id || idx + 1}`
          const jeId = `JE-EXP-${ec.id || idx + 1}`
          const expAmt = Number(ec.amount || 3500)

          if (!this.expenses.some((e) => e.id === expId)) {
            this.expenses.push({
              id: expId,
              merchant: ec.vendor || ec.merchant || "Vendor Supply",
              category: ec.category || "Office Expenses",
              date: ec.date || new Date().toISOString().split("T")[0],
              employee: ec.employee_name || ec.employee || "Employee",
              amount: expAmt,
              currency: "ETB",
              status: "APPROVED",
            })
            hasNewSync = true
          }

          if (!this.entries.some((e) => e.id === jeId || e.source_id === ec.id)) {
            const expAcc = this.accounts.find((a) => a.code === "5100" || a.id === "acc-5100") || this.accounts[0]
            const cashAcc = this.accounts.find((a) => a.code === "1000" || a.id === "acc-1000") || this.accounts[0]

            this.entries.push({
              id: jeId,
              entry_date: ec.date || new Date().toISOString().split("T")[0],
              source_type: "Recurring Expense",
              source_id: ec.id,
              created_by: "Finance Manager",
              currency: "ETB",
              exchange_rate: 1.0,
              description: `Employee Expense Claim Disbursement for ${ec.employee_name || ec.employee || "Employee"}`,
              is_reversal_of: null,
            })

            if (expAcc && cashAcc) {
              this.lines.push(
                { id: `${jeId}-1`, journal_entry_id: jeId, account_id: expAcc.id, debit_amount: expAmt, credit_amount: 0, currency: "ETB", exchange_rate_at_time: 1.0, warehouse_id: null },
                { id: `${jeId}-2`, journal_entry_id: jeId, account_id: cashAcc.id, debit_amount: 0, credit_amount: expAmt, currency: "ETB", exchange_rate_at_time: 1.0, warehouse_id: null, party_type: "Employee", party_id: ec.employee_id || "EMP-001", party_name: ec.employee_name || ec.employee || "Employee" }
              )
            }
            hasNewSync = true
          }
        })

        // E. Sync Payroll Records -> Payroll GL Entries
        payrollRecords.forEach((pr: any, idx: number) => {
          const jeId = `JE-PAY-${pr.id || idx + 1}`
          const payAmt = Number(pr.net_salary || pr.net_pay || pr.amount || 18000)

          if (!this.entries.some((e) => e.id === jeId || e.source_id === pr.id)) {
            const salaryAcc = this.accounts.find((a) => a.code === "5010" || a.id === "acc-5010") || this.accounts[0]
            const cashAcc = this.accounts.find((a) => a.code === "1000" || a.id === "acc-1000") || this.accounts[0]

            this.entries.push({
              id: jeId,
              entry_date: pr.payment_date || new Date().toISOString().split("T")[0],
              source_type: "Payroll Payment",
              source_id: pr.id,
              created_by: "HR & Payroll Manager",
              currency: "ETB",
              exchange_rate: 1.0,
              description: `Salaries & Wages Disbursement for ${pr.employee_name || "Employee"}`,
              is_reversal_of: null,
            })

            if (salaryAcc && cashAcc) {
              this.lines.push(
                { id: `${jeId}-1`, journal_entry_id: jeId, account_id: salaryAcc.id, debit_amount: payAmt, credit_amount: 0, currency: "ETB", exchange_rate_at_time: 1.0, warehouse_id: null },
                { id: `${jeId}-2`, journal_entry_id: jeId, account_id: cashAcc.id, debit_amount: 0, credit_amount: payAmt, currency: "ETB", exchange_rate_at_time: 1.0, warehouse_id: null, party_type: "Employee", party_id: pr.employee_id || "EMP-001", party_name: pr.employee_name || "Employee" }
              )
            }
            hasNewSync = true
          }
        })

        if (hasNewSync) {
          this.saveToApi().catch((err) => console.error("Failed to auto-persist synced Finance records:", err))
        }
      } catch (syncErr) {
        console.error("Cross-module live finance sync error:", syncErr)
      }

      this._isLoading = false
      this._loadError = null
      this.listeners.forEach((l) => l())
    } catch (error) {
      console.error("Failed to load finance data from Supabase.", error)
      this.clearFinanceState()
      this._isLoading = false
      this._loadError = error instanceof Error ? error.message : "Could not connect to the server. Finance data is unavailable."
      this.listeners.forEach((l) => l())
    }
  }

  private saveToApi() {
    return persistResources([
      { resource: "chart_of_accounts", items: this.accounts },
      { resource: "journal_entries", items: this.entries },
      { resource: "journal_entry_lines", items: this.lines },
      { resource: "invoices", items: this.invoices },
      { resource: "payments", items: this.payments },
      { resource: "recurring_expense_schedules", items: this.recurringSchedules },
      { resource: "expenses", items: this.expenses },
      { resource: "vehicles", items: this.vehicles },
      { resource: "accounting_periods", items: this.periods },
      { resource: "company_settings", items: [{ id: "default", ...this.companySettings }] },
      { resource: "payroll_runs", items: this.payrollRuns },
      { resource: "revaluations", items: this.revaluations },
      { resource: "fixed_assets", items: this.fixedAssets },
      { resource: "tax_rules", items: this.taxRules },
    ])
  }

  public async reloadFromApi() {
    await this.loadFromApi()
  }

  public isLoading(): boolean {
    return this._isLoading
  }

  public getLoadError(): string | null {
    return this._loadError
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    void this.saveToApi().catch((error) => {
      console.error("Failed to persist finance data to Supabase.", error)
      void this.loadFromApi()
    })
    this.listeners.forEach((l) => l())
  }

  // --- Getters ---
  public getAccounts(): AccountItem[] {
    return [...this.accounts]
  }

  public getJournalEntries(): JournalEntry[] {
    return [...this.entries]
  }

  public getJournalEntryLines(): JournalEntryLine[] {
    return [...this.lines]
  }

  public getInvoices(): Invoice[] {
    return [...this.invoices]
  }

  public getPayments(): Payment[] {
    return [...this.payments]
  }

  public getRecurringSchedules(): RecurringExpenseSchedule[] {
    return [...this.recurringSchedules]
  }

  public getOneOffExpenses(): OneOffExpense[] {
    return [...this.expenses]
  }

  public getVehicles(): Vehicle[] {
    return [...this.vehicles]
  }

  public getAccountingPeriods(): AccountingPeriod[] {
    return [...this.periods]
  }

  public getCompanySettings(): CompanySettings {
    return { ...this.companySettings }
  }

  public getPayrollRuns(): PayrollRun[] {
    return [...this.payrollRuns]
  }

  public getRevaluations(): Revaluation[] {
    return [...this.revaluations]
  }

  // --- Company Settings Actions ---
  public updateExchangeRate(currency: string, rate: number) {
    this.companySettings = {
      ...this.companySettings,
      exchange_rates: {
        ...this.companySettings.exchange_rates,
        [currency]: rate,
      },
    }
    this.notify()
  }

  // --- Chart of Accounts Actions ---
  public addAccount(account: Omit<AccountItem, "id">): { success: boolean; error?: string; account?: AccountItem } {
    if (this.accounts.some((a) => a.code === account.code)) {
      return { success: false, error: `Account code "${account.code}" already exists in Chart of Accounts.` }
    }
    const newAcc: AccountItem = {
      ...account,
      id: `ACC-${account.code}`,
    }
    this.accounts = [...this.accounts, newAcc]
    this.notify()
    return { success: true, account: newAcc }
  }

  public toggleAccountActive(id: string) {
    this.accounts = this.accounts.map((acc) =>
      acc.id === id || acc.code === id ? { ...acc, is_active: !acc.is_active } : acc
    )
    this.notify()
  }

  public toggleLockPeriod(periodId: string) {
    this.periods = this.periods.map((p) => (p.id === periodId ? { ...p, is_closed: !p.is_closed } : p))
    this.notify()
  }

  // --- Posting Journal Entry Rules ---
  public postJournalEntry(
    entryData: Omit<JournalEntry, "id" | "is_reversal_of"> & { is_reversal_of?: string | null },
    rawLines: Array<{
      account_id: string
      debit_amount: number
      credit_amount: number
      warehouse_id?: string | null
      party_type?: "Customer" | "Supplier" | "Employee" | null
      party_id?: string | null
      party_name?: string | null
    }>
  ): { success: boolean; error?: string; entry?: JournalEntry; autoRounded?: boolean; roundOffAmount?: number } {
    // 0. Locked Accounting Period Validation
    const entryDate = entryData.entry_date
    const closedPeriod = this.periods.find(
      (p) => p.is_closed && entryDate >= p.start_date && entryDate <= p.end_date
    )
    if (closedPeriod) {
      return {
        success: false,
        error: `Posting rejected: The transaction date (${entryDate}) falls inside a locked/closed accounting period (${closedPeriod.period_label}).`,
      }
    }

    // 1. Data-layer check: Reject if any selected account is inactive
    for (const line of rawLines) {
      const acc = this.accounts.find((a) => a.id === line.account_id || a.code === line.account_id)
      if (!acc) {
        return { success: false, error: `Account "${line.account_id}" does not exist in Chart of Accounts.` }
      }
      if (!acc.is_active) {
        return { success: false, error: `Posting rejected: Account "${acc.code} - ${acc.name}" is disabled.` }
      }

      // 2. HARD RULE ENFORCEMENT: Reject creating any line against Receivable, Payable, or Payroll Payable account without party reference
      const accCode = acc.code
      const accName = acc.name.toLowerCase()
      const isReceivable = accCode === "1200" || accName.includes("receivable")
      const isPayable = accCode === "2000" || accName.includes("payable")
      const isPayrollPayable = accCode === "2100" || accCode === "2210" || accName.includes("payroll")

      if ((isReceivable || isPayable || isPayrollPayable) && !line.party_id && !line.party_name) {
        return {
          success: false,
          error: `Posting rejected: Account "${acc.code} - ${acc.name}" requires a Party Reference (Customer, Supplier, or Employee).`,
        }
      }
    }

    // 3. Round amounts to 2 decimal places before comparing
    let totalDebit = rawLines.reduce((sum, l) => sum + Math.round(l.debit_amount * 100) / 100, 0)
    let totalCredit = rawLines.reduce((sum, l) => sum + Math.round(l.credit_amount * 100) / 100, 0)

    totalDebit = Math.round(totalDebit * 100) / 100
    totalCredit = Math.round(totalCredit * 100) / 100

    const diff = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100
    let autoRounded = false
    let roundOffAmount = 0

    const finalLines = [...rawLines]

    // 4. Round off vs Imbalance tolerance
    if (diff > 0.01) {
      return {
        success: false,
        error: `Imbalance detected: Total Debits (${totalDebit.toFixed(2)} ${entryData.currency}) do not equal Total Credits (${totalCredit.toFixed(2)} ${entryData.currency}). Imbalance of ${diff.toFixed(2)} ${entryData.currency}.`,
      }
    } else if (diff > 0 && diff <= 0.01) {
      // Auto-add balancing line to Round Off account (acc-5990 / code 5990)
      autoRounded = true
      roundOffAmount = diff
      const roundOffAcc = this.accounts.find((a) => a.code === "5990" || a.id === "acc-5990") || this.accounts[0]
      if (totalDebit < totalCredit) {
        finalLines.push({
          account_id: roundOffAcc.id,
          debit_amount: diff,
          credit_amount: 0,
          warehouse_id: null,
        })
      } else {
        finalLines.push({
          account_id: roundOffAcc.id,
          debit_amount: 0,
          credit_amount: diff,
          warehouse_id: null,
        })
      }
    }

    // Generate Entry ID safely by checking max numeric suffix and avoiding duplicates
    let maxJeNum = 0
    const currentYear = new Date().getFullYear()
    for (const ent of this.entries) {
      if (ent.id) {
        const match = ent.id.match(/\d+$/)
        if (match) {
          const val = parseInt(match[0], 10)
          if (!isNaN(val) && val > maxJeNum) {
            maxJeNum = val
          }
        }
      }
    }
    let nextJeNum = Math.max(maxJeNum + 1, this.entries.length + 1)
    let newEntryId = `JE-${currentYear}-${String(nextJeNum).padStart(3, "0")}`
    while (this.entries.some((e) => e.id === newEntryId)) {
      nextJeNum++
      newEntryId = `JE-${currentYear}-${String(nextJeNum).padStart(3, "0")}`
    }

    const newEntry: JournalEntry = {
      id: newEntryId,
      entry_date: entryData.entry_date,
      description: entryData.description,
      source_type: entryData.source_type,
      source_id: entryData.source_id ?? null,
      created_by: entryData.created_by,
      currency: entryData.currency,
      exchange_rate: entryData.exchange_rate,
      is_reversal_of: entryData.is_reversal_of ?? null,
    }

    const createdLines: JournalEntryLine[] = finalLines.map((fl, idx) => ({
      id: `JEL-${Date.now()}-${idx}`,
      journal_entry_id: newEntryId,
      account_id: fl.account_id,
      debit_amount: Math.round(fl.debit_amount * 100) / 100,
      credit_amount: Math.round(fl.credit_amount * 100) / 100,
      currency: entryData.currency,
      exchange_rate_at_time: entryData.exchange_rate,
      warehouse_id: fl.warehouse_id ?? null,
      party_type: fl.party_type ?? null,
      party_id: fl.party_id ?? null,
      party_name: fl.party_name ?? null,
    }))

    this.entries = [newEntry, ...this.entries]
    this.lines = [...createdLines, ...this.lines]

    this.notify()
    return { success: true, entry: newEntry, autoRounded, roundOffAmount }
  }

  public validateVoucher(lines: any[]) {
    return validateJournalVoucher(lines)
  }

  // --- Reversal Action ---
  public reverseJournalEntry(
    targetEntryId: string,
    targetLineId?: string
  ): { success: boolean; reversalEntry?: JournalEntry; error?: string } {
    const originalEntry = this.entries.find((e) => e.id === targetEntryId)
    if (!originalEntry) {
      return { success: false, error: "Original journal entry not found." }
    }

    const originalLines = this.lines.filter((l) => l.journal_entry_id === targetEntryId)
    if (originalLines.length === 0) {
      return { success: false, error: "Original journal entry lines not found." }
    }

    let linesToReverse = originalLines
    if (targetLineId) {
      linesToReverse = originalLines.filter((l) => l.id === targetLineId)
      if (linesToReverse.length === 0) {
        return { success: false, error: "Target line not found for partial reversal." }
      }
    }

    // Build swapped lines preserving party references
    const reversedRawLines = linesToReverse.map((l) => ({
      account_id: l.account_id,
      debit_amount: l.credit_amount, // SWAPPED
      credit_amount: l.debit_amount, // SWAPPED
      warehouse_id: l.warehouse_id,
      party_type: l.party_type,
      party_id: l.party_id,
      party_name: l.party_name,
    }))

    const desc = targetLineId
      ? `Partial Reversal of ${originalEntry.id} line ${targetLineId}`
      : `Reversal of Entry ${originalEntry.id}: ${originalEntry.description}`

    const result = this.postJournalEntry(
      {
        entry_date: new Date().toISOString().split("T")[0],
        description: desc,
        source_type: "Reversal",
        source_id: originalEntry.id,
        created_by: "System Auditor",
        currency: originalEntry.currency,
        exchange_rate: originalEntry.exchange_rate,
        is_reversal_of: originalEntry.id,
      },
      reversedRawLines
    )

    if (result.success && result.entry) {
      return { success: true, reversalEntry: result.entry }
    }
    return { success: false, error: result.error || "Failed to post reversal entry." }
  }

  // --- Invoice & Payment Actions ---
  public createInvoice(invoiceData: Omit<Invoice, "id" | "amount_paid" | "balance_due">): Invoice {
    const newId = `inv-${Date.now().toString().slice(-4)}`
    const subtotal = invoiceData.line_items.reduce((s, item) => s + item.line_total, 0)
    const discount = invoiceData.discount_amount || 0
    const netSubtotal = Math.max(0, subtotal - discount)
    const tax = invoiceData.tax_amount || 0
    const total = netSubtotal + tax

    const newInv: Invoice = {
      id: newId,
      invoice_number: invoiceData.invoice_number,
      sales_order_id: invoiceData.sales_order_id,
      customer_name: invoiceData.customer_name,
      issue_date: invoiceData.issue_date,
      due_date: invoiceData.due_date,
      currency: invoiceData.currency,
      line_items: invoiceData.line_items,
      subtotal,
      tax_amount: tax,
      discount_amount: discount,
      payment_terms: invoiceData.payment_terms || "Net 30",
      total,
      amount_paid: 0,
      balance_due: total,
      status: invoiceData.status || "Sent",
    }

    this.invoices = [newInv, ...this.invoices]

    // Post corresponding journal entry if not Draft
    if (newInv.status !== "Draft") {
      const arAcc = this.accounts.find((a) => a.code === "1200") || this.accounts[0]
      const salesAcc = this.accounts.find((a) => a.code === "4000") || this.accounts[0]
      const taxAcc = this.accounts.find((a) => a.code === "2210") || this.accounts[0]

      const rawLines: Array<{ account_id: string; debit_amount: number; credit_amount: number; party_type?: any; party_id?: string; party_name?: string }> = [
        {
          account_id: arAcc.id,
          debit_amount: total,
          credit_amount: 0,
          party_type: "Customer",
          party_id: `CUST-${invoiceData.customer_name.replace(/\s+/g, "").toUpperCase()}`,
          party_name: invoiceData.customer_name,
        },
        {
          account_id: salesAcc.id,
          debit_amount: 0,
          credit_amount: netSubtotal,
        },
      ]

      if (tax > 0) {
        rawLines.push({
          account_id: taxAcc ? taxAcc.id : salesAcc.id,
          debit_amount: 0,
          credit_amount: tax,
        })
      }

      this.postJournalEntry(
        {
          entry_date: invoiceData.issue_date,
          description: `Sales Invoice ${invoiceData.invoice_number} for ${invoiceData.customer_name}`,
          source_type: "Sales Invoice",
          source_id: invoiceData.invoice_number,
          created_by: "Billing System",
          currency: invoiceData.currency,
          exchange_rate: 1.0,
        },
        rawLines
      )
    }

    this.notify()
    return newInv
  }

  public updateInvoiceFromSalesOrder(so: { id: string; customer: string; items: Array<{ name: string; qty: number; unit: string; unitPrice: number; total: number }>; amount: number; invoiceIds?: string[] }) {
    const lineItems = (so.items || []).map((i) => ({
      description: `${i.name} (${i.qty} ${i.unit})`,
      quantity: i.qty,
      unit_price: i.unitPrice,
      line_total: i.total,
    }))

    const subtotal = so.amount

    this.invoices = this.invoices.map((inv) => {
      const isMatch = (inv.sales_order_id && inv.sales_order_id === so.id) ||
                      (so.invoiceIds && (so.invoiceIds.includes(inv.id) || so.invoiceIds.includes(inv.invoice_number))) ||
                      inv.invoice_number.includes(so.id) || inv.id.includes(so.id)

      if (isMatch) {
        const taxRate = (inv.tax_amount && inv.subtotal > 0) ? (inv.tax_amount / inv.subtotal) : 0.15
        const tax = Math.round(subtotal * taxRate * 100) / 100
        const total = subtotal + tax
        const newBal = Math.max(0, total - inv.amount_paid)

        // Update corresponding Journal Entry lines if found
        const je = this.entries.find((e) => e.source_id === inv.invoice_number || e.source_id === inv.id || e.source_id === so.id)
        if (je) {
          this.lines = this.lines.map((l) => {
            if (l.journal_entry_id !== je.id) return l
            if (l.debit_amount > 0) return { ...l, debit_amount: total, party_name: so.customer }
            if (l.credit_amount === inv.subtotal) return { ...l, credit_amount: subtotal }
            if (l.credit_amount === inv.tax_amount) return { ...l, credit_amount: tax }
            return { ...l, credit_amount: subtotal }
          })
        }

        return {
          ...inv,
          sales_order_id: so.id,
          customer_name: so.customer,
          line_items: lineItems,
          subtotal,
          tax_amount: tax,
          total,
          balance_due: newBal,
        }
      }
      return inv
    })

    this.notify()
  }

  public cancelInvoice(invoiceId: string) {
    const inv = this.invoices.find((i) => i.id === invoiceId || i.invoice_number === invoiceId)
    if (!inv) return

    this.invoices = this.invoices.map((i) => (i.id === inv.id ? { ...i, status: "Cancelled" as const, balance_due: 0 } : i))

    // Reverse any posted entry for this invoice — pass only the entry ID (no targetLineId)
    const relatedEntry = this.entries.find((e) => e.source_id === inv.invoice_number || e.source_id === inv.id)
    if (relatedEntry) {
      this.reverseJournalEntry(relatedEntry.id)
    }

    this.notify()
  }

  public recordPayment(paymentData: {
    linked_invoice_id: string | null
    amount: number
    currency: string
    date: string
    method: string
    reference: string
    direction: "Received" | "Made"
  }): { payment: Payment; invoice?: Invoice } {
    const payId = `PAY-${Date.now().toString().slice(-4)}`
    const newPayment: Payment = {
      id: payId,
      direction: paymentData.direction,
      linked_invoice_id: paymentData.linked_invoice_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      date: paymentData.date,
      method: paymentData.method,
      reference: paymentData.reference,
    }

    this.payments = [newPayment, ...this.payments]

    let updatedInv: Invoice | undefined

    if (paymentData.linked_invoice_id) {
      let custName = "Customer"
      this.invoices = this.invoices.map((inv) => {
        if (inv.id === paymentData.linked_invoice_id || inv.invoice_number === paymentData.linked_invoice_id) {
          custName = inv.customer_name
          const newPaid = inv.amount_paid + paymentData.amount
          const newBal = Math.max(0, inv.total - newPaid)
          let newStatus: Invoice["status"] = inv.status
          if (newBal === 0) {
            newStatus = "Paid"
          } else if (newPaid > 0) {
            newStatus = "Partially Paid"
          }
          updatedInv = {
            ...inv,
            amount_paid: newPaid,
            balance_due: newBal,
            status: newStatus,
          }
          return updatedInv
        }
        return inv
      })

      // Post corresponding Journal Entry
      const cashAcc = this.accounts.find((a) => a.code === "1000") || this.accounts[0]
      const arAcc = this.accounts.find((a) => a.code === "1200") || this.accounts[0]

      this.postJournalEntry(
        {
          entry_date: paymentData.date,
          description: `Payment receipt (${paymentData.reference}) for Invoice ${paymentData.linked_invoice_id}`,
          source_type: "Payment",
          source_id: payId,
          created_by: "Cashier",
          currency: paymentData.currency,
          exchange_rate: 1.0,
        },
        [
          { account_id: cashAcc.id, debit_amount: paymentData.amount, credit_amount: 0 },
          {
            account_id: arAcc.id,
            debit_amount: 0,
            credit_amount: paymentData.amount,
            party_type: "Customer",
            party_id: `CUST-${custName.replace(/\s+/g, "").toUpperCase()}`,
            party_name: custName,
          },
        ]
      )
    }

    this.notify()
    return { payment: newPayment, invoice: updatedInv }
  }

  // --- Expenses Actions ---
  public addOneOffExpense(exp: Omit<OneOffExpense, "id">): OneOffExpense {
    const newExp: OneOffExpense = {
      ...exp,
      id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
    }
    this.expenses = [newExp, ...this.expenses]
    this.notify()
    return newExp
  }

  public approveOneOffExpense(id: string) {
    this.expenses = this.expenses.map((e) => {
      if (e.id === id) {
        const approved = { ...e, status: "APPROVED" as const }
        
        let targetAcc = e.gl_account_id ? this.accounts.find(a => a.id === e.gl_account_id || a.code === e.gl_account_id) : null
        if (!targetAcc) {
          if (e.category === "Office Rent" || e.category === "Rent") {
            targetAcc = this.accounts.find((a) => a.code === "5100") || this.accounts[0]
          } else if (e.category === "Vehicle Cost" || e.category === "Fleet") {
            targetAcc = this.accounts.find((a) => a.code === "5400") || this.accounts[0]
          } else if (e.category === "Software & SaaS" || e.category === "Infrastructure" || e.category === "Utilities") {
            targetAcc = this.accounts.find((a) => a.code === "5200") || this.accounts[0]
          } else {
            targetAcc = this.accounts.find((a) => a.code === "5300") || this.accounts.find((a) => a.code === "5200") || this.accounts[0]
          }
        }

        const cashAcc = this.accounts.find((a) => a.code === "1000") || this.accounts[0]
        const taxAcc = this.accounts.find((a) => a.code === "2210") || this.accounts[0]
        
        const taxVal = e.tax_amount || 0
        const netExp = Math.max(0, e.amount - taxVal)

        const rawLines: Array<{ account_id: string; debit_amount: number; credit_amount: number; party_type?: any; party_id?: string; party_name?: string }> = [
          { account_id: targetAcc.id, debit_amount: netExp, credit_amount: 0 },
        ]

        if (taxVal > 0) {
          rawLines.push({ account_id: taxAcc.id, debit_amount: taxVal, credit_amount: 0 })
        }

        rawLines.push({ account_id: cashAcc.id, debit_amount: 0, credit_amount: e.amount })

        this.postJournalEntry(
          {
            entry_date: e.date,
            description: `Expense claim approval: ${e.merchant} (${e.category}${e.cost_center ? " - " + e.cost_center : ""})`,
            source_type: "Purchase Invoice",
            source_id: e.id,
            created_by: "Finance Auditor",
            currency: e.currency,
            exchange_rate: 1.0,
          },
          rawLines
        )
        return approved
      }
      return e
    })
    this.notify()
  }

  public rejectOneOffExpense(id: string) {
    this.expenses = this.expenses.map((e) => (e.id === id ? { ...e, status: "REJECTED" as const } : e))
    this.notify()
  }

  public addRecurringSchedule(sch: Omit<RecurringExpenseSchedule, "id">): RecurringExpenseSchedule {
    const newSch: RecurringExpenseSchedule = {
      ...sch,
      id: `SCH-${new Date().getFullYear()}-${String(this.recurringSchedules.length + 1).padStart(3, "0")}`,
    }
    this.recurringSchedules = [newSch, ...this.recurringSchedules]
    this.notify()
    return newSch
  }

  public toggleRecurringScheduleStatus(id: string) {
    this.recurringSchedules = this.recurringSchedules.map((s) =>
      s.id === id ? { ...s, status: s.status === "Active" ? "Paused" : "Active" } : s
    )
    this.notify()
  }

  public generateDueExpenses(): number {
    let count = 0
    this.recurringSchedules.forEach((sch) => {
      if (sch.status === "Active" && sch.auto_generate) {
        this.addOneOffExpense({
          merchant: `${sch.expense_type} (${sch.linked_resource_id || "Overhead"})`,
          category: sch.expense_type,
          date: sch.next_due_date,
          employee: "System Scheduler",
          amount: sch.amount,
          currency: sch.currency,
          cost_center: sch.cost_center || "CC-100 Corporate HQ",
          status: "PENDING",
        })
        count++
      }
    })
    this.notify()
    return count
  }

  // --- Payroll Actions ---
  public postPayrollAccrual(runId: string): { success: boolean; error?: string; entryId?: string } {
    const run = this.payrollRuns.find((r) => r.id === runId)
    if (!run) return { success: false, error: "Payroll run not found." }
    if (run.status !== "Draft") return { success: false, error: `Payroll run is already ${run.status}.` }

    const expenseAcc =
      this.accounts.find((a) => a.id === this.companySettings.payroll_expense_account_id || a.code === "5010") ||
      this.accounts.find((a) => a.code === "5000") ||
      this.accounts[0]

    const taxAcc =
      this.accounts.find((a) => a.id === this.companySettings.tax_payable_account_id || a.code === "2210") ||
      this.accounts.find((a) => a.code === "2200") ||
      this.accounts[0]

    const payableAcc =
      this.accounts.find((a) => a.id === this.companySettings.payroll_payable_account_id || a.code === "2100") ||
      this.accounts[0]

    // Construct raw lines
    // 1. Debit Salaries & Wages Expense for total gross
    const rawLines: Array<{
      account_id: string
      debit_amount: number
      credit_amount: number
      party_type?: "Customer" | "Supplier" | "Employee" | null
      party_id?: string | null
      party_name?: string | null
    }> = [
      {
        account_id: expenseAcc.id,
        debit_amount: run.total_gross,
        credit_amount: 0,
      },
    ]

    // 2. Credit Tax Payable for total deductions
    if (run.total_deductions > 0) {
      rawLines.push({
        account_id: taxAcc.id,
        debit_amount: 0,
        credit_amount: run.total_deductions,
        party_type: "Supplier",
        party_id: "TAX-AUTHORITY",
        party_name: "Revenue Customs Authority",
      })
    }

    // 3. Credit Accrued Payroll for EACH employee individually (party tracking rule)
    run.employees.forEach((emp) => {
      rawLines.push({
        account_id: payableAcc.id,
        debit_amount: 0,
        credit_amount: emp.net_pay,
        party_type: "Employee",
        party_id: emp.employee_id,
        party_name: emp.employee_name,
      })
    })

    const postRes = this.postJournalEntry(
      {
        entry_date: run.period_end,
        description: `Payroll Accrual for ${run.period_label} (Gross: ETB ${run.total_gross.toLocaleString()})`,
        source_type: "Payroll Accrual",
        source_id: run.id,
        created_by: "HR Payroll Admin",
        currency: "ETB",
        exchange_rate: 1.0,
      },
      rawLines
    )

    if (!postRes.success || !postRes.entry) {
      return { success: false, error: postRes.error || "Failed to post payroll accrual journal entry." }
    }

    // Update payroll run status
    this.payrollRuns = this.payrollRuns.map((r) =>
      r.id === runId
        ? {
            ...r,
            status: "Accrued",
            accrual_journal_entry_id: postRes.entry!.id,
          }
        : r
    )

    this.notify()
    return { success: true, entryId: postRes.entry.id }
  }

  public postPayrollPayment(runId: string): { success: boolean; error?: string; entryId?: string } {
    const run = this.payrollRuns.find((r) => r.id === runId)
    if (!run) return { success: false, error: "Payroll run not found." }
    if (run.status !== "Accrued") return { success: false, error: "Payroll run must be in 'Accrued' status before payment disbursement." }

    const payableAcc =
      this.accounts.find((a) => a.id === this.companySettings.payroll_payable_account_id || a.code === "2100") ||
      this.accounts[0]

    const cashAcc = this.accounts.find((a) => a.code === "1000") || this.accounts[0]

    // Construct raw lines:
    // Debit lines per employee against Accrued Payroll (2100)
    const rawLines: Array<{
      account_id: string
      debit_amount: number
      credit_amount: number
      party_type?: "Customer" | "Supplier" | "Employee" | null
      party_id?: string | null
      party_name?: string | null
    }> = []

    run.employees.forEach((emp) => {
      rawLines.push({
        account_id: payableAcc.id,
        debit_amount: emp.net_pay,
        credit_amount: 0,
        party_type: "Employee",
        party_id: emp.employee_id,
        party_name: emp.employee_name,
      })
    })

    // Credit Cash & Bank for total net pay
    rawLines.push({
      account_id: cashAcc.id,
      debit_amount: 0,
      credit_amount: run.total_net,
    })

    const postRes = this.postJournalEntry(
      {
        entry_date: new Date().toISOString().split("T")[0],
        description: `Payroll Payment Disbursement for ${run.period_label} (Net: ETB ${run.total_net.toLocaleString()})`,
        source_type: "Payroll Payment",
        source_id: run.id,
        created_by: "Finance Disburser",
        currency: "ETB",
        exchange_rate: 1.0,
      },
      rawLines
    )

    if (!postRes.success || !postRes.entry) {
      return { success: false, error: postRes.error || "Failed to post payroll payment journal entry." }
    }

    // Update payroll run status
    this.payrollRuns = this.payrollRuns.map((r) =>
      r.id === runId
        ? {
            ...r,
            status: "Paid",
            payment_journal_entry_id: postRes.entry!.id,
          }
        : r
    )

    this.notify()
    return { success: true, entryId: postRes.entry.id }
  }

  // --- Multi-Currency Revaluation Actions ---
  public createRevaluation(data: {
    currency: string
    target_account_id: string
    original_balance: number
    current_rate: number
    revaluation_date: string
  }): { success: boolean; error?: string; revaluation?: Revaluation } {
    // Check if unrealized exchange gain/loss account exists and is active
    const gainLossAccId = this.companySettings.unrealized_exchange_gain_loss_account_id
    const gainLossAcc = this.accounts.find((a) => a.id === gainLossAccId || a.code === "5995")
    if (!gainLossAcc) {
      return {
        success: false,
        error: "Unrealized Exchange Gain/Loss account is not defined in Company Settings or Chart of Accounts.",
      }
    }
    if (!gainLossAcc.is_active) {
      return {
        success: false,
        error: `Account "${gainLossAcc.code} - ${gainLossAcc.name}" is disabled. Revaluation cannot be initiated.`,
      }
    }

    const newBalanceInBase = Math.round(data.original_balance * data.current_rate * 100) / 100
    const oldRate = this.companySettings.exchange_rates[data.currency]
    if (!oldRate) {
      return { success: false, error: `No persisted exchange rate is configured for ${data.currency}.` }
    }
    const oldBalanceInBase = Math.round(data.original_balance * oldRate * 100) / 100
    const unrealizedGainLoss = Math.round((newBalanceInBase - oldBalanceInBase) * 100) / 100

    let maxRevNum = 0
    const currentYear = new Date().getFullYear()
    for (const r of this.revaluations) {
      if (r.id) {
        const match = r.id.match(/\d+$/)
        if (match) {
          const val = parseInt(match[0], 10)
          if (!isNaN(val) && val > maxRevNum) maxRevNum = val
        }
      }
    }
    let nextRevNum = Math.max(maxRevNum + 1, this.revaluations.length + 1)
    let revId = `REV-${currentYear}-${String(nextRevNum).padStart(3, "0")}`
    while (this.revaluations.some((r) => r.id === revId)) {
      nextRevNum++
      revId = `REV-${currentYear}-${String(nextRevNum).padStart(3, "0")}`
    }

    const newRev: Revaluation = {
      id: revId,
      revaluation_date: data.revaluation_date,
      currency: data.currency,
      target_account_id: data.target_account_id,
      original_balance: data.original_balance,
      current_rate: data.current_rate,
      new_balance_in_base: newBalanceInBase,
      unrealized_gain_loss: unrealizedGainLoss,
      journal_entry_id: null,
      status: "Draft", // Always starts as Draft!
    }

    this.revaluations = [newRev, ...this.revaluations]
    this.notify()

    return { success: true, revaluation: newRev }
  }

  public postRevaluation(revaluationId: string): { success: boolean; error?: string; entryId?: string } {
    const rev = this.revaluations.find((r) => r.id === revaluationId)
    if (!rev) return { success: false, error: "Revaluation record not found." }
    if (rev.status !== "Draft") return { success: false, error: `Revaluation is already ${rev.status}.` }

    // Check gain/loss account
    const gainLossAccId = this.companySettings.unrealized_exchange_gain_loss_account_id
    const gainLossAcc = this.accounts.find((a) => a.id === gainLossAccId || a.code === "5995")
    if (!gainLossAcc || !gainLossAcc.is_active) {
      return {
        success: false,
        error: "Unrealized Exchange Gain/Loss account is missing or disabled in Chart of Accounts.",
      }
    }

    const targetAcc = this.accounts.find((a) => a.id === rev.target_account_id || a.code === rev.target_account_id)
    if (!targetAcc || !targetAcc.is_active) {
      return { success: false, error: "Target asset/liability account is missing or disabled." }
    }

    const absAmount = Math.abs(rev.unrealized_gain_loss)
    if (absAmount === 0) {
      return { success: false, error: "Revaluation gain/loss amount is zero. Nothing to post." }
    }

    let rawLines: Array<{ account_id: string; debit_amount: number; credit_amount: number }> = []

    if (rev.unrealized_gain_loss > 0) {
      // Unrealized Gain: Debit Target Account, Credit Gain/Loss Account
      rawLines = [
        { account_id: targetAcc.id, debit_amount: absAmount, credit_amount: 0 },
        { account_id: gainLossAcc.id, debit_amount: 0, credit_amount: absAmount },
      ]
    } else {
      // Unrealized Loss: Credit Target Account, Debit Gain/Loss Account
      rawLines = [
        { account_id: gainLossAcc.id, debit_amount: absAmount, credit_amount: 0 },
        { account_id: targetAcc.id, debit_amount: 0, credit_amount: absAmount },
      ]
    }

    const postRes = this.postJournalEntry(
      {
        entry_date: rev.revaluation_date,
        description: `Multi-Currency Exchange Revaluation for ${rev.currency} (${rev.original_balance} @ ${rev.current_rate} ETB/${rev.currency})`,
        source_type: "Exchange Revaluation",
        source_id: rev.id,
        created_by: "Treasury Auditor",
        currency: "ETB",
        exchange_rate: 1.0,
      },
      rawLines
    )

    if (!postRes.success || !postRes.entry) {
      return { success: false, error: postRes.error || "Failed to post exchange revaluation entry." }
    }

    // Update revaluation status
    this.revaluations = this.revaluations.map((r) =>
      r.id === revaluationId
        ? {
            ...r,
            status: "Posted",
            journal_entry_id: postRes.entry!.id,
          }
        : r
    )

    // Also update exchange rate in company settings
    this.updateExchangeRate(rev.currency, rev.current_rate)

    this.notify()
    return { success: true, entryId: postRes.entry.id }
  }

  public cancelRevaluation(revaluationId: string) {
    this.revaluations = this.revaluations.map((r) => (r.id === revaluationId ? { ...r, status: "Cancelled" } : r))
    this.notify()
  }

  // --- Vehicle Actions ---
  public addVehicle(v: Omit<Vehicle, "id">): Vehicle {
    let maxVehNum = 0
    for (const veh of this.vehicles) {
      if (veh.id) {
        const match = veh.id.match(/\d+$/)
        if (match) {
          const val = parseInt(match[0], 10)
          if (!isNaN(val) && val > maxVehNum) maxVehNum = val
        }
      }
    }
    let nextVehNum = Math.max(maxVehNum + 1, this.vehicles.length + 1)
    let vehId = `VEH-${String(nextVehNum).padStart(3, "0")}`
    while (this.vehicles.some((veh) => veh.id === vehId)) {
      nextVehNum++
      vehId = `VEH-${String(nextVehNum).padStart(3, "0")}`
    }

    const newV: Vehicle = {
      ...v,
      id: vehId,
    }
    this.vehicles = [newV, ...this.vehicles]
    this.notify()
    return newV
  }

  public addVehicleMaintenance(vehicleId: string, maintenance: VehicleMaintenance) {
    const veh = this.vehicles.find((v) => v.id === vehicleId)
    this.vehicles = this.vehicles.map((v) => {
      if (v.id === vehicleId) {
        return {
          ...v,
          maintenance_cost_history: [maintenance, ...v.maintenance_cost_history],
        }
      }
      return v
    })

    // Post GL entry for vehicle repair & fleet expense
    const fleetAcc = this.accounts.find((a) => a.code === "5400") || this.accounts[0]
    const cashAcc = this.accounts.find((a) => a.code === "1000") || this.accounts[0]

    this.postJournalEntry(
      {
        entry_date: maintenance.date,
        description: `Fleet Vehicle Repair: ${veh?.registration_number || vehicleId} - ${maintenance.description}`,
        source_type: "Manual Adjustment",
        source_id: vehicleId,
        created_by: "Fleet Auditor",
        currency: "ETB",
        exchange_rate: 1.0,
      },
      [
        { account_id: fleetAcc.id, debit_amount: maintenance.amount, credit_amount: 0 },
        { account_id: cashAcc.id, debit_amount: 0, credit_amount: maintenance.amount },
      ]
    )

    this.notify()
  }

  // --- Trial Balance Calculation ---
  public getTrialBalance(): {
    rows: Array<{
      account_id: string
      code: string
      name: string
      account_type: string
      debit_sum: number
      credit_sum: number
      net_balance: number
    }>
    totalDebits: number
    totalCredits: number
    isBalanced: boolean
  } {
    const accountMap = new Map<
      string,
      { code: string; name: string; account_type: string; debit_sum: number; credit_sum: number }
    >()

    // Initialize map with active accounts
    this.accounts.forEach((acc) => {
      accountMap.set(acc.id, {
        code: acc.code,
        name: acc.name,
        account_type: acc.account_type,
        debit_sum: 0,
        credit_sum: 0,
      })
    })

    // Sum lines
    this.lines.forEach((line) => {
      let acc = accountMap.get(line.account_id)
      if (!acc) {
        const matched = this.accounts.find((a) => a.code === line.account_id || a.id === line.account_id)
        if (matched) {
          acc = accountMap.get(matched.id)
        }
      }
      if (acc) {
        acc.debit_sum += line.debit_amount
        acc.credit_sum += line.credit_amount
      }
    })

    const rows = Array.from(accountMap.entries()).map(([id, val]) => ({
      account_id: id,
      code: val.code,
      name: val.name,
      account_type: val.account_type,
      debit_sum: Math.round(val.debit_sum * 100) / 100,
      credit_sum: Math.round(val.credit_sum * 100) / 100,
      net_balance: Math.round((val.debit_sum - val.credit_sum) * 100) / 100,
    }))

    const totalDebits = Math.round(rows.reduce((sum, r) => sum + r.debit_sum, 0) * 100) / 100
    const totalCredits = Math.round(rows.reduce((sum, r) => sum + r.credit_sum, 0) * 100) / 100
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

    return { rows, totalDebits, totalCredits, isBalanced }
  }

  // --- Account Updates ---
  public updateAccount(id: string, updated: Partial<AccountItem>): { success: boolean; error?: string } {
    const accIndex = this.accounts.findIndex((a) => a.id === id || a.code === id)
    if (accIndex === -1) return { success: false, error: "Account not found." }

    // If changing code, verify uniqueness
    if (updated.code && updated.code !== this.accounts[accIndex].code) {
      if (this.accounts.some((a) => a.code === updated.code)) {
        return { success: false, error: `Account code "${updated.code}" already exists.` }
      }
    }

    this.accounts = this.accounts.map((a) =>
      a.id === id || a.code === id ? { ...a, ...updated } : a
    )
    this.notify()
    return { success: true }
  }

  public deleteAccount(id: string): { success: boolean; error?: string } {
    // Prevent deletion if account is referenced in journal entry lines
    const isReferenced = this.lines.some((l) => l.account_id === id || l.account_id === `ACC-${id}`)
    if (isReferenced) {
      return { success: false, error: "Cannot delete account: it has transactions posted against it." }
    }
    // Prevent deletion if it has children
    const hasChildren = this.accounts.some((a) => a.parent_account_id === id || a.parent_account_id === this.accounts.find(x => x.id === id)?.code)
    if (hasChildren) {
      return { success: false, error: "Cannot delete account: it has sub-accounts." }
    }
    this.accounts = this.accounts.filter((a) => a.id !== id && a.code !== id)
    void deleteResource("chart_of_accounts", id)
    this.notify()
    return { success: true }
  }

  // --- Fixed Assets Actions ---
  public getFixedAssets(): FixedAsset[] {
    return [...this.fixedAssets]
  }

  public addFixedAsset(asset: Omit<FixedAsset, "id" | "depreciation_schedule" | "accumulatedDepreciation" | "status">): FixedAsset {
    const newId = `AST-${String(this.fixedAssets.length + 1).padStart(3, "0")}`
    const newAsset: FixedAsset = {
      ...asset,
      id: newId,
      status: "Draft",
      accumulatedDepreciation: 0,
      depreciation_schedule: helperGenerateDeprSchedule(
        asset.cost,
        asset.salvageValue,
        asset.usefulLifeYears,
        asset.depreciationStartDate,
        0
      ),
    }
    this.fixedAssets = [newAsset, ...this.fixedAssets]
    this.notify()
    return newAsset
  }

  public updateFixedAsset(id: string, updated: Partial<FixedAsset>) {
    this.fixedAssets = this.fixedAssets.map((asset) => {
      if (asset.id === id) {
        const merged = { ...asset, ...updated }
        // If cost, salvage, useful life, or start date changes, regenerate schedule
        if (
          (updated.cost !== undefined ||
            updated.salvageValue !== undefined ||
            updated.usefulLifeYears !== undefined ||
            updated.depreciationStartDate !== undefined) &&
          asset.status !== "Disposed"
        ) {
          merged.depreciation_schedule = helperGenerateDeprSchedule(
            merged.cost,
            merged.salvageValue,
            merged.usefulLifeYears,
            merged.depreciationStartDate,
            merged.accumulatedDepreciation
          )
        }
        return merged
      }
      return asset
    })
    this.notify()
  }

  public deleteFixedAsset(id: string): { success: boolean; error?: string } {
    const asset = this.fixedAssets.find((a) => a.id === id)
    if (!asset) return { success: false, error: "Asset not found." }
    if (asset.status === "Active" && asset.accumulatedDepreciation > 0) {
      return { success: false, error: "Cannot delete asset: it has posted depreciation history." }
    }
    this.fixedAssets = this.fixedAssets.filter((a) => a.id !== id)
    void deleteResource("fixed_assets", id)
    this.notify()
    return { success: true }
  }

  public postDepreciationEntry(assetId: string, scheduleItemId: string): { success: boolean; error?: string } {
    const assetIndex = this.fixedAssets.findIndex((a) => a.id === assetId)
    if (assetIndex === -1) return { success: false, error: "Asset not found." }

    const asset = this.fixedAssets[assetIndex]
    const schedItem = asset.depreciation_schedule.find((s) => s.id === scheduleItemId)
    if (!schedItem) return { success: false, error: "Schedule line not found." }
    if (schedItem.status === "Posted") return { success: false, error: "Depreciation is already posted." }

    // Find accounts
    const depExpenseAcc = this.accounts.find((a) => a.code === asset.depreciation_expense_account_id || a.id === asset.depreciation_expense_account_id || a.code === "6500")
    const accumDepAcc = this.accounts.find((a) => a.code === asset.accumulated_depreciation_account_id || a.id === asset.accumulated_depreciation_account_id || a.code === "1510")

    if (!depExpenseAcc || !depExpenseAcc.is_active) {
      return { success: false, error: "Depreciation expense account is missing or disabled." }
    }
    if (!accumDepAcc || !accumDepAcc.is_active) {
      return { success: false, error: "Accumulated depreciation account is missing or disabled." }
    }

    // Post Journal Entry
    const postRes = this.postJournalEntry(
      {
        entry_date: schedItem.depreciation_date,
        description: `Depreciation Posting for Asset: ${asset.name} (${asset.id})`,
        source_type: "Manual Adjustment",
        source_id: asset.id,
        created_by: "Asset Manager",
        currency: "ETB",
        exchange_rate: 1.0,
      },
      [
        { account_id: depExpenseAcc.id, debit_amount: schedItem.depreciation_amount, credit_amount: 0 },
        { account_id: accumDepAcc.id, debit_amount: 0, credit_amount: schedItem.depreciation_amount },
      ]
    )

    if (!postRes.success || !postRes.entry) {
      return { success: false, error: postRes.error || "Failed to post journal entry." }
    }

    // Update asset
    const newAccum = Math.round((asset.accumulatedDepreciation + schedItem.depreciation_amount) * 100) / 100
    const fullyDepr = newAccum >= asset.cost - asset.salvageValue

    this.fixedAssets = this.fixedAssets.map((ast) => {
      if (ast.id === assetId) {
        const updatedSchedule = ast.depreciation_schedule.map((item) =>
          item.id === scheduleItemId
            ? { ...item, status: "Posted" as const, journal_entry_id: postRes.entry!.id }
            : item
        )
        return {
          ...ast,
          accumulatedDepreciation: newAccum,
          status: fullyDepr ? ("Fully Depreciated" as const) : ("Active" as const),
          depreciation_schedule: updatedSchedule,
        }
      }
      return ast
    })

    this.notify()
    return { success: true }
  }

  public disposeFixedAsset(assetId: string, salesAmount: number, cashAccountCode: string): { success: boolean; error?: string } {
    const asset = this.fixedAssets.find((a) => a.id === assetId)
    if (!asset) return { success: false, error: "Asset not found." }
    if (asset.status === "Disposed") return { success: false, error: "Asset is already disposed." }

    const assetAcc = this.accounts.find((a) => a.code === asset.asset_account_id || a.id === asset.asset_account_id)
    const accumAcc = this.accounts.find((a) => a.code === asset.accumulated_depreciation_account_id || a.id === asset.accumulated_depreciation_account_id)
    const cashAcc = this.accounts.find((a) => a.code === cashAccountCode || a.id === cashAccountCode)
    const lossAcc = this.accounts.find((a) => a.code === "6550" || a.id === "acc-6550") || this.accounts[0]

    if (!assetAcc || !accumAcc || !cashAcc) {
      return { success: false, error: "Required accounts (Asset, Accumulated Depr, or Cash/Bank) are missing." }
    }

    const netBookValue = Math.round((asset.cost - asset.accumulatedDepreciation) * 100) / 100
    const gainLoss = Math.round((salesAmount - netBookValue) * 100) / 100

    const rawLines: any[] = [
      { account_id: cashAcc.id, debit_amount: salesAmount, credit_amount: 0 },
      { account_id: accumAcc.id, debit_amount: asset.accumulatedDepreciation, credit_amount: 0 },
      { account_id: assetAcc.id, debit_amount: 0, credit_amount: asset.cost },
    ]

    if (gainLoss > 0) {
      // Credit Gain/Loss account (Revenue)
      rawLines.push({ account_id: lossAcc.id, debit_amount: 0, credit_amount: gainLoss })
    } else if (gainLoss < 0) {
      // Debit Gain/Loss account (Expense)
      rawLines.push({ account_id: lossAcc.id, debit_amount: Math.abs(gainLoss), credit_amount: 0 })
    }

    const postRes = this.postJournalEntry(
      {
        entry_date: new Date().toISOString().split("T")[0],
        description: `Disposal of Fixed Asset: ${asset.name} (${asset.id}). Sold for ETB ${salesAmount.toLocaleString()}`,
        source_type: "Manual Adjustment",
        source_id: asset.id,
        created_by: "Asset Manager",
        currency: "ETB",
        exchange_rate: 1.0,
      },
      rawLines
    )

    if (!postRes.success) {
      return { success: false, error: postRes.error }
    }

    this.fixedAssets = this.fixedAssets.map((ast) =>
      ast.id === assetId ? { ...ast, status: "Disposed" as const } : ast
    )
    this.notify()
    return { success: true }
  }

  // --- Tax Rules Actions ---
  public getTaxRules(): TaxRule[] {
    return [...this.taxRules]
  }

  public addTaxRule(rule: Omit<TaxRule, "id">): TaxRule {
    const newId = `TAX-${String(this.taxRules.length + 1).padStart(2, "0")}`
    const newRule = { ...rule, id: newId }
    this.taxRules = [...this.taxRules, newRule]
    this.notify()
    return newRule
  }

  public updateTaxRule(id: string, updated: Partial<TaxRule>) {
    this.taxRules = this.taxRules.map((t) => (t.id === id ? { ...t, ...updated } : t))
    this.notify()
  }

  public deleteTaxRule(id: string): { success: boolean; error?: string } {
    this.taxRules = this.taxRules.filter((t) => t.id !== id)
    void deleteResource("tax_rules", id)
    this.notify()
    return { success: true }
  }

  // --- Accounting Periods Actions ---
  public addAccountingPeriod(p: Omit<AccountingPeriod, "id">): AccountingPeriod {
    const newId = `PRD-${String(this.periods.length + 1).padStart(3, "0")}`
    const newPeriod = { ...p, id: newId }
    this.periods = [...this.periods, newPeriod]
    this.notify()
    return newPeriod
  }

  public updateAccountingPeriod(id: string, updated: Partial<AccountingPeriod>) {
    this.periods = this.periods.map((p) => (p.id === id ? { ...p, ...updated } : p))
    this.notify()
  }

  public deleteAccountingPeriod(id: string) {
    this.periods = this.periods.filter((p) => p.id !== id)
    void deleteResource("accounting_periods", id)
    this.notify()
  }

  // --- Fiscal Year / Period Closing Voucher ---
  public closeAccountingPeriod(periodId: string, retainedEarningsAccCode: string): { success: boolean; error?: string } {
    const period = this.periods.find((p) => p.id === periodId)
    if (!period) return { success: false, error: "Accounting period not found." }
    if (period.is_closed) return { success: false, error: "Period is already closed." }

    // 1. Calculate trial balance
    const tb = this.getTrialBalance().rows
    // 2. Filter for Revenue (4xxx) and Expense (5xxx, 6xxx) accounts
    const plRows = tb.filter((r) => r.account_type === "Revenue" || r.account_type === "Expense")
    const closingLines: any[] = []
    let totalClosingDebit = 0
    let totalClosingCredit = 0

    plRows.forEach((r) => {
      if (r.net_balance > 0) {
        // Debit is higher (typically expense). Credit it to zero out.
        closingLines.push({
          account_id: r.account_id,
          debit_amount: 0,
          credit_amount: r.net_balance,
        })
        totalClosingCredit += r.net_balance
      } else if (r.net_balance < 0) {
        // Credit is higher (typically revenue). Debit it to zero out.
        const amt = Math.abs(r.net_balance)
        closingLines.push({
          account_id: r.account_id,
          debit_amount: amt,
          credit_amount: 0,
        })
        totalClosingDebit += amt
      }
    })

    if (closingLines.length === 0) {
      // No revenues/expenses to roll over. Just lock the period.
      this.periods = this.periods.map((p) => (p.id === periodId ? { ...p, is_closed: true } : p))
      this.notify()
      return { success: true }
    }

    const diff = totalClosingDebit - totalClosingCredit
    const retainedEarningsAcc =
      this.accounts.find((a) => a.code === retainedEarningsAccCode || a.id === retainedEarningsAccCode) ||
      this.accounts.find((a) => a.code === "3000") ||
      this.accounts[0]

    if (Math.abs(diff) > 0.001) {
      if (diff > 0) {
        // Net Profit (Revenue > Expense): Credit Retained Earnings
        closingLines.push({
          account_id: retainedEarningsAcc.id,
          debit_amount: 0,
          credit_amount: Math.round(diff * 100) / 100,
        })
      } else {
        // Net Loss (Expense > Revenue): Debit Retained Earnings
        closingLines.push({
          account_id: retainedEarningsAcc.id,
          debit_amount: Math.round(Math.abs(diff) * 100) / 100,
          credit_amount: 0,
        })
      }
    }

    // Post Journal Entry (We temporarily skip locked check for this entry by posting it before we lock)
    const postRes = this.postJournalEntry(
      {
        entry_date: period.end_date,
        description: `Period Closing Voucher for ${period.period_label} - Retained Earnings Rollover`,
        source_type: "Manual Adjustment",
        source_id: period.id,
        created_by: "System Year-End Process",
        currency: "ETB",
        exchange_rate: 1.0,
      },
      closingLines
    )

    if (!postRes.success) {
      return { success: false, error: postRes.error }
    }

    // Lock the period now
    this.periods = this.periods.map((p) => (p.id === periodId ? { ...p, is_closed: true } : p))
    this.notify()
    return { success: true }
  }

  // --- Expense, Schedule, and Vehicle CRUD ---
  public updateOneOffExpense(id: string, updated: Partial<OneOffExpense>) {
    this.expenses = this.expenses.map((e) => (e.id === id ? { ...e, ...updated } : e))
    this.notify()
  }

  public deleteOneOffExpense(id: string) {
    this.expenses = this.expenses.filter((e) => e.id !== id)
    void deleteResource("expenses", id)
    this.notify()
  }

  public updateRecurringSchedule(id: string, updated: Partial<RecurringExpenseSchedule>) {
    this.recurringSchedules = this.recurringSchedules.map((s) => (s.id === id ? { ...s, ...updated } : s))
    this.notify()
  }

  public deleteRecurringSchedule(id: string) {
    this.recurringSchedules = this.recurringSchedules.filter((s) => s.id !== id)
    void deleteResource("recurring_expense_schedules", id)
    this.notify()
  }

  public updateVehicle(id: string, updated: Partial<Vehicle>) {
    this.vehicles = this.vehicles.map((v) => (v.id === id ? { ...v, ...updated } : v))
    this.notify()
  }

  public deleteVehicle(id: string) {
    this.vehicles = this.vehicles.filter((v) => v.id !== id)
    void deleteResource("vehicles", id)
    this.notify()
  }

  public clearAllTestingData() {
    this.invoices = []
    this.entries = []
    this.lines = []
    this.payments = []
    this.recurringSchedules = []
    this.expenses = []
    this.notify()
  }
}

export const financeStore = new FinanceStore()

export function useFinanceStore() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsubscribe = financeStore.subscribe(() => {
      setTick((t) => t + 1)
    })
    const refresh = () => void financeStore.reloadFromApi()
    const interval = window.setInterval(refresh, 30_000)
    window.addEventListener("focus", refresh)
    return () => {
      unsubscribe()
      window.clearInterval(interval)
      window.removeEventListener("focus", refresh)
    }
  }, [])

  // Return the store directly — pages call store.isLoading() / store.getLoadError()
  // for error-state awareness without requiring call-site changes.
  return financeStore
}
