import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Archive, Download, Package, RefreshCw, Warehouse } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { ResizableTh, useResizableTable, type TableColumn } from "@/components/ResizableTable"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import { useErpStore } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { Skeleton } from "@/components/ui/skeleton"

type CurrentStockRow = {
  id: string
  item: string
  warehouse: string
  batch: string
  manufacturingDate: string
  expiryDate: string
  packagingUnit: string
  quantityPerPack: number
  numberOfCartons: number
  totalQuantity: number
  remainingQuantity: number
  unitPrice: number
  stockValue: number
}

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

const columns: TableColumn[] = [
  { key: "item", label: "Item" },
  { key: "warehouse", label: "Warehouse" },
  { key: "batch", label: "Batch" },
  { key: "manufacturingDate", label: "MFG" },
  { key: "expiryDate", label: "EXP" },
  { key: "packagingUnit", label: "Packaging Unit" },
  { key: "quantityPerPack", label: "Qty / Pack", align: "right" },
  { key: "numberOfCartons", label: "Cartons", align: "right" },
  { key: "totalQuantity", label: "Total Qty", align: "right" },
  { key: "remainingQuantity", label: "Remaining Qty", align: "right" },
  { key: "unitPrice", label: "Unit Price", align: "right" },
  { key: "stockValue", label: "Stock Value", align: "right" },
]

function money(value: number) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function displayDate(value?: string) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

function SummarySkeleton() {
  return (
    <GlassCard className="border border-white/70 bg-white/90 p-5 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-3 w-24 bg-zinc-200/80" />
        <Skeleton className="size-4 bg-zinc-200/80" />
      </div>
      <Skeleton className="h-8 w-32 bg-zinc-200/80" />
    </GlassCard>
  )
}

function ReportTableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <tr key={index}>
          {columns.map((column) => (
            <td key={column.key} className="px-3 py-4">
              <Skeleton className={`h-3 bg-zinc-200/80 ${column.align === "right" ? "ml-auto w-20" : "w-28"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default function Reports() {
  const { showToast } = useFeedback()
  const erp = useErpStore()
  const products = erp.getProducts()
  const isLoading = erp.isLoading()
  const warehouses = withOperatingWarehouses(erp.getWarehouses())
  const [warehouseFilter, setWarehouseFilter] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const warehouseByKey = useMemo(() => new Map(warehouses.flatMap((warehouse) => [[warehouse.id, warehouse], [warehouse.code, warehouse]])), [warehouses])

  const rows = useMemo<CurrentStockRow[]>(() => {
    return products.flatMap((product) => {
      const stockEntries = product.stockBreakdown.length ? product.stockBreakdown : [{ warehouse: product.warehouse, qty: product.quantity }]
      const batchEntries = product.batches.length ? product.batches : [{ batchNo: product.batch, qty: product.quantity, expiry: product.expiry, status: "Released" as const }]
      return batchEntries.flatMap((batch) => {
        return stockEntries.map((stock) => {
          const warehouse = warehouseByKey.get(stock.warehouse)
          const remainingQuantity = Number(batch.qty || stock.qty || 0)
          const unitPrice = Number(product.sellingPrice || product.unitCost || 0)
          return {
            id: `${product.id}-${stock.warehouse}-${batch.batchNo}`,
            item: product.name,
            warehouse: warehouse?.name || stock.warehouse,
            batch: batch.batchNo,
            manufacturingDate: displayDate(product.manufacturingDate),
            expiryDate: displayDate(batch.expiry || product.expiry),
            packagingUnit: product.unit,
            quantityPerPack: Number(product.quantityPerPack || 0),
            numberOfCartons: Number(product.numberOfCartons || 0),
            totalQuantity: Number(product.totalQuantity || product.quantity || 0),
            remainingQuantity,
            unitPrice,
            stockValue: remainingQuantity * unitPrice,
          }
        })
      })
    })
  }, [products, warehouseByKey])

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesWarehouse = warehouseFilter === "ALL" || row.warehouse === warehouseByKey.get(warehouseFilter)?.name || row.warehouse === warehouseFilter
      const matchesSearch = !query || [row.item, row.batch, row.packagingUnit, row.warehouse].some((value) => value.toLowerCase().includes(query))
      return matchesWarehouse && matchesSearch
    })
  }, [rows, searchQuery, warehouseFilter, warehouseByKey])

  const totals = useMemo(() => {
    const lowStock = products.filter((product) => product.status === "Low Stock" || Number(product.quantity || 0) <= Number(product.reorderLevel || 0)).length
    const outOfStock = products.filter((product) => product.status === "Out of Stock" || Number(product.quantity || 0) <= 0).length
    return {
      items: products.length,
      quantity: products.reduce((sum, product) => sum + Number(product.quantity || 0), 0),
      value: products.reduce((sum, product) => sum + Number(product.totalStockValue ?? Number(product.quantity || 0) * Number(product.unitCost || 0)), 0),
      lowStock,
      outOfStock,
    }
  }, [products])

  const table = useResizableTable(columns, filteredRows, {
    item: 240,
    warehouse: 180,
    batch: 140,
    manufacturingDate: 110,
    expiryDate: 110,
    packagingUnit: 150,
    quantityPerPack: 110,
    numberOfCartons: 100,
    totalQuantity: 120,
    remainingQuantity: 135,
    unitPrice: 120,
    stockValue: 130,
  })

  const handleExport = () => {
    showToast("Export ready", "success", `${filteredRows.length.toLocaleString()} current stock rows are available in this filtered report.`)
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />
      <motion.main variants={fade} initial="hidden" animate="visible" className="mx-auto max-w-[98%] px-4 pb-12 pt-24 md:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-black">Stock Reports</h1>
            <p className="mt-1 max-w-xl text-xs font-semibold leading-relaxed text-zinc-500">
              Current inventory balances from saved stock, warehouse, and batch records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/inventory")} />
            <button onClick={handleExport} className="flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-black uppercase tracking-wide text-white shadow-md">
              <Download className="size-4" /> Export Current View
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {isLoading ? Array.from({ length: 5 }).map((_, index) => <SummarySkeleton key={index} />) : [
            { label: "Total Items", value: totals.items.toLocaleString(), Icon: Archive },
            { label: "Total Quantity", value: totals.quantity.toLocaleString(), Icon: Package },
            { label: "Total Value", value: `ETB ${money(totals.value)}`, Icon: Warehouse },
            { label: "Low Stock", value: totals.lowStock.toLocaleString(), Icon: AlertTriangle },
            { label: "Out of Stock", value: totals.outOfStock.toLocaleString(), Icon: RefreshCw },
          ].map((card) => {
            const Icon = card.Icon
            return (
              <GlassCard key={card.label} className="border border-white/70 bg-white/90 p-5 shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{card.label}</span>
                  <Icon className="size-4 text-zinc-500" />
                </div>
                <p className="text-2xl font-black tracking-tight text-zinc-950">{card.value}</p>
              </GlassCard>
            )
          })}
        </div>

        <GlassCard className="overflow-hidden border border-white/65 p-0 shadow-md">
          <div className="px-6 pt-6">
            <FinanceTableToolbar
              title="Current Stock"
              subtitle={`${filteredRows.length.toLocaleString()} rows from inventory records`}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search item, batch, packaging unit, warehouse..."
              filters={[
                {
                  value: warehouseFilter,
                  onChange: setWarehouseFilter,
                  ariaLabel: "Warehouse",
                  options: [{ value: "ALL", label: "All Warehouses" }, ...warehouses.map((warehouse) => ({ value: warehouse.code || warehouse.id, label: warehouse.name || warehouse.code || warehouse.id }))],
                },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1550px] text-left">
              <thead>
                <tr className="border-y border-zinc-200/40 bg-black/[0.02] text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  {columns.map((column) => (
                    <ResizableTh
                      key={column.key}
                      col={column}
                      width={table.colWidths[column.key]}
                      sortKey={table.sortKey}
                      sortDir={table.sortDir}
                      openMenuCol={table.openMenuCol}
                      onResizeStart={table.handleResizeStart}
                      onToggleMenu={table.toggleMenu}
                      onSortAsc={table.setSortAsc}
                      onSortDesc={table.setSortDesc}
                      onClearSort={table.clearSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {isLoading ? (
                  <ReportTableSkeletonRows />
                ) : table.sorted().length === 0 ? (
                  <tr><td colSpan={columns.length} className="py-16 text-center text-xs font-bold text-zinc-400">No current stock records match your filters.</td></tr>
                ) : (
                  table.sorted().map((row) => (
                    <tr key={row.id} className="hover:bg-white/50">
                      <td className="px-3 py-4 text-xs font-black text-zinc-900">{row.item}</td>
                      <td className="px-3 py-4 text-xs font-bold text-zinc-700">{row.warehouse}</td>
                      <td className="px-3 py-4 font-mono text-xs font-bold text-zinc-700">{row.batch}</td>
                      <td className="px-3 py-4 text-xs font-bold text-zinc-700">{row.manufacturingDate}</td>
                      <td className="px-3 py-4 text-xs font-bold text-zinc-700">{row.expiryDate}</td>
                      <td className="px-3 py-4 text-xs font-bold text-zinc-700">{row.packagingUnit}</td>
                      <td className="px-3 py-4 text-right font-mono text-xs font-bold">{row.quantityPerPack.toLocaleString()}</td>
                      <td className="px-3 py-4 text-right font-mono text-xs font-bold">{row.numberOfCartons.toLocaleString()}</td>
                      <td className="px-3 py-4 text-right font-mono text-xs font-black">{row.totalQuantity.toLocaleString()}</td>
                      <td className="px-3 py-4 text-right font-mono text-xs font-black">{row.remainingQuantity.toLocaleString()}</td>
                      <td className="px-3 py-4 text-right font-mono text-xs font-bold">{money(row.unitPrice)}</td>
                      <td className="px-3 py-4 text-right font-mono text-xs font-black">{money(row.stockValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.main>
    </div>
  )
}
