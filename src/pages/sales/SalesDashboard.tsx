import { motion } from "framer-motion"
import { 
  DollarSign, 
  Activity, 
  ArrowRight,
  Truck,
  FileText,
  ShieldAlert
} from "lucide-react"
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore } from "@/lib/erpStore"
import { useNavigate } from "react-router-dom"

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

const SALES_REVENUE_DATA = [
  { name: "Jan", "Sales Revenue": 1450000, "Procurement Spend": 820000 },
  { name: "Feb", "Sales Revenue": 1610000, "Procurement Spend": 950000 },
  { name: "Mar", "Sales Revenue": 1890000, "Procurement Spend": 1080000 },
  { name: "Apr", "Sales Revenue": 2120000, "Procurement Spend": 1210000 },
  { name: "May", "Sales Revenue": 2410000, "Procurement Spend": 1330000 },
  { name: "Jun", "Sales Revenue": 2850000, "Procurement Spend": 1540000 },
]

export default function SalesDashboard() {
  const navigate = useNavigate()
  const erp = useErpStore()

  const salesOrders = erp.getSalesOrders()
  const quotations = erp.getQuotations()
  const deliveryNotes = erp.getDeliveryNotes()
  const customers = erp.getCustomers()

  const totalContractRevenue = salesOrders.reduce((sum, so) => sum + so.amount, 0)
  const totalDispatchedValue = deliveryNotes.reduce((sum, dn) => sum + dn.totalValue, 0)
  const pendingQuotationsCount = quotations.filter(q => q.status !== "Ordered" && q.status !== "Cancelled").length

  // Calculate credit risk count
  const customersOverLimit = customers.filter(c => {
    const info = erp.getCustomerCreditUsage(c.id)
    return info.isOverLimit
  })

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header Block */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-black tracking-tight mt-1">Sales & Trade Command Center</h1>
            </div>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Overview of sales pipelines, contracts, stock dispatch, and credit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/sales")} />
          </div>
        </motion.div>

        {/* 4 KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "PIPELINE REVENUE", value: `ETB ${totalContractRevenue.toLocaleString()}`, Icon: DollarSign, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", note: `${salesOrders.length} Confirmed Contracts` },
            { label: "DISPATCHED STOCK VALUE", value: `ETB ${totalDispatchedValue.toLocaleString()}`, Icon: Truck, iconBg: "bg-green-100", iconColor: "text-green-700", note: `${deliveryNotes.length} Delivery Notes Dispatched` },
            { label: "PENDING QUOTATIONS", value: `${pendingQuotationsCount} Pro-Formas`, Icon: FileText, iconBg: "bg-blue-50", iconColor: "text-blue-700", note: "Ready for Order Conversion" },
            { label: "CREDIT RISK ALERT", value: `${customersOverLimit.length} Customers`, Icon: ShieldAlert, iconBg: customersOverLimit.length > 0 ? "bg-red-50" : "bg-black/5", iconColor: customersOverLimit.length > 0 ? "text-red-600" : "text-zinc-600", note: customersOverLimit.length > 0 ? "Credit limit threshold exceeded" : "All limits healthy" },
          ].map((kpi, idx) => {
            const Icon = kpi.Icon
            return (
              <GlassCard key={kpi.label} transition={{ delay: 0.05 * idx, duration: 0.4 }}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`size-9 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                    <Icon className={`size-4.5 ${kpi.iconColor}`} />
                  </div>
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{kpi.label}</span>
                </div>
                <p className="text-2xl font-black text-zinc-950 tracking-tight leading-none mb-1.5">{kpi.value}</p>
                <div className="pt-2 border-t border-zinc-100 mt-2.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase font-mono">{kpi.note}</span>
                </div>
              </GlassCard>
            )
          })}
        </div>

        {/* Sales Main Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Revenue Chart */}
          <GlassCard className="lg:col-span-8 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5 border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Trade Revenue & Procurement Flow</h3>
                  <p className="text-[11px] font-semibold text-zinc-400">Monthly progression comparing client revenue vs procurement expenditure</p>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-100/50 px-2.5 py-1 rounded-full">
                  <Activity className="size-3 text-emerald-500 animate-pulse" /> Live ERP Feed
                </div>
              </div>

              {/* Area Chart */}
              <div className="h-64 mt-4 text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SALES_REVENUE_DATA} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSalesRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPurchCap" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#15803d" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#15803d" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `ETB ${v/1000}k`} />
                    <Tooltip formatter={(value) => [`ETB ${(value as number).toLocaleString()}`, ""]} labelStyle={{ fontWeight: "bold" }} />
                    <Area type="monotone" dataKey="Sales Revenue" stroke="#18181b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSalesRev)" />
                    <Area type="monotone" dataKey="Procurement Spend" stroke="#15803d" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPurchCap)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t border-zinc-100 pt-3.5 mt-4 text-[10px] text-zinc-500 font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-zinc-950" />
                <span>Export & Local Sales Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-green-700" />
                <span>Procurement & Import Spend</span>
              </div>
            </div>
          </GlassCard>

          {/* Right Panel: Recent Sales pipeline states & Quick Actions */}
          <GlassCard className="lg:col-span-4 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Active Sales Funnel</h3>
                  <p className="text-[11px] font-semibold text-zinc-400">High-value contracts ready for fulfillment</p>
                </div>
              </div>

              <div className="space-y-3">
                {salesOrders.slice(0, 4).map((order) => (
                  <div 
                    key={order.id} 
                    onClick={() => navigate("/sales/sales-orders")}
                    className="p-3 bg-zinc-50/70 border border-zinc-200/60 rounded-2xl cursor-pointer hover:bg-zinc-100/80 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black font-mono text-zinc-500 uppercase">{order.id} ({order.warehouse})</span>
                      <span className="text-[9px] font-black uppercase text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                        {order.stage}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-zinc-900 leading-tight">{order.customer}</h4>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-200/50 font-mono text-[11px]">
                      <span className="font-black text-zinc-900">ETB {order.amount.toLocaleString()}</span>
                      <span className="text-[9px] font-sans font-bold text-zinc-500">{order.deliveryStatus || "Not Delivered"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => navigate("/sales/sales-orders")}
              className="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-zinc-950 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors shadow"
            >
              Manage Full Sales Register <ArrowRight className="size-3.5" />
            </button>
          </GlassCard>
        </div>
      </motion.div>
    </div>
  )
}
