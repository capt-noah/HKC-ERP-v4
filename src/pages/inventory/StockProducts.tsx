import { useState, useMemo, Fragment } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  X,
  ChevronDown,
  ChevronRight,
  Edit3,
  PlusCircle,
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import StoreTransfersTab from "@/components/StoreTransfersTab"
import { useErpStore, type Product, type WH1Entry } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { EditModalHeader } from "@/components/EditModalHeader"
import { RecordDeleteModal } from "@/components/RecordDeleteModal"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/lib/authStore"

const packagingUnits = ["Box", "Bottle", "Vial"]
const TON_TO_QUINTAL = 10

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

interface StockEditForm {
  name: string
  sku: string
  category: string
  warehouse: string
  batch: string
  expiry: string
  entryDate?: string
  leaveDate?: string
  unit: string
  unitCost: string
  sellingPrice: string
  price?: string
  reorderLevel: string
  approvalStatus: Product["approvalStatus"]
}

function money(value: number) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function displayDate(value?: string) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

function ProductTableSkeletonRows({ colSpan }: { colSpan: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <tr key={index}>
          <td className="py-4 px-6"><div className="space-y-2"><Skeleton className="h-3 w-44 bg-zinc-200/80" /><Skeleton className="h-3 w-24 bg-zinc-200/80" /></div></td>
          {Array.from({ length: colSpan - 1 }).map((_, cIdx) => (
            <td key={cIdx} className="py-4 px-4"><Skeleton className="h-3 w-20 bg-zinc-200/80" /></td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default function StockProducts() {
  const { showToast } = useFeedback()
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

  const isLoading = erp.isLoading()
  const allWarehouses = withOperatingWarehouses(erp.getWarehouses())
  const warehouseRecords = isInventoryAdminOnly
    ? allWarehouses.filter(w => resolvedWarehouseIds.includes(w.id) || resolvedWarehouseIds.includes(w.code))
    : allWarehouses
  const isWH1 = (w: string) => w === "WH1" || w === "WH1-AGRI-EXP"

  const [activeTab, setActiveTab] = useState<"Register" | "Store Transfer">("Register")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL")
  
  // Expanded rows for WH1 items
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set())

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
  const [addEntryDate, setAddEntryDate] = useState("")
  const [addLeaveDate, setAddLeaveDate] = useState("")
  const [addQuantity, setAddQuantity] = useState("")
  const [addNotes, setAddNotes] = useState("")
  const [isSavingAdd, setIsSavingAdd] = useState(false)

  // Autocomplete state for WH1 existing items lookup
  const [showItemSuggestions, setShowItemSuggestions] = useState(false)
  const [selectedExistingProduct, setSelectedExistingProduct] = useState<Product | null>(null)

  // Direct Slim Add Entry Modal
  const [slimAddEntryProduct, setSlimAddEntryProduct] = useState<Product | null>(null)
  
  // Edit WH1 sub-entry modal state
  const [editingSubEntry, setEditingSubEntry] = useState<{ product: Product; entry: WH1Entry } | null>(null)
  const [editSubEntryQty, setEditSubEntryQty] = useState("")
  const [editSubEntryPrice, setEditSubEntryPrice] = useState("")
  const [editSubEntryDate, setEditSubEntryDate] = useState("")
  const [editSubEntryLeave, setEditSubEntryLeave] = useState("")
  const [editSubEntryNotes, setEditSubEntryNotes] = useState("")
  const [isSavingSubEdit, setIsSavingSubEdit] = useState(false)

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
    entryDate: "",
    leaveDate: "",
    unit: "",
    unitCost: "",
    sellingPrice: "",
    price: "",
    reorderLevel: "",
    approvalStatus: "Approved",
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const isWH1Form = isWH1(addWarehouse)

  // Quantities & Stock values
  const addTotalQuantity = isWH1Form
    ? (addPackagingUnit === "Ton" ? Number(addQuantity || 0) * TON_TO_QUINTAL : Number(addQuantity || 0))
    : Number(addQtyPerPack || 0) * Number(addNumCartons || 0)
  
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
  
  const addDateInvalid = isWH1Form
    ? Boolean(addEntryDate && addLeaveDate && daysBetween(addEntryDate, addLeaveDate) !== null && (daysBetween(addEntryDate, addLeaveDate) ?? 0) <= 0)
    : Boolean(addShelfLifeDays !== null && addShelfLifeDays <= 0)

  const addNormalizedBatch = addBatchNumber.trim().toLowerCase()
  const addDuplicateBatch = !isWH1Form && Boolean(addNormalizedBatch) && products.some((product) => {
    const batches = [product.batch, ...product.batches.map((batch) => batch.batchNo)]
    return batches.some((batch) => String(batch || "").trim().toLowerCase() === addNormalizedBatch)
  })

  const canSaveAdd = isWH1Form
    ? Boolean(
        addDescription &&
        addPackagingUnit &&
        addWarehouse &&
        addEntryDate &&
        Number(addQuantity) > 0 &&
        !addDateInvalid
      )
    : Boolean(
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
    setAddEntryDate("")
    setAddLeaveDate("")
    setAddQuantity("")
    setAddNotes("")
    setSelectedExistingProduct(null)
  }

  // Filtered warehouses mapping
  const warehouseOptions = useMemo(() => [
    { value: "ALL", label: "All Warehouses" },
    ...warehouseRecords.map((warehouse) => ({
      value: warehouse.code || warehouse.id,
      label: warehouse.name || warehouse.code || warehouse.id,
    })),
  ], [warehouseRecords])

  const warehouseKeyMap = useMemo(() => new Map(warehouseRecords.map((warehouse) => [warehouse.code || warehouse.id, new Set([warehouse.id, warehouse.code, warehouse.name].filter(Boolean))])), [warehouseRecords])

  // Filters for Table
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
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
  }, [products, searchQuery, selectedWarehouse, warehouseKeyMap])



  // Suggested matching existing items list for WH1 auto-complete lookup
  const wh1ItemSuggestions = useMemo(() => {
    if (!addDescription || addDescription.length < 2) return []
    return products.filter(p => isWH1(p.warehouse) && p.name.toLowerCase().includes(addDescription.toLowerCase()))
  }, [products, addDescription])

  // Table Column Definitions
  const currentProductColumns = useMemo(() => {
    const cols: TableColumn[] = [
      { key: "sku", label: "ID", align: "left" },
      { key: "name", label: "Item", align: "left" },
    ]

    if (isWH1(selectedWarehouse)) {
      cols.push(
        { key: "unit", label: "UOM", align: "left" },
        { key: "entryDate", label: "Entry Date", align: "left" },
        { key: "leaveDate", label: "Leave Date", align: "left" },
        { key: "quantity", label: "Total Quantity", align: "right" },
        { key: "totalStockValue", label: "Stock Value", align: "right" }
      )
    } else {
      cols.push(
        { key: "batch", label: "Batch", align: "left" },
        { key: "manufacturingDate", label: "MFG", align: "left" },
        { key: "expiryDate", label: "EXP", align: "left" },
        { key: "unit", label: "Packaging Unit", align: "left" },
        { key: "numberOfCartons", label: "Cartons", align: "right" },
        { key: "quantityPerPack", label: "Quantity/Pack", align: "right" },
        { key: "quantity", label: "Total Quantity", align: "right" },
        { key: "unitCost", label: "Unit Price", align: "right" },
        { key: "totalStockValue", label: "Stock Value", align: "right" }
      )
    }

    cols.push({ key: "_actions", label: "Action", align: "center", noSort: true })
    return cols
  }, [selectedWarehouse])

  const productsTable = useResizableTable(currentProductColumns, filteredProducts, {
    sku: 110,
    name: 200,
    batch: 100,
    manufacturingDate: 100,
    expiryDate: 100,
    unit: 120,
    numberOfCartons: 80,
    quantityPerPack: 90,
    quantity: 110,
    unitCost: 110,
    totalStockValue: 120,
    entryDate: 110,
    leaveDate: 110,
    _actions: 100,
  })

  // Chevron expand / collapse toggle
  const toggleRowExpand = (productId: string) => {
    const next = new Set(expandedProductIds)
    if (next.has(productId)) {
      next.delete(productId)
    } else {
      next.add(productId)
    }
    setExpandedProductIds(next)
  }

  // Handle Save product form
  const handleSaveNewStockItem = async (addAnother = false) => {
    if (!canSaveAdd) {
      showToast("Cannot save item", "warning", "Complete required stock fields and resolve warnings.")
      return
    }

    setIsSavingAdd(true)
    try {
      const now = new Date().toISOString()
      const selectedWarehouseRecord = warehouseRecords.find((item) => (item.code || item.id) === addWarehouse || item.id === addWarehouse)
      
      const targetUOM = isWH1Form ? "Quintal" : addPackagingUnit

      if (selectedExistingProduct) {
        // Option A: Add sub-entry to existing item
        const newEntryPayload: Omit<WH1Entry, "entryId"> = {
          entryDate: addEntryDate,
          leaveDate: addLeaveDate || undefined,
          quantityReceived: addTotalQuantity,
          quantityRemaining: addTotalQuantity,
          unitPrice: Number(addUnitPrice || 0),
          notes: addNotes.trim() || undefined,
        }
        await erp.addWH1Entry(selectedExistingProduct.id, newEntryPayload)
        showToast("Stock entry added", "success", `Entry added to existing item ${selectedExistingProduct.name}.`)
      } else {
        // Option B: Add new item entirely
        const productId = `P-${Date.now()}`
        const initialWH1Entries: WH1Entry[] = isWH1Form ? [{
          entryId: `WH1E-${Date.now()}`,
          entryDate: addEntryDate,
          leaveDate: addLeaveDate || undefined,
          quantityReceived: addTotalQuantity,
          quantityRemaining: addTotalQuantity,
          unitPrice: Number(addUnitPrice || 0),
          notes: addNotes.trim() || undefined,
        }] : []

        const product: Product = {
          id: productId,
          name: addDescription,
          sku: `${addDescription.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "STK")}-${isWH1Form ? "WH1" : addBatchNumber}`,
          category: "",
          itemType: "",
          description: addDescription,
          warehouse: addWarehouse,
          warehouseName: selectedWarehouseRecord?.name,
          quantity: addTotalQuantity,
          quantityPerPack: isWH1Form ? undefined : Number(addQtyPerPack),
          numberOfCartons: isWH1Form ? undefined : Number(addNumCartons),
          totalQuantity: addTotalQuantity,
          quantitySold: 0,
          openingBalance: addTotalQuantity,
          unit: targetUOM,
          unitCost: Number(addUnitPrice || 0),
          sellingPrice: Number(addUnitPrice || 0),
          totalStockValue: addTotalStockValue,
          batch: isWH1Form ? "" : addBatchNumber,
          manufacturingDate: isWH1Form ? undefined : addMfgDate,
          expiry: isWH1Form ? "" : addExpDate,
          shelfLifeMonths: isWH1Form ? undefined : addShelfLifeMonths,
          entryDate: isWH1Form ? addEntryDate : undefined,
          leaveDate: (isWH1Form && addLeaveDate) ? addLeaveDate : undefined,
          status: addTotalQuantity > 0 ? "In Stock" : "Out of Stock",
          stockBreakdown: [{ warehouse: addWarehouse, qty: addTotalQuantity }],
          batches: isWH1Form ? [] : [{ batchNo: addBatchNumber, qty: addTotalQuantity, expiry: addExpDate, status: "Released" }],
          wh1Entries: isWH1Form ? initialWH1Entries : undefined,
          origin: "",
          supplierName: "",
          itemRegistrationStatus: "Active",
          approvalStatus: "Approved",
          createdDate: now,
          createdAt: now,
          updatedAt: now,
        }

        await erp.addProduct(product)
        showToast("Stock item saved", "success", `${addDescription} was saved to inventory.`)
      }

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

  // Handle saving direct slim sub-entry modal
  const handleSaveSlimEntry = async () => {
    if (!slimAddEntryProduct || !addEntryDate || !addQuantity || Number(addQuantity) <= 0) {
      showToast("Validation failed", "warning", "Provide a valid quantity and entry date.")
      return
    }
    setIsSavingAdd(true)
    try {
      const finalQty = addPackagingUnit === "Ton" ? Number(addQuantity) * TON_TO_QUINTAL : Number(addQuantity)
      const newEntryPayload: Omit<WH1Entry, "entryId"> = {
        entryDate: addEntryDate,
        leaveDate: addLeaveDate || undefined,
        quantityReceived: finalQty,
        quantityRemaining: finalQty,
        unitPrice: Number(addUnitPrice || 0),
        notes: addNotes.trim() || undefined,
      }
      await erp.addWH1Entry(slimAddEntryProduct.id, newEntryPayload)
      showToast("Stock entry added", "success", `New entry added for ${slimAddEntryProduct.name}.`)
      setSlimAddEntryProduct(null)
      resetAddForm()
    } catch (error) {
      showToast("Save failed", "warning", error instanceof Error ? error.message : "Failed to add entry.")
    } finally {
      setIsSavingAdd(false)
    }
  }

  // Handle Edit/Delete Sub Entry
  const openEditSubEntry = (product: Product, entry: WH1Entry) => {
    setEditingSubEntry({ product, entry })
    setEditSubEntryQty(String(entry.quantityReceived))
    setEditSubEntryPrice(String(entry.unitPrice))
    setEditSubEntryDate(entry.entryDate)
    setEditSubEntryLeave(entry.leaveDate || "")
    setEditSubEntryNotes(entry.notes || "")
  }

  const handleSaveSubEntryEdit = async () => {
    if (!editingSubEntry || !editSubEntryQty || !editSubEntryDate) return
    setIsSavingSubEdit(true)
    try {
      const nextQty = Number(editSubEntryQty)
      const originalRemaining = editingSubEntry.entry.quantityRemaining
      const difference = editingSubEntry.entry.quantityReceived - nextQty
      const nextRemaining = Math.max(0, originalRemaining - difference)

      await erp.updateWH1Entry(editingSubEntry.product.id, editingSubEntry.entry.entryId, {
        entryDate: editSubEntryDate,
        leaveDate: editSubEntryLeave || undefined,
        quantityReceived: nextQty,
        quantityRemaining: nextRemaining,
        unitPrice: Number(editSubEntryPrice || 0),
        notes: editSubEntryNotes.trim() || undefined,
      })
      showToast("Entry updated", "success", "Sub-entry values saved.")
      setEditingSubEntry(null)
    } catch (e) {
      showToast("Update failed", "warning", e instanceof Error ? e.message : "Failed to save edit.")
    } finally {
      setIsSavingSubEdit(false)
    }
  }

  const handleDeleteSubEntry = async (product: Product, entryId: string) => {
    if (confirm("Are you sure you want to delete this sub-entry? This will decrease the overall product stock.")) {
      try {
        await erp.deleteWH1Entry(product.id, entryId)
        showToast("Entry deleted", "info", "Sub-entry was removed from inventory.")
      } catch (e) {
        showToast("Delete failed", "warning", e instanceof Error ? e.message : "Failed to delete entry.")
      }
    }
  }

  // Normal product edit dialog
  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name,
      sku: product.sku,
      category: product.category || "",
      warehouse: product.warehouse,
      batch: product.batch || "",
      expiry: product.expiry || "",
      entryDate: product.entryDate || "",
      leaveDate: product.leaveDate || "",
      unit: product.unit,
      unitCost: String(product.unitCost || 0),
      sellingPrice: String(product.sellingPrice || 0),
      price: isWH1(product.warehouse) ? String(product.unitCost || 0) : "",
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
    const expiry = isWH1(warehouse) ? "" : editForm.expiry
    const entryDate = isWH1(warehouse) ? editForm.entryDate : undefined
    const leaveDate = (isWH1(warehouse) && editForm.leaveDate) ? editForm.leaveDate : undefined
    const unit = editForm.unit.trim()
    
    const priceVal = isWH1(warehouse) ? Number(editForm.price || 0) : Number(editForm.unitCost || 0)
    const unitCost = priceVal
    const sellingPrice = isWH1(warehouse) ? priceVal : Number(editForm.sellingPrice || 0)
    const reorderLevel = editForm.reorderLevel === "" ? undefined : Number(editForm.reorderLevel)

    if (isWH1(warehouse)) {
      if (!name || !sku || !warehouse || !entryDate || !unit) {
        showToast("Cannot save stock details", "warning", "Complete item name, ID (SKU), warehouse, entry date, and UOM.")
        return
      }
      const datesInvalid = Boolean(
        entryDate &&
        leaveDate &&
        daysBetween(entryDate, leaveDate) !== null &&
        (daysBetween(entryDate, leaveDate) ?? 0) <= 0
      )
      if (datesInvalid) {
        showToast("Cannot save stock details", "warning", "Leave date must be after entry date.")
        return
      }
    } else {
      if (!name || !sku || !batch || !warehouse || !expiry || !unit || !Number.isFinite(unitCost) || !Number.isFinite(sellingPrice)) {
        showToast("Cannot save stock details", "warning", "Complete item name, SKU, batch, warehouse, expiry, unit, cost, and selling price.")
        return
      }
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
        entryDate,
        leaveDate,
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
      <FloatingNav brand="HKC Trading" sections={navSections} />

      <motion.div 
        variants={stagger} 
        initial="hidden" 
        animate="visible" 
        className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12"
      >
        {/* Header Section */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Stock</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Manage product inventory, warehouse records, and stock entries across standard and agricultural warehouses.
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
            { id: "Store Transfer", label: "Store Transfer" },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
                    title="Stock List"
                    subtitle={`Total: ${productsTable.sorted().length} products matches filters`}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search product name, SKU..."
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
                    <thead className="relative z-20">
                      <tr className="bg-black/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                        {currentProductColumns.map((col: TableColumn) => (
                          <ResizableTh
                            key={col.key}
                            col={col}
                            width={productsTable.colWidths[col.key] || 110}
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
                        <ProductTableSkeletonRows colSpan={currentProductColumns.length} />
                      ) : productsTable.sorted().length === 0 ? (
                        <tr>
                          <td colSpan={currentProductColumns.length} className="text-center py-16 text-zinc-400 text-xs font-semibold">
                            No stock records found matching filters.
                          </td>
                        </tr>
                      ) : (
                        productsTable.sorted().map((prod) => {
                          const isWH1Item = isWH1(prod.warehouse)
                          const isExpanded = expandedProductIds.has(prod.id)

                          // Render Parent Row for WH1 items
                          if (isWH1Item && isWH1(selectedWarehouse)) {
                            const entries = prod.wh1Entries || []
                            const totalReceived = entries.reduce((sum, e) => sum + e.quantityReceived, 0)
                            const entryDates = entries.map(e => new Date(e.entryDate).getTime()).filter(t => !Number.isNaN(t))
                            const earliestDate = entryDates.length ? new Date(Math.min(...entryDates)).toISOString().slice(0, 10) : prod.entryDate || "-"
                            const latestDate = entryDates.length ? new Date(Math.max(...entryDates)).toISOString().slice(0, 10) : prod.entryDate || "-"
                            
                            const leaveDates = entries.map(e => e.leaveDate ? new Date(e.leaveDate).getTime() : 0).filter(t => t > 0)
                            const latestLeave = leaveDates.length ? new Date(Math.max(...leaveDates)).toISOString().slice(0, 10) : prod.leaveDate || "-"

                            return (
                              <Fragment key={prod.id}>
                                <tr className="hover:bg-white/45 cursor-pointer transition-colors font-semibold text-xs border-b border-zinc-100">
                                  {/* ID / SKU */}
                                  <td className="py-4 px-6 overflow-hidden">
                                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 font-bold uppercase">
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleRowExpand(prod.id) }} 
                                        className="p-1 hover:bg-zinc-100 rounded-md"
                                      >
                                        {isExpanded ? <ChevronDown className="size-3 text-zinc-800" /> : <ChevronRight className="size-3 text-zinc-400" />}
                                      </button>
                                      <span className="truncate">{prod.sku}</span>
                                    </div>
                                  </td>
                                  
                                  {/* Item */}
                                  <td className="py-4 px-4 overflow-hidden font-black text-zinc-950">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate">{prod.name}</span>
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[9px] font-black text-emerald-800 border border-emerald-100">
                                        {entries.length} {entries.length === 1 ? "entry" : "entries"}
                                      </span>
                                    </div>
                                  </td>

                                  {/* UOM */}
                                  <td className="py-4 px-4 font-bold text-zinc-500 uppercase">{prod.unit}</td>

                                  {/* Entry date */}
                                  <td className="py-4 px-4 font-mono text-[11px] text-zinc-700">
                                    {earliestDate === latestDate ? earliestDate : `${earliestDate} to ${latestDate}`}
                                  </td>

                                  {/* Leave date */}
                                  <td className="py-4 px-4 font-mono text-[11px] text-zinc-700">{latestLeave}</td>

                                  {/* Total quantity */}
                                  <td className="py-4 px-4 text-right font-mono font-black text-zinc-900">
                                    <div>{prod.quantity.toLocaleString()}</div>
                                    <div className="text-[9px] text-zinc-400 font-bold">of {totalReceived.toLocaleString()} received</div>
                                  </td>

                                  {/* Stock Value */}
                                  <td className="py-4 px-4 text-right font-mono font-black text-zinc-900">
                                    <div>ETB {money(prod.totalStockValue || 0)}</div>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-4 px-6 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setSlimAddEntryProduct(prod)}
                                        className="px-2.5 py-1.5 rounded-full bg-zinc-950 text-white font-extrabold text-[10px] inline-flex items-center gap-1 hover:bg-zinc-800 transition-all active:scale-95 shadow-xs"
                                      >
                                        <PlusCircle className="size-3" /> Add
                                      </button>
                                      <button
                                        onClick={() => openEditProduct(prod)}
                                        className="px-2.5 py-1.5 rounded-full border border-zinc-200 bg-white text-zinc-800 font-extrabold text-[10px] inline-flex items-center gap-1 hover:bg-zinc-50 transition-all active:scale-95 shadow-xs"
                                      >
                                        <Edit3 className="size-3 text-zinc-500" /> Edit
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr className="bg-zinc-50/60">
                                    <td colSpan={currentProductColumns.length} className="px-6 py-3">
                                      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
                                        {entries.length === 0 ? (
                                          <div className="text-zinc-400 text-xs py-3 px-4 text-center font-medium">No active sub-entries.</div>
                                        ) : (
                                          <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs font-semibold">
                                              <thead>
                                                <tr className="bg-zinc-50/90 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                                                  <th className="py-2.5 px-4">Entry ID</th>
                                                  <th className="py-2.5 px-4">Entry Date</th>
                                                  <th className="py-2.5 px-4">Leave Date</th>
                                                  <th className="py-2.5 px-4 text-right">Qty Received</th>
                                                  <th className="py-2.5 px-4 text-right">Qty Remaining</th>
                                                  <th className="py-2.5 px-4 text-right">Unit Price</th>
                                                  <th className="py-2.5 px-4 text-center">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-zinc-150">
                                                {entries.map((entry) => (
                                                  <tr key={entry.entryId} className="hover:bg-zinc-50 transition-colors">
                                                    <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-600 font-bold">{entry.entryId}</td>
                                                    <td className="py-2.5 px-4 font-mono text-zinc-800">{entry.entryDate || prod.entryDate || "—"}</td>
                                                    <td className="py-2.5 px-4 font-mono text-zinc-500">{entry.leaveDate || "—"}</td>
                                                    <td className="py-2.5 px-4 text-right font-mono text-zinc-700">{entry.quantityReceived.toLocaleString()}</td>
                                                    <td className="py-2.5 px-4 text-right font-mono text-zinc-950 font-black">{entry.quantityRemaining.toLocaleString()}</td>
                                                    <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-bold">ETB {money(entry.unitPrice)}</td>
                                                    <td className="py-2.5 px-4 text-center">
                                                      <button
                                                        type="button"
                                                        onClick={() => openEditSubEntry(prod, entry)}
                                                        className="px-2.5 py-1 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 text-[10px] font-extrabold inline-flex items-center gap-1 transition-all shadow-xs"
                                                        title="Edit sub-entry details"
                                                      >
                                                        <Edit3 className="size-3 text-zinc-500" /> Edit
                                                      </button>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            )
                          }

                          // Standard Warehouse rendering (flat row)
                          return (
                            <tr
                              key={prod.id}
                              onClick={() => openEditProduct(prod)}
                              className="hover:bg-white/45 cursor-pointer transition-colors text-xs border-b border-zinc-100"
                            >
                              {/* SKU */}
                              <td className="py-4 px-6 font-mono text-[10px] text-zinc-400 font-bold uppercase truncate">
                                {prod.sku}
                              </td>

                              {/* Item name */}
                              <td className="py-4 px-4 font-black text-zinc-950 leading-tight">
                                {prod.name}
                              </td>

                              {/* Standard flat table columns */}
                              {!isWH1(selectedWarehouse) && (
                                <>
                                  <td className="py-4 px-4 font-mono font-bold text-zinc-700 truncate">{prod.batch || "—"}</td>
                                  <td className="py-4 px-4 font-mono text-zinc-600">{displayDate(prod.manufacturingDate)}</td>
                                  <td className="py-4 px-4 font-mono text-zinc-600">{displayDate(prod.expiry)}</td>
                                  <td className="py-4 px-4 text-zinc-600">{prod.unit}</td>
                                  <td className="py-4 px-4 text-right font-mono font-bold text-zinc-700">{prod.numberOfCartons?.toLocaleString() || "—"}</td>
                                  <td className="py-4 px-4 text-right font-mono font-bold text-zinc-700">{prod.quantityPerPack?.toLocaleString() || "—"}</td>
                                </>
                              )}

                              {/* Quantity */}
                              <td className="py-4 px-4 text-right font-mono font-black text-zinc-900">
                                {prod.quantity.toLocaleString()} <span className="text-[10px] text-zinc-400 uppercase font-bold">{prod.unit}</span>
                              </td>

                              {/* Unit Price (Standard) */}
                              {!isWH1(selectedWarehouse) && (
                                <td className="py-4 px-4 text-right font-mono font-bold text-zinc-700">
                                  ETB {money(prod.sellingPrice || prod.unitCost || 0)}
                                </td>
                              )}

                              {/* Total stock value */}
                              <td className="py-4 px-4 text-right font-mono font-black text-zinc-900">
                                ETB {money(prod.totalStockValue || 0)}
                              </td>

                              {/* Action */}
                              <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => openEditProduct(prod)}
                                  className="px-3.5 py-1.5 rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-extrabold text-[11px] border border-zinc-200/80 active:scale-95 shadow-xs inline-flex items-center gap-1"
                                >
                                  <Edit3 className="size-3 text-zinc-500" /> Edit
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

          {activeTab === "Store Transfer" && (
            <motion.div
              key="store-transfers-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <StoreTransfersTab />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* MODAL: EDIT PRODUCT DETAILS */}
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
              className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl z-[121]"
            >
              <EditModalHeader
                title={`Edit Stock Details: ${editingProduct.name}`}
                subtitle={`SKU: ${editingProduct.sku}`}
                onClose={() => setEditingProduct(null)}
                onRequestDelete={() => setDeletingProduct(editingProduct)}
                deleteLabel="Delete Stock Product"
              />

              <div className="grid gap-4 md:grid-cols-2 mt-4 text-xs font-semibold">
                <label className="space-y-1">
                  <span className="block text-[11px] font-black uppercase text-zinc-500">Item Name</span>
                  <input value={editForm.name} onChange={(e) => updateEditForm({ name: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs" />
                </label>
                <label className="space-y-1">
                  <span className="block text-[11px] font-black uppercase text-zinc-500">SKU</span>
                  <input value={editForm.sku} onChange={(e) => updateEditForm({ sku: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono" />
                </label>
                <label className="space-y-1">
                  <span className="block text-[11px] font-black uppercase text-zinc-500">Warehouse</span>
                  <select value={editForm.warehouse} onChange={(e) => updateEditForm({ warehouse: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs">
                    {warehouseOptions.filter(w => w.value !== "ALL").map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </label>
                
                {!isWH1(editForm.warehouse) && (
                  <label className="space-y-1">
                    <span className="block text-[11px] font-black uppercase text-zinc-500">Batch Number</span>
                    <input value={editForm.batch} onChange={(e) => updateEditForm({ batch: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono" />
                  </label>
                )}

                {isWH1(editForm.warehouse) ? (
                  <>
                    <label className="space-y-1">
                      <span className="block text-[11px] font-black uppercase text-zinc-500">Entry Date</span>
                      <input type="date" value={editForm.entryDate} onChange={(e) => updateEditForm({ entryDate: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs" />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[11px] font-black uppercase text-zinc-500">Leave Date <span className="text-[10px] text-zinc-400 font-semibold lowercase">(optional)</span></span>
                      <input type="date" value={editForm.leaveDate} onChange={(e) => updateEditForm({ leaveDate: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs" />
                    </label>
                  </>
                ) : (
                  <label className="space-y-1">
                    <span className="block text-[11px] font-black uppercase text-zinc-500">Expiry Date</span>
                    <input type="date" value={editForm.expiry} onChange={(e) => updateEditForm({ expiry: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs" />
                  </label>
                )}
                
                <label className="space-y-1">
                  <span className="block text-[11px] font-black uppercase text-zinc-500">{isWH1(editForm.warehouse) ? "UOM" : "Unit"}</span>
                  <select 
                    value={editForm.unit} 
                    onChange={(e) => updateEditForm({ unit: e.target.value })} 
                    className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {isWH1(editForm.warehouse) ? (
                      <>
                        <option value="Quintal">Quintal</option>
                        <option value="Ton">Ton</option>
                      </>
                    ) : (
                      <>
                        <option value="Box">Box</option>
                        <option value="Bottle">Bottle</option>
                        <option value="Vial">Vial</option>
                      </>
                    )}
                  </select>
                </label>

                {!isWH1(editForm.warehouse) && (
                  <>
                    <label className="space-y-1">
                      <span className="block text-[11px] font-black uppercase text-zinc-500">Cost Price</span>
                      <input type="number" min="0" value={editForm.unitCost} onChange={(e) => updateEditForm({ unitCost: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs" />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[11px] font-black uppercase text-zinc-500">Selling Price</span>
                      <input type="number" min="0" value={editForm.sellingPrice} onChange={(e) => updateEditForm({ sellingPrice: e.target.value })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs" />
                    </label>
                  </>
                )}
                
                <label className="space-y-1">
                  <span className="block text-[11px] font-black uppercase text-zinc-500">Compliance Status</span>
                  <select value={editForm.approvalStatus || "Approved"} onChange={(e) => updateEditForm({ approvalStatus: e.target.value as Product["approvalStatus"] })} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs">
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

      {/* MODAL: ADD NEW STOCK ITEM / ENTRY */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200"
            >
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-200">
                <div>
                  <h3 className="text-xl font-black text-zinc-900">
                    {selectedExistingProduct ? `Add Entry to Existing Item: ${selectedExistingProduct.name}` : "Add Stock Item"}
                  </h3>
                  <p className="text-xs text-zinc-500">Register new product inventory into warehouse stock.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); resetAddForm() }}
                  className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid gap-4 md:grid-cols-2 font-semibold">
                  <div className="space-y-1 md:col-span-2 relative">
                    <span className="text-[11px] font-black uppercase text-zinc-700">
                      Item Name / Description of Goods <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Sesame Seed (White)"
                      value={addDescription}
                      disabled={!!selectedExistingProduct}
                      onChange={(e) => {
                        setAddDescription(e.target.value)
                        setShowItemSuggestions(true)
                      }}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500"
                    />

                    {/* Auto-complete Suggestions Dropdown */}
                    {showItemSuggestions && isWH1Form && wh1ItemSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-zinc-150 bg-white p-2 shadow-xl">
                        {wh1ItemSuggestions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedExistingProduct(p)
                              setAddDescription(p.name)
                              setAddPackagingUnit(p.unit)
                              setShowItemSuggestions(false)
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-50 flex items-center justify-between text-xs font-bold"
                          >
                            <span className="text-zinc-900">{p.name}</span>
                            <span className="text-[10px] text-zinc-400">{p.quantity} Q left</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700">Primary Warehouse <span className="text-rose-600">*</span></span>
                    <select
                      value={addWarehouse}
                      disabled={!!selectedExistingProduct}
                      onChange={(e) => {
                        setAddWarehouse(e.target.value)
                        setAddPackagingUnit("")
                        setAddQuantity("")
                      }}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">Select warehouse</option>
                      {warehouseRecords.map((item) => (
                        <option key={item.id} value={item.code || item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700">
                      {isWH1Form ? "UOM" : "Packaging Unit"} <span className="text-rose-600">*</span>
                    </span>
                    <select
                      value={addPackagingUnit}
                      disabled={!!selectedExistingProduct}
                      onChange={(e) => setAddPackagingUnit(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">{isWH1Form ? "Select UOM" : "Select packaging unit"}</option>
                      {isWH1Form ? (
                        <>
                          <option value="Quintal">Quintal</option>
                          <option value="Ton">Ton</option>
                        </>
                      ) : (
                        packagingUnits.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))
                      )}
                    </select>
                  </label>

                  {!isWH1Form && (
                    <label className="space-y-1">
                      <span className="text-[11px] font-black uppercase text-zinc-700">Batch Number <span className="text-rose-600">*</span></span>
                      <input
                        type="text"
                        placeholder="BATCH-001"
                        value={addBatchNumber}
                        onChange={(e) => setAddBatchNumber(e.target.value)}
                        className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono"
                      />
                    </label>
                  )}

                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700">Price per unit (ETB)</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={addUnitPrice}
                      onChange={(e) => setAddUnitPrice(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono"
                    />
                  </label>

                  {isWH1Form ? (
                    <>
                      <label className="space-y-1">
                        <span className="text-[11px] font-black uppercase text-zinc-700">Entry Date <span className="text-rose-600">*</span></span>
                        <input
                          type="date"
                          value={addEntryDate}
                          onChange={(e) => setAddEntryDate(e.target.value)}
                          className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-black uppercase text-zinc-700">Leave Date <span className="text-[10px] text-zinc-400 lowercase">(optional)</span></span>
                        <input
                          type="date"
                          value={addLeaveDate}
                          onChange={(e) => setAddLeaveDate(e.target.value)}
                          className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-black uppercase text-zinc-700">Quantity <span className="text-rose-600">*</span></span>
                        <input
                          type="number"
                          placeholder="e.g. 50"
                          value={addQuantity}
                          onChange={(e) => setAddQuantity(e.target.value)}
                          className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-black uppercase text-zinc-700">Notes <span className="text-[10px] text-zinc-400 lowercase">(optional)</span></span>
                        <input
                          type="text"
                          placeholder="e.g. Received from exporter"
                          value={addNotes}
                          onChange={(e) => setAddNotes(e.target.value)}
                          className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs"
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="space-y-1">
                        <span className="text-[11px] font-black uppercase text-zinc-700">Manufacturing Date <span className="text-rose-600">*</span></span>
                        <input type="date" value={addMfgDate} onChange={(e) => setAddMfgDate(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-black uppercase text-zinc-700">Expiry Date <span className="text-rose-600">*</span></span>
                        <input type="date" value={addExpDate} onChange={(e) => setAddExpDate(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-black uppercase text-zinc-700">Quantity Per Pack <span className="text-rose-600">*</span></span>
                        <input type="number" placeholder="100" value={addQtyPerPack} onChange={(e) => setAddQtyPerPack(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-black uppercase text-zinc-700">Number of Cartons <span className="text-rose-600">*</span></span>
                        <input type="number" placeholder="50" value={addNumCartons} onChange={(e) => setAddNumCartons(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono" />
                      </label>
                    </>
                  )}
                </div>

                {isWH1Form && addPackagingUnit === "Ton" && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 text-[11px] font-bold">
                    Note: 1 Ton = 10 Quintals. Entering {addQuantity || 0} Tons will save as {(Number(addQuantity || 0) * TON_TO_QUINTAL).toLocaleString()} Quintals in the database.
                  </p>
                )}

                {addDateInvalid && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 font-bold">
                    {isWH1Form ? "Leave date must be after entry date." : "Expiry date must be after manufacturing date."}
                  </p>
                )}

                {addDuplicateBatch && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-3 font-bold">
                    Batch number already exists.
                  </p>
                )}

                <div className="flex justify-between items-center border-t border-zinc-200 pt-4 mt-6">
                  {selectedExistingProduct && (
                    <button 
                      type="button" 
                      onClick={() => setSelectedExistingProduct(null)} 
                      className="text-xs font-black text-emerald-700 hover:underline"
                    >
                      ← Create new item instead
                    </button>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => { setIsAddModalOpen(false); resetAddForm() }}
                      className="h-10 rounded-full border border-zinc-200 px-4 font-bold text-zinc-600 hover:bg-zinc-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!canSaveAdd || isSavingAdd}
                      onClick={() => void handleSaveNewStockItem(true)}
                      className="h-10 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 font-bold disabled:opacity-40"
                    >
                      Save & Add Another
                    </button>
                    <button
                      type="button"
                      disabled={!canSaveAdd || isSavingAdd}
                      onClick={() => void handleSaveNewStockItem(false)}
                      className="h-10 rounded-full bg-zinc-950 text-white font-bold px-5 disabled:opacity-40"
                    >
                      {isSavingAdd ? "Saving..." : "Save Item"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SLIM ADD ENTRY MODAL */}
      <AnimatePresence>
        {slimAddEntryProduct && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-zinc-200"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-150">
                <div>
                  <h3 className="font-black text-zinc-900 text-base">Add New Entry to {slimAddEntryProduct.name}</h3>
                  <p className="text-xs text-zinc-500">Record a new daily batch receipt into stock.</p>
                </div>
                <button onClick={() => setSlimAddEntryProduct(null)} className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400"><X className="size-5" /></button>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 block">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">UOM</span>
                    <select 
                      value={addPackagingUnit} 
                      onChange={(e) => setAddPackagingUnit(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3"
                    >
                      <option value="Quintal">Quintal</option>
                      <option value="Ton">Ton</option>
                    </select>
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">Quantity</span>
                    <input 
                      type="number" 
                      placeholder="Quantity" 
                      value={addQuantity} 
                      onChange={(e) => setAddQuantity(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3 font-mono"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">Unit Price (ETB)</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={addUnitPrice} 
                      onChange={(e) => setAddUnitPrice(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3 font-mono"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">Entry Date</span>
                    <input 
                      type="date" 
                      value={addEntryDate} 
                      onChange={(e) => setAddEntryDate(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3 font-mono"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">Leave Date (Optional)</span>
                    <input 
                      type="date" 
                      value={addLeaveDate} 
                      onChange={(e) => setAddLeaveDate(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3 font-mono"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">Notes (Optional)</span>
                    <input 
                      type="text" 
                      placeholder="Notes" 
                      value={addNotes} 
                      onChange={(e) => setAddNotes(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3"
                    />
                  </label>
                </div>

                {addPackagingUnit === "Ton" && (
                  <p className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
                    Converts automatically: {addQuantity || 0} Tons = {(Number(addQuantity || 0) * TON_TO_QUINTAL).toLocaleString()} Quintals.
                  </p>
                )}

                <div className="flex justify-end gap-2 border-t border-zinc-150 pt-4 mt-6">
                  <button onClick={() => setSlimAddEntryProduct(null)} className="h-9 rounded-xl border border-zinc-200 px-4 text-xs font-bold">Cancel</button>
                  <button disabled={isSavingAdd} onClick={handleSaveSlimEntry} className="h-9 rounded-xl bg-zinc-950 text-white px-5 text-xs font-bold shadow-md">
                    {isSavingAdd ? "Saving..." : "Add Entry"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT WH1 SUB ENTRY MODAL */}
      <AnimatePresence>
        {editingSubEntry && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-zinc-200"
            >
              <EditModalHeader
                title={`Edit Entry: ${editingSubEntry.entry.entryId}`}
                subtitle={`Product: ${editingSubEntry.product.name}`}
                onClose={() => setEditingSubEntry(null)}
                onRequestDelete={() => {
                  handleDeleteSubEntry(editingSubEntry.product, editingSubEntry.entry.entryId)
                  setEditingSubEntry(null)
                }}
                deleteLabel="Delete This Entry"
              />

              <div className="space-y-4 text-xs font-semibold">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 block">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">Quantity (Received)</span>
                    <input 
                      type="number" 
                      value={editSubEntryQty} 
                      onChange={(e) => setEditSubEntryQty(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3 font-mono"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">Unit Price (ETB)</span>
                    <input 
                      type="number" 
                      value={editSubEntryPrice} 
                      onChange={(e) => setEditSubEntryPrice(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3 font-mono"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">Entry Date</span>
                    <input 
                      type="date" 
                      value={editSubEntryDate} 
                      onChange={(e) => setEditSubEntryDate(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3 font-mono"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">Leave Date (Optional)</span>
                    <input 
                      type="date" 
                      value={editSubEntryLeave} 
                      onChange={(e) => setEditSubEntryLeave(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3 font-mono"
                    />
                  </label>

                  <label className="space-y-1 block md:col-span-2">
                    <span className="text-zinc-500 uppercase text-[10px] font-black">Notes (Optional)</span>
                    <input 
                      type="text" 
                      value={editSubEntryNotes} 
                      onChange={(e) => setEditSubEntryNotes(e.target.value)} 
                      className="h-10 w-full border border-zinc-200 rounded-xl px-3"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-150 pt-4 mt-6">
                  <button onClick={() => setEditingSubEntry(null)} className="h-9 rounded-xl border border-zinc-200 px-4 text-xs font-bold">Cancel</button>
                  <button disabled={isSavingSubEdit} onClick={handleSaveSubEntryEdit} className="h-9 rounded-xl bg-zinc-950 text-white px-5 text-xs font-bold shadow-md">
                    {isSavingSubEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RecordDeleteModal
        isOpen={!!deletingProduct}
        title="Delete Grouped WH1 Item?"
        recordId={deletingProduct?.sku}
        recordName={deletingProduct?.name}
        description="This will permanently delete this product and ALL its sub-entries from system inventory registry. This action is irreversible."
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
