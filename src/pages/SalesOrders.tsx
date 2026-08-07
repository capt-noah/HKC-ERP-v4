import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  Truck, 
  FileText, 
  Eye, 
  X, 
  ShieldAlert, 
  Box,
  LayoutGrid,
  Table as TableIcon,
  Pencil,
  Trash2,
  AlertTriangle,
  FileCheck
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { GlassCard } from "@/components/GlassCard"
import { FloatingNav } from "@/components/FloatingNav"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore, type SalesOrder, type Quotation, type SalesOrderItem } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { useFeedback } from "@/context/FeedbackContext"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { ShipmentDocChecklist } from "@/components/ShipmentDocChecklist"
import {
  evaluateShipmentDocs,
  fetchShipmentDocs,
  fetchShipmentDocRules,
  type ShipmentDocAttachment,
  type ShipmentDocRule,
  DEFAULT_FRONTEND_RULES,
} from "@/lib/shipmentDocumentEngine"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const CONTAINER_UNITS = ["Box", "Bottle", "Vial"]

function SalesOrdersTableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-b border-zinc-150/40">
          <td className="py-4 px-6"><Skeleton className="h-4 w-20 bg-zinc-200/80" /><Skeleton className="h-3 w-16 mt-1 bg-zinc-200/50" /></td>
          <td className="py-4 px-4"><Skeleton className="h-4 w-32 bg-zinc-200/80" /><Skeleton className="h-3 w-20 mt-1 bg-zinc-200/50" /></td>
          <td className="py-4 px-4"><Skeleton className="h-5 w-24 rounded-full bg-zinc-200/80" /></td>
          <td className="py-4 px-4"><Skeleton className="h-4 w-16 bg-zinc-200/80" /></td>
          <td className="py-4 px-4"><Skeleton className="h-5 w-28 rounded-full bg-zinc-200/80" /></td>
          <td className="py-4 px-4"><Skeleton className="h-5 w-24 rounded-full bg-zinc-200/80" /></td>
          <td className="py-4 px-4 text-right"><Skeleton className="h-4 w-24 ml-auto bg-zinc-200/80" /></td>
          <td className="py-4 px-4 text-center"><Skeleton className="h-8 w-44 mx-auto rounded-xl bg-zinc-200/80" /></td>
        </tr>
      ))}
    </>
  )
}

export default function SalesOrders() {
  const { showToast } = useFeedback()
  const erp = useErpStore()
  const isLoading = erp.isLoading()
  
  const salesOrders = erp.getSalesOrders()
  const customers = erp.getCustomers()
  const products = erp.getProducts()
  const warehouses = withOperatingWarehouses(erp.getWarehouses())
  const warehouseOptions = warehouses.map((warehouse) => ({ value: warehouse.code || warehouse.id, label: warehouse.name || warehouse.code || warehouse.id }))

  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table")

  // Search & Filter states for Sales Orders
  const [soSearch, setSoSearch] = useState("")
  const [soStageFilter, setSoStageFilter] = useState("ALL")
  const [soWhFilter, setSoWhFilter] = useState("ALL")

  // Selected Sales Order for Inspection / Fulfillment / Invoicing
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)

  const [shipmentDocRules, setShipmentDocRules] = useState<ShipmentDocRule[]>(DEFAULT_FRONTEND_RULES)
  const [soAttachmentsMap, setSoAttachmentsMap] = useState<Record<string, ShipmentDocAttachment[]>>({})
  const [soInspectorTab, setSoInspectorTab] = useState<"Order Lines" | "Shipping Docs">("Order Lines")

  useEffect(() => {
    fetchShipmentDocRules("sales_order").then(setShipmentDocRules)
  }, [])

  useEffect(() => {
    if (selectedOrder?.id) {
      fetchShipmentDocs(selectedOrder.id, "sales_order").then((docs) => {
        setSoAttachmentsMap((prev) => ({ ...prev, [selectedOrder.id]: docs }))
      })
    }
  }, [selectedOrder?.id])
  
  // Modals
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null)
  const [isNewQuotationOpen, setIsNewQuotationOpen] = useState(false)
  const [isFulfillModalOpen, setIsFulfillModalOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)

  // Dispatch / Fulfillment form state
  const [driverName, setDriverName] = useState("")
  const [vehicleReg, setVehicleReg] = useState("")

  // Billing form state
  const [taxPercent, setTaxPercent] = useState(0)
  const [paymentTerms, setPaymentTerms] = useState("")

  // New Sales Order Form State
  const [newCustomerId, setNewCustomerId] = useState("")
  const [newWarehouse, setNewWarehouse] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [orderItems, setOrderItems] = useState<SalesOrderItem[]>([])

  // New Quotation Form State
  const [quoteCustomerId, setQuoteCustomerId] = useState("")
  const [quoteWarehouse, setQuoteWarehouse] = useState("")
  const [quoteValidDays, setQuoteValidDays] = useState("")
  const [quoteDesc, setQuoteDesc] = useState("")
  const [quoteItems] = useState<SalesOrderItem[]>([])

  const stages: Array<SalesOrder["stage"]> = ["Quote", "Confirmed", "Picking", "Shipped"]

  // Filtered data for tables
  const filteredOrders = salesOrders.filter((so) => {
    const matchesSearch =
      so.customer.toLowerCase().includes(soSearch.toLowerCase()) ||
      so.id.toLowerCase().includes(soSearch.toLowerCase()) ||
      so.desc.toLowerCase().includes(soSearch.toLowerCase())
    if (!matchesSearch) return false
    if (soStageFilter !== "ALL" && so.stage !== soStageFilter) return false
    if (soWhFilter !== "ALL" && so.warehouse !== soWhFilter) return false
    return true
  })

  // Table Columns & Resizable Tables setup
  const salesOrderColumns: TableColumn[] = [
    { key: "id", label: "Order ID", align: "left" },
    { key: "customer", label: "Customer", align: "left" },
    { key: "warehouse", label: "Warehouse", align: "left" },
    { key: "stage", label: "Stage", align: "left" },
    { key: "deliveryStatus", label: "Delivery Status", align: "left" },
    { key: "billingStatus", label: "Billing Status", align: "left" },
    { key: "amount", label: "Amount (ETB)", align: "right" },
    { key: "_actions", label: "Action", align: "center", noSort: true },
  ]

  const soTable = useResizableTable(salesOrderColumns, filteredOrders, {
    id: 110,
    customer: 220,
    warehouse: 110,
    stage: 110,
    itemsSummary: 200,
    deliveryStatus: 140,
    billingStatus: 130,
    amount: 140,
    _actions: 240,
  })

  // Handle stage advancement
  const handleAdvanceStage = (id: string, currentStage: SalesOrder["stage"]) => {
    let nextStage: SalesOrder["stage"] = currentStage
    let progress: number | undefined = undefined

    if (currentStage === "Quote") nextStage = "Confirmed"
    else if (currentStage === "Confirmed") {
      nextStage = "Picking"
      progress = 40
    } else if (currentStage === "Picking") {
      nextStage = "Shipped"
      progress = 100
    }

    if (nextStage !== currentStage) {
      erp.updateSalesOrderStage(id, nextStage, progress)
      showToast("Pipeline Stage Updated", "success", `Order ${id} moved to ${nextStage}.`)
    }
  }

function resolveWarehouseCode(rawWh: string | undefined, warehousesList: Array<{ id: string; code?: string; name?: string }>): string {
  if (!warehousesList || warehousesList.length === 0) return "WH1"
  if (!rawWh) return warehousesList[0].code || warehousesList[0].id
  const clean = rawWh.trim().toLowerCase()
  const match = warehousesList.find((w) => 
    (w.code && w.code.toLowerCase() === clean) ||
    (w.id && w.id.toLowerCase() === clean) ||
    (w.name && w.name.toLowerCase() === clean) ||
    (w.code && clean.includes(w.code.toLowerCase())) ||
    (w.id && clean.includes(w.id.toLowerCase()))
  )
  return match ? (match.code || match.id) : (warehousesList[0].code || warehousesList[0].id)
}

  // Open New Order modal prefilled with default line item and product warehouse
  const handleOpenNewOrderModal = () => {
    const defaultProduct = products[0] || { id: "PRD-001", name: "Amoxicillin 500mg", sku: "AMX-500", valuationRate: 150, unit: "Box", sellingPrice: 150, warehouse: "WH1" }
    const loadedPrice = defaultProduct.sellingPrice || defaultProduct.unitCost || defaultProduct.valuationRate || 150
    
    // Robustly resolve warehouse code
    const targetWh = resolveWarehouseCode(defaultProduct.warehouse, warehouses)
    setNewWarehouse(targetWh)

    setOrderItems([
      {
        productId: defaultProduct.id,
        name: defaultProduct.name,
        qty: 10,
        unit: defaultProduct.unit || "Box",
        unitPrice: loadedPrice,
        total: loadedPrice * 10,
      },
    ])
    setIsNewOrderOpen(true)
  }

  // Item Row Handlers for New/Edit Order
  const handleOrderItemChange = (index: number, field: keyof SalesOrderItem, value: any, isEditing = false) => {
    const setter = isEditing ? setEditingOrderItems : setOrderItems
    setter((prev) => {
      const next = [...prev]
      const current = { ...next[index] }

      if (field === "productId") {
        const prod = products.find((p) => p.id === value)
        if (prod) {
          const loadedPrice = prod.sellingPrice || prod.unitCost || prod.valuationRate || 150
          current.productId = prod.id
          current.name = prod.name
          current.unit = prod.unit || "Box"
          current.unitPrice = loadedPrice
          current.total = current.qty * current.unitPrice

          // Auto-bind warehouse to product's designated stock warehouse
          if (!isEditing) {
            const targetWh = resolveWarehouseCode(prod.warehouse, warehouses)
            setNewWarehouse(targetWh)
          }
        }
      } else if (field === "qty") {
        const parsed = Math.max(0, Number(value) || 0)
        current.qty = parsed
        current.total = current.qty * current.unitPrice
      } else if (field === "unitPrice") {
        const parsed = Math.max(0, Number(value) || 0)
        current.unitPrice = parsed
        current.total = current.qty * current.unitPrice
      } else if (field === "unit") {
        current.unit = String(value)
      }

      next[index] = current
      return next
    })
  }

  const handleAddOrderItemRow = (isEditing = false) => {
    const p = products[0] || { id: "PRD-001", name: "Amoxicillin 500mg", unit: "Box", valuationRate: 150, sellingPrice: 150 }
    const loadedPrice = p.sellingPrice || p.unitCost || p.valuationRate || 150
    const setter = isEditing ? setEditingOrderItems : setOrderItems
    setter((prev) => [
      ...prev,
      {
        productId: p.id,
        name: p.name,
        qty: 10,
        unit: p.unit || "Box",
        unitPrice: loadedPrice,
        total: loadedPrice * 10,
      },
    ])
  }

  const handleRemoveOrderItemRow = (index: number, isEditing = false) => {
    const setter = isEditing ? setEditingOrderItems : setOrderItems
    setter((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  // State for Editing Sales Order
  const [editingOrderItems, setEditingOrderItems] = useState<SalesOrderItem[]>([])

  const handleOpenEditModal = (so: SalesOrder) => {
    setEditingOrder(so)
    setEditingOrderItems(so.items.length > 0 ? [...so.items] : [
      {
        productId: products[0]?.id || "PRD-001",
        name: products[0]?.name || "Amoxicillin 500mg",
        qty: 10,
        unit: products[0]?.unit || "Box",
        unitPrice: products[0]?.valuationRate || 150,
        total: (products[0]?.valuationRate || 150) * 10,
      }
    ])
    setIsEditOrderOpen(true)
  }

  const handleSaveEditOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrder) return

    const sanitizedItems: SalesOrderItem[] = editingOrderItems.map((i) => {
      const q = Math.max(1, Number(i.qty) || 1)
      const p = Math.max(0, Number(i.unitPrice) || 0)
      return { ...i, qty: q, unitPrice: p, total: q * p }
    })

    const totalAmt = sanitizedItems.reduce((sum, i) => sum + i.total, 0)
    const updatedSo: SalesOrder = {
      ...editingOrder,
      items: sanitizedItems,
      amount: totalAmt,
    }

    erp.updateSalesOrder(updatedSo)
    setIsEditOrderOpen(false)
    setEditingOrder(null)
    showToast("Sales Order Updated", "success", `Sales Order contract ${updatedSo.id} updated successfully.`)
  }

  // Handle Create Sales Order
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedCust = customers.find((c) => c.id === newCustomerId)
    if (!selectedCust || !newWarehouse) {
      showToast("Validation Error", "warning", "Please select a customer and warehouse.")
      return
    }

    const rawItems = orderItems.length > 0 ? orderItems : [
      {
        productId: products[0]?.id || "PRD-001",
        name: products[0]?.name || "Amoxicillin 500mg",
        qty: 10,
        unit: products[0]?.unit || "Box",
        unitPrice: products[0]?.valuationRate || 150,
        total: (products[0]?.valuationRate || 150) * 10,
      }
    ]

    const finalItems: SalesOrderItem[] = rawItems.map((i) => {
      const q = Math.max(1, Number(i.qty) || 1)
      const p = Math.max(0, Number(i.unitPrice) || 0)
      return { ...i, qty: q, unitPrice: p, total: q * p }
    })

    const totalAmt = finalItems.reduce((sum, item) => sum + item.total, 0)
    const wh = warehouses.find((w) => w.code === newWarehouse || w.id === newWarehouse)

    const newSo: SalesOrder = {
      id: `SO-${Date.now().toString().slice(-4)}`,
      customer: selectedCust.name,
      customerId: selectedCust.id,
      customerGroup: selectedCust.category,
      warehouse: newWarehouse,
      warehouseName: wh ? `${wh.code} - ${wh.name}` : newWarehouse,
      date: new Date().toISOString().split("T")[0],
      amount: totalAmt,
      currency: "ETB",
      stage: "Quote",
      desc: newDesc || `Sales Order contract for ${selectedCust.name}`,
      initials: selectedCust.name.slice(0, 2).toUpperCase(),
      label: selectedCust.contactPerson || selectedCust.name,
      avatarBg: "bg-emerald-100 text-emerald-800",
      urgent: false,
      attachment: true,
      items: finalItems,
      deliveredAmount: 0,
      billedAmount: 0,
      deliveryStatus: "Not Delivered",
      billingStatus: "Not Billed",
      paymentTerms,
    }

    erp.addSalesOrder(newSo)
    showToast("Sales Order Created", "success", `Contract ${newSo.id} created under Quote stage for ${selectedCust.name}.`)
    setIsNewOrderOpen(false)
    setNewDesc("")
  }

  // Handle Create Quotation
  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedCust = customers.find((c) => c.id === quoteCustomerId)
    if (!selectedCust || !quoteWarehouse || !quoteValidDays) {
      showToast("Validation Error", "warning", "Please select a customer, warehouse, and valid-until period.")
      return
    }

    const defaultItemProduct = products[0] || { id: "PRD-001", name: "Amoxicillin 500mg", sku: "AMX-500", valuationRate: 150 }
    const finalItems: SalesOrderItem[] = quoteItems.length > 0 ? quoteItems : [
      {
        productId: defaultItemProduct.id,
        name: defaultItemProduct.name,
        qty: 100,
        unit: "Pcs",
        unitPrice: defaultItemProduct.valuationRate || 150,
        total: (defaultItemProduct.valuationRate || 150) * 100,
      }
    ]

    const totalAmt = finalItems.reduce((sum, item) => sum + item.total, 0)
    const wh = warehouses.find((w) => w.code === quoteWarehouse)
    const validTillDate = new Date()
    validTillDate.setDate(validTillDate.getDate() + Number(quoteValidDays))

    const newQt: Quotation = {
      id: `QT-${Date.now().toString().slice(-4)}`,
      customer: selectedCust.name,
      customerId: selectedCust.id,
      customerGroup: selectedCust.category,
      warehouse: quoteWarehouse,
      warehouseName: wh ? `${wh.code} - ${wh.name}` : quoteWarehouse,
      date: new Date().toISOString().split("T")[0],
      validTill: validTillDate.toISOString().split("T")[0],
      amount: totalAmt,
      currency: "ETB",
      status: "Draft",
      desc: quoteDesc || `Pro-forma Quotation for ${selectedCust.name}`,
      paymentTerms,
      items: finalItems,
    }

    erp.addQuotation(newQt)
    showToast("Quotation Generated", "success", `Pro-Forma ${newQt.id} created for ${selectedCust.name}.`)
    setIsNewQuotationOpen(false)
    setQuoteDesc("")
  }

  // Confirm Fulfillment & Create Delivery Note
  const handleConfirmFulfillment = () => {
    if (!selectedOrder) return

    const docs = soAttachmentsMap[selectedOrder.id] || []
    const evaluation = evaluateShipmentDocs({
      record: selectedOrder,
      items: selectedOrder.items || [],
      attachments: docs,
      rules: shipmentDocRules,
      appliesTo: "sales_order",
    })

    if (!evaluation.isComplete) {
      const missingList = evaluation.missing.map((m) => m.document_type).join(", ")
      showToast(
        "Shipping Clearance Blocked",
        "warning",
        `Stock dispatch is blocked because mandatory shipping documents are missing: ${missingList}. Attach these files in the Shipping Docs tab to proceed.`
      )
      return
    }

    const itemsToFulfill = selectedOrder.items.map((i) => ({
      productId: i.productId,
      qty: i.qty,
    }))

    if (itemsToFulfill.length === 0) {
      showToast("Dispatch Error", "warning", "Please specify at least 1 item quantity to dispatch.")
      return
    }

    const res = erp.createDeliveryNoteForSalesOrder(
      selectedOrder.id,
      itemsToFulfill,
      driverName,
      vehicleReg
    )

    if (res.success && res.deliveryNote) {
      showToast(
        "Stock Dispatched & COGS Posted",
        "success",
        `Delivery Note ${res.deliveryNote.id} submitted! Inventory stock updated & GL COGS voucher ${res.deliveryNote.journalEntryId || ""} posted to Finance.`
      )
      setIsFulfillModalOpen(false)
      const updated = erp.getSalesOrderById(selectedOrder.id)
      if (updated) setSelectedOrder(updated)
    } else {
      showToast("Fulfillment Failed", "warning", res.error || "Could not complete stock dispatch.")
    }
  }

  // Confirm Sales Invoice Creation
  const handleConfirmInvoice = () => {
    if (!selectedOrder) return

    const res = erp.createSalesInvoiceForSalesOrder(selectedOrder.id, taxPercent, paymentTerms)
    if (res.success && res.invoiceId) {
      showToast(
        "Sales Invoice Generated",
        "success",
        `Invoice ${res.invoiceId} created in Finance Store with ${taxPercent}% Tax! Accounts Receivable GL entry updated.`
      )
      setIsInvoiceModalOpen(false)
      const updated = erp.getSalesOrderById(selectedOrder.id)
      if (updated) setSelectedOrder(updated)
    } else {
      showToast("Billing Error", "warning", res.error || "Could not generate Sales Invoice.")
    }
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={fade} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-black tracking-tight">Sales Orders & Contracts</h1>
            </div>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Manage sales contracts, fulfillment, and invoicing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SubPageNav items={getSectionChildren("/sales")} />
          </div>
        </div>

        {/* SALES ORDERS REGISTER */}
        <GlassCard className="flex flex-col overflow-hidden p-0">
            <div className="px-6 pt-6">
              <FinanceTableToolbar
                title="Sales Orders Register"
                subtitle={`Total: ${soTable.sorted().length} sales contracts`}
                searchValue={soSearch}
                onSearchChange={setSoSearch}
                searchPlaceholder="Search order ID, client..."
                filters={[
                  {
                    value: soStageFilter,
                    onChange: setSoStageFilter,
                    ariaLabel: "Filter by Stage",
                    options: [
                      { value: "ALL", label: "All Stages" },
                      { value: "Quote", label: "Stage: Quote" },
                      { value: "Confirmed", label: "Stage: Confirmed" },
                      { value: "Picking", label: "Stage: Picking" },
                      { value: "Shipped", label: "Stage: Shipped" },
                    ],
                  },
                  {
                    value: soWhFilter,
                    onChange: setSoWhFilter,
                    ariaLabel: "Filter by Warehouse",
                    options: [{ value: "ALL", label: "All Warehouses" }, ...warehouseOptions],
                  },
                ]}
                actions={[
                  {
                    label: "New Order",
                    onClick: handleOpenNewOrderModal,
                    icon: <Plus className="size-4" />,
                    variant: "primary",
                  },
                ]}
              >
                <div className="flex items-center gap-1 bg-black/[0.03] p-1 rounded-xl text-xs font-bold text-gray-700 h-[38px]">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                      viewMode === "table" ? "bg-white text-black shadow-sm font-black" : "hover:text-black text-gray-500"
                    }`}
                    title="Table View"
                  >
                    <TableIcon className="size-3.5" /> Table
                  </button>
                  <button
                    onClick={() => setViewMode("kanban")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                      viewMode === "kanban" ? "bg-white text-black shadow-sm font-black" : "hover:text-black text-gray-500"
                    }`}
                    title="Board View"
                  >
                    <LayoutGrid className="size-3.5" /> Board
                  </button>
                </div>
              </FinanceTableToolbar>
            </div>

            {viewMode === "kanban" ? (
              <div className="p-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stages.map((stageName, colIdx) => {
                    const cards = filteredOrders.filter((so) => so.stage === stageName)
                    return (
                      <motion.div
                        key={stageName}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: colIdx * 0.08, duration: 0.35 }}
                      >
                        <div className="flex items-center justify-between mb-3 px-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-xs uppercase tracking-widest text-zinc-900">{stageName}</h3>
                            <span className="inline-flex items-center justify-center size-5 rounded-full bg-zinc-950 text-white text-[10px] font-bold">
                              {cards.length}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 min-h-[520px] p-2 bg-zinc-100/40 rounded-2xl border border-zinc-200/60">
                          {cards.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 text-xs font-semibold">
                              No orders in {stageName}
                            </div>
                          ) : (
                            cards.map((card, cardIdx) => {
                              const creditInfo = erp.getCustomerCreditUsage(card.customerId)
                              return (
                                <motion.div
                                  key={card.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.05 + colIdx * 0.05 + cardIdx * 0.03 }}
                                  whileHover={{ y: -2 }}
                                >
                                  <GlassCard className={`p-4 cursor-pointer hover:shadow-lg transition-all ${card.urgent ? "border-l-4 border-l-red-600" : ""}`}>
                                    <div onClick={() => setSelectedOrder(card)}>
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                                            {card.id}
                                          </span>
                                          <span className="ml-2 text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                                            {card.warehouse}
                                          </span>
                                        </div>
                                        <span className="text-xs font-black text-zinc-950 font-mono">
                                          ETB {card.amount.toLocaleString()}
                                        </span>
                                      </div>

                                      <p className="font-extrabold text-xs text-zinc-900 mb-1 flex items-center gap-1.5">
                                        <Building2 className="size-3.5 text-zinc-500 shrink-0" />
                                        {card.customer}
                                      </p>

                                      <p className="text-[11px] font-medium text-zinc-600 leading-relaxed mb-3 line-clamp-2">
                                        {card.desc}
                                      </p>

                                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${card.deliveryStatus === "Fully Delivered" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                                          <Truck className="size-2.5 inline mr-1" />
                                          {card.deliveryStatus || "Not Delivered"}
                                        </span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${card.billingStatus === "Fully Billed" ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-zinc-50 text-zinc-700 border-zinc-200"}`}>
                                          <FileText className="size-2.5 inline mr-1" />
                                          {card.billingStatus || "Not Billed"}
                                        </span>
                                        {creditInfo.isOverLimit && (
                                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                                            <ShieldAlert className="size-2.5 inline mr-1" /> Credit Warning
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[10px] font-semibold text-zinc-500">
                                      <button 
                                        onClick={() => setSelectedOrder(card)}
                                        className="flex items-center gap-1 text-zinc-700 hover:text-black font-bold"
                                      >
                                        <Eye className="size-3" /> Inspect Order
                                      </button>

                                      {stageName !== "Shipped" && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleAdvanceStage(card.id, card.stage)
                                          }}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-[10px] transition-all"
                                        >
                                          Advance <ArrowRight className="size-3" />
                                        </button>
                                      )}
                                      {stageName === "Shipped" && (
                                        <span className="flex items-center gap-1 text-green-700 font-bold">
                                          <CheckCircle2 className="size-3" /> Shipped
                                        </span>
                                      )}
                                    </div>
                                  </GlassCard>
                                </motion.div>
                              )
                            })
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Resizable & Sortable Table View for Sales Orders (Stock Registry Design) */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-black/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                      {salesOrderColumns.map((col) => (
                        <ResizableTh
                          key={col.key}
                          col={col}
                          width={soTable.colWidths[col.key] || 120}
                          sortKey={soTable.sortKey}
                          sortDir={soTable.sortDir}
                          openMenuCol={soTable.openMenuCol}
                          onResizeStart={soTable.handleResizeStart}
                          onToggleMenu={soTable.toggleMenu}
                          onSortAsc={soTable.setSortAsc}
                          onSortDesc={soTable.setSortDesc}
                          onClearSort={soTable.clearSort}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150/40">
                    {isLoading ? (
                      <SalesOrdersTableSkeletonRows />
                    ) : soTable.sorted().length === 0 ? (
                      <tr>
                        <td colSpan={salesOrderColumns.length} className="text-center py-16 text-zinc-400 text-xs font-medium">
                          No sales orders match your active search filters.
                        </td>
                      </tr>
                    ) : (
                      soTable.sorted().map((so) => (
                        <motion.tr 
                          key={so.id}
                          onClick={() => setSelectedOrder(so)}
                          className="hover:bg-white/45 cursor-pointer transition-colors"
                          whileHover={{ scale: 1.001 }}
                        >
                          <td style={{ width: `${soTable.colWidths.id}px` }} className="py-4 px-6 overflow-hidden">
                            <div className="flex flex-col">
                              <span className="font-black text-zinc-950 text-xs tracking-tight leading-tight mb-0.5 truncate font-mono">
                                {so.id}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase">
                                {so.date}
                              </span>
                            </div>
                          </td>

                          <td style={{ width: `${soTable.colWidths.customer}px` }} className="py-4 px-4 overflow-hidden">
                            <div className="flex flex-col">
                              <span className="font-black text-zinc-950 text-xs tracking-tight leading-tight mb-0.5 truncate">
                                {so.customer}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-bold uppercase truncate">
                                {so.customerGroup}
                              </span>
                            </div>
                          </td>

                          <td style={{ width: `${soTable.colWidths.warehouse}px` }} className="py-4 px-4 overflow-hidden">
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight bg-zinc-100 border border-zinc-200/50 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                              {so.warehouse}
                            </span>
                          </td>

                          <td style={{ width: `${soTable.colWidths.stage}px` }} className="py-4 px-4 overflow-hidden">
                            <span className="text-xs font-black text-zinc-900">
                              {so.stage}
                            </span>
                          </td>

                          <td style={{ width: `${soTable.colWidths.deliveryStatus}px` }} className="py-4 px-4 overflow-hidden">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${so.deliveryStatus === "Fully Delivered" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                              <Truck className="size-2.5 inline mr-1" />
                              {so.deliveryStatus || "Not Delivered"}
                            </span>
                          </td>

                          <td style={{ width: `${soTable.colWidths.billingStatus}px` }} className="py-4 px-4 overflow-hidden">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${so.billingStatus === "Fully Billed" ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-zinc-100 text-zinc-700 border-zinc-200"}`}>
                              <FileText className="size-2.5 inline mr-1" />
                              {so.billingStatus || "Not Billed"}
                            </span>
                          </td>

                          <td style={{ width: `${soTable.colWidths.amount}px` }} className="py-4 px-4 text-right font-mono text-xs overflow-hidden">
                            <div className="font-black text-zinc-950">ETB {so.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                            <div className="mt-0.5 text-[9px] font-bold uppercase text-zinc-400">{so.items?.length || 0} items</div>
                          </td>

                          <td style={{ width: `${soTable.colWidths._actions}px` }} className="py-4 px-4 text-center whitespace-nowrap overflow-hidden">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => handleOpenEditModal(so)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-[11px] transition-all border border-zinc-200/80 active:scale-95 shadow-2xs"
                                title="Edit Sales Order"
                              >
                                <Pencil className="size-3 text-zinc-700" /> Edit
                              </button>
                              <button 
                                onClick={() => setSelectedOrder(so)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] transition-all shadow-xs active:scale-95"
                              >
                                <Eye className="size-3.5" /> {so.deliveryStatus === "Fully Delivered" ? "Inspect Order" : "Inspect & Fulfill"}
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
      </motion.div>

      {/* SALES ORDER INSPECTION / FULFILLMENT SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-zinc-200 flex flex-col justify-between overflow-y-auto p-6"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-zinc-900 bg-zinc-100 px-2.5 py-0.5 rounded-md">
                        {selectedOrder.id}
                      </span>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        {selectedOrder.stage}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-zinc-950 mt-1">{selectedOrder.customer}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 rounded-full hover:bg-zinc-100 text-zinc-500"
                  >
                    <X className="size-5" />
                  </button>
                </div>



                {/* Tab Selector: Order Lines vs Shipping Docs */}
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-200 pb-3">
                  <button
                    onClick={() => setSoInspectorTab("Order Lines")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      soInspectorTab === "Order Lines"
                        ? "bg-zinc-950 text-white shadow-sm"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" /> Order Lines ({selectedOrder.items.length})
                  </button>
                  <button
                    onClick={() => setSoInspectorTab("Shipping Docs")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      soInspectorTab === "Shipping Docs"
                        ? "bg-zinc-950 text-white shadow-sm"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" /> Shipping Docs Checklist
                    {(() => {
                      const docs = soAttachmentsMap[selectedOrder.id] || []
                      const evalRes = evaluateShipmentDocs({
                        record: selectedOrder,
                        items: selectedOrder.items || [],
                        attachments: docs,
                        rules: shipmentDocRules,
                        appliesTo: "sales_order",
                      })
                      return (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                            evalRes.isComplete ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {evalRes.isComplete ? "Complete" : `${evalRes.missingCount} Missing`}
                        </span>
                      )
                    })()}
                  </button>
                </div>

                {soInspectorTab === "Shipping Docs" ? (
                  <div className="mb-6">
                    <ShipmentDocChecklist
                      recordId={selectedOrder.id}
                      recordType="sales_order"
                      evaluation={evaluateShipmentDocs({
                        record: selectedOrder,
                        items: selectedOrder.items || [],
                        attachments: soAttachmentsMap[selectedOrder.id] || [],
                        rules: shipmentDocRules,
                        appliesTo: "sales_order",
                      })}
                      attachments={soAttachmentsMap[selectedOrder.id] || []}
                      onAttachmentsChange={(updated) => {
                        setSoAttachmentsMap((prev) => ({ ...prev, [selectedOrder.id]: updated }))
                      }}
                      readOnly={true}
                    />
                  </div>
                ) : (
                  /* Line Items Table */
                  <div className="mb-6">
                    <h3 className="text-xs font-black uppercase text-zinc-900 mb-2 flex items-center gap-1.5">
                      <Box className="size-3.5 text-zinc-500" /> Contract Line Items & Warehouse Stock
                    </h3>
                    <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[9px]">
                          <tr>
                            <th className="px-3 py-2">Product Item</th>
                            <th className="px-3 py-2 text-center">Ordered</th>
                            <th className="px-3 py-2 text-right">Unit Price</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-medium">
                          {selectedOrder.items.map((item, idx) => {
                            const p = products.find(prod => prod.id === item.productId)
                            return (
                              <tr key={idx}>
                                <td className="px-3 py-2.5">
                                  <div className="font-bold text-zinc-900">{item.name}</div>
                                  <div className="text-[10px] text-zinc-500 font-mono">
                                    Warehouse Stock: <span className="font-bold text-zinc-700">{p ? p.quantity : "N/A"} {item.unit}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold">{item.qty} {item.unit}</td>
                                <td className="px-3 py-2.5 text-right font-mono">ETB {item.unitPrice.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-zinc-900">
                                  ETB {item.total.toLocaleString()}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Linked Documents Status */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3 mb-6">
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Fulfillment & Financial Integration</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 block text-[10px] font-bold uppercase">Delivery Status</span>
                      <span className="font-extrabold text-zinc-900">{selectedOrder.deliveryStatus || "Not Delivered"}</span>
                      {selectedOrder.deliveryNoteIds && selectedOrder.deliveryNoteIds.length > 0 && (
                        <div className="text-[10px] font-mono text-emerald-800 font-bold mt-0.5">
                          Notes: {selectedOrder.deliveryNoteIds.join(", ")}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] font-bold uppercase">Billing Status</span>
                      <span className="font-extrabold text-zinc-900">{selectedOrder.billingStatus || "Not Billed"}</span>
                      {selectedOrder.invoiceIds && selectedOrder.invoiceIds.length > 0 && (
                        <div className="text-[10px] font-mono text-blue-800 font-bold mt-0.5">
                          Invoices: {selectedOrder.invoiceIds.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Triggers */}
              <div className="pt-4 border-t border-zinc-200 flex flex-col gap-2">
                {selectedOrder.deliveryStatus !== "Fully Delivered" ? (
                  <button 
                    onClick={() => navigate(`/sales/sales-issued?soId=${selectedOrder.id}`)}
                    className="w-full py-2.5 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 shadow-md flex items-center justify-center gap-2"
                  >
                    <Truck className="size-4" /> Go to Sales Issued to Issue Stock
                  </button>
                ) : (
                  <div className="w-full py-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200/80 font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" /> Stock Issued & Dispatched
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DISPATCH & FULFILLMENT (CREATE DELIVERY NOTE) */}
      <AnimatePresence>
        {isFulfillModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200"
            >
              <h2 className="text-xl font-black text-zinc-950 mb-1">Dispatch Stock</h2>
              <p className="text-xs font-semibold text-zinc-500 mb-4">
                Fulfilling items will automatically decrement inventory levels at warehouse <span className="font-bold text-zinc-800">{selectedOrder.warehouse}</span> and update store records.
              </p>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Logistics Driver Name</label>
                    <input 
                      type="text" 
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Vehicle Registration</label>
                    <input 
                      type="text" 
                      value={vehicleReg}
                      onChange={(e) => setVehicleReg(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-2">Quantities to Dispatch (Contract Fixed)</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedOrder.items.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl text-xs font-semibold">
                        <div>
                          <div className="font-bold text-zinc-900">{item.name}</div>
                          <div className="text-[10px] text-zinc-500 font-medium">Contract Item</div>
                        </div>
                        <div className="font-mono font-black text-xs text-zinc-900 bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-sm">
                          {item.qty} {item.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsFulfillModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmFulfillment}
                  className="px-5 py-2 rounded-full bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-md"
                >
                  Confirm Dispatch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: GENERATE SALES INVOICE */}
      <AnimatePresence>
        {isInvoiceModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <h2 className="text-xl font-black text-zinc-950 mb-1">Generate Sales Invoice</h2>
              <p className="text-xs font-semibold text-zinc-500 mb-4">
                Creates an Accounts Receivable invoice in Finance for customer <span className="font-bold text-zinc-800">{selectedOrder.customer}</span>.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Tax Percent</label>
                  <input
                    type="number"
                    min="0"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Payment Terms</label>
                  <select 
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                  >
                    <option value="">Select payment terms</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Payment on Delivery">Payment on Delivery</option>
                  </select>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 font-mono text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Contract Subtotal:</span>
                    <span className="font-bold">ETB {selectedOrder.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tax Amount ({taxPercent}%):</span>
                    <span className="font-bold text-amber-700">ETB {(selectedOrder.amount * (taxPercent / 100)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-zinc-200 font-black">
                    <span>Total Invoiced Amount:</span>
                    <span className="text-emerald-700">ETB {(selectedOrder.amount * (1 + taxPercent / 100)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmInvoice}
                  className="px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md"
                >
                  Generate Sales Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: NEW SALES ORDER */}
      <AnimatePresence>
        {isNewOrderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-xl font-black text-zinc-950 mb-1">Create HKC Sales Contract</h2>
              <p className="text-xs font-semibold text-zinc-500 mb-5">Draft a new sales contract with item quantities, packaging units, and prices.</p>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Select Customer</label>
                    <select 
                      value={newCustomerId}
                      onChange={(e) => setNewCustomerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      <option value="">Select customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.country})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Fulfillment Warehouse <span className="text-[10px] font-normal text-zinc-400 font-mono">(Auto-locked)</span>
                    </label>
                    <select 
                      value={newWarehouse}
                      disabled={true}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold outline-none text-zinc-700 cursor-not-allowed"
                    >
                      <option value="">Select warehouse</option>
                      {warehouseOptions.map((warehouse) => (
                        <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-zinc-400 font-semibold block mt-1">
                      🔒 Locked: Auto-derived from selected stock item location
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Contract Description</label>
                  <textarea 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                    placeholder="Enter sales contract terms or description..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold outline-none resize-none" 
                  />
                </div>

                {/* Line Items Table */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black uppercase text-zinc-900 tracking-wide">
                      Contract Line Items (Products, Quantities & Prices)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddOrderItemRow(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 transition-colors"
                    >
                      <Plus className="size-3" /> Add Item Row
                    </button>
                  </div>

                  <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="px-3 py-2 w-[35%]">Product Item</th>
                          <th className="px-3 py-2 w-[18%] text-center">Qty</th>
                          <th className="px-3 py-2 w-[20%] text-center">Unit</th>
                          <th className="px-3 py-2 w-[20%] text-right">Unit Price</th>
                          <th className="px-3 py-2 w-[7%] text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {orderItems.map((item, index) => {
                          const p = products.find((prod) => prod.id === item.productId)
                          const avail = p ? (newWarehouse && newWarehouse !== "ALL" ? (p.stockBreakdown?.find((sb) => sb.warehouse === newWarehouse)?.qty ?? p.quantity) : p.quantity) : 0
                          const isOver = item.qty > avail
                          return (
                            <tr key={index}>
                              <td className="p-2">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleOrderItemChange(index, "productId", e.target.value, false)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold"
                                >
                                  {products.map((prod) => (
                                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                                  ))}
                                </select>
                                <div className="mt-1 flex flex-col gap-0.5 text-[10px]">
                                  <span className="text-zinc-500 font-bold">Store Available: <span className="font-mono font-black text-zinc-900">{avail} {item.unit}</span></span>
                                  {isOver && (
                                    <span className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-0.5">
                                      <AlertTriangle className="size-3 text-amber-600 shrink-0" />
                                      <span>Insufficient Stock ({item.qty} &gt; {avail})</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty === 0 ? "" : item.qty}
                                  onChange={(e) => handleOrderItemChange(index, "qty", e.target.value, false)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono font-bold text-center"
                                />
                              </td>
                              <td className="p-2 align-top">
                                <select
                                  value={item.unit}
                                  onChange={(e) => handleOrderItemChange(index, "unit", e.target.value, false)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-center"
                                >
                                  {CONTAINER_UNITS.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice === 0 ? "" : item.unitPrice}
                                  onChange={(e) => handleOrderItemChange(index, "unitPrice", e.target.value, false)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono font-bold text-right"
                                />
                              </td>
                              <td className="p-2 text-center align-top pt-2.5">
                                {orderItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOrderItemRow(index, false)}
                                    className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 font-mono text-xs flex justify-between items-center">
                    <span className="text-zinc-500 font-sans font-bold">Total Contract Amount:</span>
                    <span className="font-black text-sm text-emerald-800">
                      ETB {orderItems.reduce((sum, i) => sum + i.total, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button 
                    type="button" 
                    onClick={() => setIsNewOrderOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md"
                  >
                    Create Contract
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT SALES ORDER */}
      <AnimatePresence>
        {isEditOrderOpen && editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-xl font-black text-zinc-950 mb-1">Edit Sales Order ({editingOrder.id})</h2>
              <p className="text-xs font-semibold text-zinc-500 mb-5">Update contract terms, products, container units, quantities, and prices.</p>

              <form onSubmit={handleSaveEditOrder} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Customer</label>
                    <select 
                      value={editingOrder.customerId}
                      onChange={(e) => {
                        const cust = customers.find((c) => c.id === e.target.value)
                        setEditingOrder({
                          ...editingOrder,
                          customerId: e.target.value,
                          customer: cust ? cust.name : editingOrder.customer,
                        })
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Fulfillment Warehouse</label>
                    <select 
                      value={editingOrder.warehouse}
                      onChange={(e) => setEditingOrder({ ...editingOrder, warehouse: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      {warehouseOptions.map((warehouse) => (
                        <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Contract Description</label>
                  <textarea 
                    value={editingOrder.desc}
                    onChange={(e) => setEditingOrder({ ...editingOrder, desc: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold outline-none resize-none" 
                  />
                </div>

                {/* Line Items Table */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black uppercase text-zinc-900 tracking-wide">
                      Contract Line Items
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddOrderItemRow(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 transition-colors"
                    >
                      <Plus className="size-3" /> Add Item Row
                    </button>
                  </div>

                  <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="px-3 py-2 w-[35%]">Product Item</th>
                          <th className="px-3 py-2 w-[18%] text-center">Qty</th>
                          <th className="px-3 py-2 w-[20%] text-center">Unit</th>
                          <th className="px-3 py-2 w-[20%] text-right">Unit Price</th>
                          <th className="px-3 py-2 w-[7%] text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {editingOrderItems.map((item, index) => {
                          const p = products.find((prod) => prod.id === item.productId)
                          const avail = p ? (editingOrder.warehouse && editingOrder.warehouse !== "ALL" ? (p.stockBreakdown?.find((sb) => sb.warehouse === editingOrder.warehouse)?.qty ?? p.quantity) : p.quantity) : 0
                          const isOver = item.qty > avail
                          return (
                            <tr key={index}>
                              <td className="p-2">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleOrderItemChange(index, "productId", e.target.value, true)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold"
                                >
                                  {products.map((prod) => (
                                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                                  ))}
                                </select>
                                <div className="mt-1 flex flex-col gap-0.5 text-[10px]">
                                  <span className="text-zinc-500 font-bold">Store Available: <span className="font-mono font-black text-zinc-900">{avail} {item.unit}</span></span>
                                  {isOver && (
                                    <span className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-0.5">
                                      <AlertTriangle className="size-3 text-amber-600 shrink-0" />
                                      <span>Insufficient Stock ({item.qty} &gt; {avail})</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty === 0 ? "" : item.qty}
                                  onChange={(e) => handleOrderItemChange(index, "qty", e.target.value, true)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono font-bold text-center"
                                />
                              </td>
                              <td className="p-2 align-top">
                                <select
                                  value={item.unit}
                                  onChange={(e) => handleOrderItemChange(index, "unit", e.target.value, true)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-center"
                                >
                                  {CONTAINER_UNITS.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice === 0 ? "" : item.unitPrice}
                                  onChange={(e) => handleOrderItemChange(index, "unitPrice", e.target.value, true)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono font-bold text-right"
                                />
                              </td>
                              <td className="p-2 text-center align-top pt-2.5">
                                {editingOrderItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOrderItemRow(index, true)}
                                    className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 font-mono text-xs flex justify-between items-center">
                    <span className="text-zinc-500 font-sans font-bold">Total Contract Amount:</span>
                    <span className="font-black text-sm text-emerald-800">
                      ETB {editingOrderItems.reduce((sum, i) => sum + i.total, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button 
                    type="button" 
                    onClick={() => setIsEditOrderOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-full bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-md"
                  >
                    Save Order Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: NEW QUOTATION */}
      <AnimatePresence>
        {isNewQuotationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-xl font-black text-zinc-950 mb-1">Draft Pro-Forma Quotation</h2>
              <p className="text-xs font-semibold text-zinc-500 mb-5">Generates an ERPNext-aligned pro-forma quotation.</p>

              <form onSubmit={handleCreateQuotation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Target Customer</label>
                  <select 
                    value={quoteCustomerId}
                    onChange={(e) => setQuoteCustomerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                  >
                    <option value="">Select customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Warehouse</label>
                    <select 
                      value={quoteWarehouse}
                      onChange={(e) => setQuoteWarehouse(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      <option value="">Select warehouse</option>
                      {warehouseOptions.map((warehouse) => (
                        <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Validity (Days)</label>
                    <input 
                      type="number"
                      value={quoteValidDays}
                      onChange={(e) => setQuoteValidDays(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Quotation Notes</label>
                  <textarea 
                    value={quoteDesc}
                    onChange={(e) => setQuoteDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold outline-none resize-none" 
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setIsNewQuotationOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md"
                  >
                    Generate Quotation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
