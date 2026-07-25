import type { NavSection, NavChild } from "@/components/FloatingNav"

export const navSections: NavSection[] = [
  {
    label: "Sales",
    path: "/sales",
    children: [
      { label: "Dashboard", path: "/sales" },
      { label: "Sales Issued", path: "/sales/sales-issued" },
      { label: "Sales Orders", path: "/sales/sales-orders" },
      { label: "Quotations", path: "/sales/quotations" },
      { label: "Delivery Notes", path: "/sales/delivery-notes" },
      { label: "Purchase Orders", path: "/sales/purchase-orders" },
    ],
  },
  {
    label: "Inventory",
    path: "/inventory",
    children: [
      { label: "Dashboard", path: "/inventory" },
      { label: "Stock Registration", path: "/inventory/stock" },
      { label: "Add Item", path: "/inventory/stock/add-item" },
      { label: "Stock In", path: "/inventory/stock" },
      { label: "Stock Out", path: "/inventory/stock" },
      { label: "Stock Transfer", path: "/inventory/stock" },
      { label: "Stock Adjustment", path: "/inventory/stock" },
      { label: "Damage / Loss", path: "/inventory/stock" },
      { label: "Inventory Reports", path: "/inventory/reports" },
    ],
  },
  {
    label: "Finance",
    path: "/finance",
    children: [
      { label: "Overview", path: "/finance" },
      { label: "Ledger", path: "/finance/ledger" },
      { label: "Invoices", path: "/finance/invoices" },
      { label: "Expenses", path: "/finance/expenses" },
      { label: "Banking", path: "/finance/banking" },
      { label: "Assets", path: "/finance/assets" },
      { label: "Taxes", path: "/finance/taxes" },
      { label: "Reports", path: "/finance/reports" },
    ],
  },
  {
    label: "HR",
    path: "/hr",
    children: [
      { label: "Dashboard", path: "/hr" },
      { label: "Employees", path: "/hr/employees" },
      { label: "Payroll", path: "/hr/payroll" },
      { label: "Attendance & Leave", path: "/hr/attendance-leave" },
      { label: "Recruitment", path: "/hr/recruitment" },
      { label: "Onboarding & Separation", path: "/hr/onboarding-separation" },
    ],
  },
  {
    label: "Admin",
    path: "/admin",
    children: [
      { label: "Control Center", path: "/admin" },
      { label: "User Management", path: "/admin/users" },
      { label: "Settings", path: "/admin/settings" },
    ],
  },
]

export function getSectionChildren(sectionPath: string): NavChild[] {
  const section = navSections.find((s) => s.path === sectionPath)
  return section?.children ?? []
}
