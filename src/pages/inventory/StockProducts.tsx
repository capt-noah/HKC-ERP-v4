import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  Warehouse as WarehouseIcon, 
  Upload,
  Calendar, 
  Edit3,
  FileText,
  X,
  Save,
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import StoreTransfersTab from "@/components/StoreTransfersTab"
import { useErpStore, type Product } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { EditModalHeader } from "@/components/EditModalHeader"
import { RecordDeleteModal } from "@/components/RecordDeleteModal"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { Skeleton } from "@/components/ui/skeleton"

const packagingUnits = ["Box", "Bottle", "Vial"]

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
  { key: "warehouse", label: "Primary Warehouse", align: "left" },
  { key: "quantity", label: "Available Qty", align: "right" },
  { key: "totalStockValue", label: "Stock Value", align: "right" },
  { key: "batch", label: "Latest Batch & Expiry", align: "left" },
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
  const { showToast } = useFeedback()
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

  // Add Stock Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addDescription, setAddDescription] = useState("")
  const [addPackagingUnit, setAddPackagingUnit] = useState("")
  const [addWarehouse, setAddWarehouse] = useState("")
  const [addBatchNumber, setAddBatchNumber] = useState("")
  const [addUnitPrice, setAddUnitPrice] = useState("")
  const [addMfgDate, setAddMfgDate] = useState("")
  const [addExpDate, setAddExpDate] = useState("")
  const [addQtyPerPack, setAddQtyPerPack] = useState("")
  const [addNumCartons, setAddNumCartons] = useState("")
  const [isSavingAdd, setIsSavingAdd] = useState(false)

  const addTotalQuantity = Number(addQtyPerPack || 0) * Number(addNumCartons || 0)
  const addTotalStockValue = addTotalQuantity * Number(addUnitPrice || 0)

  const daysBetween = (start: string, end: string) => {
    if (!start || !end) return null
    const startDate = new Date(`${start}T00:00:00`)
    const endDate = new Date(`${end}T00:00:00`)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
    return Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000)
  }

  const addShelfLifeDays = daysBetween(addMfgDate, addExpDate)
  const addShelfLifeMonths = addShelfLifeDays === null ? 0 : Math.max(0, Math.round((addShelfLifeDays / 30.4375) * 10) / 10)
  const addDateInvalid = Boolean(addShelfLifeDays !== null && addShelfLifeDays <= 0)
  const addNormalizedBatch = addBatchNumber.trim().toLowerCase()
  const addDuplicateBatch = Boolean(addNormalizedBatch) && products.some((product) => {
    const batches = [product.batch, ...product.batches.map((batch) => batch.batchNo)]
    return batches.some((batch) => String(batch || "").trim().toLowerCase() === addNormalizedBatch)
  })

  const canSaveAdd = Boolean(
    addDescription &&
      addPackagingUnit &&
      addWarehouse &&
      addBatchNumber &&
      addMfgDate &&
      addExpDate &&
      addQtyPerPack &&
      addNumCartons &&
      addTotalQuantity > 0 &&
      !addDateInvalid &&
      !addDuplicateBatch
  )

  const resetAddForm = () => {
    setAddDescription("")
    setAddPackagingUnit("")
    setAddWarehouse("")
    setAddBatchNumber("")
    setAddUnitPrice("")
    setAddMfgDate("")
    setAddExpDate("")
    setAddQtyPerPack("")
    setAddNumCartons("")
  }

  const handleSaveNewStockItem = async (addAnother = false) => {
    if (!canSaveAdd) {
      showToast("Cannot save item", "warning", "Complete the required stock fields and resolve validation warnings first.")
      return
    }

    const now = new Date().toISOString()
    const selectedWarehouseRecord = warehouseRecords.find((item) => (item.code || item.id) === addWarehouse || item.id === addWarehouse)
    const productId = `P-${Date.now()}`
    const product: Product = {
      id: productId,
      name: addDescription,
      sku: `${addDescription.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "STK")}-${addBatchNumber}`,
      category: "",
      itemType: "",
      description: addDescription,
      warehouse: addWarehouse,
      warehouseName: selectedWarehouseRecord?.name,
      quantity: addTotalQuantity,
      quantityPerPack: Number(addQtyPerPack),
      numberOfCartons: Number(addNumCartons),
      totalQuantity: addTotalQuantity,
      quantitySold: 0,
      openingBalance: addTotalQuantity,
      unit: addPackagingUnit,
      unitCost: Number(addUnitPrice),
      sellingPrice: Number(addUnitPrice),
      totalStockValue: addTotalStockValue,
      batch: addBatchNumber,
      manufacturingDate: addMfgDate,
      expiry: addExpDate,
      shelfLifeMonths: addShelfLifeMonths,
      status: addTotalQuantity > 0 ? "In Stock" : "Out of Stock",
      stockBreakdown: [{ warehouse: addWarehouse, qty: addTotalQuantity }],
      batches: [{ batchNo: addBatchNumber, qty: addTotalQuantity, expiry: addExpDate, status: "Released" }],
      origin: "",
      supplierName: "",
      itemRegistrationStatus: "Active",
      approvalStatus: "Approved",
      createdDate: now,
      createdAt: now,
      updatedAt: now,
    }

    setIsSavingAdd(true)
    try {
      await erp.addProduct(product)
      showToast("Stock item saved", "success", `${addDescription} was saved to inventory.`)
      if (addAnother) {
        resetAddForm()
      } else {
        resetAddForm()
        setIsAddModalOpen(false)
      }
    } catch (error) {
      showToast("Save failed", "warning", error instanceof Error ? error.message : "The stock item could not be saved.")
    } finally {
      setIsSavingAdd(false)
    }
  }

  // Edit/Delete Product state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
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
      showToast("Stock details saved", "success", `${saved.name} was updated.`)
    } catch (error) {
      showToast("Save failed", "warning", error instanceof Error ? error.message : "The stock details could not be saved.")
    } finally {
      setIsSavingEdit(false)
    }
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
                        onClick: () => setIsAddModalOpen(true),
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
                          return (
                            <motion.tr
                              key={prod.id}
                              onClick={() => openEditProduct(prod)}
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

                              <td className="py-4 px-6 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditProduct(prod)
                                  }}
                                  className="px-3.5 py-1.5 rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-extrabold text-[11px] transition-all border border-zinc-200/80 active:scale-95 shadow-xs inline-flex items-center gap-1"
                                  title="Edit stock details"
                                >
                                  <Edit3 className="size-3 text-zinc-500" /> Edit
                                </button>
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
                                  <FileText className="size-3.5" />
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
              <EditModalHeader
                title={`Edit Stock Details: ${editingProduct.name}`}
                subtitle={`SKU: ${editingProduct.sku} • Pricing and batch details changes made here are reflected system-wide.`}
                onClose={() => setEditingProduct(null)}
                onRequestDelete={() => setDeletingProduct(editingProduct)}
                deleteLabel="Delete Stock Product"
              />

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
                  <select 
                    value={editForm.unit} 
                    onChange={(e) => updateEditForm({ unit: e.target.value })} 
                    className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-bold text-zinc-900 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Box">Box</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Vial">Vial</option>
                  </select>
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

      {/* MODAL: ADD NEW STOCK ITEM */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Add Stock Item</h3>
                  <p className="text-xs text-zinc-500">Register new product inventory into warehouse stock.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      Item Name / Description of Goods <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Paracetamol 500mg Tablets"
                      value={addDescription}
                      onChange={(e) => setAddDescription(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold outline-none focus:border-emerald-500"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      Packaging Unit <span className="text-rose-600">*</span>
                    </span>
                    <select
                      value={addPackagingUnit}
                      onChange={(e) => setAddPackagingUnit(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">Select packaging unit</option>
                      {packagingUnits.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      Primary Warehouse <span className="text-rose-600">*</span>
                    </span>
                    <select
                      value={addWarehouse}
                      onChange={(e) => setAddWarehouse(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold outline-none focus:border-emerald-500"
                    >
                      <option value="">Select warehouse</option>
                      {warehouseRecords.map((item) => {
                        const value = item.code || item.id
                        return <option key={item.id} value={value}>{item.name || value}</option>
                      })}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      Batch Number <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. BATCH-2026-09"
                      value={addBatchNumber}
                      onChange={(e) => setAddBatchNumber(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold outline-none focus:border-emerald-500 font-mono"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      Unit Price (ETB) <span className="text-[10px] text-zinc-400 font-semibold lowercase">(optional)</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={addUnitPrice}
                      onChange={(e) => setAddUnitPrice(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-black outline-none focus:border-emerald-500 font-mono"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      Manufacturing Date <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="date"
                      value={addMfgDate}
                      onChange={(e) => setAddMfgDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono font-bold outline-none focus:border-emerald-500"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      Expiry Date <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="date"
                      value={addExpDate}
                      onChange={(e) => setAddExpDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono font-bold outline-none focus:border-emerald-500"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      Quantity Per Pack <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 100"
                      value={addQtyPerPack}
                      onChange={(e) => setAddQtyPerPack(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-bold outline-none focus:border-emerald-500 font-mono"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      Number of Cartons <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50"
                      value={addNumCartons}
                      onChange={(e) => setAddNumCartons(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-bold outline-none focus:border-emerald-500 font-mono"
                    />
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      Total Calculated Quantity
                    </span>
                    <input
                      readOnly
                      value={addTotalQuantity.toLocaleString()}
                      className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 text-right font-mono text-sm font-black text-zinc-900 dark:text-zinc-100 outline-none"
                    />
                  </label>
                </div>

                {addDateInvalid && (
                  <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                    Expiry date must be after the manufacturing date.
                  </p>
                )}
                {addDuplicateBatch && (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    Batch number already exists in inventory.
                  </p>
                )}

                <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="h-10 rounded-full border border-zinc-200 dark:border-zinc-700 px-4 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!canSaveAdd || isSavingAdd}
                    onClick={() => void handleSaveNewStockItem(true)}
                    className="h-10 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Save and Add Another
                  </button>
                  <button
                    type="button"
                    disabled={!canSaveAdd || isSavingAdd}
                    onClick={() => void handleSaveNewStockItem(false)}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 text-white font-bold hover:bg-zinc-800 px-5 text-xs shadow-md disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Save className="size-4" /> Save Item
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REUSABLE DELETE CONFIRMATION MODAL — rendered above edit modal */}
      <RecordDeleteModal
        isOpen={!!deletingProduct}
        title="Delete Stock Product?"
        recordId={deletingProduct?.sku}
        recordName={deletingProduct?.name}
        description="This will permanently delete this product from system inventory registry."
        onClose={() => setDeletingProduct(null)}
        onConfirmDelete={() => {
          if (!deletingProduct) return
          erp.deleteProduct(deletingProduct.id)
          showToast("Product Removed", "info", `Product ${deletingProduct.name} deleted.`)
          setDeletingProduct(null)
          setEditingProduct(null)
        }}
      />
    </div>
  )
}
