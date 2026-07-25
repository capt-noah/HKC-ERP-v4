import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Calendar, 
  Download, 
  Warehouse, 
  TrendingUp, 
  Trash2, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText
} from "lucide-react"
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell
} from "recharts"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"

const reportMovementColumns: TableColumn[] = [
  { key: "id", label: "Log ID", align: "left" },
  { key: "date", label: "Timestamp", align: "left" },
  { key: "product", label: "Material / Product", align: "left" },
  { key: "sku", label: "SKU", align: "left" },
  { key: "type", label: "Action Type", align: "left" },
  { key: "qty", label: "Quantity", align: "right" },
  { key: "warehouse", label: "Site Location", align: "left" },
  { key: "operator", label: "Operator", align: "left" },
]

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

// Mock Data representing HKC Trading 3 Warehouses
const VALUATION_TREND_DATA = [
  { name: "Jan 26", "WH1 (Agri Export)": 18500000, "WH2 (India Vet)": 8400000, "WH3 (China Vet)": 6200000 },
  { name: "Feb 26", "WH1 (Agri Export)": 21000000, "WH2 (India Vet)": 9100000, "WH3 (China Vet)": 6800000 },
  { name: "Mar 26", "WH1 (Agri Export)": 22400000, "WH2 (India Vet)": 9800000, "WH3 (China Vet)": 7400000 },
  { name: "Apr 26", "WH1 (Agri Export)": 24800000, "WH2 (India Vet)": 11200000, "WH3 (China Vet)": 8100000 },
  { name: "May 26", "WH1 (Agri Export)": 26100000, "WH2 (India Vet)": 12500000, "WH3 (China Vet)": 8900000 },
  { name: "Jun 26", "WH1 (Agri Export)": 28500000, "WH2 (India Vet)": 13800000, "WH3 (China Vet)": 9600000 },
]

const CATEGORY_COLORS = ["#18181b", "#16a34a", "#a1a1aa"] // Zinc-900, Green-600, Zinc-400

interface MovementLog {
  id: string
  date: string
  product: string
  sku: string
  type: "Received" | "Shipped" | "Adjusted" | "Transferred"
  qty: number
  unit: string
  warehouse: string
  operator: string
}

export default function Reports() {
  const { showToast } = useFeedback()
  
  // Filters
  const [dateRange, setDateRange] = useState("Last 30 Days")
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [movementFilter, setMovementFilter] = useState<"ALL" | "Received" | "Shipped" | "Adjusted" | "Transferred">("ALL")

  // HKC Trading Movement Logs
  const movements: MovementLog[] = [
    { id: "M-9921", date: "2026-07-07", product: "Grade 1 Yirgacheffe Arabica Coffee Beans", sku: "AGR-COF-YRG1", type: "Received", qty: 200, unit: "bags", warehouse: "WH1 (Agri Export)", operator: "A. Kasahun" },
    { id: "M-9922", date: "2026-07-06", product: "Oxytetracycline 20% LA Injectable", sku: "VET-OXY-20LA", type: "Transferred", qty: 400, unit: "vials", warehouse: "WH2 (India Vet)", operator: "S. Kebede" },
    { id: "M-9923", date: "2026-07-05", product: "Amoxicillin Trihydrate 50% Soluble Powder", sku: "VET-AMX-50SP", type: "Shipped", qty: 100, unit: "tins", warehouse: "WH3 (China Vet)", operator: "T. Haile" },
    { id: "M-9924", date: "2026-07-04", product: "Humera White Sesame Seeds", sku: "AGR-SES-HUM1", type: "Shipped", qty: 5, unit: "MT", warehouse: "WH1 (Agri Export)", operator: "A. Kasahun" },
    { id: "M-9925", date: "2026-07-03", product: "Newcastle + IB Poultry Vaccine", sku: "VET-VAC-NCIB", type: "Received", qty: 160, unit: "vials", warehouse: "WH3 (China Vet)", operator: "T. Haile" },
    { id: "M-9926", date: "2026-07-02", product: "Ivermectin 1% Injectable Solution", sku: "VET-IVM-01IN", type: "Received", qty: 800, unit: "vials", warehouse: "WH2 (India Vet)", operator: "S. Kebede" },
  ]

  // Filter movements
  const filteredMovements = movements.filter(m => {
    const matchesSearch = m.product.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = movementFilter === "ALL" || m.type === movementFilter
    const matchesWH = selectedWarehouse === "ALL" || m.warehouse.includes(selectedWarehouse)
    
    return matchesSearch && matchesType && matchesWH
  })

  const movementTable = useResizableTable(reportMovementColumns, filteredMovements, {
    id: 110,
    date: 120,
    product: 220,
    sku: 140,
    type: 120,
    qty: 120,
    warehouse: 160,
    operator: 140,
  })

  // Export handlers
  const handleExport = (type: "CSV" | "PDF", widgetName: string) => {
    showToast(
      `${type} Export Triggered`,
      "success",
      `Your custom report for "${widgetName}" is compiling and will begin downloading automatically.`
    )
  }

  // Derived Category Data for Donut Chart (HKC Trading)
  const getCategoryData = () => {
    if (selectedWarehouse === "WH1") {
      return [
        { name: "Coffee & Oilseeds (WH1 Export)", value: 28500000 },
        { name: "Veterinary Imports (India WH2)", value: 0 },
        { name: "Veterinary Imports (China WH3)", value: 0 },
      ]
    } else if (selectedWarehouse === "WH2") {
      return [
        { name: "Coffee & Oilseeds (WH1 Export)", value: 0 },
        { name: "Veterinary Imports (India WH2)", value: 13800000 },
        { name: "Veterinary Imports (China WH3)", value: 0 },
      ]
    } else if (selectedWarehouse === "WH3") {
      return [
        { name: "Coffee & Oilseeds (WH1 Export)", value: 0 },
        { name: "Veterinary Imports (India WH2)", value: 0 },
        { name: "Veterinary Imports (China WH3)", value: 9600000 },
      ]
    }
    return [
      { name: "Coffee & Oilseeds (WH1 Export)", value: 28500000 },
      { name: "Veterinary Imports (India WH2)", value: 13800000 },
      { name: "Veterinary Imports (China WH3)", value: 9600000 },
    ]
  }

  const categoryData = getCategoryData()
  const totalValuation = categoryData.reduce((acc, curr) => acc + curr.value, 0)

  // Derived trend data based on warehouse
  const getValuationTrend = () => {
    return VALUATION_TREND_DATA.map(d => {
      let val = d["WH1 (Agri Export)"] + d["WH2 (India Vet)"] + d["WH3 (China Vet)"]
      if (selectedWarehouse === "WH1") val = d["WH1 (Agri Export)"]
      if (selectedWarehouse === "WH2") val = d["WH2 (India Vet)"]
      if (selectedWarehouse === "WH3") val = d["WH3 (China Vet)"]
      return {
        name: d.name,
        Valuation: val
      }
    })
  }

  const trendData = getValuationTrend()

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        
        {/* Header Block with Integrated SubPage Navigation */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight mt-1">Stock Reports</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Inventory valuation trends and audit reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/inventory")} />

            <button 
              onClick={() => handleExport("PDF", "Consolidated Stock Status")}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
            >
              <Download className="size-4" /> Download Master PDF
            </button>
          </div>
        </motion.div>

        {/* Global Report Filters Grid */}
        <motion.div variants={fade} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mb-6 bg-white/40 border border-zinc-200/50 p-4 rounded-3xl backdrop-blur-md">
          {/* Warehouse Selector */}
          <div className="md:col-span-4 flex items-center gap-2 bg-white/80 border border-zinc-200 rounded-2xl px-3 py-1.5 shadow-sm">
            <Warehouse className="size-4 text-zinc-400 shrink-0" />
            <div className="flex-1">
              <span className="text-[8px] font-black text-zinc-400 uppercase block leading-none">Warehouse Focus</span>
              <select
                value={selectedWarehouse}
                onChange={(e) => {
                  setSelectedWarehouse(e.target.value)
                  showToast("Scope Adjusted", "info", `Report set to focus on: ${e.target.value === "ALL" ? "All Sites" : e.target.value}`)
                }}
                className="bg-transparent text-xs font-black text-zinc-800 outline-none w-full cursor-pointer pr-4"
              >
                <option value="ALL">All Warehouses (WH1, WH2, WH3)</option>
                <option value="WH1">Warehouse 1 - General Goods</option>
                <option value="WH2">Warehouse 2 - Nutrition & Food</option>
                <option value="WH3">Warehouse 3 - Cold-Chain Pharma</option>
              </select>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="md:col-span-4 flex items-center gap-2 bg-white/80 border border-zinc-200 rounded-2xl px-3 py-1.5 shadow-sm">
            <Calendar className="size-4 text-zinc-400 shrink-0" />
            <div className="flex-1">
              <span className="text-[8px] font-black text-zinc-400 uppercase block leading-none">Reporting Interval</span>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value)
                  showToast("Date Horizon Changed", "info", `Interval set to: ${e.target.value}`)
                }}
                className="bg-transparent text-xs font-black text-zinc-800 outline-none w-full cursor-pointer pr-4"
              >
                <option value="Last 30 Days">Last 30 Days (Rolling)</option>
                <option value="Last Quarter">Last Quarter (Q2 2026)</option>
                <option value="Year to Date">Year to Date (YTD 2026)</option>
                <option value="Custom Range">Custom Audit Interval...</option>
              </select>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="md:col-span-4 flex justify-between md:justify-end items-center gap-4 px-2">
            <div className="text-right">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block leading-none">Selected Scope Valuation</span>
              <span className="font-mono text-base font-black text-zinc-900 mt-1 block">
                ETB {totalValuation.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedWarehouse("ALL")
                setDateRange("Last 30 Days")
                showToast("Filters Restored", "success", "Audit scope set back to default parameters.")
              }}
              className="size-9 rounded-xl bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors shadow-sm"
              title="Reset Filters"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
        </motion.div>

        {/* -------------------- CHARTS & ANALYTICS ROW 1 -------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          
          {/* Widget 1: Stock Valuation over Time */}
          <GlassCard className="lg:col-span-7 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-zinc-150/40 pb-3">
                <div>
                  <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Stock Valuation Trend</h3>
                  <p className="text-[11px] font-semibold text-zinc-400">Total physical inventory valuation over time</p>
                </div>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleExport("CSV", "Valuation Trend")}
                    className="size-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition-colors border border-zinc-200/50 shadow-sm"
                    title="Export CSV"
                  >
                    <FileSpreadsheet className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Chart container */}
              <div className="h-64 mt-4 text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="valTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `ETB ${v/1000}k`} />
                    <Tooltip formatter={(value) => [`ETB ${(value as number).toLocaleString()}`, "Valuation"]} labelStyle={{ fontWeight: "bold" }} />
                    <Area type="monotone" dataKey="Valuation" stroke="#18181b" strokeWidth={2.5} fillOpacity={1} fill="url(#valTrendGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-zinc-100 text-[10px] text-zinc-400 font-semibold font-mono">
              <span className="flex items-center gap-1">
                <TrendingUp className="size-3 text-emerald-500" /> +15.4% Valuation Increase H1
              </span>
              <span>Audited under GAS standards</span>
            </div>
          </GlassCard>

          {/* Widget 2: Category Share Donut */}
          <GlassCard className="lg:col-span-5 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-zinc-150/40 pb-3">
                <div>
                  <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Stock Share by Category</h3>
                  <p className="text-[11px] font-semibold text-zinc-400">Medicine, Food & General distribution proportions</p>
                </div>
                <button 
                  onClick={() => handleExport("PDF", "Category Shares")}
                  className="size-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition-colors border border-zinc-200/50 shadow-sm"
                  title="Export PDF"
                >
                  <FileText className="size-3.5" />
                </button>
              </div>

              {/* Pie Chart */}
              <div className="h-56 flex items-center justify-center relative mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `ETB ${(value as number).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center total label */}
                <div className="absolute text-center">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block leading-none">Total Value</span>
                  <span className="font-mono text-sm font-black text-zinc-900 mt-1 block">
                    ETB {(totalValuation/1000).toFixed(1)}k
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Legend / Category List */}
            <div className="space-y-2 mt-4 pt-4 border-t border-zinc-100">
              {categoryData.map((cat, idx) => {
                const pct = ((cat.value / (totalValuation || 1)) * 100).toFixed(0)
                return (
                  <div key={cat.name} className="flex items-center justify-between text-xs font-bold text-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx] }} />
                      <span className="text-zinc-600 font-semibold">{cat.name}</span>
                    </div>
                    <span className="font-mono">{pct}% ({cat.value > 0 ? `ETB ${cat.value/1000}k` : "0"})</span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </div>

        {/* -------------------- ROW 2: COMPARATIVE PERFORMANCE & EXPIRY/WASTE -------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          
          {/* Comparative Warehouse Performance Matrices */}
          <GlassCard className="lg:col-span-8 p-6">
            <div className="flex items-center justify-between mb-5 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Warehouse Comparison Matrix</h3>
                <p className="text-[11px] font-semibold text-zinc-400">Audit comparing storage, distinct items, and monthly throughput</p>
              </div>
              <button
                onClick={() => handleExport("CSV", "Warehouse Comparison")}
                className="flex items-center gap-1 text-[10px] font-black uppercase text-zinc-800 hover:text-black border border-zinc-200 bg-white shadow-sm px-3 py-1.5 rounded-xl"
              >
                <Download className="size-3" /> Export comparison
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: "WH1 (General)", val: 63000, skus: 3400, turnover: "Light (14% Dispatch)", loss: "ETB 2,400", bg: "bg-zinc-50/50" },
                { name: "WH2 (Nutrition)", val: 168000, skus: 4200, turnover: "Moderate (38% Dispatch)", loss: "ETB 11,500", bg: "bg-zinc-100/50 border-zinc-200/50" },
                { name: "WH3 (Cold-Chain)", val: 410000, skus: 4882, turnover: "High (48% Dispatch)", loss: "ETB 34,900", bg: "bg-zinc-950/[0.02]" },
              ].map((site) => (
                <div key={site.name} className={`p-4 border border-zinc-200/60 rounded-2xl flex flex-col justify-between ${site.bg}`}>
                  <div>
                    <h4 className="text-xs font-black text-zinc-900 uppercase tracking-tight mb-2">{site.name}</h4>
                    <div className="space-y-3 font-mono text-[11px] font-bold text-zinc-600">
                      <div className="flex justify-between border-b border-zinc-100 pb-1.5">
                        <span className="text-zinc-400 font-sans font-semibold">Stock Value</span>
                        <span className="text-zinc-900">ETB {site.val.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-100 pb-1.5">
                        <span className="text-zinc-400 font-sans font-semibold">Distinct SKUs</span>
                        <span className="text-zinc-900">{site.skus}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-100 pb-1.5">
                        <span className="text-zinc-400 font-sans font-semibold">Turnover</span>
                        <span className="text-zinc-800 font-sans font-black">{site.turnover.split(" ")[0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 font-sans font-semibold text-zinc-950">Expired Waste</span>
                        <span className="text-zinc-850">{site.loss}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-between items-center">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Active Site</span>
                    <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Expiry/Waste report */}
          <GlassCard className="lg:col-span-4 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-zinc-150/40 pb-3">
                <div>
                  <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Expiry &amp; Waste Loss</h3>
                  <p className="text-[11px] font-semibold text-zinc-400">Value of stock lost to shelf limits (YTD)</p>
                </div>
              </div>

              {/* Progress bar lists of loss */}
              <div className="space-y-4 mt-2">
                {[
                  { cat: "Pharmaceutical APIs", loss: "ETB 34,900", pct: 72, color: "bg-zinc-950" },
                  { cat: "Therapeutic Pastes", loss: "ETB 11,500", pct: 23, color: "bg-green-600" },
                  { cat: "Sterile Dressings", loss: "ETB 2,400", pct: 5, color: "bg-zinc-400" },
                ].map((item) => (
                  <div key={item.cat}>
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-800 mb-1.5">
                      <span className="text-zinc-600 font-semibold">{item.cat}</span>
                      <span className="font-mono text-zinc-900">{item.loss}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden p-0.1">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-3 bg-zinc-50 border border-zinc-200 rounded-2xl">
              <div className="flex items-start gap-2">
                <Trash2 className="size-4.5 text-zinc-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[11px] font-black text-zinc-900 uppercase tracking-tight">Leadership Watch</h5>
                  <p className="text-[10px] font-semibold text-zinc-700 leading-normal mt-0.5">
                    ETB 48,800 lost YTD. Cold-chain storage monitoring audits have been deployed to mitigate active ingredient decay.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* -------------------- ROW 3: DETAILED STOCK MOVEMENT AUDIT TABLE -------------------- */}
        <div className="space-y-4">
          <FinanceTableToolbar
            title="Stock Movement Audit Log"
            subtitle={`${filteredMovements.length} audit entries matching active filters`}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search item, SKU, or ID..."
            secondary={
              <div className="flex bg-black/[0.03] p-1 rounded-2xl gap-1 w-fit">
                {[
                  { id: "ALL", label: "All Actions" },
                  { id: "Received", label: "Received" },
                  { id: "Shipped", label: "Shipped" },
                  { id: "Adjusted", label: "Adjusted" },
                  { id: "Transferred", label: "Transferred" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMovementFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      movementFilter === tab.id
                        ? "bg-white text-black shadow-sm"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
            actions={[
              {
                label: "Export CSV",
                onClick: () => handleExport("CSV", "Stock Movement Log"),
                icon: <Download className="size-4" />,
                variant: "secondary",
              },
            ]}
          />

          <GlassCard className="p-0 overflow-hidden border border-white/65 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase select-none">
                    <ResizableTh col={reportMovementColumns[0]} width={movementTable.colWidths.id} sortKey={movementTable.sortKey} sortDir={movementTable.sortDir} openMenuCol={movementTable.openMenuCol} onResizeStart={movementTable.handleResizeStart} onToggleMenu={movementTable.toggleMenu} onSortAsc={movementTable.setSortAsc} onSortDesc={movementTable.setSortDesc} onClearSort={movementTable.clearSort} />
                    <ResizableTh col={reportMovementColumns[1]} width={movementTable.colWidths.date} sortKey={movementTable.sortKey} sortDir={movementTable.sortDir} openMenuCol={movementTable.openMenuCol} onResizeStart={movementTable.handleResizeStart} onToggleMenu={movementTable.toggleMenu} onSortAsc={movementTable.setSortAsc} onSortDesc={movementTable.setSortDesc} onClearSort={movementTable.clearSort} />
                    <ResizableTh col={reportMovementColumns[2]} width={movementTable.colWidths.product} sortKey={movementTable.sortKey} sortDir={movementTable.sortDir} openMenuCol={movementTable.openMenuCol} onResizeStart={movementTable.handleResizeStart} onToggleMenu={movementTable.toggleMenu} onSortAsc={movementTable.setSortAsc} onSortDesc={movementTable.setSortDesc} onClearSort={movementTable.clearSort} />
                    <ResizableTh col={reportMovementColumns[3]} width={movementTable.colWidths.sku} sortKey={movementTable.sortKey} sortDir={movementTable.sortDir} openMenuCol={movementTable.openMenuCol} onResizeStart={movementTable.handleResizeStart} onToggleMenu={movementTable.toggleMenu} onSortAsc={movementTable.setSortAsc} onSortDesc={movementTable.setSortDesc} onClearSort={movementTable.clearSort} />
                    <ResizableTh col={reportMovementColumns[4]} width={movementTable.colWidths.type} sortKey={movementTable.sortKey} sortDir={movementTable.sortDir} openMenuCol={movementTable.openMenuCol} onResizeStart={movementTable.handleResizeStart} onToggleMenu={movementTable.toggleMenu} onSortAsc={movementTable.setSortAsc} onSortDesc={movementTable.setSortDesc} onClearSort={movementTable.clearSort} />
                    <ResizableTh col={reportMovementColumns[5]} width={movementTable.colWidths.qty} sortKey={movementTable.sortKey} sortDir={movementTable.sortDir} openMenuCol={movementTable.openMenuCol} onResizeStart={movementTable.handleResizeStart} onToggleMenu={movementTable.toggleMenu} onSortAsc={movementTable.setSortAsc} onSortDesc={movementTable.setSortDesc} onClearSort={movementTable.clearSort} />
                    <ResizableTh col={reportMovementColumns[6]} width={movementTable.colWidths.warehouse} sortKey={movementTable.sortKey} sortDir={movementTable.sortDir} openMenuCol={movementTable.openMenuCol} onResizeStart={movementTable.handleResizeStart} onToggleMenu={movementTable.toggleMenu} onSortAsc={movementTable.setSortAsc} onSortDesc={movementTable.setSortDesc} onClearSort={movementTable.clearSort} />
                    <ResizableTh col={reportMovementColumns[7]} width={movementTable.colWidths.operator} sortKey={movementTable.sortKey} sortDir={movementTable.sortDir} openMenuCol={movementTable.openMenuCol} onResizeStart={movementTable.handleResizeStart} onToggleMenu={movementTable.toggleMenu} onSortAsc={movementTable.setSortAsc} onSortDesc={movementTable.setSortDesc} onClearSort={movementTable.clearSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150/40 text-xs font-semibold text-zinc-800">
                  {movementTable.sorted().length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-zinc-400 font-bold uppercase text-[10px] tracking-widest">
                        No matching audit records located.
                      </td>
                    </tr>
                  ) : (
                    movementTable.sorted().map((log: any) => {
                      let typeBadge = "bg-green-50 text-green-700 border-green-200"
                      if (log.type === "Shipped") typeBadge = "bg-zinc-100 text-zinc-600 border-zinc-200"
                      if (log.type === "Adjusted") typeBadge = "bg-black text-white border-black"
                      if (log.type === "Transferred") typeBadge = "bg-zinc-150 text-zinc-700 border-zinc-200"

                      return (
                        <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-black text-zinc-400 text-[11px] uppercase">{log.id}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">{log.date}</td>
                          <td className="py-3 px-4 font-black text-zinc-950">{log.product}</td>
                          <td className="py-3 px-4 font-mono text-zinc-500 text-[11px] uppercase">{log.sku}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${typeBadge}`}>
                              {log.type}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-black ${log.qty < 0 ? "text-zinc-800" : "text-zinc-950"}`}>
                            {log.qty > 0 ? "+" : ""}{log.qty.toLocaleString()} <span className="text-[9px] font-normal font-sans text-zinc-400">{log.unit}</span>
                          </td>
                          <td className="py-3 px-4 font-black text-zinc-600 text-[11px]">{log.warehouse}</td>
                          <td className="py-3 px-4 font-semibold text-zinc-500">{log.operator}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </motion.div>
    </div>
  )
}
