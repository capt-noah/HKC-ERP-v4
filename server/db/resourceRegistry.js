const jsonb = { storage: "jsonb_document" }

export const resources = {
  warehouses: { table: "warehouses", module: "inventory", ...jsonb },
  inventory_products: { table: "inventory_products", module: "inventory", ...jsonb },
  bin_cards: { table: "bin_cards", module: "inventory", ...jsonb },
  stock_movements: { table: "stock_movements", module: "inventory", ...jsonb },
  store_transfers: { table: "store_transfers", module: "inventory", ...jsonb },
  sales_orders: { table: "sales_orders", module: "sales", ...jsonb },
  quotations: { table: "quotations", module: "sales", ...jsonb },
  delivery_notes: { table: "delivery_notes", module: "sales", ...jsonb },
  purchase_orders: { table: "purchase_orders", module: "sales", ...jsonb },
  sales_issues: { table: "sales_issues", module: "sales", storage: "relational" },
  customers: { table: "customers", module: "sales", ...jsonb },
  suppliers: { table: "suppliers", module: "sales", ...jsonb },
  users: { table: "users", module: "admin", storage: "relational" },
  user_activity_logs: { table: "user_activity_logs", module: "admin", storage: "relational" },
  hkc_doc_records: { table: "hkc_doc_records", module: "sales", ...jsonb },
  processing_services: { table: "processing_services", module: "sales", storage: "relational" },
  shipment_documents: { table: "shipment_documents", module: "sales", storage: "relational" },
  shipment_document_officers: { table: "shipment_document_officers", module: "sales", storage: "relational" },

  chart_of_accounts: { table: "chart_of_accounts", module: "finance", ...jsonb },
  journal_entries: { table: "journal_entries", module: "finance", ...jsonb },
  journal_entry_lines: { table: "journal_entry_lines", module: "finance", ...jsonb },
  invoices: { table: "invoices", module: "finance", ...jsonb },
  payments: { table: "payments", module: "finance", ...jsonb },
  expenses: { table: "expenses", module: "finance", ...jsonb },
  recurring_expense_schedules: { table: "recurring_expense_schedules", module: "finance", ...jsonb },
  vehicles: { table: "vehicles", module: "finance", ...jsonb },
  accounting_periods: { table: "accounting_periods", module: "finance", ...jsonb },
  company_settings: { table: "company_settings", module: "finance", ...jsonb },
  payroll_runs: { table: "payroll_runs", module: "finance", ...jsonb },
  revaluations: { table: "revaluations", module: "finance", ...jsonb },
  fixed_assets: { table: "fixed_assets", module: "finance", ...jsonb },
  tax_rules: { table: "tax_rules", module: "finance", ...jsonb },
  tax_schedules: { table: "tax_schedules", module: "finance", ...jsonb },

  employees: { table: "employees", module: "hr", ...jsonb },
  attendance_records: { table: "attendance_records", module: "hr", ...jsonb },
  payroll_periods: { table: "payroll_periods", module: "hr", ...jsonb },
  payroll_records: { table: "payroll_records", module: "hr", ...jsonb },
  departments: { table: "departments", module: "hr", ...jsonb },
  designations: { table: "designations", module: "hr", ...jsonb },
  job_openings: { table: "job_openings", module: "hr", ...jsonb },
  job_applicants: { table: "job_applicants", module: "hr", ...jsonb },
  onboardings: { table: "onboardings", module: "hr", ...jsonb },
  separations: { table: "separations", module: "hr", ...jsonb },
  leave_types: { table: "leave_types", module: "hr", ...jsonb },
  leave_requests: { table: "leave_requests", module: "hr", ...jsonb },
  expense_claims: { table: "expense_claims", module: "hr", ...jsonb },
  appraisals: { table: "appraisals", module: "hr", ...jsonb },
  training_programs: { table: "training_programs", module: "hr", ...jsonb },

  cost_center_budgets: { table: "cost_center_budgets", module: "finance", planned: true, ...jsonb },
}

export function getResource(name) {
  return resources[name] || null
}

export function listResources() {
  return Object.entries(resources).map(([name, value]) => ({ name, ...value }))
}
