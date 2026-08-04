import { useState, useEffect } from "react"
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
  Check, 
  ShieldAlert, 
  Box,
  LayoutGrid,
  Table as TableIcon
} from "lucide-react"
import { GlassCard } from "@/components/GlassCard"
import { FloatingNav } from "@/components/FloatingNav"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore, type SalesOrder, type Quotation, type SalesOrderItem } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { useFeedback } from "@/context/FeedbackContext"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

interface SalesOrdersProps {
  initialTab?: "sales-orders" | "quotations" | "delivery-notes"
}

export default function SalesOrders({ initialTab = "sales-orders" }: SalesOrdersProps) {
  const { showToast } = useFeedback()
  const erp = useErpStore()
  
  const salesOrders = erp.getSalesOrders()
  const quotations = erp.getQuotations()
  const deliveryNotes = erp.getDeliveryNotes()
  const customers = erp.getCustomers()
  const products = erp.getProducts()
  const warehouses = withOperatingWarehouses(erp.getWarehouses())
  const warehouseOptions = warehouses.map((warehouse) => ({ value: warehouse.code || warehouse.id, label: warehouse.name || warehouse.code || warehouse.id }))

  const [activeTab, setActiveTab] = useState<"sales-orders" | "quotations" | "delivery-notes">(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const [viewMode, setViewMode] = useState<"kanban" | "table">("table")

  // Search & Filter states for each table
  const [soSearch, setSoSearch] = useState("")
  const [soStageFilter, setSoStageFilter] = useState("ALL")
  const [soWhFilter, setSoWhFilter] = useState("ALL")

  const [qtSearch, setQtSearch] = useState("")
  const [qtStatusFilter, setQtStatusFilter] = useState("ALL")

  const [dnSearch, setDnSearch] = useState("")
  const [dnWhFilter, setDnWhFilter] = useState("ALL")

  // Selected Sales Order for Inspection / Fulfillment / Invoicing
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  
  // Modals
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [isNewQuotationOpen, setIsNewQuotationOpen] = useState(false)
  const [isFulfillModalOpen, setIsFulfillModalOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)

  // Dispatch / Fulfillment form state
  const [driverName, setDriverName] = useState("")
  const [vehicleReg, setVehicleReg] = useState("")
  const [fulfillQtys, setFulfillQtys] = useState<Record<string, number>>({})

  // Billing form state
  const [taxPercent, setTaxPercent] = useState(0)
  const [paymentTerms, setPaymentTerms] = useState("")

  // New Sales Order Form State
  const [newCustomerId, setNewCustomerId] = useState("")
  const [newWarehouse, setNewWarehouse] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [orderItems] = useState<SalesOrderItem[]>([])

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

  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.customer.toLowerCase().includes(qtSearch.toLowerCase()) ||
      q.id.toLowerCase().includes(qtSearch.toLowerCase()) ||
      q.desc.toLowerCase().includes(qtSearch.toLowerCase())
    if (!matchesSearch) return false
    if (qtStatusFilter !== "ALL" && q.status !== qtStatusFilter) return false
    return true
  })

  const filteredDeliveryNotes = deliveryNotes.filter((dn) => {
    const matchesSearch =
      dn.customer.toLowerCase().includes(dnSearch.toLowerCase()) ||
      dn.id.toLowerCase().includes(dnSearch.toLowerCase()) ||
      dn.salesOrderId.toLowerCase().includes(dnSearch.toLowerCase())
    if (!matchesSearch) return false
    if (dnWhFilter !== "ALL" && dn.warehouse !== dnWhFilter) return false
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

  const quotationColumns: TableColumn[] = [
    { key: "id", label: "Quote ID", align: "left" },
    { key: "customer", label: "Customer", align: "left" },
    { key: "warehouse", label: "Target Warehouse", align: "left" },
    { key: "validTill", label: "Valid Until", align: "left" },
    { key: "status", label: "Status", align: "left" },
    { key: "amount", label: "Amount (ETB)", align: "right" },
    { key: "_actions", label: "Action", align: "center", noSort: true },
  ]

  const deliveryNoteColumns: TableColumn[] = [
    { key: "id", label: "DN ID", align: "left" },
    { key: "salesOrderId", label: "Sales Order", align: "left" },
    { key: "customer", label: "Customer", align: "left" },
    { key: "warehouse", label: "Warehouse", align: "left" },
    { key: "driverName", label: "Logistics Driver", align: "left" },
    { key: "journalEntryId", label: "GL COGS Voucher", align: "left" },
    { key: "totalValue", label: "Dispatched Value (ETB)", align: "right" },
  ]

  const soTable = useResizableTable(salesOrderColumns, filteredOrders, {
    id: 120,
    customer: 200,
    warehouse: 110,
    stage: 120,
    deliveryStatus: 140,
    billingStatus: 130,
    amount: 140,
    _actions: 140,
  })

  const qtTable = useResizableTable(quotationColumns, filteredQuotations, {
    id: 120,
    customer: 220,
    warehouse: 120,
    validTill: 120,
    status: 120,
    amount: 140,
    _actions: 180,
  })

  const dnTable = useResizableTable(deliveryNoteColumns, filteredDeliveryNotes, {
    id: 120,
    salesOrderId: 130,
    customer: 200,
    warehouse: 110,
    driverName: 180,
    journalEntryId: 150,
    totalValue: 150,
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

  // Handle Create Sales Order
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedCust = customers.find((c) => c.id === newCustomerId)
    if (!selectedCust || !newWarehouse || orderItems.length === 0) {
      showToast("Validation Error", "warning", "Select a customer, warehouse, and at least one stock item.")
      return
    }

    const totalAmt = orderItems.reduce((sum, item) => sum + item.total, 0)
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
      desc: newDesc,
      initials: selectedCust.name.slice(0, 2).toUpperCase(),
      label: selectedCust.contactPerson || selectedCust.name,
      avatarBg: "bg-emerald-100 text-emerald-800",
      urgent: false,
      attachment: true,
      items: orderItems,
      deliveredAmount: 0,
      billedAmount: 0,
      deliveryStatus: "Not Delivered",
      billingStatus: "Not Billed",
      paymentTerms,
    }

    erp.addSalesOrder(newSo)
    showToast("Sales Order Created", "success", `Contract ${newSo.id} created under Quote stage.`)
    setIsNewOrderOpen(false)
    setNewDesc("")
  }

  // Handle Create Quotation
  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedCust = customers.find((c) => c.id === quoteCustomerId)
    if (!selectedCust || !quoteWarehouse || !quoteValidDays || quoteItems.length === 0) {
      showToast("Validation Error", "warning", "Select a customer, warehouse, valid-until period, and at least one stock item.")
      return
    }

    const totalAmt = quoteItems.reduce((sum, item) => sum + item.total, 0)
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
      status: "Quoted",
      desc: quoteDesc,
      paymentTerms,
      items: quoteItems,
    }

    erp.addQuotation(newQt)
    showToast("Quotation Generated", "success", `Pro-Forma ${newQt.id} created for ${selectedCust.name}.`)
    setIsNewQuotationOpen(false)
    setQuoteDesc("")
  }

  // Convert Quotation to Sales Order
  const handleConvertQuotation = (qtId: string) => {
    const newSo = erp.convertQuotationToSalesOrder(qtId)
    if (newSo) {
      showToast("Quotation Converted", "success", `Quotation ${qtId} converted to confirmed Sales Order ${newSo.id}!`)
    }
  }

  // Open Fulfill Modal
  const handleOpenFulfillModal = (so: SalesOrder) => {
    setSelectedOrder(so)
    const initialQtys: Record<string, number> = {}
    so.items.forEach(i => {
      initialQtys[i.productId] = i.qty
    })
    setFulfillQtys(initialQtys)
    setIsFulfillModalOpen(true)
  }

  // Confirm Fulfillment & Create Delivery Note
  const handleConfirmFulfillment = () => {
    if (!selectedOrder) return

    const itemsToFulfill = Object.entries(fulfillQtys)
      .map(([productId, qty]) => ({
        productId,
        qty: Number(qty) || 0,
      }))
      .filter((i) => i.qty > 0)

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

  // Header Title & Description based on activeTab
  const headerInfo = {
    "sales-orders": {
      title: "Sales Orders & Contracts",
      desc: "Manage sales contracts, fulfillment, and invoicing.",
    },
    quotations: {
      title: "Pro-Forma Quotations",
      desc: "Manage estimates and converted sales orders.",
    },
    "delivery-notes": {
      title: "Delivery & Dispatch Notes",
      desc: "Track inventory dispatch notes and linked COGS vouchers.",
    },
  }[activeTab]

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={fade} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-black tracking-tight">{headerInfo.title}</h1>
            </div>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              {headerInfo.desc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SubPageNav items={getSectionChildren("/sales")} />
          </div>
        </div>

        {/* TAB 1: SALES ORDERS */}
        {activeTab === "sales-orders" && (
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
                    onClick: () => setIsNewOrderOpen(true),
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
                    title="Kanban Board View"
                  >
                    <LayoutGrid className="size-3.5" /> Kanban
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
              /* Resizable & Sortable Table View for Sales Orders */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase tracking-wider select-none">
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
                  <tbody className="divide-y divide-zinc-100">
                    {soTable.sorted().length === 0 ? (
                      <tr>
                        <td colSpan={salesOrderColumns.length} className="px-4 py-8 text-center text-xs font-semibold text-zinc-400">
                          No sales orders found matching search or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      soTable.sorted().map((so) => (
                        <tr key={so.id} className="hover:bg-zinc-50/60 transition-colors text-xs">
                          <td style={{ width: `${soTable.colWidths.id}px` }} className="px-3 py-3 whitespace-nowrap font-mono font-bold text-zinc-900 truncate">
                            {so.id}
                          </td>
                          <td style={{ width: `${soTable.colWidths.customer}px` }} className="px-3 py-3 truncate">
                            <div className="font-semibold text-zinc-800 truncate">{so.customer}</div>
                            <div className="text-[10px] font-mono text-zinc-400 truncate">{so.customerGroup}</div>
                          </td>
                          <td style={{ width: `${soTable.colWidths.warehouse}px` }} className="px-3 py-3 whitespace-nowrap truncate">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 truncate">
                              {so.warehouse}
                            </span>
                          </td>
                          <td style={{ width: `${soTable.colWidths.stage}px` }} className="px-3 py-3 whitespace-nowrap truncate">
                            <span className="font-semibold text-zinc-800">{so.stage}</span>
                          </td>
                          <td style={{ width: `${soTable.colWidths.deliveryStatus}px` }} className="px-3 py-3 whitespace-nowrap truncate">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${so.deliveryStatus === "Fully Delivered" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                              {so.deliveryStatus || "Not Delivered"}
                            </span>
                          </td>
                          <td style={{ width: `${soTable.colWidths.billingStatus}px` }} className="px-3 py-3 whitespace-nowrap truncate">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${so.billingStatus === "Fully Billed" ? "bg-blue-50 text-blue-800" : "bg-zinc-100 text-zinc-700"}`}>
                              {so.billingStatus || "Not Billed"}
                            </span>
                          </td>
                          <td style={{ width: `${soTable.colWidths.amount}px` }} className="px-3 py-3 text-right font-mono font-bold text-zinc-900 whitespace-nowrap truncate">
                            ETB {so.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ width: `${soTable.colWidths._actions}px` }} className="px-3 py-3 text-center whitespace-nowrap pr-4">
                            <button 
                              onClick={() => setSelectedOrder(so)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 hover:text-black bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-full transition-colors"
                            >
                              Inspect & Fulfill
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}

        {/* TAB 2: QUOTATIONS */}
        {activeTab === "quotations" && (
          <GlassCard className="flex flex-col overflow-hidden p-0">
            <div className="px-6 pt-6">
              <FinanceTableToolbar
                title="Pro-Forma Quotations Register"
                subtitle={`Total: ${qtTable.sorted().length} active estimates`}
                searchValue={qtSearch}
                onSearchChange={setQtSearch}
                searchPlaceholder="Search quotation ID or customer..."
                filters={[
                  {
                    value: qtStatusFilter,
                    onChange: setQtStatusFilter,
                    ariaLabel: "Filter by Status",
                    options: [
                      { value: "ALL", label: "All Statuses" },
                      { value: "Quoted", label: "Status: Quoted" },
                      { value: "Ordered", label: "Status: Ordered" },
                    ],
                  },
                ]}
                actions={[
                  {
                    label: "New Quote",
                    onClick: () => setIsNewQuotationOpen(true),
                    icon: <Plus className="size-4" />,
                    variant: "primary",
                  },
                ]}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase tracking-wider select-none">
                    {quotationColumns.map((col) => (
                      <ResizableTh
                        key={col.key}
                        col={col}
                        width={qtTable.colWidths[col.key] || 120}
                        sortKey={qtTable.sortKey}
                        sortDir={qtTable.sortDir}
                        openMenuCol={qtTable.openMenuCol}
                        onResizeStart={qtTable.handleResizeStart}
                        onToggleMenu={qtTable.toggleMenu}
                        onSortAsc={qtTable.setSortAsc}
                        onSortDesc={qtTable.setSortDesc}
                        onClearSort={qtTable.clearSort}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {qtTable.sorted().length === 0 ? (
                    <tr>
                      <td colSpan={quotationColumns.length} className="px-4 py-8 text-center text-xs font-semibold text-zinc-400">
                        No quotations found matching search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    qtTable.sorted().map((q) => (
                      <tr key={q.id} className="hover:bg-zinc-50/60 transition-colors text-xs">
                        <td style={{ width: `${qtTable.colWidths.id}px` }} className="px-3 py-3 whitespace-nowrap font-mono font-bold text-zinc-900 truncate">
                          {q.id}
                        </td>
                        <td style={{ width: `${qtTable.colWidths.customer}px` }} className="px-3 py-3 truncate">
                          <div className="font-semibold text-zinc-800 truncate">{q.customer}</div>
                          <div className="text-[10px] font-mono text-zinc-400 truncate">{q.desc}</div>
                        </td>
                        <td style={{ width: `${qtTable.colWidths.warehouse}px` }} className="px-3 py-3 whitespace-nowrap truncate">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 truncate">
                            {q.warehouse}
                          </span>
                        </td>
                        <td style={{ width: `${qtTable.colWidths.validTill}px` }} className="px-3 py-3 font-mono text-zinc-700 whitespace-nowrap truncate">
                          {q.validTill}
                        </td>
                        <td style={{ width: `${qtTable.colWidths.status}px` }} className="px-3 py-3 whitespace-nowrap truncate">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${q.status === "Ordered" ? "bg-emerald-50 text-emerald-800" : q.status === "Quoted" ? "bg-blue-50 text-blue-800" : "bg-zinc-100 text-zinc-700"}`}>
                            {q.status}
                          </span>
                        </td>
                        <td style={{ width: `${qtTable.colWidths.amount}px` }} className="px-3 py-3 text-right font-mono font-bold text-zinc-900 whitespace-nowrap truncate">
                          ETB {q.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ width: `${qtTable.colWidths._actions}px` }} className="px-3 py-3 text-center whitespace-nowrap pr-4">
                          {q.status !== "Ordered" ? (
                            <button 
                              onClick={() => handleConvertQuotation(q.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full transition-colors mx-auto shadow-sm"
                            >
                              <Check className="size-3" /> Convert to Sales Order
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="size-3" /> Converted
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* TAB 3: DELIVERY NOTES */}
        {activeTab === "delivery-notes" && (
          <GlassCard className="flex flex-col overflow-hidden p-0">
            <div className="px-6 pt-6">
              <FinanceTableToolbar
                title="Delivery & Dispatch Register"
                subtitle={`Total: ${dnTable.sorted().length} dispatched notes`}
                searchValue={dnSearch}
                onSearchChange={setDnSearch}
                searchPlaceholder="Search DN ID, Order ID, driver..."
                filters={[
                  {
                    value: dnWhFilter,
                    onChange: setDnWhFilter,
                    ariaLabel: "Filter by Warehouse",
                    options: [{ value: "ALL", label: "All Warehouses" }, ...warehouseOptions],
                  },
                ]}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase tracking-wider select-none">
                    {deliveryNoteColumns.map((col) => (
                      <ResizableTh
                        key={col.key}
                        col={col}
                        width={dnTable.colWidths[col.key] || 120}
                        sortKey={dnTable.sortKey}
                        sortDir={dnTable.sortDir}
                        openMenuCol={dnTable.openMenuCol}
                        onResizeStart={dnTable.handleResizeStart}
                        onToggleMenu={dnTable.toggleMenu}
                        onSortAsc={dnTable.setSortAsc}
                        onSortDesc={dnTable.setSortDesc}
                        onClearSort={dnTable.clearSort}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {dnTable.sorted().length === 0 ? (
                    <tr>
                      <td colSpan={deliveryNoteColumns.length} className="px-4 py-8 text-center text-xs font-semibold text-zinc-400">
                        No delivery notes recorded matching search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    dnTable.sorted().map((dn) => (
                      <tr key={dn.id} className="hover:bg-zinc-50/60 transition-colors text-xs">
                        <td style={{ width: `${dnTable.colWidths.id}px` }} className="px-3 py-3 whitespace-nowrap font-mono font-bold text-zinc-900 truncate">
                          {dn.id}
                        </td>
                        <td style={{ width: `${dnTable.colWidths.salesOrderId}px` }} className="px-3 py-3 font-mono text-zinc-600 whitespace-nowrap truncate">
                          {dn.salesOrderId}
                        </td>
                        <td style={{ width: `${dnTable.colWidths.customer}px` }} className="px-3 py-3 truncate">
                          <div className="font-semibold text-zinc-800 truncate">{dn.customer}</div>
                        </td>
                        <td style={{ width: `${dnTable.colWidths.warehouse}px` }} className="px-3 py-3 whitespace-nowrap truncate">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 truncate">
                            {dn.warehouse}
                          </span>
                        </td>
                        <td style={{ width: `${dnTable.colWidths.driverName}px` }} className="px-3 py-3 truncate">
                          <div className="font-semibold text-zinc-800 truncate">{dn.driverName || "Standard Courier"}</div>
                          <div className="text-[10px] font-mono text-zinc-400 truncate">{dn.vehicleReg}</div>
                        </td>
                        <td style={{ width: `${dnTable.colWidths.journalEntryId}px` }} className="px-3 py-3 whitespace-nowrap truncate">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60 truncate">
                            {dn.journalEntryId || "JE-POSTED"}
                          </span>
                        </td>
                        <td style={{ width: `${dnTable.colWidths.totalValue}px` }} className="px-3 py-3 text-right font-mono font-bold text-zinc-900 whitespace-nowrap truncate pr-4">
                          ETB {dn.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
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

                {/* Customer Credit Health & Warehouse Info */}
                {(() => {
                  const credit = erp.getCustomerCreditUsage(selectedOrder.customerId)
                  return (
                    <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 mb-5 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Building2 className="size-3.5" /> Customer Credit Health
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${credit.isOverLimit ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                          {credit.isOverLimit ? "EXCEEDED CREDIT LIMIT" : "CREDIT LIMIT SAFE"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-[11px]">
                        <div className="bg-white p-2 rounded-xl border border-zinc-100">
                          <span className="text-[9px] text-zinc-400 block uppercase font-sans">Credit Limit</span>
                          <span className="font-bold text-zinc-900">ETB {credit.limit.toLocaleString()}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-zinc-100">
                          <span className="text-[9px] text-zinc-400 block uppercase font-sans">Total Utilized</span>
                          <span className="font-bold text-amber-700">ETB {credit.used.toLocaleString()}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-zinc-100">
                          <span className="text-[9px] text-zinc-400 block uppercase font-sans">Available</span>
                          <span className="font-bold text-emerald-700">ETB {credit.available.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Line Items Table */}
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
                <button 
                  onClick={() => handleOpenFulfillModal(selectedOrder)}
                  className="w-full py-2.5 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 shadow-md flex items-center justify-center gap-2"
                >
                  <Truck className="size-4" /> Dispatch Stock & Generate Delivery Note (COGS GL)
                </button>
                <button 
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="w-full py-2.5 bg-zinc-950 text-white font-bold text-xs rounded-xl hover:bg-zinc-800 shadow-md flex items-center justify-center gap-2"
                >
                  <FileText className="size-4" /> Generate Sales Invoice in Finance (AR Ledger)
                </button>
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
              <h2 className="text-xl font-black text-zinc-950 mb-1">Dispatch Stock & Issue Delivery Note</h2>
              <p className="text-xs font-semibold text-zinc-500 mb-4">
                Fulfilling items will automatically decrement inventory levels at warehouse <span className="font-bold text-zinc-800">{selectedOrder.warehouse}</span> and post double-entry COGS GL Voucher to Finance.
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
                  <label className="block text-xs font-bold text-zinc-700 mb-2">Quantities to Dispatch</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedOrder.items.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl text-xs font-semibold">
                        <div>
                          <div className="font-bold text-zinc-900">{item.name}</div>
                          <div className="text-[10px] text-zinc-500">Ordered: {item.qty} {item.unit}</div>
                        </div>
                        <input 
                          type="number" 
                          value={fulfillQtys[item.productId] ?? item.qty}
                          onChange={(e) => setFulfillQtys({ ...fulfillQtys, [item.productId]: Number(e.target.value) })}
                          className="w-20 px-2 py-1 rounded-lg border border-zinc-200 bg-white text-right font-mono font-bold"
                        />
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
                  Confirm Dispatch & Post COGS
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
              <h2 className="text-xl font-black text-zinc-950 mb-1">Generate Sales Invoice in Finance</h2>
              <p className="text-xs font-semibold text-zinc-500 mb-4">
                Creates an Accounts Receivable invoice in <span className="font-bold text-zinc-800">useFinanceStore</span> for customer <span className="font-bold text-zinc-800">{selectedOrder.customer}</span>.
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
                  Create Invoice & AR Entry
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
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-xl font-black text-zinc-950 mb-1">Create HKC Sales Contract</h2>
              <p className="text-xs font-semibold text-zinc-500 mb-5">Draft a new sales contract into the Quote pipeline.</p>

              <form onSubmit={handleCreateOrder} className="space-y-4">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Fulfillment Warehouse</label>
                    <select 
                      value={newWarehouse}
                      onChange={(e) => setNewWarehouse(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      <option value="">Select warehouse</option>
                      {warehouseOptions.map((warehouse) => (
                        <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Item Product</label>
                    <select 
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Contract Description</label>
                  <textarea 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold outline-none resize-none" 
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
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
