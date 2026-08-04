import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  X, 
  Warehouse as WarehouseIcon, 
  Upload,
  Calendar, 
  Eye,
  Edit3
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import StoreTransfersTab from "@/components/StoreTransfersTab"
import { useErpStore, type Product } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { Skeleton } from "@/components/ui/skeleton"

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

interface RegulatoryDoc {
  id: string
  name: string
  type: string
  linkedBatch: string
  expiryDate: string
  status: "Valid" | "Expiring Soon" | "Expired"
}

interface StockEditForm {
  name: string
  sku: string
  category: string
  warehouse: string
  batch: string
  expiry: string
  unit: string
  unitCost: string
  sellingPrice: string
  reorderLevel: string
  approvalStatus: Product["approvalStatus"]
}

const productColumns: TableColumn[] = [
  { key: "name", label: "Product & SKU", align: "left" },
  { key: "category", label: "Category", align: "left" },
  { key: "warehouse", label: "Primary Warehouse", align: "left" },
  { key: "quantity", label: "Available Qty", align: "right" },
  { key: "totalStockValue", label: "Stock Value", align: "right" },
  { key: "batch", label: "Latest Batch & Expiry", align: "left" },
  { key: "status", label: "Compliance Status", align: "center" },
  { key: "_actions", label: "Action", align: "center", noSort: true },
]

const movementColumns: TableColumn[] = [
  { key: "date", label: "Date & Time", align: "left" },
  { key: "type", label: "Movement Type", align: "left" },
  { key: "productName", label: "Item / SKU", align: "left" },
  { key: "fromTo", label: "Warehouse Location", align: "left" },
  { key: "qty", label: "Quantity", align: "right" },
  { key: "reference", label: "Reference / GL Voucher", align: "left" },
]

const docColumns: TableColumn[] = [
  { key: "id", label: "Document ID", align: "left" },
  { key: "name", label: "Certificate / License Name", align: "left" },
  { key: "type", label: "Type", align: "left" },
  { key: "linkedBatch", label: "Linked Batch", align: "left" },
  { key: "expiryDate", label: "Expiry Date", align: "left" },
  { key: "status", label: "Validity Status", align: "center" },
  { key: "_actions", label: "Action", align: "center", noSort: true },
]

function money(value: number) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function stockValueFor(product: Product) {
  const quantity = Number(product.quantity || 0)
  const unitCost = Number(product.unitCost || 0)
  return Math.round(quantity * unitCost * 100) / 100
}

function ProductTableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <tr key={index}>
          <td className="py-4 px-6"><div className="space-y-2"><Skeleton className="h-3 w-44 bg-zinc-200/80" /><Skeleton className="h-3 w-24 bg-zinc-200/80" /></div></td>
          <td className="py-4 px-4"><Skeleton className="h-5 w-28 rounded-full bg-zinc-200/80" /></td>
          <td className="py-4 px-4"><Skeleton className="h-3 w-24 bg-zinc-200/80" /></td>
          <td className="py-4 px-4"><Skeleton className="ml-auto h-3 w-20 bg-zinc-200/80" /></td>
          <td className="py-4 px-4"><div className="space-y-2"><Skeleton className="ml-auto h-3 w-28 bg-zinc-200/80" /><Skeleton className="ml-auto h-2.5 w-20 bg-zinc-200/80" /></div></td>
          <td className="py-4 px-4"><div className="space-y-2"><Skeleton className="h-3 w-28 bg-zinc-200/80" /><Skeleton className="h-2.5 w-20 bg-zinc-200/80" /></div></td>
          <td className="py-4 px-4"><Skeleton className="mx-auto h-5 w-20 rounded-full bg-zinc-200/80" /></td>
          <td className="py-4 px-6"><div className="flex justify-center gap-1"><Skeleton className="size-7 rounded-lg bg-zinc-200/80" /><Skeleton className="size-7 rounded-lg bg-zinc-200/80" /><Skeleton className="size-7 rounded-lg bg-zinc-200/80" /></div></td>
        </tr>
      ))}
    </>
  )
}

export default function StockProducts() {
  const { showToast, confirm } = useFeedback()
  const navigate = useNavigate()
  const erp = useErpStore()
  const products = erp.getProducts()
  const isLoading = erp.isLoading()
  const warehouseRecords = withOperatingWarehouses(erp.getWarehouses())
  const [activeTab, setActiveTab] = useState<"Register" | "Transfer Entries" | "Movement Ledger" | "Regulatory Docs">("Register")
  const [docs] = useState<RegulatoryDoc[]>([])

  // Filters for Products tab
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL")

  // Filters for Movements tab
  const [movementsSearch, setMovementsSearch] = useState("")
  const [movementTypeFilter, setMovementTypeFilter] = useState("ALL")

  // Filters for Regulatory Docs tab
  const [docSearch, setDocSearch] = useState("")
  const [docStatusFilter, setDocStatusFilter] = useState("ALL")

  // Slide-in Quick-Peek Panel
  const [peekProduct, setPeekProduct] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState<StockEditForm>({
    name: "",
    sku: "",
    category: "",
    warehouse: "",
    batch: "",
    expiry: "",
    unit: "",
    unitCost: "",
    sellingPrice: "",
    reorderLevel: "",
    approvalStatus: "Approved",
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState<number | "">("")
  const [adjustWarehouse, setAdjustWarehouse] = useState("")
  const [adjustBatch, setAdjustBatch] = useState("")

  // Warehouse filter uses normalized warehouse IDs so saved WH1/WH2/WH3 records match.
  const warehouseOptions = [
    { value: "ALL", label: "All Warehouses" },
    ...warehouseRecords.map((warehouse) => ({
      value: warehouse.code || warehouse.id,
      label: warehouse.name || warehouse.code || warehouse.id,
    })),
  ]
  const warehouseKeyMap = new Map(warehouseRecords.map((warehouse) => [warehouse.code || warehouse.id, new Set([warehouse.id, warehouse.code, warehouse.name].filter(Boolean))]))

  // Filtered lists
  const filteredProducts = products.filter((prod) => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prod.batch.toLowerCase().includes(searchQuery.toLowerCase())
    const selectedWarehouseKeys = warehouseKeyMap.get(selectedWarehouse) || new Set([selectedWarehouse])
    const matchesWarehouse =
      selectedWarehouse === "ALL" ||
      selectedWarehouseKeys.has(prod.warehouse) ||
      prod.stockBreakdown.some((breakdown) => selectedWarehouseKeys.has(breakdown.warehouse))
    return matchesSearch && matchesWarehouse
  })

  const productsTable = useResizableTable(productColumns, filteredProducts, {
    name: 240,
    category: 160,
    warehouse: 160,
    quantity: 140,
    totalStockValue: 150,
    batch: 180,
    status: 150,
    _actions: 90,
  })

  const movements = erp.getStockMovements()
  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      m.productName.toLowerCase().includes(movementsSearch.toLowerCase()) ||
      m.reference.toLowerCase().includes(movementsSearch.toLowerCase()) ||
      (m.journalEntryId && m.journalEntryId.toLowerCase().includes(movementsSearch.toLowerCase()))
    const matchesType = movementTypeFilter === "ALL" || m.type === movementTypeFilter
    return matchesSearch && matchesType
  })

  const movementsTable = useResizableTable(movementColumns, filteredMovements, {
    date: 130,
    type: 130,
    productName: 220,
    fromTo: 220,
    qty: 140,
    reference: 200,
  })

  const filteredDocs = docs.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.id.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.linkedBatch.toLowerCase().includes(docSearch.toLowerCase())
    const matchesStatus = docStatusFilter === "ALL" || d.status === docStatusFilter
    return matchesSearch && matchesStatus
  })

  const docsTable = useResizableTable(docColumns, filteredDocs, {
    id: 120,
    name: 280,
    type: 140,
    linkedBatch: 140,
    expiryDate: 140,
    status: 140,
    _actions: 90,
  })

  const complianceStatusFor = (product: Product) => {
    if (product.batches.some((batch) => batch.status === "Quarantined")) return "Rejected"
    if (product.batches.some((batch) => batch.status === "Pending QA")) return "Pending QA"
    if (product.approvalStatus === "Submitted") return "Pending QA"
    if (product.approvalStatus === "Approved" || product.batches.some((batch) => batch.status === "Released")) return "Approved"
    return "Not Submitted"
  }

  const complianceClassFor = (status: string) => {
    if (status === "Approved") return "bg-emerald-50 text-emerald-800 border-emerald-200"
    if (status === "Pending QA") return "bg-amber-50 text-amber-800 border-amber-200"
    if (status === "Rejected") return "bg-rose-50 text-rose-800 border-rose-200"
    return "bg-zinc-100 text-zinc-700 border-zinc-200"
  }

  const handleDeleteProduct = (product: Product) => {
    confirm({
      title: "Remove Stock?",
      message: `Remove ${product.name} batch ${product.batch}? This deletes the stock item and linked stock movements.`,
      confirmLabel: "Remove",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await erp.deleteProduct(product.id)
          if (peekProduct?.id === product.id) setPeekProduct(null)
          showToast("Stock removed", "success", `${product.name} was removed from inventory.`)
        } catch (error) {
          showToast("Remove failed", "warning", error instanceof Error ? error.message : "The stock item could not be removed.")
        }
      },
    })
  }

  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name,
      sku: product.sku,
      category: product.category || "",
      warehouse: product.warehouse,
      batch: product.batch,
      expiry: product.expiry,
      unit: product.unit,
      unitCost: String(product.unitCost || 0),
      sellingPrice: String(product.sellingPrice || 0),
      reorderLevel: String(product.reorderLevel || ""),
      approvalStatus: product.approvalStatus || "Approved",
    })
  }

  const updateEditForm = (partial: Partial<StockEditForm>) => {
    setEditForm((current) => ({ ...current, ...partial }))
  }

  const handleSaveProductDetails = async () => {
    if (!editingProduct) return
    const name = editForm.name.trim()
    const sku = editForm.sku.trim()
    const batch = editForm.batch.trim()
    const warehouse = editForm.warehouse
    const expiry = editForm.expiry
    const unit = editForm.unit.trim()
    const unitCost = Number(editForm.unitCost)
    const sellingPrice = Number(editForm.sellingPrice)
    const reorderLevel = editForm.reorderLevel === "" ? undefined : Number(editForm.reorderLevel)

    if (!name || !sku || !batch || !warehouse || !expiry || !unit || !Number.isFinite(unitCost) || !Number.isFinite(sellingPrice)) {
      showToast("Cannot save stock details", "warning", "Complete item, batch, warehouse, unit, cost, and selling price.")
      return
    }

    const selectedWarehouseRecord = warehouseRecords.find((item) => (item.code || item.id) === warehouse || item.id === warehouse)
    const nextBreakdown = editingProduct.stockBreakdown.length
      ? editingProduct.stockBreakdown.map((item, index) => index === 0 ? { ...item, warehouse } : item)
      : [{ warehouse, qty: editingProduct.quantity }]
    const nextBatches = editingProduct.batches.length
      ? editingProduct.batches.map((item, index) => index === 0 ? { ...item, batchNo: batch, expiry } : item)
      : [{ batchNo: batch, qty: editingProduct.quantity, expiry, status: "Released" as const }]

    setIsSavingEdit(true)
    try {
      const saved = await erp.updateProductDetails(editingProduct.id, {
        name,
        sku,
        category: editForm.category.trim(),
        warehouse,
        warehouseName: selectedWarehouseRecord?.name,
        batch,
        expiry,
        unit,
        unitCost,
        sellingPrice,
        reorderLevel,
        totalStockValue: editingProduct.quantity * unitCost,
        stockBreakdown: nextBreakdown,
        batches: nextBatches,
        approvalStatus: editForm.approvalStatus,
      })
      setEditingProduct(null)
      if (peekProduct?.id === saved.id) setPeekProduct(saved)
      showToast("Stock details saved", "success", `${saved.name} was updated.`)
    } catch (error) {
      showToast("Save failed", "warning", error instanceof Error ? error.message : "The stock details could not be saved.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Handle Stock Adjust from Quick Peek
  const handleAdjustStock = () => {
    if (!peekProduct || adjustAmount === "") return
    const change = Number(adjustAmount)
    const targetW = adjustWarehouse || peekProduct.warehouse

    const currentWQty = peekProduct.stockBreakdown.find((sb) => sb.warehouse === targetW)?.qty ?? peekProduct.quantity
    const newQty = Math.max(0, currentWQty + change)

    const res = erp.adjustStock(
      peekProduct.id,
      targetW,
      newQty,
      `Manual Inventory Audit Adjustment (${change > 0 ? "+" : ""}${change} ${peekProduct.unit})`
    )

    if (res.success) {
      const updated = erp.getProductById(peekProduct.id)
      if (updated) setPeekProduct(updated)
      showToast(
        "Stock Adjusted & Logged",
        "success",
        `Adjusted ${peekProduct.name} at ${targetW} by ${change > 0 ? "+" : ""}${change} ${peekProduct.unit}. ${res.journalEntryId ? `GL Voucher ${res.journalEntryId} recorded.` : ""}`
      )
    } else {
      showToast("Adjustment Error", "warning", res.error || "Failed to adjust stock.")
    }

    setAdjustAmount("")
  }

  return (
    <div className="min-h-screen page-gradient">
      {/* Global Navigation Header */}
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div 
        variants={stagger} 
        initial="hidden" 
        animate="visible" 
        className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12"
      >
        {/* Header Section */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Stock Register</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Manage product inventory, warehouse movement entries, stock adjustments, and compliance certificates from one register.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/inventory")} />
          </div>
        </motion.div>

        {/* Tab Selection Row */}
        <motion.div variants={fade} className="flex items-center gap-2 border-b border-zinc-200/60 mb-6 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "Register", label: "Stock Register" },
            { id: "Transfer Entries", label: "Transfer Entries" },
            { id: "Movement Ledger", label: "Movement Ledger" },
            { id: "Regulatory Docs", label: "Regulatory Docs" }
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                }}
                className="px-4 py-2.5 text-xs font-black relative tracking-tight transition-colors uppercase shrink-0"
              >
                <span className={isActive ? "text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-700"}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="stock-tabs"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950"
                  />
                )}
              </button>
            )
          })}
        </motion.div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          {/* TAB 1: ACTIVE PRODUCTS TABLE */}
          {activeTab === "Register" && (
            <motion.div
              key="products-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <GlassCard className="flex flex-col overflow-hidden p-0 border border-white/65 shadow-md">
                <div className="px-6 pt-6">
                  <FinanceTableToolbar
                    title="Stock Register"
                    subtitle={`Total: ${productsTable.sorted().length} inventory SKUs across warehouses`}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search product, SKU, batch..."
                    filters={[
                      {
                        value: selectedWarehouse,
                        onChange: setSelectedWarehouse,
                        ariaLabel: "Filter by Warehouse",
                        options: warehouseOptions,
                      },
                    ]}
                    actions={[
                      {
                        label: "Add Item",
                        onClick: () => {
                          navigate("/inventory/stock/add-item")
                        },
                        icon: <Plus className="size-4" />,
                        variant: "primary",
                      },
                    ]}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-black/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                        {productColumns.map((col) => (
                          <ResizableTh
                            key={col.key}
                            col={col}
                            width={productsTable.colWidths[col.key]}
                            sortKey={productsTable.sortKey}
                            sortDir={productsTable.sortDir}
                            openMenuCol={productsTable.openMenuCol}
                            onResizeStart={productsTable.handleResizeStart}
                            onToggleMenu={productsTable.toggleMenu}
                            onSortAsc={productsTable.setSortAsc}
                            onSortDesc={productsTable.setSortDesc}
                            onClearSort={productsTable.clearSort}
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150/40">
                      {isLoading ? (
                        <ProductTableSkeletonRows />
                      ) : productsTable.sorted().length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-16 text-zinc-400 text-xs font-medium">
                            No products match your active search filters.
                          </td>
                        </tr>
                      ) : (
                        productsTable.sorted().map((prod) => {
                          const complianceStatus = complianceStatusFor(prod)

                          return (
                            <motion.tr
                              key={prod.id}
                              onClick={() => {
                                setPeekProduct(prod)
                                setAdjustWarehouse(prod.warehouse)
                                setAdjustBatch(prod.batch)
                              }}
                              className="hover:bg-white/45 cursor-pointer transition-colors"
                              whileHover={{ scale: 1.001 }}
                            >
                              <td className="py-4 px-6 overflow-hidden">
                                <div className="flex flex-col">
                                  <span className="font-black text-zinc-950 text-xs tracking-tight leading-tight mb-0.5 truncate">
                                    {prod.name}
                                  </span>
                                  <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase">
                                    {prod.sku}
                                  </span>
                                </div>
                              </td>

                              <td className="py-4 px-4 overflow-hidden">
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight bg-zinc-100 border border-zinc-200/50 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                                  {prod.category}
                                </span>
                              </td>

                              <td className="py-4 px-4 overflow-hidden">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                                  <WarehouseIcon className="size-3.5 text-zinc-400 shrink-0" />
                                  <span className="truncate">{prod.warehouse}</span>
                                </div>
                              </td>

                              <td className="py-4 px-4 text-right font-mono font-black text-zinc-900 text-xs">
                                {prod.quantity.toLocaleString()}{" "}
                                <span className="text-[10px] text-zinc-400 uppercase font-bold">{prod.unit}</span>
                              </td>

                              <td className="py-4 px-4 text-right font-mono text-xs">
                                <div className="font-black text-zinc-950">ETB {money(stockValueFor(prod))}</div>
                                <div className="mt-1 text-[9px] font-bold uppercase text-zinc-400">
                                  {money(Number(prod.unitCost || 0))} / {prod.unit}
                                </div>
                              </td>

                              <td className="py-4 px-4 overflow-hidden">
                                <div className="flex flex-col">
                                  <span className="font-mono text-[11px] font-black text-zinc-800 leading-none mb-1">
                                    {prod.batch}
                                  </span>
                                  <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-1">
                                    <Calendar className="size-2.5 shrink-0 text-zinc-400" />
                                    Exp: {prod.expiry}
                                  </span>
                                </div>
                              </td>

                              <td className="py-4 px-4 text-center">
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${complianceClassFor(complianceStatus)}`}>
                                  {complianceStatus}
                                </span>
                              </td>

                              <td className="py-4 px-6 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setPeekProduct(prod)
                                      setAdjustWarehouse(prod.warehouse)
                                      setAdjustBatch(prod.batch)
                                    }}
                                    className="p-1.5 rounded-lg border border-zinc-200/60 hover:bg-zinc-100 text-zinc-600 transition-colors"
                                    title="Quick Peek & Adjust"
                                  >
                                    <Eye className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditProduct(prod)
                                    }}
                                    className="p-1.5 rounded-lg border border-zinc-200/60 hover:bg-zinc-100 text-zinc-600 transition-colors"
                                    title="Edit stock details"
                                  >
                                    <Edit3 className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteProduct(prod)
                                    }}
                                    className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                                    title="Remove stock"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* TAB 2: TRANSFER ENTRIES */}
          {activeTab === "Transfer Entries" && (
            <motion.div
              key="transfers-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <StoreTransfersTab />
            </motion.div>
          )}

          {/* TAB 3: MOVEMENT LEDGER */}
          {activeTab === "Movement Ledger" && (
            <motion.div
              key="movements-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <GlassCard className="flex flex-col overflow-hidden p-0 border border-white/65 shadow-md">
                <div className="px-6 pt-6">
                  <FinanceTableToolbar
                    title="Stock Movement Ledger"
                    subtitle={`Total: ${movementsTable.sorted().length} inventory ledger events recorded`}
                    searchValue={movementsSearch}
                    onSearchChange={setMovementsSearch}
                    searchPlaceholder="Search item, reference, voucher..."
                    filters={[
                      {
                        value: movementTypeFilter,
                        onChange: setMovementTypeFilter,
                        ariaLabel: "Filter Movement Type",
                        options: [
                          { value: "ALL", label: "All Movement Types" },
                          { value: "RECEIPT", label: "Type: Receipt" },
                          { value: "TRANSFER", label: "Type: Transfer" },
                          { value: "FULFILLMENT", label: "Type: Fulfillment" },
                          { value: "ADJUSTMENT", label: "Type: Adjustment" },
                        ],
                      },
                    ]}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-black/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                        {movementColumns.map((col) => (
                          <ResizableTh
                            key={col.key}
                            col={col}
                            width={movementsTable.colWidths[col.key]}
                            sortKey={movementsTable.sortKey}
                            sortDir={movementsTable.sortDir}
                            openMenuCol={movementsTable.openMenuCol}
                            onResizeStart={movementsTable.handleResizeStart}
                            onToggleMenu={movementsTable.toggleMenu}
                            onSortAsc={movementsTable.setSortAsc}
                            onSortDesc={movementsTable.setSortDesc}
                            onClearSort={movementsTable.clearSort}
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150/40">
                      {movementsTable.sorted().length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-xs text-zinc-400 font-medium">
                            No stock movements match your search filters.
                          </td>
                        </tr>
                      ) : (
                        movementsTable.sorted().map((m) => (
                          <tr key={m.id} className="hover:bg-white/45 transition-colors">
                            <td className="py-4 px-6 font-mono text-xs font-bold text-zinc-600">{m.date}</td>
                            <td className="py-4 px-4">
                              <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider ${
                                m.type === "RECEIPT" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                m.type === "SALES_OUT" ? "bg-rose-50 text-rose-800 border-rose-200" :
                                m.type === "TRANSFER" ? "bg-blue-50 text-blue-800 border-blue-200" :
                                m.type === "FULFILLMENT" ? "bg-purple-50 text-purple-800 border-purple-200" :
                                "bg-amber-50 text-amber-800 border-amber-200"
                              }`}>
                                {m.type}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-black text-zinc-950 text-xs">{m.productName}</td>
                            <td className="py-4 px-4 font-mono text-xs font-semibold text-zinc-700">
                              {m.fromWarehouse && m.toWarehouse ? `${m.fromWarehouse} → ${m.toWarehouse}` : m.fromWarehouse ? `Out: ${m.fromWarehouse}` : m.toWarehouse ? `In: ${m.toWarehouse}` : ""}
                            </td>
                            <td className="py-4 px-4 text-right font-mono font-black text-xs text-zinc-900">
                              {m.qty} <span className="text-[10px] text-zinc-400 font-bold uppercase">{m.unit}</span>
                            </td>
                            <td className="py-4 px-6 font-mono text-xs">
                              <div className="flex flex-col">
                                <span className="font-bold text-zinc-900">{m.reference}</span>
                                {m.journalEntryId && (
                                  <span className="text-[10px] text-emerald-700 font-bold">{m.journalEntryId} (GL Posted)</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* TAB 4: REGULATORY DOCUMENTS */}
          {activeTab === "Regulatory Docs" && (
            <motion.div
              key="docs-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <GlassCard className="flex flex-col overflow-hidden p-0 border border-white/65 shadow-md">
                <div className="px-6 pt-6">
                  <FinanceTableToolbar
                    title="Regulatory Compliance Certificates & Licenses"
                    subtitle={`Total: ${docsTable.sorted().length} validated Certificates of Analysis and licenses`}
                    searchValue={docSearch}
                    onSearchChange={setDocSearch}
                    searchPlaceholder="Search document, batch, type..."
                    filters={[
                      {
                        value: docStatusFilter,
                        onChange: setDocStatusFilter,
                        ariaLabel: "Filter Status",
                        options: [
                          { value: "ALL", label: "All Statuses" },
                          { value: "Valid", label: "Status: Valid" },
                          { value: "Expiring Soon", label: "Status: Expiring Soon" },
                          { value: "Expired", label: "Status: Expired" },
                        ],
                      },
                    ]}
                    actions={[
                      {
                        label: "Upload CoA",
                        onClick: () => {
                          showToast("Upload Certificate", "info", "CoA document upload flow initiated.")
                        },
                        icon: <Upload className="size-4" />,
                        variant: "primary",
                      },
                    ]}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-black/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                        {docColumns.map((col) => (
                          <ResizableTh
                            key={col.key}
                            col={col}
                            width={docsTable.colWidths[col.key]}
                            sortKey={docsTable.sortKey}
                            sortDir={docsTable.sortDir}
                            openMenuCol={docsTable.openMenuCol}
                            onResizeStart={docsTable.handleResizeStart}
                            onToggleMenu={docsTable.toggleMenu}
                            onSortAsc={docsTable.setSortAsc}
                            onSortDesc={docsTable.setSortDesc}
                            onClearSort={docsTable.clearSort}
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150/40">
                      {docsTable.sorted().length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-xs text-zinc-400 font-medium">
                            No regulatory documents match your search filters.
                          </td>
                        </tr>
                      ) : (
                        docsTable.sorted().map((doc) => {
                          const isExpiring = doc.status === "Expiring Soon"
                          const isExpired = doc.status === "Expired"

                          return (
                            <tr key={doc.id} className="hover:bg-white/45 transition-colors">
                              <td className="py-4 px-6 font-mono text-xs font-black text-zinc-900">{doc.id}</td>
                              <td className="py-4 px-4 font-black text-zinc-950 text-xs">{doc.name}</td>
                              <td className="py-4 px-4 font-bold text-xs text-zinc-600">{doc.type}</td>
                              <td className="py-4 px-4 font-mono text-xs text-zinc-800 font-bold">{doc.linkedBatch}</td>
                              <td className="py-4 px-4 font-mono text-xs text-zinc-700">{doc.expiryDate}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider ${
                                  isExpired ? "bg-rose-50 text-rose-800 border-rose-200" :
                                  isExpiring ? "bg-amber-50 text-amber-800 border-amber-200 animate-pulse" :
                                  "bg-emerald-50 text-emerald-800 border-emerald-200"
                                }`}>
                                  {doc.status}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <button
                                  onClick={() => showToast("Downloading Document", "info", `Fetching PDF for ${doc.id}`)}
                                  className="p-1.5 rounded-lg border border-zinc-200/60 hover:bg-zinc-100 text-zinc-600 transition-colors"
                                  title="Download Document"
                                >
                                  <Eye className="size-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ==================== SLIDE-IN QUICK PEEK PANEL ==================== */}
      <AnimatePresence>
        {peekProduct && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setPeekProduct(null)
                setAdjustAmount("")
              }}
              className="fixed inset-0 bg-black/35 backdrop-blur-sm z-[100]"
            />

            {/* Slide-over Content Card */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-zinc-50/98 backdrop-blur-md shadow-2xl border-l border-zinc-200/80 p-6 z-[101] overflow-y-auto flex flex-col justify-between"
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200/60 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Product Details Peek</span>
                    <h2 className="text-xl font-black text-zinc-950 tracking-tight leading-none">
                      {peekProduct.name}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setPeekProduct(null)
                      setAdjustAmount("")
                    }}
                    className="size-8 rounded-full border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center transition-colors text-zinc-500"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Global SKU Code</span>
                    <span className="font-mono text-xs font-black text-zinc-900 bg-white border border-zinc-200 px-3 py-1 rounded-xl block">
                      {peekProduct.sku}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Standard Unit</span>
                    <span className="text-xs font-bold text-zinc-700 bg-white border border-zinc-200 px-3 py-1 rounded-xl block uppercase">
                      {peekProduct.unit}
                    </span>
                  </div>
                </div>

                {/* Stock Breakdown */}
                <div className="mb-6">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2.5">
                    Storage Breakdown
                  </h3>
                  <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
                    {peekProduct.stockBreakdown.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs font-bold text-zinc-700">
                        <div className="flex items-center gap-1.5">
                          <WarehouseIcon className="size-3.5 text-zinc-400 shrink-0" />
                          <span>{item.warehouse}</span>
                        </div>
                        <span className="font-mono font-black text-zinc-950">
                          {item.qty} {peekProduct.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Batches Info */}
                <div className="mb-6">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2.5">
                    Traced Compliance Batches
                  </h3>
                  <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-black text-zinc-400 uppercase">
                          <th className="py-2.5 px-4">Batch #</th>
                          <th className="py-2.5 px-2 text-right">Qty</th>
                          <th className="py-2.5 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150">
                        {peekProduct.batches.map((b, idx) => (
                          <tr key={idx} className="font-bold text-zinc-700">
                            <td className="py-3 px-4 font-mono">{b.batchNo}</td>
                            <td className="py-3 px-2 text-right font-mono text-zinc-950">
                              {b.qty} {peekProduct.unit}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                                b.status === "Released" ? "bg-green-50 text-green-700 border-green-200" :
                                "bg-zinc-100 text-zinc-700 border-zinc-200"
                              }`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Adjust Stock Form (Footer block) */}
              <div className="border-t border-zinc-200/80 pt-5 mt-6 bg-zinc-100/50 -mx-6 -mb-6 p-6">
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider mb-3">
                  Direct Ledger Adjustment
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Target Warehouse</label>
                      <select
                        value={adjustWarehouse}
                        onChange={(e) => setAdjustWarehouse(e.target.value)}
                        className="w-full bg-white border border-zinc-200/80 px-3 py-2 rounded-xl text-xs font-bold outline-none"
                      >
                        {warehouseOptions.filter((warehouse) => warehouse.value !== "ALL").map((warehouse) => (
                          <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Target Batch</label>
                      <select
                        value={adjustBatch}
                        onChange={(e) => setAdjustBatch(e.target.value)}
                        className="w-full bg-white border border-zinc-200/80 px-3 py-2 rounded-xl text-xs font-bold outline-none font-mono"
                      >
                        {peekProduct.batches.map((b) => (
                          <option key={b.batchNo} value={b.batchNo}>{b.batchNo}</option>
                        ))}
                        <option value="NEW">Create New Batch</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-white border border-zinc-200/80 px-4 py-2.5 rounded-xl text-xs font-bold outline-none"
                      />
                      <span className="absolute right-4 top-2.5 text-xs font-bold text-zinc-400 uppercase">
                        {peekProduct.unit}
                      </span>
                    </div>
                    <button
                      onClick={handleAdjustStock}
                      disabled={adjustAmount === ""}
                      className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all uppercase tracking-wider ${
                        adjustAmount === "" 
                          ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                          : "bg-zinc-950 hover:bg-zinc-900 text-white shadow-md active:scale-95"
                      }`}
                    >
                      Post Change
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
              onClick={() => setEditingProduct(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-zinc-950">Edit Stock Details</h2>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">Pricing changes made here are used when issuing sales.</p>
                </div>
                <button onClick={() => setEditingProduct(null)} className="rounded-xl border border-zinc-200 p-2 text-zinc-600">
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Item Name</span>
                  <input value={editForm.name} onChange={(e) => updateEditForm({ name: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">SKU</span>
                  <input value={editForm.sku} onChange={(e) => updateEditForm({ sku: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Category</span>
                  <input value={editForm.category} onChange={(e) => updateEditForm({ category: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Warehouse</span>
                  <select value={editForm.warehouse} onChange={(e) => updateEditForm({ warehouse: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold">
                    {warehouseOptions.filter((warehouse) => warehouse.value !== "ALL").map((warehouse) => (
                      <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Batch Number</span>
                  <input value={editForm.batch} onChange={(e) => updateEditForm({ batch: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Expiry Date</span>
                  <input type="date" value={editForm.expiry} onChange={(e) => updateEditForm({ expiry: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Unit</span>
                  <input value={editForm.unit} onChange={(e) => updateEditForm({ unit: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Cost Price</span>
                  <input type="number" min="0" value={editForm.unitCost} onChange={(e) => updateEditForm({ unitCost: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Selling Price</span>
                  <input type="number" min="0" value={editForm.sellingPrice} onChange={(e) => updateEditForm({ sellingPrice: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Reorder Level</span>
                  <input type="number" min="0" value={editForm.reorderLevel} onChange={(e) => updateEditForm({ reorderLevel: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Compliance Status</span>
                  <select value={editForm.approvalStatus || "Approved"} onChange={(e) => updateEditForm({ approvalStatus: e.target.value as Product["approvalStatus"] })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold">
                    <option value="Approved">Approved</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Not Submitted">Not Submitted</option>
                  </select>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button onClick={() => setEditingProduct(null)} className="h-10 rounded-xl border border-zinc-200 px-4 text-xs font-black">Cancel</button>
                <button disabled={isSavingEdit} onClick={() => void handleSaveProductDetails()} className="h-10 rounded-xl bg-zinc-950 px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
                  {isSavingEdit ? "Saving..." : "Save Stock Details"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
