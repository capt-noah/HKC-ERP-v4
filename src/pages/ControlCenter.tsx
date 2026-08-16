import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowUpRight,
  DollarSign,
  Package,
  Activity,
  Search,
  Filter,
  Calendar,
  MapPin,
  RefreshCw,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Users,
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
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

// Custom Skeleton Components (Zero Spinners)
function StatCardSkeleton() {
  return (
    <GlassCard className="p-6 relative overflow-hidden animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-3.5 w-28 bg-black/10 rounded-full" />
        <div className="size-10 rounded-2xl bg-black/10" />
      </div>
      <div className="h-8 w-44 bg-black/10 rounded-xl mt-4" />
      <div className="h-3 w-56 bg-black/10 rounded-full mt-3" />
    </GlassCard>
  )
}

function ChartSkeleton() {
  return (
    <GlassCard className="p-6 relative overflow-hidden animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-black/10 rounded-lg" />
          <div className="h-3 w-64 bg-black/5 rounded-full" />
        </div>
        <div className="h-8 w-32 bg-black/10 rounded-full" />
      </div>
      <div className="h-[280px] w-full bg-black/[0.03] rounded-2xl flex items-end justify-between p-6 gap-3">
        {[40, 65, 30, 85, 55, 70, 90, 45, 60, 75, 50, 80].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-black/10 rounded-t-lg transition-all"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </GlassCard>
  )
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between pb-4 border-b border-black/5">
        <div className="h-4 w-32 bg-black/10 rounded-full" />
        <div className="h-4 w-24 bg-black/10 rounded-full" />
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3.5 border-b border-black/[0.03]">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-black/10 shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 bg-black/10 rounded-full" />
              <div className="h-2.5 w-24 bg-black/5 rounded-full" />
            </div>
          </div>
          <div className="h-6 w-20 bg-black/10 rounded-full" />
          <div className="h-3.5 w-28 bg-black/10 rounded-full hidden sm:block" />
          <div className="h-3 w-32 bg-black/5 rounded-full hidden md:block" />
          <div className="h-7 w-24 bg-black/10 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function ControlCenter() {
  const erp = useErpStore()
  const finance = useFinanceStore()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<"overview" | "logs">("overview")
  const [chartMode, setChartMode] = useState<"revenue" | "inventory">("revenue")

  // Data states
  const [hrData, setHrData] = useState<HRData>(emptyHRData)
  const [hrError, setHrError] = useState("")
  const [dataLoading, setDataLoading] = useState(true)

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
    setDataLoading(true)
    loadHRData()
      .then((data) => {
        if (!cancelled) setHrData(data)
      })
      .catch((error) => {
        if (!cancelled) setHrError(error instanceof Error ? error.message : "Failed to load HR data.")
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
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

  // Key ERP Metrics
  const inventoryValue = erp
    .getProducts()
    .reduce(
      (sum, product) =>
        sum + Number(product.totalStockValue ?? Number(product.quantity || 0) * Number(product.unitCost || 0)),
      0
    )

  const postedRevenue = finance.getJournalEntryLines().reduce((sum, line) => {
    const account = finance.getAccounts().find((item) => item.id === line.account_id)
    return account?.account_type === "Revenue"
      ? sum + Number(line.credit_amount || 0) - Number(line.debit_amount || 0)
      : sum
  }, 0)

  // Chart Data Preparation
  const revenueChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentYear = new Date().getFullYear()

    // Group journal revenue lines & sales orders
    const monthlyMap: Record<string, { revenue: number; orders: number }> = {}
    months.forEach((m) => {
      monthlyMap[m] = { revenue: 0, orders: 0 }
    })

    finance.getJournalEntries().forEach((entry) => {
      const entryDate = entry.entry_date ? new Date(entry.entry_date) : null
      if (entryDate && entryDate.getFullYear() === currentYear) {
        const monthLabel = months[entryDate.getMonth()]
        const lines = finance.getJournalEntryLines().filter((l) => l.journal_entry_id === entry.id)
        lines.forEach((line) => {
          const acc = finance.getAccounts().find((a) => a.id === line.account_id)
          if (acc?.account_type === "Revenue") {
            monthlyMap[monthLabel].revenue += Number(line.credit_amount || 0) - Number(line.debit_amount || 0)
          }
        })
      }
    })

    erp.getSalesOrders().forEach((so) => {
      const orderDate = so.date ? new Date(so.date) : null
      if (orderDate && orderDate.getFullYear() === currentYear) {
        const monthLabel = months[orderDate.getMonth()]
        monthlyMap[monthLabel].orders += Number(so.amount || 0)
      }
    })

    // If no entries recorded yet for current month, provide default baseline visualization
    const data = months.map((month) => ({
      name: month,
      revenue: Math.max(0, monthlyMap[month].revenue),
      orders: Math.max(0, monthlyMap[month].orders),
    }))

    const hasAny = data.some((d) => d.revenue > 0 || d.orders > 0)
    if (!hasAny && postedRevenue > 0) {
      const currentMonth = months[new Date().getMonth()]
      return data.map((d) => (d.name === currentMonth ? { ...d, revenue: postedRevenue, orders: postedRevenue } : d))
    }

    return data
  }, [finance, erp, postedRevenue])

  const inventoryCategoryData = useMemo(() => {
    const categoryMap: Record<string, { value: number; count: number }> = {}
    erp.getProducts().forEach((p) => {
      const cat = p.category || "General Stock"
      const val = Number(p.totalStockValue ?? Number(p.quantity || 0) * Number(p.unitCost || 0))
      if (!categoryMap[cat]) {
        categoryMap[cat] = { value: 0, count: 0 }
      }
      categoryMap[cat].value += val
      categoryMap[cat].count += Number(p.quantity || 0)
    })

    return Object.entries(categoryMap).map(([name, stat]) => ({
      name,
      value: Math.round(stat.value),
      count: stat.count,
    }))
  }, [erp])

  // Resolve user identity against employees and user profiles
  const logsWithUserInfo = useMemo(() => {
    return logs.map((log) => {
      const user = users.find((u) => u.id === log.user_id || u.username === log.username)
      let personName = log.fullname || ""
      let roleDisplay = ""

      if (user) {
        if (user.employee_id && hrData.employees.length > 0) {
          const emp = hrData.employees.find((e) => e.id === user.employee_id)
          if (emp) {
            personName = emp.full_name || personName
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
      case "warehouses":
      case "inventory-products":
      case "stock-movements":
      case "warehouse-stock":
      case "inventory":
        navigate("/inventory")
        break
      case "sales-orders":
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
        navigate("/finance/expenses")
        break
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

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header Block */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Control Center</h1>
            <p className="text-sm text-gray-500 mt-1">Operational analytics and live audit logs across all ERP modules.</p>
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
              activeTab === "overview" ? "bg-zinc-900 text-white shadow-sm" : "text-gray-500 hover:text-black hover:bg-black/5"
            )}
          >
            System Overview & Analytics
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={cn(
              "px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2",
              activeTab === "logs" ? "bg-zinc-900 text-white shadow-sm" : "text-gray-500 hover:text-black hover:bg-black/5"
            )}
          >
            <Activity className="size-4 shrink-0" />
            Audit Activity Logs
          </button>
        </motion.div>

        {/* Tab Content 1: Overview */}
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Colored Metric Cards (Posted Revenue & Inventory Value) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {dataLoading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  {/* Card 1: Posted Revenue (Emerald/Green Gradient) */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-500/15 via-emerald-600/5 to-white/70 border border-emerald-500/30 backdrop-blur-xl shadow-lg shadow-emerald-950/[0.04]"
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                          Financial Balance
                        </span>
                        <p className="text-xs text-emerald-900 font-extrabold uppercase tracking-wider mt-2.5">Posted Revenue</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-800 border border-emerald-500/30 shadow-inner">
                        <DollarSign className="size-6 text-emerald-700" />
                      </div>
                    </div>
                    <div className="mt-4 relative z-10">
                      <p className="text-3xl sm:text-4xl font-black text-black tracking-tight font-mono">
                        ETB {money(postedRevenue)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-800">
                        <TrendingUp className="size-4" />
                        <span>Calculated from posted general ledger revenue transactions</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 2: Inventory Value (Indigo/Violet Gradient) */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-indigo-500/15 via-violet-600/5 to-white/70 border border-indigo-500/30 backdrop-blur-xl shadow-lg shadow-indigo-950/[0.04]"
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm">
                          Asset Valuation
                        </span>
                        <p className="text-xs text-indigo-900 font-extrabold uppercase tracking-wider mt-2.5">Total Inventory Value</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-800 border border-indigo-500/30 shadow-inner">
                        <Package className="size-6 text-indigo-700" />
                      </div>
                    </div>
                    <div className="mt-4 relative z-10">
                      <p className="text-3xl sm:text-4xl font-black text-black tracking-tight font-mono">
                        ETB {money(inventoryValue)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-indigo-800">
                        <Layers className="size-4" />
                        <span>Valued across all active warehouse stock batches</span>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </div>

            {/* Interactive Graph Section Replacing Activity Feed & System Data Sources */}
            {dataLoading ? (
              <ChartSkeleton />
            ) : (
              <GlassCard className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-black tracking-tight flex items-center gap-2">
                      <BarChart3 className="size-5 text-zinc-900" />
                      Enterprise Performance Analytics
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {chartMode === "revenue"
                        ? "Revenue performance & sales orders pipeline across the active fiscal year."
                        : "Inventory valuation and stock distribution breakdown by product category."}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 bg-black/5 rounded-2xl shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => setChartMode("revenue")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                        chartMode === "revenue"
                          ? "bg-white text-black shadow-sm"
                          : "text-gray-500 hover:text-black"
                      )}
                    >
                      <TrendingUp className="size-3.5 text-emerald-600" />
                      Revenue Trend
                    </button>
                    <button
                      onClick={() => setChartMode("inventory")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                        chartMode === "inventory"
                          ? "bg-white text-black shadow-sm"
                          : "text-gray-500 hover:text-black"
                      )}
                    >
                      <PieChartIcon className="size-3.5 text-indigo-600" />
                      Stock Valuation
                    </button>
                  </div>
                </div>

                {chartMode === "revenue" ? (
                  <div className="h-[320px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#888", fontWeight: 600 }} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "#888", fontWeight: 600 }}
                          tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderRadius: "16px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                          formatter={(val: any) => [`ETB ${Number(val).toLocaleString()}`, "Amount"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Posted Revenue"
                          stroke="#059669"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                        <Area
                          type="monotone"
                          dataKey="orders"
                          name="Sales Pipeline"
                          stroke="#4f46e5"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fillOpacity={1}
                          fill="url(#colorOrders)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[320px] w-full pt-4">
                    {inventoryCategoryData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs font-semibold text-gray-400">
                        No product category valuation data available.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={inventoryCategoryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#888", fontWeight: 600 }} />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "#888", fontWeight: 600 }}
                            tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              borderRadius: "16px",
                              border: "1px solid rgba(0,0,0,0.08)",
                              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                            formatter={(val: any) => [
                              `ETB ${Number(val).toLocaleString()}`,
                              "Category Value",
                            ]}
                          />
                          <Bar dataKey="value" name="Valuation (ETB)" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
              </GlassCard>
            )}
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
                    className="bg-transparent border-none text-xs font-bold text-black outline-none pr-4 cursor-pointer appearance-none"
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
                    className="bg-transparent border-none text-xs font-bold text-black outline-none pr-4 cursor-pointer appearance-none"
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
                    className="bg-transparent border-none text-xs font-bold text-black outline-none pr-4 cursor-pointer appearance-none"
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
                    className="bg-transparent border-none text-xs font-bold text-black outline-none pr-4 cursor-pointer appearance-none"
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

            {/* Audit Logs Table with Skeleton Loader */}
            <GlassCard>
              {logsLoading ? (
                <TableSkeleton />
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
                          const initials =
                            log.resolvedName
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
