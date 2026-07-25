import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Archive, 
  AlertTriangle, 
  Clock, 
  Package, 
  FlaskConical, 
  Check, 
  X, 
  ArrowUpRight, 
  PlusCircle, 
  CheckCircle2, 
  ChevronRight, 
  Truck
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

interface BatchApproval {
  id: string
  product: string
  batchNumber: string
  quantity: number
  unit: string
  expiry: string
  warehouse: string
  status: "Pending QA" | "Approved" | "Rejected"
}

interface ActivityLog {
  id: string
  type: "Received" | "Dispatched"
  product: string
  quantity: number
  unit: string
  time: string
  warehouse: string
}

interface ExpectedDelivery {
  id: string
  product: string
  expectedQty: number
  unit: string
  supplier: string
  eta: string
}

export default function InventoryDashboard() {
  const { showToast } = useFeedback()
  
  // Role switcher: "Overview" | "Reception" | "Technical"
  const [activeRole, setActiveRole] = useState<"Overview" | "Reception" | "Technical">("Overview")
  
  // Interactive Pending Approvals State
  const [batches, setBatches] = useState<BatchApproval[]>([
    { id: "B-QA-101", product: "Newcastle & IB Poultry Vaccine (1000d)", batchNumber: "B-VAC-CHN-05", quantity: 160, unit: "vials", expiry: "2026-11-30", warehouse: "WH3 (China Vet)", status: "Pending QA" },
    { id: "B-QA-102", product: "Oxytetracycline 20% LA Injectable (100ml)", batchNumber: "B-OXY-IND-99", quantity: 1200, unit: "vials", expiry: "2028-05-18", warehouse: "WH2 (India Vet)", status: "Pending QA" },
    { id: "B-QA-103", product: "Grade 1 Yirgacheffe Arabica Coffee Beans", batchNumber: "B-YRG-2026-04", quantity: 650, unit: "bags (60kg)", expiry: "2027-12-31", warehouse: "WH1 (Agri Export)", status: "Pending QA" },
  ])

  // Interactive Today's Activity (for Reception & Overview)
  const [activities, setActivities] = useState<ActivityLog[]>([
    { id: "ACT-01", type: "Received", product: "Humera White Sesame Seeds", quantity: 50, unit: "Metric Tons", time: "09:14 AM", warehouse: "WH1 (Agri Export)" },
    { id: "ACT-02", type: "Dispatched", product: "Amoxicillin Trihydrate 50% Soluble Powder", quantity: 100, unit: "tins (1kg)", time: "10:45 AM", warehouse: "WH3 (China Vet)" },
    { id: "ACT-03", type: "Received", product: "Ivermectin 1% Injectable Solution", quantity: 800, unit: "vials", time: "11:20 AM", warehouse: "WH2 (India Vet)" },
  ])

  // Expected Deliveries
  const [expectedDeliveries, setExpectedDeliveries] = useState<ExpectedDelivery[]>([
    { id: "DEL-441", product: "Yirgacheffe Arabica Coffee (Oromia Farmers Union)", expectedQty: 200, unit: "bags (60kg)", supplier: "Oromia Farmers Cooperative Union", eta: "2:00 PM Today" },
    { id: "DEL-442", product: "Oxytetracycline 20% LA & Albendazole Boluses", expectedQty: 3400, unit: "vials/boxes", supplier: "Indian Vet Bio Pharma Ltd", eta: "4:30 PM Today" },
    { id: "DEL-443", product: "Enrofloxacin 10% Oral Solution", expectedQty: 1000, unit: "bottles (1L)", supplier: "Shandong Animal Health Corp", eta: "Tomorrow Morning" },
  ])

  // Modals / Inputs
  const [isLogReceiptOpen, setIsLogReceiptOpen] = useState(false)
  const [newReceiptProduct, setNewReceiptProduct] = useState("")
  const [newReceiptQty, setNewReceiptQty] = useState("")
  const [newReceiptUnit, setNewReceiptUnit] = useState("units")
  const [newReceiptWarehouse, setNewReceiptWarehouse] = useState("General Goods WH")

  // Handle Approvals
  const handleApproval = (id: string, isApproved: boolean) => {
    const updated = batches.map(b => {
      if (b.id === id) {
        return { ...b, status: isApproved ? "Approved" as const : "Rejected" as const }
      }
      return b
    })
    setBatches(updated)
    const b = batches.find(x => x.id === id)
    if (isApproved) {
      showToast(
        "Batch Approved Successfully",
        "success",
        `${b?.product} (Batch: ${b?.batchNumber}) passed quality checks and is cleared for stock allocation.`
      )
    } else {
      showToast(
        "Batch Quality Rejected",
        "warning",
        `${b?.product} failed compliance checks and has been flagged for return/disposal.`
      )
    }
  }

  // Handle Log Receipt
  const handleLogReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReceiptProduct || !newReceiptQty) {
      showToast(
        "Missing Fields",
        "info",
        "Please enter a product name and quantity."
      )
      return
    }

    const newLog: ActivityLog = {
      id: `ACT-${activities.length + 1}`,
      type: "Received",
      product: newReceiptProduct,
      quantity: Number(newReceiptQty),
      unit: newReceiptUnit,
      time: "Just Now",
      warehouse: newReceiptWarehouse
    }

    setActivities([newLog, ...activities])
    setIsLogReceiptOpen(false)
    setNewReceiptProduct("")
    setNewReceiptQty("")

    showToast(
      "Receipt Logged Successfully",
      "success",
      `Logged ${newLog.quantity} ${newLog.unit} of ${newLog.product} at ${newLog.warehouse}.`
    )
  }

  // Derived counts
  const pendingApprovalsCount = batches.filter(b => b.status === "Pending QA").length
  const totalSKUs = "12,482"
  const lowStockAlerts = 48
  const batchesNearExpiry = 12

  // Expiry alerts static data
  const expiryAlerts = [
    { name: "Amoxicillin 500mg", batch: "Batch B-9923", days: 12, warehouse: "Cold-Chain A", units: "450 UNITS", Icon: Package },
    { name: "Reagent Sol. A", batch: "Batch X-001", days: 4, warehouse: "Cold-Chain A", units: "120 UNITS", Icon: FlaskConical },
    { name: "Nutritional Paste", batch: "Batch N-442", days: 18, warehouse: "General Goods WH", units: "800 UNITS", Icon: Package },
  ]

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header Block with Integrated SubPage Navigation */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight mt-1">Inventory Dashboard</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Warehouse metrics, stock levels, and quality assurance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/inventory")} />

            {/* Quick Role Switcher */}
            <div className="flex items-center gap-1 bg-white/60 border border-zinc-200/60 rounded-full p-1 shadow-sm">
              <button
                onClick={() => {
                  setActiveRole("Overview")
                  showToast("Switched View", "info", "Showing General Inventory Overview stats.")
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeRole === "Overview" ? "bg-zinc-950 text-white shadow" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => {
                  setActiveRole("Reception")
                  showToast("Switched View", "info", "Showing Reception (Warehouse 1) portal.")
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeRole === "Reception" ? "bg-zinc-950 text-white shadow" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Reception (WH1)
              </button>
              <button
                onClick={() => {
                  setActiveRole("Technical")
                  showToast("Switched View", "info", "Showing Technical Quality Manager workspace.")
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeRole === "Technical" ? "bg-zinc-950 text-white shadow" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Tech Manager
              </button>
            </div>
          </div>
        </motion.div>

        {/* -------------------- ROLE 1: GENERAL OVERVIEW -------------------- */}
        {activeRole === "Overview" && (
          <motion.div key="overview-role" variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            {/* Top KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "TOTAL ACTIVE SKUS", value: totalSKUs, Icon: Archive, iconBg: "bg-black/5", iconColor: "text-zinc-600", note: "Across 3 sites", clickHandler: null },
                { label: "LOW-STOCK ALERTS", value: String(lowStockAlerts), Icon: AlertTriangle, iconBg: "bg-zinc-150", iconColor: "text-zinc-800", note: "Immediate order needed", clickHandler: null },
                { label: "BATCHES NEAR EXPIRY", value: String(batchesNearExpiry), Icon: Clock, iconBg: "bg-zinc-100", iconColor: "text-zinc-700", note: "Under 30 days horizon", clickHandler: null },
                { 
                  label: "PENDING BATCH APPROVALS", 
                  value: String(pendingApprovalsCount), 
                  Icon: CheckCircle2, 
                  iconBg: pendingApprovalsCount > 0 ? "bg-black animate-pulse text-white" : "bg-green-100", 
                  iconColor: pendingApprovalsCount > 0 ? "text-white" : "text-green-700", 
                  note: pendingApprovalsCount > 0 ? "Technical QA pending" : "All cleared",
                  clickHandler: () => setActiveRole("Technical")
                },
              ].map((kpi, idx) => {
                const Icon = kpi.Icon
                const isActionable = kpi.clickHandler !== null
                return (
                  <GlassCard 
                    key={kpi.label} 
                    className={`relative p-5 flex flex-col justify-between ${isActionable ? "cursor-pointer border border-dashed border-green-600/30 bg-green-50/10 hover:border-green-600" : ""}`}
                    onClick={kpi.clickHandler || undefined}
                    whileHover={{ y: isActionable ? -4 : -2 }}
                    transition={{ delay: 0.05 * idx, duration: 0.3 }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{kpi.label}</span>
                        <div className={`size-7.5 rounded-lg flex items-center justify-center ${kpi.iconBg}`}>
                          <Icon className={`size-4 ${kpi.iconColor}`} />
                        </div>
                      </div>
                      <p className="text-3xl font-black text-zinc-950 tracking-tight">{kpi.value}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-100/60">
                      <span className="text-[10px] font-bold text-zinc-500">{kpi.note}</span>
                      {isActionable && (
                        <span className="text-[9px] font-black uppercase text-green-700 flex items-center gap-0.5">
                          Audit Queue <ArrowUpRight className="size-3" />
                        </span>
                      )}
                    </div>
                  </GlassCard>
                )
              })}
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Warehouse Allocation & Top Moving */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Stock by Warehouse Card */}
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-5 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Stock by Warehouse Capacity</h3>
                      <p className="text-[11px] font-semibold text-zinc-400">Total volume levels and health indexes</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-500 font-mono text-[9px] font-bold uppercase">
                      Live Occupancy
                    </span>
                  </div>

                  <div className="space-y-5">
                    {[
                      { name: "Warehouse 1 - General", loc: "Ground Floor Dock", fill: 35, color: "bg-zinc-800", count: "3,120 m³", limit: "9,000 m³" },
                      { name: "Warehouse 2 - Nutrition", loc: "Aisle B-D Mezzanine", fill: 72, color: "bg-black", count: "6,480 m³", limit: "9,000 m³" },
                      { name: "Warehouse 3 - Cold-Chain A", loc: "Secure Climate Vault", fill: 88, color: "bg-green-600", count: "4,400 m³", limit: "5,000 m³" },
                    ].map((wh) => (
                      <div key={wh.name} className="p-4 bg-zinc-50/60 border border-zinc-150/40 rounded-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                          <div>
                            <span className="text-xs font-black text-zinc-800">{wh.name}</span>
                            <span className="block text-[9px] text-zinc-400 font-semibold">{wh.loc}</span>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-mono font-black text-zinc-900">{wh.count}</span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase"> / Limit {wh.limit}</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3 bg-zinc-200/50 rounded-full overflow-hidden p-0.5 border border-zinc-150/20">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${wh.fill}%` }} 
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className={`h-full rounded-full ${wh.color}`}
                            />
                          </div>
                          <span className={`font-mono text-xs font-black shrink-0 ${wh.fill > 80 ? "text-green-600" : "text-zinc-800"}`}>
                            {wh.fill}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Top Moving Products */}
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Top Moving Products</h3>
                      <p className="text-[11px] font-semibold text-zinc-400">Inventory movement frequency (rolling 30-day)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { rank: 1, name: "Surgical Masks Type IIR", change: "+24% movement", units: "2,400 units sold", lineColor: "stroke-zinc-900" },
                      { rank: 2, name: "Sterile Nitrile Gloves", change: "+18% movement", units: "1,850 units sold", lineColor: "stroke-green-600" },
                      { rank: 3, name: "Dextrose 5% Bags", change: "+12% movement", units: "1,120 units sold", lineColor: "stroke-zinc-400" },
                      { rank: 4, name: "Amoxicillin Trihydrate", change: "+8% movement", units: "980 units sold", lineColor: "stroke-black" },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center gap-3 p-3 bg-zinc-50/60 border border-zinc-150/40 rounded-2xl">
                        <span className="font-mono text-sm font-black text-zinc-300 w-5 text-center">#{item.rank}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-zinc-900 truncate">{item.name}</p>
                          <p className="text-[10px] font-bold text-zinc-400">{item.units}</p>
                        </div>
                        
                        {/* Sparkline Visualizer */}
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <svg width="55" height="18" viewBox="0 0 60 20" className="opacity-90">
                            <path 
                              d={item.rank === 1 ? "M0,16 C10,16 10,4 20,6 C30,12 30,2 40,4 C50,10 55,14 60,6" : 
                                 item.rank === 2 ? "M0,12 C10,14 15,18 20,16 C30,6 35,2 40,6 C50,14 55,10 60,12" :
                                 item.rank === 3 ? "M0,16 C15,16 10,12 20,14 C30,10 35,6 40,8 C50,4 55,8 60,4" :
                                 "M0,10 C10,12 20,8 30,10 C40,6 50,8 60,6"} 
                              fill="none" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              className={item.lineColor} 
                            />
                          </svg>
                          <span className="text-[8px] font-black uppercase text-emerald-600 font-mono tracking-tight">{item.change}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>

              {/* Right Column: Near Expiry Batches */}
              <div className="lg:col-span-4">
                <GlassCard className="h-full flex flex-col justify-between p-6">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Near Expiry Watch</h3>
                        <p className="text-[11px] font-semibold text-zinc-400">Critical ingredients and materials</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {expiryAlerts.map((alert) => {
                        const Icon = alert.Icon
                        // soft gray to green urgency scale
                        let badgeBg = "bg-green-100 border-green-200 text-green-700"
                        if (alert.days <= 5) {
                          badgeBg = "bg-black text-white border-black"
                        } else if (alert.days <= 14) {
                          badgeBg = "bg-zinc-100 border-zinc-200 text-zinc-800"
                        }

                        return (
                          <div key={alert.name} className="flex items-start gap-3 p-3 bg-zinc-50/40 border border-zinc-100 rounded-2xl hover:bg-zinc-50/80 transition-colors">
                            <div className="size-8.5 rounded-xl bg-zinc-100 border border-zinc-200/50 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="size-4 text-zinc-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-zinc-900 truncate leading-tight mb-0.5">{alert.name}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[9px] font-bold text-zinc-400">{alert.batch}</span>
                                <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 bg-zinc-100 text-zinc-500 rounded font-mono">
                                  {alert.warehouse.split(" ")[0]}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeBg}`}>
                                {alert.days} Days
                              </span>
                              <p className="text-[9px] font-black font-mono text-zinc-400 mt-1">{alert.units}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100">
                    <div className="flex items-center justify-between text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">
                      <span>Status Summary</span>
                      <span className="text-emerald-600 font-bold font-mono">Safe Spectrum</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">
                      Most pharma chemical ingredients and nutrition supplies are fully optimized. 1 batch requires re-testing within 4 days.
                    </p>
                  </div>
                </GlassCard>
              </div>
            </div>
          </motion.div>
        )}

        {/* -------------------- ROLE 2: RECEPTION (WAREHOUSE 1) -------------------- */}
        {activeRole === "Reception" && (
          <motion.div key="reception-role" variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            
            {/* Top Stat Row customized for Reception */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassCard className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Today's Total Receipts</span>
                  <p className="text-3xl font-black text-zinc-950 font-mono">5 batches</p>
                  <span className="text-[10px] font-semibold text-emerald-600 block mt-1">✓ Logged & Docked</span>
                </div>
                <div className="size-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Check className="size-5" />
                </div>
              </GlassCard>

              <GlassCard className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Today's Dispatches</span>
                  <p className="text-3xl font-black text-zinc-950 font-mono">3 shipments</p>
                  <span className="text-[10px] font-semibold text-zinc-500 block mt-1">✓ Cleared for transit</span>
                </div>
                <div className="size-11 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center">
                  <Truck className="size-5" />
                </div>
              </GlassCard>

              <GlassCard className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Pending Receipts</span>
                  <p className="text-3xl font-black text-zinc-950 font-mono">3 expected</p>
                  <span className="text-[10px] font-semibold text-zinc-600 block mt-1">ℹ Due in under 8 hrs</span>
                </div>
                <div className="size-11 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <Clock className="size-5 animate-spin-slow" />
                </div>
              </GlassCard>
            </div>

            {/* Quick Action Dock */}
            <motion.div variants={fade} className="flex justify-between items-center bg-white/40 border border-zinc-200/50 p-4 rounded-3xl backdrop-blur-md">
              <div>
                <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Warehouse 1 Dock Portal</h4>
                <p className="text-xs font-semibold text-zinc-500">Fast logger for incoming receipts and material check-ins</p>
              </div>
              <button
                onClick={() => setIsLogReceiptOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold transition-all shadow active:scale-95 shrink-0"
              >
                <PlusCircle className="size-4" /> Log New Receipt
              </button>
            </motion.div>

            {/* Main content split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Today's Activity */}
              <div className="lg:col-span-7">
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-5 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Today's Activity Log</h3>
                      <p className="text-[11px] font-semibold text-zinc-400">Chronological list of received and dispatched inventory today</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {activities.map((act) => (
                      <div key={act.id} className="flex items-center justify-between p-3.5 bg-zinc-50/60 border border-zinc-150/40 rounded-2xl hover:bg-white transition-all">
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
                            act.type === "Received" ? "bg-emerald-50 text-emerald-600 border-emerald-150" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                          }`}>
                            {act.type}
                          </span>
                          <div>
                            <p className="text-xs font-black text-zinc-900">{act.product}</p>
                            <span className="text-[9px] font-bold text-zinc-400 font-mono uppercase">
                              {act.id} · {act.warehouse}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-xs font-black text-zinc-950">
                            {act.type === "Received" ? "+" : "-"}{act.quantity} {act.unit}
                          </span>
                          <span className="block text-[9px] text-zinc-400 font-semibold">{act.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>

              {/* Right Column: Expected Deliveries */}
              <div className="lg:col-span-5">
                <GlassCard className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Expected Deliveries</h3>
                        <p className="text-[11px] font-semibold text-zinc-400">Supplier shipments incoming today</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {expectedDeliveries.map((del) => (
                        <div key={del.id} className="p-3.5 bg-zinc-50/40 border border-zinc-100 rounded-2xl hover:bg-zinc-50/80 transition-all">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-xs font-black text-zinc-900 leading-snug">{del.product}</h4>
                            <span className="font-mono text-[9px] font-bold text-zinc-400 shrink-0 uppercase">{del.id}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500">
                            <span>Supplier: {del.supplier}</span>
                            <span className="font-mono font-black text-zinc-800">{del.expectedQty} {del.unit}</span>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-zinc-100/60 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                              ETA: {del.eta}
                            </span>
                            <button
                              onClick={() => {
                                // Simulate accepting this delivery
                                const log: ActivityLog = {
                                  id: `ACT-${activities.length + 1}`,
                                  type: "Received",
                                  product: del.product,
                                  quantity: del.expectedQty,
                                  unit: del.unit,
                                  time: "Just Now",
                                  warehouse: "General Goods WH"
                                }
                                setActivities([log, ...activities])
                                setExpectedDeliveries(expectedDeliveries.filter(x => x.id !== del.id))
                                showToast(
                                  "Incoming Delivery Checked In",
                                  "success",
                                  `Successfully logged receipt of ${del.expectedQty} ${del.unit} of ${del.product}.`
                                )
                              }}
                              className="text-[9px] font-black uppercase text-zinc-800 hover:text-black flex items-center gap-0.5"
                            >
                              Check In <ChevronRight className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-t border-zinc-100/60 mt-4">
                    Supplier Logistics Operational
                  </div>
                </GlassCard>
              </div>
            </div>
          </motion.div>
        )}

        {/* -------------------- ROLE 3: TECHNICAL MANAGER -------------------- */}
        {activeRole === "Technical" && (
          <motion.div key="technical-role" variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            
            {/* QA Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <GlassCard className="p-5">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Queue Backlog</span>
                <p className="text-3xl font-black text-zinc-950 font-mono">{pendingApprovalsCount}</p>
                <span className="text-[10px] font-semibold text-zinc-500 block mt-1">Pending Quality Testing</span>
              </GlassCard>

              <GlassCard className="p-5">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Total Audited Today</span>
                <p className="text-3xl font-black text-zinc-950 font-mono">
                  {batches.filter(b => b.status !== "Pending QA").length}
                </p>
                <span className="text-[10px] font-semibold text-emerald-600 block mt-1">Decisions finalized</span>
              </GlassCard>

              <GlassCard className="p-5">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Average Turnaround</span>
                <p className="text-3xl font-black text-zinc-950 font-mono">2.4 Hrs</p>
                <span className="text-[10px] font-semibold text-zinc-500 block mt-1">Lab verification speed</span>
              </GlassCard>

              <GlassCard className="p-5">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Compliance Rate</span>
                <p className="text-3xl font-black text-zinc-950 font-mono">98.4%</p>
                <span className="text-[10px] font-semibold text-emerald-600 block mt-1">Passed test baseline</span>
              </GlassCard>
            </div>

            {/* QA Pipeline */}
            <GlassCard className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Compliance Pipeline & QA Queue</h3>
                  <p className="text-xs font-semibold text-zinc-500">Inspect Active Pharma Ingredients (APIs) and clear batches for distribution</p>
                </div>
                <div className="flex gap-1.5 self-start">
                  <span className="text-[10px] font-black uppercase text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                    High compliance protocol active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batches.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-zinc-400 text-xs font-semibold">
                    No batches currently in the quality pipeline.
                  </div>
                ) : (
                  batches.map((item) => (
                    <GlassCard 
                      key={item.id} 
                      className="p-5 flex flex-col justify-between"
                      whileHover={{ y: -3 }}
                    >
                      <div>
                        {/* ID Row */}
                        <div className="flex items-center justify-between mb-3 border-b border-zinc-150/40 pb-2.5">
                          <span className="font-mono text-[9px] font-black text-zinc-400 uppercase">
                            QA {item.id}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            item.status === "Pending QA" ? "bg-zinc-100 text-zinc-700 border-zinc-200" :
                            item.status === "Approved" ? "bg-green-50 text-green-700 border-green-200" :
                            "bg-black text-white border-black"
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        <h3 className="text-xs font-black text-zinc-900 tracking-tight leading-snug mb-1">
                          {item.product}
                        </h3>
                        <p className="font-mono text-[10px] font-bold text-zinc-400 mb-4">
                          Batch No: {item.batchNumber}
                        </p>

                        {/* Stats Block */}
                        <div className="grid grid-cols-2 gap-2 mb-4 bg-zinc-50/60 border border-zinc-150/40 p-2.5 rounded-2xl">
                          <div>
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wide block">Test Vol</span>
                            <span className="font-mono text-[10px] font-black text-zinc-800">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wide block">Expiry</span>
                            <span className="font-mono text-[10px] font-black text-zinc-800">
                              {item.expiry}
                            </span>
                          </div>
                        </div>

                        <div className="text-[9px] text-zinc-400 font-semibold mb-4 flex items-center gap-1 bg-zinc-100/50 px-2 py-1 rounded-lg">
                          <Package className="size-3 text-zinc-400" />
                          Target: {item.warehouse}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {item.status === "Pending QA" ? (
                        <div className="flex items-center gap-2 border-t border-zinc-100 pt-3.5">
                          <button
                            onClick={() => handleApproval(item.id, false)}
                            className="flex-1 py-1.5 rounded-xl border border-zinc-200 hover:bg-black hover:border-black text-zinc-600 hover:text-white text-[10px] font-black transition-all uppercase tracking-wider"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproval(item.id, true)}
                            className="flex-1 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white text-[10px] font-black transition-all uppercase tracking-wider"
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <div className="text-center pt-2.5 border-t border-zinc-50 text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">
                          Decision Locked
                        </div>
                      )}
                    </GlassCard>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* -------------------- LOG RECEIPT MODAL (FOR RECEPTION ROLE) -------------------- */}
        <AnimatePresence>
          {isLogReceiptOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[2rem] border border-zinc-200 max-w-md w-full p-6 shadow-2xl relative overflow-hidden"
              >
                <button 
                  onClick={() => setIsLogReceiptOpen(false)}
                  className="absolute top-4 right-4 size-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors"
                >
                  <X className="size-4" />
                </button>

                <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-1">Log Incoming Receipt</h3>
                <p className="text-xs font-semibold text-zinc-500 mb-5">Manually record a checked-in parcel at Warehouse 1 docks.</p>

                <form onSubmit={handleLogReceiptSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5">Product / Material Name</label>
                    <input
                      type="text"
                      required
                      value={newReceiptProduct}
                      onChange={(e) => setNewReceiptProduct(e.target.value)}
                      placeholder="e.g. Surgical Gloves Type II"
                      className="w-full bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5">Quantity</label>
                      <input
                        type="number"
                        required
                        value={newReceiptQty}
                        onChange={(e) => setNewReceiptQty(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5">Unit</label>
                      <select
                        value={newReceiptUnit}
                        onChange={(e) => setNewReceiptUnit(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors cursor-pointer"
                      >
                        <option value="units">Units</option>
                        <option value="bags">Bags</option>
                        <option value="pairs">Pairs</option>
                        <option value="packs">Packs</option>
                        <option value="kg">kg</option>
                        <option value="L">Liters</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5">Receiving Location</label>
                    <select
                      value={newReceiptWarehouse}
                      onChange={(e) => setNewReceiptWarehouse(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors cursor-pointer"
                    >
                      <option value="General Goods WH">Warehouse 1 - General Goods</option>
                      <option value="Mezzanine Nutrition WH">Warehouse 2 - Nutrition WH</option>
                      <option value="Cold-Chain A Vault">Warehouse 3 - Cold-Chain A Vault</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsLogReceiptOpen(false)}
                      className="flex-1 py-2.5 rounded-full border border-zinc-200 hover:bg-zinc-50 text-zinc-600 text-xs font-bold uppercase transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold uppercase shadow"
                    >
                      Log Cargo
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
