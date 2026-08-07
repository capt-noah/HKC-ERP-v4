import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  CheckCircle2,
  Building2,
  Truck,
  Sparkles,
  X,
  Play,
  Trash2,
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { useErpStore } from "@/lib/erpStore"
import { useFeedback } from "@/context/FeedbackContext"
import { Skeleton } from "@/components/ui/skeleton"

function ProcessingServicesSkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-b border-zinc-150/40">
          <td className="px-3 py-4"><Skeleton className="h-4 w-24 bg-zinc-200/80" /></td>
          <td className="px-3 py-4"><div className="space-y-1.5"><Skeleton className="h-4 w-36 bg-zinc-200/80" /><Skeleton className="h-3 w-24 bg-zinc-200/80" /></div></td>
          <td className="px-3 py-4"><div className="space-y-1.5"><Skeleton className="h-4 w-32 bg-zinc-200/80" /><Skeleton className="h-3 w-20 bg-zinc-200/80" /></div></td>
          <td className="px-3 py-4"><Skeleton className="h-4 w-24 bg-zinc-200/80" /></td>
          <td className="px-3 py-4"><Skeleton className="h-5 w-24 rounded-full mx-auto bg-zinc-200/80" /></td>
          <td className="px-3 py-4"><Skeleton className="h-4 w-24 ml-auto bg-zinc-200/80" /></td>
          <td className="px-3 py-4 pr-4"><Skeleton className="h-7 w-24 rounded-xl mx-auto bg-zinc-200/80" /></td>
        </tr>
      ))}
    </>
  )
}
import {
  type ProcessingServiceOrder,
  type ProcessingServiceStage,
  fetchProcessingServices,
  createProcessingService,
  transitionProcessingServiceStage,
  deleteProcessingService,
} from "@/lib/processingServicesApi"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const STAGE_COLOR_MAP: Record<ProcessingServiceStage, { bg: string; text: string; border: string }> = {
  Draft: { bg: "bg-zinc-500/10", text: "text-zinc-700 dark:text-zinc-300", border: "border-zinc-500/20" },
  Received: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20" },
  "In Progress": { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20" },
  Processed: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20" },
  "Picked Up/Delivered": { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/20" },
}

const serviceOrderColumns: TableColumn[] = [
  { key: "reference_number", label: "Ref Number", align: "left" },
  { key: "client_company_name", label: "Client Company", align: "left" },
  { key: "goods_description", label: "Raw Commodity", align: "left" },
  { key: "entry_date", label: "Entry Date", align: "left" },
  { key: "status", label: "Stage Status", align: "center" },
  { key: "agreed_price", label: "Agreed Fee", align: "right" },
  { key: "_actions", label: "Action", align: "center", noSort: true },
]

export default function ProcessingServices() {
  const { showToast } = useFeedback()
  const erp = useErpStore()
  const customers = erp.getCustomers()

  const [services, setServices] = useState<ProcessingServiceOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [stageFilter, setStageFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedOrder, setSelectedOrder] = useState<ProcessingServiceOrder | null>(null)

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Form State
  const [clientName, setClientName] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [goodsDescription, setGoodsDescription] = useState("")
  const [quantity, setQuantity] = useState<number | "">(500)
  const [uom, setUom] = useState("Quintal")
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0])
  const [agreedPrice, setAgreedPrice] = useState<number | "">(75000)
  const [assignedTo] = useState("Abebe Bikila (Task Manager)")
  const [notes, setNotes] = useState("")

  const loadServices = async () => {
    setIsLoading(true)
    try {
      const data = await fetchProcessingServices()
      setServices(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [])

  // Action: Create Service Order (Sales Admin role)
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetClient = clientName.trim() || customers.find((c) => c.id === selectedCustomerId)?.name || "Client Company"

    if (!goodsDescription || !quantity || !agreedPrice) {
      showToast("Validation Error", "warning", "Please fill in goods description, quantity, and agreed price.")
      return
    }

    setIsSubmitting(true)
    try {
      const created = await createProcessingService({
        client_company_name: targetClient,
        customer_id: selectedCustomerId || null,
        goods_description: goodsDescription,
        quantity: Number(quantity),
        uom,
        entry_date: entryDate,
        agreed_price: Number(agreedPrice),
        currency: "ETB",
        status: "Draft",
        assigned_to: assignedTo,
        notes,
      })

      showToast("Service Order Created", "success", `Order ${created.reference_number || created.id} registered for ${targetClient}.`)
      setIsCreateOpen(false)
      setGoodsDescription("")
      setClientName("")
      loadServices()
    } catch (err) {
      showToast("Creation Failed", "warning", err instanceof Error ? err.message : "Failed to create processing service order.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Action: Transition Stage (Task Manager / Operations role)
  const handleTransitionStage = async (id: string, targetStage: ProcessingServiceStage) => {
    try {
      const result = await transitionProcessingServiceStage(id, targetStage)
      if (result.ok) {
        if (targetStage === "Processed" && result.journalEntry) {
          showToast(
            "Service Processed & Billed!",
            "success",
            `Processing complete for ${id}! Accounts Receivable Invoice generated & Service Revenue GL Voucher posted.`
          )
        } else {
          showToast("Stage Updated", "info", `Order ${id} advanced to stage '${targetStage}'.`)
        }
        loadServices()
        if (selectedOrder?.id === id) {
          setSelectedOrder(result)
        }
      }
    } catch (err) {
      showToast("Transition Failed", "warning", err instanceof Error ? err.message : "Could not update stage.")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProcessingService(id)
      showToast("Order Deleted", "info", `Processing service order ${id} deleted.`)
      setSelectedOrder(null)
      loadServices()
    } catch (err) {
      showToast("Delete Error", "warning", "Failed to delete order.")
    }
  }

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.client_company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.goods_description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = stageFilter === "ALL" || s.status === stageFilter
    return matchesSearch && matchesStage
  })

  const ordersTable = useResizableTable<ProcessingServiceOrder>(serviceOrderColumns, filteredServices, {
    reference_number: 140,
    client_company_name: 200,
    goods_description: 200,
    entry_date: 120,
    status: 150,
    agreed_price: 130,
    _actions: 120,
  })

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={fade} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-black tracking-tight">Warehouse 1 Processing Services</h1>
            </div>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Client toll-processing contract management, washing, sorting, milling, and automated service revenue recognition.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/inventory")} />
          </div>
        </div>

        {/* Stock Register Designed Table Container */}
        <GlassCard className="flex flex-col overflow-hidden p-0 border border-white/65 shadow-md">
          <div className="px-6 pt-6">
            <FinanceTableToolbar
              title="Processing Services Register"
              subtitle={`Total: ${ordersTable.sorted().length} service orders`}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search PS number, client, or commodity..."
              filters={[
                {
                  value: stageFilter,
                  onChange: (val) => setStageFilter(val),
                  ariaLabel: "Filter by Stage",
                  options: [
                    { value: "ALL", label: "All Stages" },
                    { value: "Draft", label: "Draft" },
                    { value: "Received", label: "Received" },
                    { value: "In Progress", label: "In Progress" },
                    { value: "Processed", label: "Processed" },
                    { value: "Picked Up/Delivered", label: "Picked Up/Delivered" },
                  ],
                },
              ]}
              actions={[
                {
                  label: "Create Service Order",
                  onClick: () => setIsCreateOpen(true),
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
                  {serviceOrderColumns.map((col) => (
                    <ResizableTh
                      key={col.key}
                      col={col}
                      width={ordersTable.colWidths[col.key] || 120}
                      sortKey={ordersTable.sortKey}
                      sortDir={ordersTable.sortDir}
                      openMenuCol={ordersTable.openMenuCol}
                      onResizeStart={ordersTable.handleResizeStart}
                      onToggleMenu={ordersTable.toggleMenu}
                      onSortAsc={ordersTable.setSortAsc}
                      onSortDesc={ordersTable.setSortDesc}
                      onClearSort={ordersTable.clearSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {isLoading ? (
                  <ProcessingServicesSkeletonRows />
                ) : ordersTable.sorted().length === 0 ? (
                  <tr>
                    <td colSpan={serviceOrderColumns.length} className="px-4 py-8 text-center text-xs font-semibold text-zinc-400">
                      No processing service orders found matching criteria.
                    </td>
                  </tr>
                ) : (
                  ordersTable.sorted().map((order) => {
                    const colors = STAGE_COLOR_MAP[order.status] || STAGE_COLOR_MAP.Draft

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="border-b border-zinc-150/40 hover:bg-zinc-50/60 transition-colors text-xs cursor-pointer"
                      >
                        <td style={{ width: `${ordersTable.colWidths.reference_number}px` }} className="px-3 py-3 whitespace-nowrap font-mono font-bold text-zinc-900 truncate">
                          {order.reference_number || order.id}
                        </td>
                        <td style={{ width: `${ordersTable.colWidths.client_company_name}px` }} className="px-3 py-3 truncate">
                          <div className="font-bold text-zinc-900">{order.client_company_name}</div>
                          <div className="text-[10px] text-zinc-400">{order.assigned_to}</div>
                        </td>
                        <td style={{ width: `${ordersTable.colWidths.goods_description}px` }} className="px-3 py-3 truncate">
                          <div className="font-bold text-zinc-800">{order.goods_description}</div>
                          <div className="text-[10px] font-mono text-zinc-500">
                            {order.quantity} {order.uom}
                          </div>
                        </td>
                        <td style={{ width: `${ordersTable.colWidths.entry_date}px` }} className="px-3 py-3 font-mono font-semibold text-zinc-600 truncate">
                          {order.entry_date}
                        </td>
                        <td style={{ width: `${ordersTable.colWidths.status}px` }} className="px-3 py-3 text-center whitespace-nowrap truncate">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ width: `${ordersTable.colWidths.agreed_price}px` }} className="px-3 py-3 text-right font-mono font-black text-zinc-950 truncate">
                          ETB {order.agreed_price.toLocaleString()}
                        </td>
                        <td style={{ width: `${ordersTable.colWidths._actions}px` }} className="px-3 py-3 text-center whitespace-nowrap truncate pr-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOrder(order)
                            }}
                            className="px-3 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-[11px] transition-colors shadow-xs"
                          >
                            View Details
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

        {/* Modal Dialog for Processing Service Order Details & Transition Controls */}
        <AnimatePresence>
          {selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 dark:border-zinc-800"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 mb-6 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">TOLL PROCESSING SERVICE ORDER</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${STAGE_COLOR_MAP[selectedOrder.status].bg} ${STAGE_COLOR_MAP[selectedOrder.status].text} ${STAGE_COLOR_MAP[selectedOrder.status].border}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black font-mono text-zinc-950 dark:text-zinc-50 mt-1">
                      {selectedOrder.reference_number || selectedOrder.id}
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-500 transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Client / Customer</span>
                    <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mt-0.5">
                      <Building2 className="size-4 text-blue-600" /> {selectedOrder.client_company_name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Raw Commodity</span>
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 block">{selectedOrder.goods_description}</span>
                    </div>
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Quantity</span>
                      <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                        {selectedOrder.quantity} {selectedOrder.uom}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Agreed Processing Fee</span>
                      <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                        ETB {selectedOrder.agreed_price.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Entry Date</span>
                      <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 block">{selectedOrder.entry_date}</span>
                    </div>
                  </div>

                  {selectedOrder.invoice_id && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">AR Revenue Invoice Generated</span>
                      <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-200">{selectedOrder.invoice_id}</span>
                    </div>
                  )}

                  {/* Operational Stage Transition Controls */}
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2">Operational Stage Transition Controls</div>

                    {selectedOrder.status === "Draft" && (
                      <button
                        onClick={() => handleTransitionStage(selectedOrder.id, "Received")}
                        className="w-full py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <Truck className="size-4" /> Confirm Goods Arrival (Mark Received)
                      </button>
                    )}

                    {selectedOrder.status === "Received" && (
                      <button
                        onClick={() => handleTransitionStage(selectedOrder.id, "In Progress")}
                        className="w-full py-2.5 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 shadow-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <Play className="size-4" /> Start Milling & Processing
                      </button>
                    )}

                    {selectedOrder.status === "In Progress" && (
                      <button
                        onClick={() => handleTransitionStage(selectedOrder.id, "Processed")}
                        className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <Sparkles className="size-4" /> Complete Processing & Bill Client (Recognize Revenue)
                      </button>
                    )}

                    {selectedOrder.status === "Processed" && (
                      <button
                        onClick={() => handleTransitionStage(selectedOrder.id, "Picked Up/Delivered")}
                        className="w-full py-2.5 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700 shadow-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <CheckCircle2 className="size-4" /> Confirm Client Pickup / Final Delivery
                      </button>
                    )}

                    {selectedOrder.status === "Picked Up/Delivered" && (
                      <div className="p-3.5 bg-purple-500/10 text-purple-900 dark:text-purple-200 border border-purple-500/30 text-center font-bold text-xs rounded-xl">
                        Order Fully Completed & Goods Dispatched
                      </div>
                    )}

                    <button
                      onClick={() => handleDelete(selectedOrder.id)}
                      className="w-full mt-3 py-2 border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Trash2 className="size-4" /> Delete Service Order
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>



        {/* MODAL: CREATE PROCESSING SERVICE ORDER */}
        <AnimatePresence>
          {isCreateOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Create Processing Service Order</h3>
                    <p className="text-xs text-zinc-500">Register a new client toll-processing contract at WH1.</p>
                  </div>
                  <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400">
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Client / Customer Company</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value)
                        const matched = customers.find((c) => c.id === e.target.value)
                        if (matched) setClientName(matched.name)
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium outline-none mb-1.5"
                    >
                      <option value="">-- Select B2B Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Or enter custom client company name..."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Raw Commodity Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Raw Arabica Coffee Beans (Grade 4 Unwashed)"
                      value={goodsDescription}
                      onChange={(e) => setGoodsDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Unit of Measure (UOM)</label>
                      <select
                        value={uom}
                        onChange={(e) => setUom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold outline-none"
                      >
                        <option value="Quintal">Quintal</option>
                        <option value="Kg">Kg</option>
                        <option value="Bags">Bags</option>
                        <option value="Tons">Tons</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Agreed Service Fee (ETB)</label>
                      <input
                        type="number"
                        min="0"
                        value={agreedPrice}
                        onChange={(e) => setAgreedPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-black outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Entry Date</label>
                      <input
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Operational Notes / Special Processing Instructions</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Toll milling, moisture testing, custom packaging..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 py-2 rounded-full border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-full bg-zinc-950 text-white font-bold hover:bg-zinc-800 shadow-md"
                    >
                      {isSubmitting ? "Creating..." : "Save Service Order"}
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
