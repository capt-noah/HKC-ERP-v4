import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  AlertCircle,
  ArrowUpRight,
  Database,
  DollarSign,
  Package,
  Settings,
  Shield,
  Users,
  Activity,
  Search,
  Filter,
  Calendar,
  MapPin,
  RefreshCw,
  Info,
  Loader2,
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore } from "@/lib/erpStore"
import { useFinanceStore } from "@/lib/financeStore"
import { type HRData, loadHRData, money } from "@/lib/hrApi"
import { loadResource } from "@/lib/apiPersistence"
import { cn } from "@/lib/utils"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

const emptyHRData: HRData = { employees: [], attendance: [], leaves: [], payrollPeriods: [], payrollRecords: [] }

export interface UserAccount {
  id: string
  username: string
  fullname: string
  roles: string[]
  status: "active" | "suspended"
  employee_id: string | null
  warehouse_ids?: string[]
}

export interface UserActivityLog {
  id: string
  user_id: string | null
  username: string
  fullname?: string
  action: string
  resource: string
  details?: {
    path?: string
    ip?: string
    itemId?: string
  }
  created_at: string
}

function latestTimestamp(value?: { created_at?: string; updated_at?: string; date?: string; sale_date?: string; entry_date?: string }) {
  return value?.updated_at || value?.created_at || value?.date || value?.sale_date || value?.entry_date || ""
}

const roleLabels: Record<string, string> = {
  superadmin: "Super Admin",
  sales_manager: "Sales Manager",
  hr_manager: "HR Manager",
  finance_manager: "Finance Manager",
  hkc_docs_manager: "HKC Docs Manager",
  inventory_admin: "Inventory Admin",
}

const resourceLabels: Record<string, string> = {
  auth: "Authentication",
  users: "User Accounts",
  partners: "Partners Directory",
  employees: "Employee Profiles",
  attendance_records: "Attendance Log",
  leave_requests: "Leave Management",
  payroll_records: "Payroll Records",
  warehouses: "Warehouses Scope",
  inventory_products: "Products Registry",
  stock_movements: "Stock Ledger",
  store_transfers: "Store Transfers",
  sales_orders: "Sales Orders",
  quotations: "Quotations",
  purchase_orders: "Purchase Orders",
  sales_issues: "Issued Sales",
  customers: "Customers Directory",
  suppliers: "Suppliers Directory",
  shipment_documents: "HKC Documents",
  chart_of_accounts: "Chart of Accounts",
  journal_entries: "General Journal",
  invoices: "Accounts Receivable Invoices",
  payments: "Cash Accounts / Banking",
  expenses: "Audit Expenses Claims",
  fixed_assets: "Fixed Assets Registry",
  tax_rules: "Tax Settings",
  company_settings: "System Configuration",
}

export default function ControlCenter() {
  const erp = useErpStore()
  const finance = useFinanceStore()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<"overview" | "logs">("overview")

  // Data states
  const [hrData, setHrData] = useState<HRData>(emptyHRData)
  const [hrError, setHrError] = useState("")

  const [logs, setLogs] = useState<UserActivityLog[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Filters state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState("All")
  const [selectedModule, setSelectedModule] = useState("All")
  const [selectedAction, setSelectedAction] = useState("All")
  const [selectedTimeframe, setSelectedTimeframe] = useState("All")

  // Load standard overview HR data
  useEffect(() => {
    let cancelled = false
    loadHRData()
      .then((data) => {
        if (!cancelled) setHrData(data)
      })
      .catch((error) => {
        if (!cancelled) setHrError(error instanceof Error ? error.message : "Failed to load HR data.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load audit logs and user context
  const fetchAuditLogsData = async () => {
    setLogsLoading(true)
    try {
      const [logsData, usersData] = await Promise.all([
        loadResource<UserActivityLog>("user_activity_logs"),
        loadResource<UserAccount>("users"),
      ])
      // Sort logs by date descending
      setLogs(logsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      setUsers(usersData)
    } catch (err: any) {
      console.error("[AUDIT LOGS FETCH ERROR]:", err.message)
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogsData()
  }, [])

  const inventoryValue = erp.getProducts().reduce((sum, product) => sum + Number(product.totalStockValue ?? Number(product.quantity || 0) * Number(product.unitCost || 0)), 0)
  const lowStock = erp.getProducts().filter((product) => product.status === "Low Stock" || Number(product.quantity || 0) <= Number(product.reorderLevel || 0)).length
  const postedRevenue = finance.getJournalEntryLines().reduce((sum, line) => {
    const account = finance.getAccounts().find((item) => item.id === line.account_id)
    return account?.account_type === "Revenue" ? sum + Number(line.credit_amount || 0) - Number(line.debit_amount || 0) : sum
  }, 0)

  // Legacy transaction feed
  const activity = useMemo(() => {
    return [
      ...erp.getStockMovements().map((item) => ({
        label: item.productName,
        sub: `${item.type} - ${Number(item.qty || 0).toLocaleString()} ${item.unit}`,
        time: latestTimestamp(item),
      })),
      ...finance.getJournalEntries().map((entry) => ({
        label: entry.description,
        sub: entry.source_type || "Journal",
        time: latestTimestamp(entry),
      })),
      ...hrData.payrollRecords.map((record) => ({
        label: record.employee_id,
        sub: `Payroll ${record.payment_status} - ETB ${money(record.net_pay)}`,
        time: latestTimestamp(record),
      })),
    ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6)
  }, [erp, finance, hrData])

  // Resolve user identity against employees and user profiles
  const logsWithUserInfo = useMemo(() => {
    return logs.map((log) => {
      const user = users.find((u) => u.id === log.user_id || u.username === log.username)
      
      let personName = log.fullname || ""
      let roleDisplay = ""

      if (user) {
        if (user.employee_id && hrData.employees.length > 0) {
          // Cross reference employee payload
          const emp = hrData.employees.find((e) => e.id === user.employee_id)
          if (emp) {
            personName = emp.payload?.name || emp.name || personName
          }
        }
        if (!personName) {
          personName = user.fullname || user.username
        }
        if (user.roles && user.roles.length > 0) {
          roleDisplay = roleLabels[user.roles[0]] || user.roles[0]
        }
      }

      if (!personName) {
        personName = log.username || "System"
      }

      return {
        ...log,
        resolvedName: personName,
        roleDisplay,
      }
    })
  }, [logs, users, hrData.employees])

  // Filters calculation
  const filteredLogs = useMemo(() => {
    return logsWithUserInfo.filter((log) => {
      const matchesSearch =
        log.resolvedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesUser = selectedUser === "All" || log.username === selectedUser
      const matchesModule = selectedModule === "All" || log.resource === selectedModule
      const matchesAction = selectedAction === "All" || log.action === selectedAction

      const matchesTimeframe = (() => {
        if (selectedTimeframe === "All") return true
        const logDate = new Date(log.created_at)
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        switch (selectedTimeframe) {
          case "Today":
            return logDate >= startOfDay
          case "Yesterday": {
            const yesterdayStart = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000)
            return logDate >= yesterdayStart && logDate < startOfDay
          }
          case "7Days": {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return logDate >= sevenDaysAgo
          }
          case "30Days": {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            return logDate >= thirtyDaysAgo
          }
          default:
            return true
        }
      })()

      return matchesSearch && matchesUser && matchesModule && matchesAction && matchesTimeframe
    })
  }, [logsWithUserInfo, searchQuery, selectedUser, selectedModule, selectedAction, selectedTimeframe])

  // Get unique lists for filter dropdowns
  const uniqueUsernames = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((log) => {
      if (log.username) set.add(log.username)
    })
    return Array.from(set).sort()
  }, [logs])

  const uniqueResources = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((log) => {
      if (log.resource) set.add(log.resource)
    })
    return Array.from(set).sort()
  }, [logs])

  const uniqueActions = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((log) => {
      if (log.action) set.add(log.action)
    })
    return Array.from(set).sort()
  }, [logs])

  // View Module routing logic
  const handleViewModule = (resource: string) => {
    const normalized = resource.toLowerCase().replace(/_/g, "-")
    switch (normalized) {
      case "auth":
      case "users":
        navigate("/admin/users")
        break
      case "partners":
        navigate("/admin/partners")
        break
      case "settings":
      case "company-settings":
        navigate("/admin/settings")
        break
      case "employees":
        navigate("/hr/employees")
        break
      case "attendance-records":
        navigate("/hr/attendance")
        break
      case "leave-requests":
      case "leave-types":
        navigate("/hr/leave")
        break
      case "payroll-runs":
      case "payroll-periods":
      case "payroll-records":
        navigate("/hr/payroll")
        break
      case "departments":
      case "designations":
        navigate("/hr")
        break
      case "warehouses":
      case "inventory-products":
      case "stock-movements":
      case "warehouse-stock":
      case "inventory":
      case "inventory-batches":
        navigate("/inventory")
        break
      case "store-transfers":
        navigate("/inventory")
        break
      case "sales-orders":
        navigate("/sales/sales-orders")
        break
      case "quotations":
      case "delivery-notes":
        navigate("/sales/sales-orders")
        break
      case "purchase-orders":
        navigate("/sales/purchase-orders")
        break
      case "sales-issues":
        navigate("/sales/sales-issued")
        break
      case "customers":
      case "suppliers":
        navigate("/sales")
        break
      case "shipment-documents":
        navigate("/sales/hkc-docs")
        break
      case "chart-of-accounts":
      case "journal-entries":
      case "journal-entry-lines":
        navigate("/finance/ledger")
        break
      case "invoices":
        navigate("/finance/invoices")
        break
      case "payments":
        navigate("/finance/banking")
        break
      case "expenses":
      case "recurring-expense-schedules":
        navigate("/finance/expenses")
        break
      case "vehicles":
      case "fixed-assets":
        navigate("/finance/assets")
        break
      case "tax-rules":
        navigate("/finance/taxes")
        break
      default:
        if (normalized.includes("sales")) navigate("/sales")
        else if (normalized.includes("inventory")) navigate("/inventory")
        else if (normalized.includes("finance")) navigate("/finance")
        else if (normalized.includes("hr")) navigate("/hr")
        else navigate("/admin")
        break
    }
  }

  const getActionBadgeStyle = (action: string) => {
    const norm = action.toLowerCase()
    if (norm.includes("create")) return "bg-green-50 text-green-700 border-green-200/50"
    if (norm.includes("update") || norm.includes("edit")) return "bg-sky-50 text-sky-700 border-sky-200/50"
    if (norm.includes("delete") || norm.includes("remove")) return "bg-rose-50 text-rose-700 border-rose-200/50"
    if (norm.includes("login")) return "bg-purple-50 text-purple-700 border-purple-200/50"
    if (norm.includes("post")) return "bg-emerald-50 text-emerald-700 border-emerald-200/50"
    if (norm.includes("cancel")) return "bg-amber-50 text-amber-700 border-amber-200/50"
    return "bg-zinc-50 text-zinc-700 border-zinc-200/50"
  }

  const formatDateTime = (isoString: string) => {
    if (!isoString) return "-"
    const d = new Date(isoString)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const stats = [
    { label: "Posted Revenue", value: `ETB ${money(postedRevenue)}`, sub: "From posted general ledger revenue lines", icon: DollarSign },
    { label: "Inventory Value", value: `ETB ${money(inventoryValue)}`, sub: "From saved inventory quantity and unit cost", icon: Package },
    { label: "Low Stock Alerts", value: lowStock.toLocaleString(), sub: "From saved reorder levels", icon: AlertCircle },
    { label: "Employees", value: hrData.employees.length.toLocaleString(), sub: "From Supabase HR employee records", icon: Users },
  ]

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        
        {/* Header Block */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Control Center</h1>
            <p className="text-sm text-gray-500 mt-1">Operational audit logs and metrics calculated from ERP records.</p>
          </div>
          <SubPageNav items={getSectionChildren("/admin")} />
        </motion.div>

        {hrError && <GlassCard className="p-4 mb-5 text-xs font-bold text-rose-700 bg-rose-50 border-rose-200">{hrError}</GlassCard>}

        {/* Tab Toggle Navigation */}
        <motion.div variants={fade} className="flex gap-2 mb-6 border-b border-black/5 pb-3">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
              activeTab === "overview"
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-gray-500 hover:text-black hover:bg-black/5"
            )}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={cn(
              "px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2",
              activeTab === "logs"
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-gray-500 hover:text-black hover:bg-black/5"
            )}
          >
            <Activity className="size-4 shrink-0" />
            Audit Activity Logs
          </button>
        </motion.div>

        {/* Tab Content 1: Overview */}
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <GlassCard key={stat.label} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs text-gray-500 font-black uppercase tracking-wider">{stat.label}</p>
                      <Icon className="size-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-black text-black mt-3">{stat.value}</p>
                    <p className="text-xs text-gray-400 mt-2">{stat.sub}</p>
                  </GlassCard>
                )
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-black">Recent Activity Feed</h3>
                  <button
                    onClick={() => setActiveTab("logs")}
                    className="text-xs font-bold text-zinc-500 hover:text-black flex items-center gap-1 bg-black/5 hover:bg-black/10 px-2.5 py-1.5 rounded-full transition-all"
                  >
                    View audit logs <ArrowUpRight className="size-3.5" />
                  </button>
                </div>
                {activity.length === 0 ? (
                  <p className="text-xs font-semibold text-gray-400 py-8">No saved activity is available yet.</p>
                ) : (
                  <div className="space-y-1">
                    {activity.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="flex items-center gap-3 py-3 border-t border-black/5">
                        <div className="size-2 rounded-full bg-zinc-900 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black truncate">{item.label}</p>
                          <p className="text-xs text-gray-400 truncate">{item.sub}</p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{item.time || "-"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-lg font-bold text-black mb-5">System Data Sources</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Supabase REST", value: "ERP resources", icon: Database },
                    { label: "Finance Ledger", value: `${finance.getJournalEntries().length} entries`, icon: Shield },
                    { label: "Module Settings", value: "Configure in Admin", icon: Settings },
                  ].map((source) => {
                    const Icon = source.icon
                    return (
                      <div key={source.label} className="rounded-2xl p-4 bg-black/[0.03] border border-black/5">
                        <Icon className="size-5 text-gray-700 mb-3" />
                        <p className="text-xs text-gray-400 mb-1">{source.label}</p>
                        <p className="text-sm font-semibold text-black">{source.value}</p>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {/* Tab Content 2: Activity Logs */}
        {activeTab === "logs" && (
          <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            
            {/* Log Filters Bar */}
            <GlassCard className="p-4 flex flex-col xl:flex-row xl:items-center gap-4">
              
              {/* Text Search */}
              <div className="relative flex items-center h-[38px] px-3 rounded-full border border-black/5 bg-black/[0.02] hover:bg-white/50 focus-within:bg-white/80 transition-all flex-1 min-w-[200px]">
                <Search className="size-4 text-gray-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs (names, actions, details)..."
                  className="bg-transparent border-none text-xs font-semibold text-black outline-none w-full"
                />
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0">
                
                {/* User filter */}
                <div className="relative flex items-center h-[38px] px-3.5 rounded-full border border-black/5 bg-black/[0.02] hover:bg-white/50 transition-all">
                  <Users className="size-3.5 text-gray-400 mr-2 shrink-0" />
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-black outline-none pr-4 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_auto] bg-[right_center] bg-no-repeat"
                  >
                    <option value="All">All Users</option>
                    {uniqueUsernames.map((u) => (
                      <option key={u} value={u}>
                        @{u}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Module filter */}
                <div className="relative flex items-center h-[38px] px-3.5 rounded-full border border-black/5 bg-black/[0.02] hover:bg-white/50 transition-all">
                  <Filter className="size-3.5 text-gray-400 mr-2 shrink-0" />
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-black outline-none pr-4 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_auto] bg-[right_center] bg-no-repeat"
                  >
                    <option value="All">All Modules</option>
                    {uniqueResources.map((r) => (
                      <option key={r} value={r}>
                        {resourceLabels[r] || r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action filter */}
                <div className="relative flex items-center h-[38px] px-3.5 rounded-full border border-black/5 bg-black/[0.02] hover:bg-white/50 transition-all">
                  <Activity className="size-3.5 text-gray-400 mr-2 shrink-0" />
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-black outline-none pr-4 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_auto] bg-[right_center] bg-no-repeat"
                  >
                    <option value="All">All Actions</option>
                    {uniqueActions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range filter */}
                <div className="relative flex items-center h-[38px] px-3.5 rounded-full border border-black/5 bg-black/[0.02] hover:bg-white/50 transition-all">
                  <Calendar className="size-3.5 text-gray-400 mr-2 shrink-0" />
                  <select
                    value={selectedTimeframe}
                    onChange={(e) => setSelectedTimeframe(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-black outline-none pr-4 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_auto] bg-[right_center] bg-no-repeat"
                  >
                    <option value="All">All Time</option>
                    <option value="Today">Today</option>
                    <option value="Yesterday">Yesterday</option>
                    <option value="7Days">Last 7 Days</option>
                    <option value="30Days">Last 30 Days</option>
                  </select>
                </div>

              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchAuditLogsData}
                disabled={logsLoading}
                className="flex items-center justify-center size-[38px] rounded-full border border-black/5 hover:bg-zinc-100 transition-all shrink-0 disabled:opacity-50"
                title="Refresh log registry"
              >
                <RefreshCw className={cn("size-4 text-gray-500", logsLoading && "animate-spin")} />
              </button>
            </GlassCard>

            {/* Audit Logs Table */}
            <GlassCard>
              {logsLoading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader2 className="h-8 w-8 text-zinc-900 animate-spin" />
                  <p className="text-xs text-gray-500 font-bold mt-4">Loading operational activity logs...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-black/5 text-[10px] text-gray-400 font-black uppercase tracking-wider">
                        <th className="py-4 px-5">Operator Name</th>
                        <th className="py-4 px-4">Action</th>
                        <th className="py-4 px-4">Module / Resource</th>
                        <th className="py-4 px-4">Context Details</th>
                        <th className="py-4 px-4">Timestamp</th>
                        <th className="py-4 px-5 text-right">Navigation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 text-xs text-black">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                            No operational audit logs match the current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => {
                          const initials = log.resolvedName
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "U"

                          return (
                            <tr key={log.id} className="hover:bg-black/[0.01] transition-all">
                              
                              {/* User identity card info */}
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-xs border border-black/5">
                                    {initials}
                                  </div>
                                  <div>
                                    <p className="font-bold text-black leading-snug">{log.resolvedName}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                      @{log.username} {log.roleDisplay ? `• ${log.roleDisplay}` : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Action Type Badge */}
                              <td className="py-3.5 px-4">
                                <span
                                  className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                    getActionBadgeStyle(log.action)
                                  )}
                                >
                                  {log.action}
                                </span>
                              </td>

                              {/* Normalized Module name */}
                              <td className="py-3.5 px-4 font-bold text-gray-600">
                                {resourceLabels[log.resource] || log.resource}
                              </td>

                              {/* JSON details formatted */}
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col gap-1 text-[10px]">
                                  {log.details?.ip && (
                                    <span className="text-gray-400 font-semibold font-mono flex items-center gap-1">
                                      <MapPin className="size-3" /> {log.details.ip}
                                    </span>
                                  )}
                                  {log.details?.itemId && (
                                    <span className="text-zinc-600 font-extrabold font-mono bg-black/[0.04] px-1.5 py-0.5 rounded border border-black/5 w-max">
                                      ID: {log.details.itemId}
                                    </span>
                                  )}
                                  {log.details?.path && (
                                    <span className="text-gray-400 truncate max-w-[180px] font-medium" title={log.details.path}>
                                      {log.details.path}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Timestamp */}
                              <td className="py-3.5 px-4 font-mono font-medium text-gray-500 text-[11px] whitespace-nowrap">
                                {formatDateTime(log.created_at)}
                              </td>

                              {/* Redirection link */}
                              <td className="py-3.5 px-5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleViewModule(log.resource)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-black/5 hover:border-black/15 bg-white/50 hover:bg-white text-[11px] font-black text-zinc-700 hover:text-black transition-all active:scale-95 shadow-sm"
                                >
                                  View Module
                                  <ArrowUpRight className="size-3 shrink-0" />
                                </button>
                              </td>

                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
