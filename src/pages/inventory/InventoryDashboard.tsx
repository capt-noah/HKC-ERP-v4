import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Archive,
  Package,
  Warehouse as WarehouseIcon,
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/lib/authStore"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

function daysUntil(value?: string) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  parsed.setHours(0, 0, 0, 0)
  return Math.ceil((parsed.getTime() - today.getTime()) / 86_400_000)
}

function KpiSkeleton() {
  return (
    <GlassCard className="relative p-5 flex flex-col justify-between">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Skeleton className="h-3 w-24 bg-zinc-200/80" />
          <Skeleton className="size-7.5 rounded-lg bg-zinc-200/80" />
        </div>
        <Skeleton className="h-9 w-32 bg-zinc-200/80" />
      </div>
      <div className="mt-3 border-t border-zinc-100/60 pt-2.5">
        <Skeleton className="h-3 w-36 bg-zinc-200/80" />
      </div>
    </GlassCard>
  )
}

export default function InventoryDashboard() {
  const erp = useErpStore()
  const { user } = useAuthStore()
  const userRoles = user?.roles || ((user as any)?.role ? [(user as any).role] : [])
  const userWarehouseIds = user?.warehouse_ids || ((user as any)?.warehouse_id ? [(user as any).warehouse_id] : [])
  const resolvedWarehouseIds = useMemo(() => {
    const allWhs = erp.getWarehouses()
    const set = new Set<string>()
    userWarehouseIds.forEach((id: string) => {
      set.add(id)
      const matched = allWhs.find(w => w.id === id || w.code === id)
      if (matched) {
        if (matched.id) set.add(matched.id)
        if (matched.code) set.add(matched.code)
      }
    })
    return Array.from(set)
  }, [userWarehouseIds, erp])

  const isInventoryAdminOnly = userRoles.includes("inventory_admin") && !userRoles.includes("superadmin")

  const allProducts = erp.getProducts()
  const products = isInventoryAdminOnly
    ? allProducts.filter(p => 
        resolvedWarehouseIds.includes(p.warehouse) || 
        (p.stockBreakdown || []).some(entry => resolvedWarehouseIds.includes(entry.warehouse))
      )
    : allProducts

  const allWarehouses = withOperatingWarehouses(erp.getWarehouses())
  const warehouses = isInventoryAdminOnly
    ? allWarehouses.filter(w => resolvedWarehouseIds.includes(w.id) || resolvedWarehouseIds.includes(w.code))
    : allWarehouses

  const allMovements = erp.getStockMovements()
  const movements = isInventoryAdminOnly
    ? allMovements.filter(m => 
        (m.fromWarehouse && resolvedWarehouseIds.includes(m.fromWarehouse)) || 
        (m.toWarehouse && resolvedWarehouseIds.includes(m.toWarehouse))
      )
    : allMovements

  const isLoading = erp.isLoading()

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("ALL")

  const warehouseById = useMemo(() => new Map(warehouses.flatMap((warehouse) => [[warehouse.id, warehouse], [warehouse.code, warehouse]])), [warehouses])

  const filteredProducts = useMemo(() => {
    if (selectedWarehouse === "ALL") return products
    return products.filter((prod) => {
      return prod.warehouse === selectedWarehouse || prod.stockBreakdown.some((entry) => entry.warehouse === selectedWarehouse)
    })
  }, [products, selectedWarehouse])

  const expiryAlerts = useMemo(() => {
    return filteredProducts
      .flatMap((product) =>
        product.batches.map((batch) => {
          const days = daysUntil(batch.expiry)
          return {
            id: `${product.id}-${batch.batchNo}`,
            product: product.name,
            batch: batch.batchNo,
            days,
            warehouse: product.warehouseName || warehouseById.get(product.warehouse)?.name || product.warehouse,
            quantity: Number(batch.qty || 0),
            unit: product.unit,
          }
        }),
      )
      .filter((entry) => entry.days !== null && entry.days >= 0 && entry.days <= 30)
      .sort((a, b) => Number(a.days) - Number(b.days))
      .slice(0, 5)
  }, [filteredProducts, warehouseById])

  const warehouseRows = useMemo(() => {
    return warehouses.map((warehouse) => {
      const key = warehouse.code || warehouse.id
      const relatedProducts = products.filter((product) => product.stockBreakdown.some((entry) => entry.warehouse === key || entry.warehouse === warehouse.id))
      const quantity = relatedProducts.reduce((sum, product) => {
        return sum + product.stockBreakdown
          .filter((entry) => entry.warehouse === key || entry.warehouse === warehouse.id)
          .reduce((entrySum, entry) => entrySum + Number(entry.qty || 0), 0)
      }, 0)
      return {
        id: warehouse.id,
        name: warehouse.name || key,
        location: warehouse.location,
        quantity,
        skuCount: relatedProducts.length,
      }
    })
  }, [products, warehouses])

  const chartData = useMemo(() => {
    if (selectedWarehouse === "ALL") {
      return warehouseRows.map(w => ({ name: w.name, quantity: w.quantity }))
    }
    return products
      .map((p) => {
        const match = p.stockBreakdown.filter(entry => entry.warehouse === selectedWarehouse)
        const qty = match.reduce((sum, entry) => sum + Number(entry.qty || 0), 0)
        return {
          name: p.name,
          quantity: qty,
        }
      })
      .filter(item => item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8)
  }, [selectedWarehouse, warehouseRows, products])

  const filteredMovements = useMemo(() => {
    if (selectedWarehouse === "ALL") return movements
    return movements.filter(m => m.fromWarehouse === selectedWarehouse || m.toWarehouse === selectedWarehouse)
  }, [movements, selectedWarehouse])

  const topMovingProducts = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; quantity: number; movements: number; unit: string }>()
    for (const movement of filteredMovements) {
      const id = movement.productId || movement.productName
      const current = grouped.get(id) || {
        id,
        name: movement.productName,
        quantity: 0,
        movements: 0,
        unit: movement.unit,
      }
      current.quantity += Math.abs(Number(movement.qty || 0))
      current.movements += 1
      grouped.set(id, current)
    }
    return Array.from(grouped.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 6)
  }, [filteredMovements])

  const totalInventoryQuantity = useMemo(() => {
    if (selectedWarehouse === "ALL") {
      return products.reduce((sum, p) => sum + Number(p.quantity || 0), 0)
    }
    return products.reduce((sum, p) => {
      const match = p.stockBreakdown.filter(entry => entry.warehouse === selectedWarehouse)
      return sum + match.reduce((entrySum, entry) => entrySum + Number(entry.qty || 0), 0)
    }, 0)
  }, [products, selectedWarehouse])

  const totalInventoryValue = useMemo(() => {
    if (selectedWarehouse === "ALL") {
      return products.reduce((sum, p) => sum + Number(p.totalStockValue ?? Number(p.quantity || 0) * Number(p.unitCost || 0)), 0)
    }
    return products.reduce((sum, p) => {
      const match = p.stockBreakdown.filter(entry => entry.warehouse === selectedWarehouse)
      const qtyInWarehouse = match.reduce((entrySum, entry) => entrySum + Number(entry.qty || 0), 0)
      const cost = Number(p.unitCost || p.valuationRate || 0)
      return sum + (qtyInWarehouse * cost)
    }, 0)
  }, [products, selectedWarehouse])

  const money = (val: number) => val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight mt-1">Inventory Dashboard</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Warehouse metrics, stock distribution, and near-expiry monitoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/inventory")} />
          </div>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          {/* KPI Row (3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoading ? Array.from({ length: 3 }).map((_, index) => <KpiSkeleton key={index} />) : [
              { label: "TOTAL ITEMS", value: filteredProducts.length.toLocaleString(), Icon: Archive, note: "Saved inventory products" },
              { label: "TOTAL QUANTITY", value: totalInventoryQuantity.toLocaleString(), Icon: Package, note: "Current stock balance" },
              { label: "TOTAL VALUE", value: `ETB ${money(totalInventoryValue)}`, Icon: WarehouseIcon, note: "Quantity multiplied by unit cost" },
            ].map((kpi, index) => {
              const Icon = kpi.Icon
              return (
                <GlassCard
                  key={kpi.label}
                  className="relative p-5 flex flex-col justify-between"
                  whileHover={{ y: -2 }}
                  transition={{ delay: 0.05 * index, duration: 0.3 }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{kpi.label}</span>
                      <div className="size-7.5 rounded-lg flex items-center justify-center bg-black/5">
                        <Icon className="size-4 text-zinc-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-zinc-950 tracking-tight">{kpi.value}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-100/60">
                    <span className="text-[10px] font-bold text-zinc-500">{kpi.note}</span>
                  </div>
                </GlassCard>
              )
            })}
          </div>

          {/* Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {/* Distribution Bar Chart Graph */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between gap-4 mb-5 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
                      {selectedWarehouse === "ALL" ? "Stock Distribution by Warehouse" : `Stock Distribution: ${warehouseById.get(selectedWarehouse)?.name || selectedWarehouse}`}
                    </h3>
                    <p className="text-[11px] font-semibold text-zinc-400">
                      {selectedWarehouse === "ALL" 
                        ? "Visual comparison of total quantities across operating warehouses" 
                        : "Visual comparison of top product quantities inside this warehouse"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black uppercase text-zinc-400">Warehouse:</span>
                    <select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                      className="h-8 px-3 rounded-full bg-zinc-50 border border-zinc-200 text-xs font-black text-zinc-900 outline-none focus:border-zinc-950 cursor-pointer shadow-xs"
                    >
                      <option value="ALL">All Warehouses</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.code || w.id}>
                          {w.name || w.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Skeleton className="h-full w-full bg-zinc-200/80 rounded-2xl" />
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-400 text-xs font-bold">
                      No stock data available for this selection.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "#71717a", fontSize: 10, fontWeight: 700 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "#71717a", fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "rgba(255, 255, 255, 0.95)", 
                            border: "1px solid #e4e4e7", 
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
                          }}
                          labelStyle={{ fontWeight: "black", color: "#18181b", fontSize: 11 }}
                          itemStyle={{ color: "#059669", fontSize: 11, fontWeight: "bold" }}
                        />
                        <Bar 
                          dataKey="quantity" 
                          name="Quantity"
                          fill="url(#colorQty)" 
                          radius={[8, 8, 0, 0]} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassCard>

              {/* Top Moving Products */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Top Moving Products</h3>
                    <p className="text-[11px] font-semibold text-zinc-400">Ranked from stock movement records</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3 rounded-2xl border border-zinc-150/40 bg-zinc-50/60 p-3">
                        <Skeleton className="h-5 w-5 bg-zinc-200/80" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-3/4 bg-zinc-200/80" />
                          <Skeleton className="h-3 w-1/2 bg-zinc-200/80" />
                        </div>
                      </div>
                    ))
                  ) : topMovingProducts.length === 0 ? (
                    <p className="md:col-span-2 py-12 text-center text-xs font-bold text-zinc-400">No movement records found.</p>
                  ) : (
                    topMovingProducts.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-zinc-50/60 border border-zinc-150/40 rounded-2xl font-semibold text-xs">
                        <span className="font-mono text-sm font-black text-zinc-300 w-5 text-center">#{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-zinc-900 truncate leading-tight">{item.name}</p>
                          <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{item.quantity.toLocaleString()} {item.unit} across {item.movements.toLocaleString()} movements</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Right Expiry Column */}
            <div className="lg:col-span-4">
              <GlassCard className="h-full p-6">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Near Expiry Watch</h3>
                    <p className="text-[11px] font-semibold text-zinc-400">Batch expiry data from inventory products</p>
                  </div>
                </div>

                <div className="space-y-4 font-semibold text-xs">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/40 p-3">
                        <Skeleton className="size-8.5 rounded-xl bg-zinc-200/80" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-4/5 bg-zinc-200/80" />
                          <Skeleton className="h-3 w-1/2 bg-zinc-200/80" />
                        </div>
                      </div>
                    ))
                  ) : expiryAlerts.length === 0 ? (
                    <p className="py-12 text-center text-xs font-bold text-zinc-400">No near-expiry batches found.</p>
                  ) : (
                    expiryAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-start gap-3 p-3 bg-zinc-50/40 border border-zinc-100 rounded-2xl">
                        <div className="size-8.5 rounded-xl bg-zinc-100 border border-zinc-200/50 flex items-center justify-center shrink-0 mt-0.5">
                          <Package className="size-4 text-zinc-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-zinc-900 truncate leading-tight mb-0.5">{alert.product}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[9px] font-bold text-zinc-400">{alert.batch}</span>
                            <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 bg-zinc-100 text-zinc-500 rounded font-mono">{alert.warehouse}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-zinc-100 border-zinc-200 text-zinc-800">
                            {alert.days} days
                          </span>
                          <p className="text-[9px] font-black font-mono text-zinc-400 mt-1">{alert.quantity.toLocaleString()} {alert.unit}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
