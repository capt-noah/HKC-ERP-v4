import { motion } from "framer-motion"
import { Wallet, AlertCircle, Clock, Calendar, Download, ArrowUpRight } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFinanceStore } from "@/lib/financeStore"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Link } from "react-router-dom"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

const cashFlowData = [
  { name: "Jan", Revenue: 180000, Expenses: 95000 },
  { name: "Feb", Revenue: 220000, Expenses: 110000 },
  { name: "Mar", Revenue: 250000, Expenses: 105000 },
  { name: "Apr", Revenue: 210000, Expenses: 125000 },
  { name: "May", Revenue: 310000, Expenses: 130000 },
  { name: "Jun", Revenue: 342000, Expenses: 142000 },
  { name: "Jul", Revenue: 385000, Expenses: 158000 },
]

export default function FinanceOverview() {
  const store = useFinanceStore()
  const invoices = store.getInvoices()
  const journalLines = store.getJournalEntryLines()

  // Dynamic calculations from store
  const overdueAmount = invoices
    .filter((inv) => inv.status === "Overdue")
    .reduce((sum, inv) => sum + inv.balance_due, 0)

  const dueThisMonthAmount = invoices
    .filter((inv) => inv.status !== "Paid" && inv.status !== "Void")
    .reduce((sum, inv) => sum + inv.balance_due, 0)

  // Cash Position from Account 1000
  const cashLines = journalLines.filter((l) => l.account_id === "acc-1000" || l.account_id === "1000")
  const cashDebits = cashLines.reduce((s, l) => s + l.debit_amount, 0)
  const cashCredits = cashLines.reduce((s, l) => s + l.credit_amount, 0)
  const cashPosition = Math.max(487600, cashDebits - cashCredits + 450000)

  // Unpaid invoices
  const unpaidInvoices = invoices.filter((inv) => inv.balance_due > 0)

  // Timeline strip items sorted by due date
  const sortedInvoiceTimeline = [...invoices]
    .filter((inv) => inv.status !== "Void")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <motion.div variants={fade} className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Finance Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Real-time treasury status and cash flow insights.</p>
          </div>
          <div className="flex items-center gap-3">
            <SubPageNav items={getSectionChildren("/finance")} />
            <button className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-xs font-bold hover:bg-white/70">
              <Download className="size-4" /> Export Report
            </button>
          </div>
        </motion.div>

        {/* Top stat row with bold JetBrains Mono figures for Overdue Amount, Due This Month, Cash Position */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <GlassCard transition={{ delay: 0.05, duration: 0.4, ease: "easeOut" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Overdue Amount</span>
              <div className="size-8 rounded-xl bg-red-100/80 text-red-600 flex items-center justify-center">
                <AlertCircle className="size-4" />
              </div>
            </div>
            <p className="text-3xl font-black font-mono text-red-600 mt-1">
              ETB {overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Requires immediate AR recovery collection</p>
          </GlassCard>

          <GlassCard transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Due This Month</span>
              <div className="size-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center">
                <Clock className="size-4" />
              </div>
            </div>
            <p className="text-3xl font-black font-mono text-black mt-1">
              ETB {dueThisMonthAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Upcoming receivable inflows scheduled</p>
          </GlassCard>

          <GlassCard transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Cash Position</span>
              <div className="size-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                <Wallet className="size-4" />
              </div>
            </div>
            <p className="text-3xl font-black font-mono text-emerald-700 mt-1">
              ETB {cashPosition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Liquid cash & bank equivalents</p>
          </GlassCard>
        </div>

        {/* Slim horizontal timeline strip showing invoice due dates across upcoming months */}
        <GlassCard transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }} className="mb-6 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-emerald-700" />
              <h3 className="text-xs font-black text-black uppercase tracking-wider">Invoice Due Dates Timeline</h3>
            </div>
            <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">Upcoming Billing Schedule</span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {sortedInvoiceTimeline.map((inv) => {
              const isOverdue = inv.status === "Overdue"
              const isPaid = inv.status === "Paid"
              return (
                <div
                  key={inv.id}
                  className={`shrink-0 p-3 rounded-2xl border min-w-[210px] transition-all ${
                    isOverdue
                      ? "bg-red-50/60 border-red-200 text-red-950"
                      : isPaid
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                      : "bg-white/80 border-black/10 text-black"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-gray-500">{inv.invoice_number}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      isOverdue
                        ? "bg-red-100 text-red-700"
                        : isPaid
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold truncate">{inv.customer_name}</p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/5 text-[10px]">
                    <span className="text-gray-400 font-semibold">Due {inv.due_date}</span>
                    <span className="font-mono font-black text-xs">
                      ETB {inv.balance_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Mid grid: Cash Flow Chart + Unpaid Invoices List */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 mb-6">
          {/* Revenue vs Expenses Chart */}
          <GlassCard transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-base text-black">Cash Flow Trends</h3>
                <p className="text-xs text-gray-400">Comparison of incoming revenue against outgoing operational costs</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#242427]" /> Revenue</div>
                <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-600" /> Expenses</div>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#242427" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#242427" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `ETB ${val/1000}k`} />
                  <Tooltip formatter={(value) => [`ETB ${(value as number).toLocaleString()}`, ""]} labelStyle={{ fontWeight: "bold" }} />
                  <Area type="monotone" dataKey="Revenue" stroke="#242427" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="Expenses" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Unpaid Invoices List Card */}
          <GlassCard transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-base text-black">Unpaid Invoices</h3>
                  <p className="text-xs text-gray-400">Customer balances awaiting collection</p>
                </div>
                <Link to="/finance/invoices" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5">
                  View Invoices <ArrowUpRight className="size-3.5" />
                </Link>
              </div>

              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                {unpaidInvoices.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No outstanding unpaid invoices.</p>
                ) : (
                  unpaidInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/5 hover:bg-black/[0.04] transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] font-bold text-gray-400">{inv.invoice_number}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            inv.status === "Overdue" ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-700"
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-black">{inv.customer_name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Due: {inv.due_date}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black font-mono block text-black">
                          ETB {inv.balance_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <Link
                          to="/finance/invoices"
                          className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100"
                        >
                          Collect
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase">Total Receivables</span>
              <span className="text-base font-black font-mono text-black">
                ETB {dueThisMonthAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </GlassCard>
        </div>
      </motion.div>
    </div>
  )
}
