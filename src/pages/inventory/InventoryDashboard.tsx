import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Archive,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Package,
  PlusCircle,
  Truck,
  Warehouse,
  X,
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import { useErpStore, type Product, type StockMovementLog } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { Skeleton } from "@/components/ui/skeleton"

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

type DashboardRole = "Overview" | "Reception" | "Technical"

interface BatchApproval {
  id: string
  productId: string
  product: string
  batchNumber: string
  quantity: number
  unit: string
  expiry: string
  warehouse: string
  status: "Pending QA" | "Approved" | "Rejected"
}

function todayKey() {
  return new Date().toISOString().split("T")[0]
}

function formatDateTime(value?: string) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(parsed)
}

function daysUntil(value?: string) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  parsed.setHours(0, 0, 0, 0)
  return Math.ceil((parsed.getTime() - today.getTime()) / 86_400_000)
}

function productStatusFor(product: Product, batches = product.batches): Product["status"] {
  if (batches.some((batch) => batch.status === "Quarantined")) return "Quarantined"
  if (batches.some((batch) => batch.status === "Pending QA")) return "Pending QA"
  const quantity = product.stockBreakdown.reduce((sum, entry) => sum + Number(entry.qty || 0), 0)
  if (quantity <= 0) return "Out of Stock"
  if (quantity <= Number(product.reorderLevel || 0)) return "Low Stock"
  return "In Stock"
}

function movementKind(type: StockMovementLog["type"]) {
  if (type === "RECEIPT") return "Received"
  if (type === "TRANSFER") return "Transferred"
  return "Dispatched"
}

function movementBadgeClass(type: StockMovementLog["type"]) {
  if (type === "RECEIPT") return "bg-emerald-50 text-emerald-800 border-emerald-200"
  return "bg-zinc-100 text-zinc-700 border-zinc-200"
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

function InventoryRowSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-150/40 bg-zinc-50/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-2/3 bg-zinc-200/80" />
          <Skeleton className="h-3 w-1/2 bg-zinc-200/80" />
        </div>
        <Skeleton className="size-8 rounded-xl bg-zinc-200/80" />
      </div>
    </div>
  )
}

export default function InventoryDashboard() {
  const { showToast, confirm } = useFeedback()
  const erp = useErpStore()
  const products = erp.getProducts()
  const warehouses = withOperatingWarehouses(erp.getWarehouses())
  const movements = erp.getStockMovements()
  const purchaseOrders = erp.getPurchaseOrders()
  const isLoading = erp.isLoading()

  const [activeRole, setActiveRole] = useState<DashboardRole>("Overview")
  const [isLogReceiptOpen, setIsLogReceiptOpen] = useState(false)
  const [newReceiptProductId, setNewReceiptProductId] = useState("")
  const [newReceiptQty, setNewReceiptQty] = useState("")
  const [newReceiptWarehouse, setNewReceiptWarehouse] = useState("")
  const [isSavingReceipt, setIsSavingReceipt] = useState(false)

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const warehouseById = useMemo(() => new Map(warehouses.flatMap((warehouse) => [[warehouse.id, warehouse], [warehouse.code, warehouse]])), [warehouses])
  const selectedReceiptProduct = productById.get(newReceiptProductId)

  const batches = useMemo<BatchApproval[]>(() => {
    return products.flatMap((product) => {
      return product.batches
        .filter((batch) => batch.status === "Pending QA" || batch.status === "Quarantined")
        .map((batch) => ({
          id: `${product.id}-${batch.batchNo}`,
          productId: product.id,
          product: product.name,
          batchNumber: batch.batchNo,
          quantity: Number(batch.qty || 0),
          unit: product.unit,
          expiry: batch.expiry,
          warehouse: product.warehouseName || warehouseById.get(product.warehouse)?.name || product.warehouse,
          status: batch.status === "Pending QA" ? "Pending QA" : "Rejected",
        }))
    })
  }, [products, warehouseById])

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [movements])

  const todaysMovements = useMemo(() => {
    const today = todayKey()
    return sortedMovements.filter((movement) => String(movement.date || "").startsWith(today))
  }, [sortedMovements])

  const expectedDeliveries = useMemo(() => {
    return purchaseOrders
      .filter((order) => order.status !== "RECEIVED" && order.status !== "CANCELLED")
      .flatMap((order) =>
        order.items.map((item) => ({
          id: `${order.id}-${item.productId}`,
          orderId: order.id,
          productId: item.productId,
          product: item.name,
          expectedQty: item.qty,
          unit: item.unit,
          supplier: order.supplier,
          eta: order.eta,
          warehouse: order.warehouse,
        })),
      )
  }, [purchaseOrders])

  const expiryAlerts = useMemo(() => {
    return products
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
  }, [products, warehouseById])

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

  const topMovingProducts = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; quantity: number; movements: number; unit: string }>()
    for (const movement of movements) {
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
  }, [movements])

  const lowStockAlerts = products.filter((product) => product.status === "Low Stock" || Number(product.quantity || 0) <= Number(product.reorderLevel || 0)).length
  const outOfStockCount = products.filter((product) => product.status === "Out of Stock" || Number(product.quantity || 0) <= 0).length
  const totalInventoryQuantity = products.reduce((sum, product) => sum + Number(product.quantity || 0), 0)
  const totalInventoryValue = products.reduce((sum, product) => sum + Number(product.totalStockValue ?? Number(product.quantity || 0) * Number(product.unitCost || 0)), 0)
  const receiptsToday = todaysMovements.filter((movement) => movement.type === "RECEIPT").length
  const dispatchesToday = todaysMovements.filter((movement) => movement.type === "FULFILLMENT" || movement.type === "SALES_OUT").length
  const allInventoryBatches = products.flatMap((product) => product.batches)
  const approvedCount = allInventoryBatches.filter((batch) => batch.status === "Released").length
  const rejectedCount = allInventoryBatches.filter((batch) => batch.status === "Quarantined").length
  const pendingBatchCount = allInventoryBatches.filter((batch) => batch.status === "Pending QA").length
  const auditedCount = approvedCount + rejectedCount
  const decidedCount = approvedCount + rejectedCount
  const complianceRate = decidedCount ? `${Math.round((approvedCount / decidedCount) * 1000) / 10}%` : "0%"

  const handleDeleteProduct = (product: Product) => {
    confirm({
      title: "Remove Stock?",
      message: `Remove ${product.name} batch ${product.batch}? This deletes the stock item and linked stock movements.`,
      confirmLabel: "Remove",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await erp.deleteProduct(product.id)
          showToast("Stock removed", "success", `${product.name} was removed from inventory.`)
        } catch (error) {
          showToast("Remove failed", "warning", error instanceof Error ? error.message : "The stock item could not be removed.")
        }
      },
    })
  }

  const handleApproval = (id: string, isApproved: boolean) => {
    const batch = batches.find((entry) => entry.id === id)
    const product = batch ? productById.get(batch.productId) : undefined
    if (!batch || !product) return

    const nextBatches = product.batches.map((entry) => {
      if (entry.batchNo !== batch.batchNumber) return entry
      return { ...entry, status: isApproved ? "Released" as const : "Quarantined" as const }
    })

    erp.updateProduct(product.id, {
      batches: nextBatches,
      status: productStatusFor(product, nextBatches),
    })

    showToast(
      isApproved ? "Batch approved" : "Batch rejected",
      isApproved ? "success" : "warning",
      `${batch.product} batch ${batch.batchNumber} was ${isApproved ? "released" : "quarantined"}.`,
    )
  }

  const handleLogReceiptSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const product = selectedReceiptProduct
    if (!product || !newReceiptQty || !newReceiptWarehouse) {
      showToast("Missing fields", "info", "Select a product, quantity, and receiving warehouse.")
      return
    }

    const quantity = Number(newReceiptQty)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showToast("Invalid quantity", "warning", "Receipt quantity must be greater than zero.")
      return
    }

    setIsSavingReceipt(true)
    try {
      await erp.recordStockReceipt({
        productId: product.id,
        warehouse: newReceiptWarehouse,
        quantity,
      })
      setIsLogReceiptOpen(false)
      setNewReceiptProductId("")
      setNewReceiptQty("")
      setNewReceiptWarehouse("")
      showToast("Receipt logged", "success", `${quantity.toLocaleString()} ${product.unit} of ${product.name} was saved.`)
    } catch (error) {
      showToast("Receipt save failed", "warning", error instanceof Error ? error.message : "The receipt could not be saved.")
    } finally {
      setIsSavingReceipt(false)
    }
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight mt-1">Inventory Dashboard</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Warehouse metrics, stock levels, and quality assurance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/inventory")} />
            <div className="flex items-center gap-1 bg-white/60 border border-zinc-200/60 rounded-full p-1 shadow-sm">
              {(["Overview", "Reception", "Technical"] as DashboardRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                    activeRole === role ? "bg-zinc-950 text-white shadow" : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {activeRole === "Overview" && (
          <motion.div key="overview-role" variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {isLoading ? Array.from({ length: 5 }).map((_, index) => <KpiSkeleton key={index} />) : [
                { label: "TOTAL ITEMS", value: products.length.toLocaleString(), Icon: Archive, note: "Saved inventory products" },
                { label: "TOTAL QUANTITY", value: totalInventoryQuantity.toLocaleString(), Icon: Package, note: "Current stock balance" },
                { label: "TOTAL VALUE", value: `ETB ${totalInventoryValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, Icon: Warehouse, note: "Quantity multiplied by unit cost" },
                { label: "LOW STOCK", value: lowStockAlerts.toLocaleString(), Icon: AlertTriangle, note: "Based on reorder levels" },
                { label: "OUT OF STOCK", value: outOfStockCount.toLocaleString(), Icon: CheckCircle2, note: "Zero or negative balance" },
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-5 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Stock by Warehouse</h3>
                      <p className="text-[11px] font-semibold text-zinc-400">Warehouse quantities from product stock breakdowns</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="rounded-2xl border border-zinc-150/40 bg-zinc-50/60 p-4">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div className="space-y-2">
                              <Skeleton className="h-3 w-40 bg-zinc-200/80" />
                              <Skeleton className="h-3 w-28 bg-zinc-200/80" />
                            </div>
                            <div className="space-y-2 sm:text-right">
                              <Skeleton className="h-3 w-20 bg-zinc-200/80 sm:ml-auto" />
                              <Skeleton className="h-3 w-32 bg-zinc-200/80 sm:ml-auto" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : warehouseRows.length === 0 ? (
                      <p className="py-12 text-center text-xs font-bold text-zinc-400">No warehouse records found.</p>
                    ) : (
                      warehouseRows.map((warehouse) => (
                        <div key={warehouse.id} className="p-4 bg-zinc-50/60 border border-zinc-150/40 rounded-2xl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <span className="text-xs font-black text-zinc-800">{warehouse.name}</span>
                              <span className="block text-[9px] text-zinc-400 font-semibold">{warehouse.location}</span>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="text-xs font-mono font-black text-zinc-900">{warehouse.quantity.toLocaleString()}</span>
                              <span className="text-[9px] text-zinc-400 font-bold uppercase"> quantity across {warehouse.skuCount.toLocaleString()} SKUs</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-5 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Current Stock Items</h3>
                      <p className="text-[11px] font-semibold text-zinc-400">Saved stock records from inventory products</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, index) => <InventoryRowSkeleton key={index} />)
                    ) : products.length === 0 ? (
                      <p className="py-12 text-center text-xs font-bold text-zinc-400">No saved stock items found.</p>
                    ) : (
                      products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-150/40 bg-zinc-50/60 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-zinc-900">{product.name}</p>
                            <p className="mt-0.5 font-mono text-[10px] font-bold text-zinc-400">
                              Batch {product.batch} · {Number(product.quantity || 0).toLocaleString()} {product.unit} · {warehouseById.get(product.warehouse)?.name || product.warehouse}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                            title="Remove stock"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>

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
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-zinc-50/60 border border-zinc-150/40 rounded-2xl">
                          <span className="font-mono text-sm font-black text-zinc-300 w-5 text-center">#{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-zinc-900 truncate">{item.name}</p>
                            <p className="text-[10px] font-bold text-zinc-400">{item.quantity.toLocaleString()} {item.unit} across {item.movements.toLocaleString()} movements</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>
              </div>

              <div className="lg:col-span-4">
                <GlassCard className="h-full p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Near Expiry Watch</h3>
                      <p className="text-[11px] font-semibold text-zinc-400">Batch expiry data from inventory products</p>
                    </div>
                  </div>

                  <div className="space-y-4">
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
        )}

        {activeRole === "Reception" && (
          <motion.div key="reception-role" variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Today's Total Receipts", value: `${receiptsToday.toLocaleString()} movements`, Icon: Check },
                { label: "Today's Dispatches", value: `${dispatchesToday.toLocaleString()} movements`, Icon: Truck },
                { label: "Pending Receipts", value: `${expectedDeliveries.length.toLocaleString()} expected`, Icon: Clock },
              ].map((stat) => {
                const Icon = stat.Icon
                return (
                  <GlassCard key={stat.label} className="p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">{stat.label}</span>
                      <p className="text-3xl font-black text-zinc-950 font-mono">{stat.value}</p>
                    </div>
                    <div className="size-11 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center">
                      <Icon className="size-5" />
                    </div>
                  </GlassCard>
                )
              })}
            </div>

            <motion.div variants={fade} className="flex justify-between items-center bg-white/40 border border-zinc-200/50 p-4 rounded-3xl backdrop-blur-md">
              <div>
                <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Receiving Portal</h4>
                <p className="text-xs font-semibold text-zinc-500">Incoming receipts are saved as stock movements.</p>
              </div>
              <button
                onClick={() => setIsLogReceiptOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold transition-all shadow active:scale-95 shrink-0"
              >
                <PlusCircle className="size-4" /> Log New Receipt
              </button>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-5 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Today's Activity Log</h3>
                      <p className="text-[11px] font-semibold text-zinc-400">Records from stock movement history</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {todaysMovements.length === 0 ? (
                      <p className="py-12 text-center text-xs font-bold text-zinc-400">No stock movements recorded today.</p>
                    ) : (
                      todaysMovements.map((movement) => (
                        <div key={movement.id} className="flex items-center justify-between p-3.5 bg-zinc-50/60 border border-zinc-150/40 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${movementBadgeClass(movement.type)}`}>
                              {movementKind(movement.type)}
                            </span>
                            <div>
                              <p className="text-xs font-black text-zinc-900">{movement.productName}</p>
                              <span className="text-[9px] font-bold text-zinc-400 font-mono uppercase">
                                {movement.reference} {movement.fromWarehouse || movement.toWarehouse ? `· ${movement.fromWarehouse || movement.toWarehouse}` : ""}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs font-black text-zinc-950">
                              {movement.type === "RECEIPT" ? "+" : "-"}{Number(movement.qty || 0).toLocaleString()} {movement.unit}
                            </span>
                            <span className="block text-[9px] text-zinc-400 font-semibold">{formatDateTime(movement.date)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>
              </div>

              <div className="lg:col-span-5">
                <GlassCard className="p-6 h-full">
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Expected Deliveries</h3>
                      <p className="text-[11px] font-semibold text-zinc-400">Open purchase order lines</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {expectedDeliveries.length === 0 ? (
                      <p className="py-12 text-center text-xs font-bold text-zinc-400">No open purchase deliveries found.</p>
                    ) : (
                      expectedDeliveries.map((delivery) => (
                        <div key={delivery.id} className="p-3.5 bg-zinc-50/40 border border-zinc-100 rounded-2xl">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-xs font-black text-zinc-900 leading-snug">{delivery.product}</h4>
                            <span className="font-mono text-[9px] font-bold text-zinc-400 shrink-0 uppercase">{delivery.orderId}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500">
                            <span>Supplier: {delivery.supplier}</span>
                            <span className="font-mono font-black text-zinc-800">{delivery.expectedQty.toLocaleString()} {delivery.unit}</span>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-zinc-100/60 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                              ETA: {delivery.eta}
                            </span>
                            <button
                              onClick={() => {
                                setNewReceiptProductId(delivery.productId)
                                setNewReceiptQty(String(delivery.expectedQty))
                                setNewReceiptWarehouse(delivery.warehouse)
                                setIsLogReceiptOpen(true)
                              }}
                              className="text-[9px] font-black uppercase text-zinc-800 hover:text-black flex items-center gap-0.5"
                            >
                              Receive <ChevronRight className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>
          </motion.div>
        )}

        {activeRole === "Technical" && (
          <motion.div key="technical-role" variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Queue Backlog", value: pendingBatchCount.toLocaleString(), note: "Pending quality testing" },
                { label: "Total Audited", value: auditedCount.toLocaleString(), note: "Decisions in visible queue" },
                { label: "Released Batches", value: approvedCount.toLocaleString(), note: "From product batch status" },
                { label: "Compliance Rate", value: complianceRate, note: "Released against decided batches" },
              ].map((stat) => (
                <GlassCard key={stat.label} className="p-5">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">{stat.label}</span>
                  <p className="text-3xl font-black text-zinc-950 font-mono">{stat.value}</p>
                  <span className="text-[10px] font-semibold text-zinc-500 block mt-1">{stat.note}</span>
                </GlassCard>
              ))}
            </div>

            <GlassCard className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Compliance Pipeline & QA Queue</h3>
                  <p className="text-xs font-semibold text-zinc-500">Batch statuses are read from inventory products and persisted on approval.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batches.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-zinc-400 text-xs font-semibold">
                    No batches currently in the quality pipeline.
                  </div>
                ) : (
                  batches.map((item) => (
                    <GlassCard key={item.id} className="p-5 flex flex-col justify-between" whileHover={{ y: -3 }}>
                      <div>
                        <div className="flex items-center justify-between mb-3 border-b border-zinc-150/40 pb-2.5">
                          <span className="font-mono text-[9px] font-black text-zinc-400 uppercase">QA {item.id}</span>
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            item.status === "Pending QA" ? "bg-zinc-100 text-zinc-700 border-zinc-200" :
                            item.status === "Approved" ? "bg-green-50 text-green-700 border-green-200" :
                            "bg-black text-white border-black"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <h3 className="text-xs font-black text-zinc-900 tracking-tight leading-snug mb-1">{item.product}</h3>
                        <p className="font-mono text-[10px] font-bold text-zinc-400 mb-4">Batch No: {item.batchNumber}</p>
                        <div className="grid grid-cols-2 gap-2 mb-4 bg-zinc-50/60 border border-zinc-150/40 p-2.5 rounded-2xl">
                          <div>
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wide block">Quantity</span>
                            <span className="font-mono text-[10px] font-black text-zinc-800">{item.quantity.toLocaleString()} {item.unit}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wide block">Expiry</span>
                            <span className="font-mono text-[10px] font-black text-zinc-800">{item.expiry}</span>
                          </div>
                        </div>
                        <div className="text-[9px] text-zinc-400 font-semibold mb-4 flex items-center gap-1 bg-zinc-100/50 px-2 py-1 rounded-lg">
                          <Package className="size-3 text-zinc-400" />
                          Target: {item.warehouse}
                        </div>
                      </div>

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
                <p className="text-xs font-semibold text-zinc-500 mb-5">Save an incoming receipt to stock movements and product stock balance.</p>

                <form onSubmit={handleLogReceiptSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5">Product / Material</label>
                    <select
                      required
                      value={newReceiptProductId}
                      onChange={(event) => setNewReceiptProductId(event.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors"
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5">Quantity</label>
                      <input
                        type="number"
                        required
                        value={newReceiptQty}
                        onChange={(event) => setNewReceiptQty(event.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5">Unit</label>
                      <input
                        readOnly
                        value={selectedReceiptProduct?.unit || ""}
                        className="w-full bg-zinc-100 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none text-zinc-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1.5">Receiving Location</label>
                    <select
                      required
                      value={newReceiptWarehouse}
                      onChange={(event) => setNewReceiptWarehouse(event.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((warehouse) => {
                        const value = warehouse.code || warehouse.id
                        return <option key={warehouse.id} value={value}>{warehouse.name || value}</option>
                      })}
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
                      disabled={isSavingReceipt}
                      className="flex-1 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold uppercase shadow disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingReceipt ? "Saving" : "Save Receipt"}
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
