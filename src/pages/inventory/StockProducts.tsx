import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  X, 
  Warehouse as WarehouseIcon, 
  Upload, 
  Calendar, 
  Eye
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import StoreTransfersTab from "@/components/StoreTransfersTab"
import { useErpStore, type Product } from "@/lib/erpStore"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"

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

const initialRegulatoryDocs: RegulatoryDoc[] = [
  {
    id: "DOC-301",
    name: "Export Coffee Phytosanitary Certificate - B-YRG-2026-04",
    type: "Phytosanitary",
    linkedBatch: "B-YRG-2026-04",
    expiryDate: "2027-12-31",
    status: "Valid"
  },
  {
    id: "DOC-302",
    name: "Ethiopian FDA Veterinary Import Registration (India LA Injections)",
    type: "EFDA License",
    linkedBatch: "B-OXY-IND-99",
    expiryDate: "2028-05-18",
    status: "Valid"
  },
  {
    id: "DOC-303",
    name: "Customs Import Clearance (China Soluble Powders WH3)",
    type: "Customs License",
    linkedBatch: "B-AMX-CHN-88",
    expiryDate: "2028-03-22",
    status: "Valid"
  },
  {
    id: "DOC-304",
    name: "Quality Analysis & Purity Certificate (Humera Sesame Seeds)",
    type: "Quality Certificate",
    linkedBatch: "B-HUM-2026-01",
    expiryDate: "2027-08-15",
    status: "Valid"
  }
]

const productColumns: TableColumn[] = [
  { key: "name", label: "Product & SKU", align: "left" },
  { key: "category", label: "Category", align: "left" },
  { key: "warehouse", label: "Primary Warehouse", align: "left" },
  { key: "quantity", label: "Available Qty", align: "right" },
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

export default function StockProducts() {
  const { showToast } = useFeedback()
  const erp = useErpStore()
  const products = erp.getProducts()
  const [activeTab, setActiveTab] = useState<"Products" | "Transfers" | "Stock Movements" | "Regulatory Docs">("Products")
  const [docs, setDocs] = useState<RegulatoryDoc[]>(initialRegulatoryDocs)

  // Filters for Products tab
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL")
  const [selectedCategory, setSelectedCategory] = useState("ALL")

  // Filters for Movements tab
  const [movementsSearch, setMovementsSearch] = useState("")
  const [movementTypeFilter, setMovementTypeFilter] = useState("ALL")

  // Filters for Regulatory Docs tab
  const [docSearch, setDocSearch] = useState("")
  const [docStatusFilter, setDocStatusFilter] = useState("ALL")

  // Slide-in Quick-Peek Panel
  const [peekProduct, setPeekProduct] = useState<Product | null>(null)
  const [adjustAmount, setAdjustAmount] = useState<number | "">("")
  const [adjustWarehouse, setAdjustWarehouse] = useState("")
  const [adjustBatch, setAdjustBatch] = useState("")

  // Add Item slide-in state & form
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSKU, setNewSKU] = useState("")
  const [newCategory, setNewCategory] = useState("Agricultural Export (Coffee)")
  const [newUnit, setNewUnit] = useState("bags (60kg)")
  const [newWarehouse, setNewWarehouse] = useState("WH1")
  const [newQty, setNewQty] = useState<number | "">("")
  const [newBatchNo, setNewBatchNo] = useState("")
  const [newExpiry, setNewExpiry] = useState("")
  const [newHasDoc, setNewHasDoc] = useState(false)
  const [newDocName, setNewDocName] = useState("")

  // Unique Warehouses & Categories list for filters
  const warehouses = ["ALL", "WH1", "WH2", "WH3"]
  const categories = ["ALL", ...Array.from(new Set(products.map(p => p.category)))]

  // Filtered lists
  const filteredProducts = products.filter((prod) => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prod.batch.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesWarehouse = selectedWarehouse === "ALL" || prod.stockBreakdown.some((b) => b.warehouse === selectedWarehouse)
    const matchesCategory = selectedCategory === "ALL" || prod.category === selectedCategory
    return matchesSearch && matchesWarehouse && matchesCategory
  })

  const productsTable = useResizableTable(productColumns, filteredProducts, {
    name: 240,
    category: 160,
    warehouse: 160,
    quantity: 140,
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

  // Handle Add Product Submission
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newSKU || newQty === "") {
      showToast("Validation Error", "warning", "Please provide a name, SKU, and starting quantity.")
      return
    }

    const qtyNum = Number(newQty)
    const productStatus = qtyNum > 500 ? "In Stock" : qtyNum > 0 ? "Low Stock" : "Out of Stock"
    const newId = `P-${Date.now().toString().slice(-3)}`

    const freshProduct: Product = {
      id: newId,
      name: newName,
      sku: newSKU,
      category: newCategory,
      warehouse: newWarehouse,
      quantity: qtyNum,
      unit: newUnit,
      unitCost: 1000,
      sellingPrice: 1500,
      batch: newBatchNo || "N/A",
      expiry: newExpiry || "N/A",
      status: productStatus,
      origin: newWarehouse === "WH1" ? "Ethiopia (Local Sourcing)" : newWarehouse === "WH2" ? "India (Import)" : "China (Import)",
      supplierName: newWarehouse === "WH1" ? "Oromia Farmers Union" : newWarehouse === "WH2" ? "Indian Vet Bio Pharma" : "Shandong Animal Health",
      stockBreakdown: [{ warehouse: newWarehouse, qty: qtyNum }],
      batches: newBatchNo ? [{ batchNo: newBatchNo, qty: qtyNum, expiry: newExpiry, status: "Released" }] : []
    }

    erp.addProduct(freshProduct)

    // Create a regulatory document if attached
    if (newHasDoc && newDocName) {
      const freshDoc: RegulatoryDoc = {
        id: `DOC-${Date.now().toString().slice(-3)}`,
        name: newDocName,
        type: "CoA",
        linkedBatch: newBatchNo || "General",
        expiryDate: newExpiry || "2029-12-31",
        status: "Valid"
      }
      setDocs((prev) => [freshDoc, ...prev])
    }

    showToast("Stock Item Added", "success", `${newName} (${newSKU}) successfully entered in HKC Trading ERP.`)
    
    // Reset Form
    setNewName("")
    setNewSKU("")
    setNewQty("")
    setNewBatchNo("")
    setNewExpiry("")
    setNewHasDoc(false)
    setNewDocName("")
    setIsAddOpen(false)
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
            <h1 className="text-3xl font-black text-black tracking-tight">Stock & Products</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Manage product inventory across all warehouses, store transfers, movement audit logs, and compliance certificates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/inventory")} />
          </div>
        </motion.div>

        {/* Tab Selection Row */}
        <motion.div variants={fade} className="flex items-center gap-2 border-b border-zinc-200/60 mb-6 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "Products", label: "Active Products" },
            { id: "Transfers", label: "Store Transfers" },
            { id: "Stock Movements", label: "Stock Movements Log" },
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
          {activeTab === "Products" && (
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
                    title="Active Stock Products"
                    subtitle={`Total: ${productsTable.sorted().length} inventory SKUs across warehouses`}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search product, SKU, batch..."
                    filters={[
                      {
                        value: selectedWarehouse,
                        onChange: setSelectedWarehouse,
                        ariaLabel: "Filter by Warehouse",
                        options: warehouses.map((w) => ({
                          value: w,
                          label: w === "ALL" ? "All Warehouses" : w,
                        })),
                      },
                      {
                        value: selectedCategory,
                        onChange: setSelectedCategory,
                        ariaLabel: "Filter by Category",
                        options: categories.map((c) => ({
                          value: c,
                          label: c === "ALL" ? "All Categories" : c.split(" ")[0],
                        })),
                      },
                    ]}
                    actions={[
                      {
                        label: "Add Item",
                        onClick: () => {
                          setNewCategory("Agricultural Export (Coffee)")
                          setNewWarehouse("WH1")
                          setIsAddOpen(true)
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
                      {productsTable.sorted().length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-16 text-zinc-400 text-xs font-medium">
                            No products match your active search filters.
                          </td>
                        </tr>
                      ) : (
                        productsTable.sorted().map((prod) => {
                          const statusColors = 
                            prod.status === "In Stock" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                            prod.status === "Low Stock" ? "bg-amber-50 text-amber-800 border-amber-200" :
                            prod.status === "Quarantined" ? "bg-zinc-900 text-white border-black" :
                            "bg-rose-50 text-rose-800 border-rose-200"

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
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${statusColors}`}>
                                  {prod.status}
                                </span>
                              </td>

                              <td className="py-4 px-6 text-center">
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

          {/* TAB 2: STORE TRANSFERS */}
          {activeTab === "Transfers" && (
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

          {/* TAB 3: STOCK MOVEMENTS LOG */}
          {activeTab === "Stock Movements" && (
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
                    title="Stock Movement Audit Log"
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
                                m.type === "TRANSFER" ? "bg-blue-50 text-blue-800 border-blue-200" :
                                m.type === "FULFILLMENT" ? "bg-purple-50 text-purple-800 border-purple-200" :
                                "bg-amber-50 text-amber-800 border-amber-200"
                              }`}>
                                {m.type}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-black text-zinc-950 text-xs">{m.productName}</td>
                            <td className="py-4 px-4 font-mono text-xs font-semibold text-zinc-700">
                              {m.fromWarehouse && m.toWarehouse ? `${m.fromWarehouse} → ${m.toWarehouse}` : m.fromWarehouse ? `Out: ${m.fromWarehouse}` : m.toWarehouse ? `In: ${m.toWarehouse}` : "N/A"}
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
                        {warehouses.filter(w => w !== "ALL").map((w) => (
                          <option key={w} value={w}>{w}</option>
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
                        placeholder="Quantity change (e.g. -50, 100)"
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

      {/* ==================== SLIDE-IN ADD ITEM FORM PANEL ==================== */}
      <AnimatePresence>
        {isAddOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="fixed inset-0 bg-black/35 backdrop-blur-sm z-[100]"
            />

            {/* Slide-over Form Container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-zinc-50/98 backdrop-blur-md shadow-2xl border-l border-zinc-200/80 p-6 z-[101] overflow-y-auto flex flex-col justify-between"
            >
              <form onSubmit={handleAddProduct} className="flex flex-col h-full justify-between">
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-200/60 mb-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Compliance Module</span>
                      <h2 className="text-xl font-black text-zinc-950 tracking-tight leading-none">
                        Add New Stock Item
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(false)}
                      className="size-8 rounded-full border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center transition-colors text-zinc-500"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* SECTION 1: Basic Info */}
                  <div className="space-y-4 mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Basic Info
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Product Name</label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. Lidocaine Hydrochloride"
                          className="w-full bg-white border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">SKU / Catalog Code</label>
                          <input
                            type="text"
                            required
                            value={newSKU}
                            onChange={(e) => setNewSKU(e.target.value)}
                            placeholder="e.g. PRD-LID-15"
                            className="w-full bg-white border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Stock Unit</label>
                          <input
                            type="text"
                            required
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                            placeholder="e.g. kg, L, vials"
                            className="w-full bg-white border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Product Category</label>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full bg-white border border-zinc-200 px-3 py-2 rounded-xl text-xs font-semibold outline-none"
                        >
                          {categories.filter(c => c !== "ALL").map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Warehouse & Stock */}
                  <div className="space-y-4 mb-6">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Warehouse & Stock
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Primary Warehouse</label>
                          <select
                            value={newWarehouse}
                            onChange={(e) => setNewWarehouse(e.target.value)}
                            className="w-full bg-white border border-zinc-200 px-3 py-2 rounded-xl text-xs font-semibold outline-none"
                          >
                            {warehouses.filter(w => w !== "ALL").map((w) => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Starting Qty</label>
                          <input
                            type="number"
                            required
                            value={newQty}
                            onChange={(e) => setNewQty(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="0"
                            className="w-full bg-white border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-zinc-100/50 p-3.5 rounded-2xl border border-zinc-200/40">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Batch Number</label>
                          <input
                            type="text"
                            value={newBatchNo}
                            onChange={(e) => setNewBatchNo(e.target.value)}
                            placeholder="e.g. B-LD26-12"
                            className="w-full bg-white border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Expiry Date</label>
                          <input
                            type="date"
                            value={newExpiry}
                            onChange={(e) => setNewExpiry(e.target.value)}
                            className="w-full bg-white border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Regulatory Docs (upload zone style) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                        Compliance Documentation
                      </h3>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newHasDoc}
                          onChange={(e) => setNewHasDoc(e.target.checked)}
                          className="rounded text-zinc-950 focus:ring-zinc-900 size-3"
                        />
                        <span className="text-[10px] font-bold text-zinc-600">Attach verification file</span>
                      </label>
                    </div>

                    {newHasDoc && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-zinc-200 p-4 rounded-2xl space-y-3 shadow-sm"
                      >
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Document File Name</label>
                          <input
                            type="text"
                            required
                            value={newDocName}
                            onChange={(e) => setNewDocName(e.target.value)}
                            placeholder="e.g. Certificate of Analysis - B-LD26-12"
                            className="w-full bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-semibold outline-none focus:border-zinc-950 transition-colors"
                          />
                        </div>

                        <div className="border border-dashed border-zinc-200 hover:border-zinc-950 hover:bg-zinc-50 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5">
                          <Upload className="size-5 text-zinc-400" />
                          <span className="text-[10px] font-bold text-zinc-600">Drag & drop or browse PDF file</span>
                          <span className="text-[8px] font-semibold text-zinc-400 uppercase">Limit 10MB</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 border-t border-zinc-200/80 pt-5 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="flex-1 py-2.5 rounded-full border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-all uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold transition-all uppercase tracking-wider shadow-md shadow-black/10"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
