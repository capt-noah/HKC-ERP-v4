import { Routes, Route, Navigate } from "react-router-dom"
import SalesDashboard from "@/pages/sales/SalesDashboard"
import SalesIssued from "@/pages/sales/SalesIssued"
import HkcDocs from "@/pages/sales/HkcDocs"
import ProcessingServices from "@/pages/sales/ProcessingServices"
import CreditSalesAttachment from "@/pages/sales/CreditSalesAttachment"
import PurchaseOrders from "@/pages/PurchaseOrders"
import SalesOrders from "@/pages/SalesOrders"
import InventoryDashboard from "@/pages/inventory/InventoryDashboard"
import StockProducts from "@/pages/inventory/StockProducts"
import AddStockItem from "@/pages/inventory/AddStockItem"
import Reports from "@/pages/inventory/Reports"
import HRDashboard from "@/pages/HRDashboard"
import ControlCenter from "@/pages/ControlCenter"
import FinanceOverview from "@/pages/finance/FinanceOverview"
import Ledger from "@/pages/finance/Ledger"
import Invoices from "@/pages/finance/Invoices"
import Expenses from "@/pages/finance/Expenses"
import Banking from "@/pages/finance/Banking"
import Assets from "@/pages/finance/Assets"
import Taxes from "@/pages/finance/Taxes"
import FinancialReports from "@/pages/finance/FinancialReports"
import Employees from "@/pages/hr/Employees"
import Payroll from "@/pages/hr/Payroll"
import Attendance from "@/pages/hr/Attendance"
import Leave from "@/pages/hr/Leave"
import UserManagement from "@/pages/admin/UserManagement"
import PartnersRegistry from "@/pages/admin/PartnersRegistry"
import AdminSettings from "@/pages/admin/AdminSettings"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/sales" replace />} />

      {/* Sales section */}
      <Route path="/sales" element={<SalesDashboard />} />
      <Route path="/sales/hkc-docs" element={<HkcDocs />} />
      <Route path="/sales/processing-services" element={<Navigate to="/inventory/processing-services" replace />} />
      <Route path="/sales/sales-issued" element={<SalesIssued />} />
      <Route path="/sales/sales-issued/:id/attachment" element={<CreditSalesAttachment />} />
      <Route path="/sales/sales-orders" element={<SalesOrders />} />
      <Route path="/sales/quotations" element={<Navigate to="/sales/sales-orders" replace />} />
      <Route path="/sales/delivery-notes" element={<Navigate to="/sales/sales-orders" replace />} />
      <Route path="/sales/purchase-orders" element={<PurchaseOrders />} />

      {/* Inventory section */}
      <Route path="/inventory" element={<InventoryDashboard />} />
      <Route path="/inventory/stock" element={<StockProducts />} />
      <Route path="/inventory/processing-services" element={<ProcessingServices />} />
      <Route path="/inventory/toll-processing" element={<Navigate to="/inventory/processing-services" replace />} />
      <Route path="/inventory/stock/add-item" element={<AddStockItem />} />
      <Route path="/inventory/reports" element={<Reports />} />

      {/* Finance section */}
      <Route path="/finance" element={<FinanceOverview />} />
      <Route path="/finance/ledger" element={<Ledger />} />
      <Route path="/finance/invoices" element={<Invoices />} />
      <Route path="/finance/expenses" element={<Expenses />} />
      <Route path="/finance/banking" element={<Banking />} />
      <Route path="/finance/assets" element={<Assets />} />
      <Route path="/finance/taxes" element={<Taxes />} />
      <Route path="/finance/reports" element={<FinancialReports />} />

      {/* HR section */}
      <Route path="/hr" element={<HRDashboard />} />
      <Route path="/hr/employees" element={<Employees />} />
      <Route path="/hr/attendance" element={<Attendance />} />
      <Route path="/hr/leave" element={<Leave />} />
      <Route path="/hr/payroll" element={<Payroll />} />
      <Route path="/hr/attendance-leave" element={<Navigate to="/hr/attendance" replace />} />
      <Route path="/hr/recruitment" element={<Navigate to="/hr" replace />} />
      <Route path="/hr/onboarding-separation" element={<Navigate to="/hr" replace />} />

      {/* Admin section */}
      <Route path="/admin" element={<ControlCenter />} />
      <Route path="/admin/users" element={<UserManagement />} />
      <Route path="/admin/partners" element={<PartnersRegistry />} />
      <Route path="/admin/settings" element={<AdminSettings />} />
    </Routes>
  )
}

export default App
