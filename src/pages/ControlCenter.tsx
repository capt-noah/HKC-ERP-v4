import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, ArrowUpRight, Database, DollarSign, Package, Settings, Shield, Users } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore } from "@/lib/erpStore"
import { useFinanceStore } from "@/lib/financeStore"
import { type HRData, loadHRData, money } from "@/lib/hrApi"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

const emptyHRData: HRData = { employees: [], attendance: [], leaves: [], payrollPeriods: [], payrollRecords: [] }

function latestTimestamp(value?: { created_at?: string; updated_at?: string; date?: string; sale_date?: string; entry_date?: string }) {
  return value?.updated_at || value?.created_at || value?.date || value?.sale_date || value?.entry_date || ""
}

export default function ControlCenter() {
  const erp = useErpStore()
  const finance = useFinanceStore()
  const [hrData, setHrData] = useState<HRData>(emptyHRData)
  const [hrError, setHrError] = useState("")

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

  const inventoryValue = erp.getProducts().reduce((sum, product) => sum + Number(product.totalStockValue ?? Number(product.quantity || 0) * Number(product.unitCost || 0)), 0)
  const lowStock = erp.getProducts().filter((product) => product.status === "Low Stock" || Number(product.quantity || 0) <= Number(product.reorderLevel || 0)).length
  const postedRevenue = finance.getJournalEntryLines().reduce((sum, line) => {
    const account = finance.getAccounts().find((item) => item.id === line.account_id)
    return account?.account_type === "Revenue" ? sum + Number(line.credit_amount || 0) - Number(line.debit_amount || 0) : sum
  }, 0)

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
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Control Center</h1>
            <p className="text-sm text-gray-500 mt-1">Operational totals calculated from saved ERP records.</p>
          </div>
          <SubPageNav items={getSectionChildren("/admin")} />
        </motion.div>

        {hrError && <GlassCard className="p-4 mb-5 text-xs font-bold text-rose-700 bg-rose-50 border-rose-200">{hrError}</GlassCard>}

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
              <h3 className="text-lg font-bold text-black">Recent Activity</h3>
              <button className="text-sm text-gray-400 hover:text-black flex items-center gap-1">
                View modules <ArrowUpRight className="size-4" />
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
    </div>
  )
}
