import type { NavSection, NavChild } from "@/components/FloatingNav"

export const navSections: NavSection[] = [
  {
    label: "Sales",
    path: "/sales",
    children: [
      { label: "Dashboard", path: "/sales" },
      { label: "Sales Issued", path: "/sales/sales-issued" },
      { label: "Sales Orders", path: "/sales/sales-orders" },
      { label: "Purchase Orders", path: "/sales/purchase-orders" },
    ],
  },
  {
    label: "HKC Docs",
    path: "/sales/hkc-docs",
  },
  {
    label: "Inventory",
    path: "/inventory",
    children: [
      { label: "Dashboard", path: "/inventory" },
      { label: "Stock", path: "/inventory/stock" },
      { label: "Bin Card", path: "/inventory/bin-card" },
      { label: "Processing Services", path: "/inventory/processing-services" },
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
      { label: "Attendance", path: "/hr/attendance" },
      { label: "Leave", path: "/hr/leave" },
      { label: "Payroll", path: "/hr/payroll" },
    ],
  },
  {
    label: "Admin",
    path: "/admin",
    children: [
      { label: "Control Center", path: "/admin" },
      { label: "User Management", path: "/admin/users" },
      { label: "Partners Registry", path: "/admin/partners" },
      { label: "Settings", path: "/admin/settings" },
    ],
  },
]

export function getSectionChildren(sectionPath: string): NavChild[] {
  const section = navSections.find((s) => s.path === sectionPath)
  return section?.children ?? []
}
