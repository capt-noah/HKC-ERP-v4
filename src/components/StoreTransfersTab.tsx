import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  X, 
  Warehouse as WarehouseIcon, 
  Calendar, 
  Eye, 
  Check, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  Download, 
  Clock,
  ArrowRight,
  Edit
} from "lucide-react"
import { useFeedback } from "@/context/FeedbackContext"
import { useErpStore, type Transfer, type TransferLineItem, type TransferStatus } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { type TableColumn } from "@/components/ResizableTable"
import { DataTable } from "@/components/DataTable"

export type { TransferStatus, TransferLineItem, Transfer }

const transferColumns: TableColumn[] = [
  { key: "reference_number", label: "TIN / Ref No.", align: "left" },
  { key: "from_warehouse", label: "Sender Warehouse", align: "left" },
  { key: "to_warehouse", label: "Receiver Warehouse", align: "left" },
  { key: "total_quantity", label: "Total Quantity", align: "right" },
  { key: "date", label: "Initiation Date", align: "left" },
  { key: "status", label: "Transfer Status", align: "center" },
  { key: "_actions", label: "Actions", align: "center", noSort: true },
]

export default function StoreTransfersTab() {
  const { showToast } = useFeedback()
  const erp = useErpStore()

  // --- TRANSFERS DATA FROM STORE ---
  const transfers = erp.getTransfers()
  const products = erp.getProducts()
  const warehouses = withOperatingWarehouses(erp.getWarehouses())
  const warehouseOptions = useMemo(() => warehouses.map((warehouse) => warehouse.code || warehouse.id).filter(Boolean), [warehouses])
  const currentWarehouse = warehouseOptions[0] || ""
  const currentWarehouseRecord = warehouses.find((warehouse) => (warehouse.code || warehouse.id) === currentWarehouse)
  const currentOperator = currentWarehouseRecord?.manager || "Store Manager"
  const currentSignature = currentOperator

  // --- LIST FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | TransferStatus>("ALL")

  // --- WIZARD FORM / VIEW STATES ---
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null) // For detail view
  const [isFormOpen, setIsFormOpen] = useState(false) // Form panel trigger

  // Lock body scroll when drawer or document is open
  useEffect(() => {
    if (isFormOpen || selectedTransfer !== null) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isFormOpen, selectedTransfer])

  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [wizardStep, setWizardStep] = useState<1 | 2>(1) // Step 1: Edit Form, Step 2: Confirm Issue

  // --- FORM DATA STATE ---
  const [formRefNum, setFormRefNum] = useState("")
  const [formFromW, setFormFromW] = useState("")
  const [formToW, setFormToW] = useState("")
  const [formLineItems, setFormLineItems] = useState<TransferLineItem[]>([])
  const [formSubmitted, setFormSubmitted] = useState(false)
// --- RECEIPT MODAL STATE ---
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [receiptMode, setReceiptMode] = useState<"match" | "discrepancy">("match")
  const [discrepancyText, setDiscrepancyText] = useState("")

  // --- EXPORT LOADING STATE ---
  const [isExporting, setIsExporting] = useState(false)

  // --- LIVE AUTO-CALC TOTAL IN FORM ---
  const formTotalQuantity = useMemo(() => {
    return formLineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  }, [formLineItems])

    // --- START NEW TRANSFER ---
  const handleInitiateNew = () => {
    if (!currentWarehouse) {
      showToast("Warehouse required", "warning", "Create a warehouse in Supabase before initiating a transfer.")
      return
    }
    if (warehouseOptions.length < 2) {
      showToast("Destination required", "warning", "At least two saved warehouses are required for a transfer.")
      return
    }

    // Auto-increment reference number based on state
    const nextNum = transfers.length + 1
    const padNum = String(nextNum).padStart(4, "0")
    const refNum = `TR-${padNum}`

    setFormMode("create")
    setFormRefNum(refNum)
    setFormFromW(currentWarehouse)
    setFormSubmitted(false)

    // Find first warehouse that is different
    const diffW = warehouseOptions.find(w => w !== currentWarehouse) || ""
    setFormToW(diffW)

    setFormLineItems([
      { line_no: 1, item: "", UOM: "", quantity: 0, remark: "" }
    ])

    setWizardStep(1)
    setIsFormOpen(true)
  }

  // --- FORM LINE ITEM MANIPULATION ---
  const handleAddLineRow = () => {
    const nextLineNo = formLineItems.length + 1
    setFormLineItems(prev => [
      ...prev,
      { line_no: nextLineNo, item: "", UOM: "", quantity: 0, remark: "" }
    ])
  }

  const handleRemoveLineRow = (index: number) => {
    if (formLineItems.length <= 1) {
      showToast("Validation Warning", "warning", "A transfer must contain at least 1 line item.")
      return
    }
    const filtered = formLineItems.filter((_, idx) => idx !== index)
    // Re-index line numbers
    const updated = filtered.map((item, idx) => ({ ...item, line_no: idx + 1 }))
    setFormLineItems(updated)
  }

  const getAvailableStock = (itemName: string) => {
    if (!itemName || !formFromW) return 0
    const prod = products.find(p => p.name.toLowerCase() === itemName.toLowerCase())
    if (!prod) return 0
    return prod.stockBreakdown?.find(sb => sb.warehouse === formFromW)?.qty ?? 0
  }

  const handleUpdateLineItem = (index: number, field: keyof TransferLineItem, value: any) => {
    setFormLineItems(prev => prev.map((row, idx) => {
      if (idx === index) {
        let updatedRow = { ...row, [field]: value }
        
        // Smart auto-fill: UOM and From Warehouse
        if (field === "item" && value) {
          const matchedProd = products.find(p => p.name.toLowerCase() === value.toLowerCase() || p.id === value)
          if (matchedProd) {
            if (matchedProd.unit) {
              updatedRow.UOM = matchedProd.unit
            }
            if (matchedProd.warehouse) {
              // Auto set origin warehouse to where this product has stock
              const sbWarehouses = (matchedProd.stockBreakdown || [])
                .filter(sb => sb.qty > 0)
                .map(sb => sb.warehouse)
              
              const primaryW = sbWarehouses[0] || matchedProd.warehouse
              if (primaryW) {
                setFormFromW(primaryW)
              }
            }
          }
        }
        return updatedRow
      }
      return row
    }))
  }

  // --- VALIDATE FORM STEP 1 AND ADVANCE ---
  const handleContinueToConfirm = () => {
    setFormSubmitted(true)
    if (!formFromW || !formToW) {
      showToast("Validation Error", "warning", "Please select both origin and destination warehouses.")
      return
    }
    if (formFromW === formToW) {
      showToast("Validation Error", "warning", "Origin and destination warehouses must be different.")
      return
    }
    // Check line product names are not empty
    const hasEmptyItem = formLineItems.some(item => !item.item || !item.item.trim())
    if (hasEmptyItem) {
      showToast("Validation Error", "warning", "All line items must have a product name filled in.")
      return
    }
    // Check line quantities
    const hasInvalidQty = formLineItems.some(item => Number(item.quantity) <= 0)
    if (hasInvalidQty) {
      showToast("Validation Error", "warning", "All line item quantities must be greater than zero.")
      return
    }

    // Check line quantities do not exceed available stock in origin warehouse
    const hasExceededQty = formLineItems.some(item => {
      if (!item.item) return false
      const avail = getAvailableStock(item.item)
      return Number(item.quantity) > avail
    })
    if (hasExceededQty) {
      showToast("Validation Error", "warning", "One or more line items exceed the available warehouse stock.")
      return
    }

    setWizardStep(2) // Move to Confirm Issue screen
  }

  // --- CONFIRM AND ISSUE ---
  const handleConfirmAndIssue = () => {
    const todayStr = new Date().toISOString().replace("T", " ").substring(0, 16)
    
    const payload: Transfer = {
      reference_number: formRefNum,
      from_warehouse: formFromW,
      to_warehouse: formToW,
      status: "Issued",
      line_items: formLineItems,
      total_quantity: formTotalQuantity,
      date: new Date().toISOString().split("T")[0],
      issued_by: currentOperator,
      issued_at: todayStr,
      issued_signature: currentSignature
    }

    const res = erp.addStockTransfer(payload)

    showToast(
      "Transfer Issued & Logged",
      "success",
      `Stock units dispatched from ${formFromW} to ${formToW}. ${res.journalEntryId ? `GL Voucher ${res.journalEntryId} recorded in Finance.` : ""}`
    )

    setIsFormOpen(false)
    if (selectedTransfer && selectedTransfer.reference_number === formRefNum) {
      setSelectedTransfer(payload)
    }
  }

  // --- CONFIRM RECEIPT PROCESS ---
  const handleConfirmReceiptSubmit = () => {
    if (!selectedTransfer) return

    if (receiptMode === "match") {
      erp.updateTransferStatus(selectedTransfer.reference_number, "Received", currentOperator)
      showToast(
        "Shipment Received",
        "success",
        `Transfer ${selectedTransfer.reference_number} marked complete. Warehouse stock levels updated.`
      )
    } else {
      if (!discrepancyText.trim()) {
        showToast("Validation Warning", "warning", "Please specify details of the reported discrepancy.")
        return
      }
      erp.updateTransferStatus(selectedTransfer.reference_number, "Discrepancy", currentOperator, discrepancyText)
      showToast(
        "Discrepancy Logged",
        "warning",
        `Transfer ${selectedTransfer.reference_number} flagged with discrepancy. Quality Assurance notified.`
      )
    }

    const updated = erp.getTransfers().find(t => t.reference_number === selectedTransfer.reference_number)
    if (updated) setSelectedTransfer(updated)
    setIsReceiptOpen(false)
    setDiscrepancyText("")
  }

  // --- DOCUMENT DOWNLOAD ---
  const handleDownloadPDF = (refNum: string) => {
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
      showToast(
        "Document Export Complete",
        "success",
        `Downloaded compliance Material Transfer Note ${refNum}.pdf`
      )
    }, 1500)
  }

  // Dynamic warehouses computed based on the first line item's selected product
  const availableWarehouses = useMemo(() => {
    const firstLineProduct = formLineItems[0]?.item
    if (!firstLineProduct) return warehouseOptions

    const matchedProd = products.find(p => p.name.toLowerCase() === firstLineProduct.toLowerCase())
    if (!matchedProd) return warehouseOptions

    const sbWarehouses = (matchedProd.stockBreakdown || [])
      .filter(sb => sb.qty > 0)
      .map(sb => sb.warehouse)
    
    if (sbWarehouses.length === 0 && matchedProd.quantity > 0 && matchedProd.warehouse) {
      sbWarehouses.push(matchedProd.warehouse)
    }

    return sbWarehouses.length > 0 ? sbWarehouses : warehouseOptions
  }, [formLineItems, products, warehouseOptions])

  // Automatically select first available warehouse if current formFromW isn't in it
  useEffect(() => {
    if (isFormOpen && formMode === "create") {
      if (!availableWarehouses.includes(formFromW)) {
        setFormFromW(availableWarehouses[0] || "")
      }
    }
  }, [availableWarehouses, formFromW, isFormOpen, formMode])

  // Automatically adjust destination warehouse to not match origin
  useEffect(() => {
    if (formFromW && formFromW === formToW) {
      const other = warehouseOptions.find(w => w !== formFromW) || ""
      setFormToW(other)
    }
  }, [formFromW, formToW, warehouseOptions])

  // --- FILTERED TRANSFERS ---
  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter
      
      const lowerQuery = searchQuery.toLowerCase()
      const matchesSearch = 
        t.reference_number.toLowerCase().includes(lowerQuery) ||
        t.from_warehouse.toLowerCase().includes(lowerQuery) ||
        t.to_warehouse.toLowerCase().includes(lowerQuery) ||
        t.line_items.some(item => item.item.toLowerCase().includes(lowerQuery))

      return matchesStatus && matchesSearch
    })
  }, [transfers, searchQuery, statusFilter])



  return (
    <div className="space-y-6">
      <DataTable
        title="Warehouse Transfers"
        subtitle={`${filteredTransfers.length} inter-warehouse movements recorded`}
        columns={transferColumns}
        data={filteredTransfers}
        isLoading={false}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search TIN, From/To, Item..."
        onRowClick={(transfer) => setSelectedTransfer(transfer)}
        keyExtractor={(transfer) => transfer.reference_number}
        actions={
          warehouseOptions.length > 1
            ? [
                {
                  label: "New Entry",
                  onClick: handleInitiateNew,
                  icon: <Plus className="size-4" />,
                  variant: "primary",
                },
              ]
            : []
        }
        filters={[
          {
            value: statusFilter,
            onChange: (val) => setStatusFilter(val as any),
            ariaLabel: "Filter by Status",
            options: [
              { value: "ALL", label: "All Statuses" },
              { value: "Issued", label: "Issued / In Transit" },
              { value: "Received", label: "Received & Posted" },
              { value: "Discrepancy", label: "Discrepancy Flagged" },
            ],
          },
        ]}
        defaultWidths={{
          reference_number: 160,
          from_warehouse: 180,
          to_warehouse: 180,
          total_quantity: 140,
          date: 140,
          status: 140,
          _actions: 120,
        }}
        renderRow={(transfer, colWidths) => {
          const isIssued = transfer.status === "Issued"
          const isReceived = transfer.status === "Received"
          const isDiscrepancy = transfer.status === "Discrepancy"

          const statusPillColors = 
            isReceived ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            isIssued ? "bg-blue-50 text-blue-700 border-blue-200" :
            isDiscrepancy ? "bg-amber-50 text-amber-800 border-amber-300/80 animate-pulse" :
            "bg-zinc-100 text-zinc-700 border-zinc-200"

          const canEdit = isIssued || isDiscrepancy

          return (
            <>
              {/* Reference Num */}
              <td style={{ width: `${colWidths.reference_number}px` }} className="py-4 px-6 overflow-hidden">
                <span className="font-mono font-black text-zinc-950 text-xs leading-none">
                  {transfer.reference_number}
                </span>
              </td>

              {/* From Warehouse */}
              <td style={{ width: `${colWidths.from_warehouse}px` }} className="py-4 px-4 overflow-hidden">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                  <WarehouseIcon className="size-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{transfer.from_warehouse}</span>
                </div>
              </td>

              {/* To Warehouse */}
              <td style={{ width: `${colWidths.to_warehouse}px` }} className="py-4 px-4 overflow-hidden">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                  <WarehouseIcon className="size-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{transfer.to_warehouse}</span>
                </div>
              </td>

              {/* Total Quantity */}
              <td style={{ width: `${colWidths.total_quantity}px` }} className="py-4 px-4 text-right overflow-hidden">
                <span className="font-mono font-extrabold text-xs text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200/50 inline-block">
                  {transfer.total_quantity.toLocaleString()} units
                </span>
              </td>

              {/* Date */}
              <td style={{ width: `${colWidths.date}px` }} className="py-4 px-4 overflow-hidden">
                <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 font-mono">
                  <Calendar className="size-3 text-zinc-400" />
                  <span>{transfer.date}</span>
                </div>
              </td>

              {/* Status */}
              <td style={{ width: `${colWidths.status}px` }} className="py-4 px-4 text-center overflow-hidden">
                <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${statusPillColors}`}>
                  {transfer.status}
                </span>
              </td>

              {/* Custom Actions */}
              <td style={{ width: `${colWidths._actions}px` }} className="py-4 px-6 text-center overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-center gap-1.5">
                  {/* View Details */}
                  <button
                    onClick={() => setSelectedTransfer(transfer)}
                    className="p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-800 transition-colors"
                    title="View Details"
                  >
                    <Eye className="size-3.5" />
                  </button>

                  {/* Edit Action */}
                  {canEdit && (
                    <button
                      onClick={() => {
                        setFormMode("edit")
                        setFormRefNum(transfer.reference_number)
                        setFormFromW(transfer.from_warehouse)
                        setFormToW(transfer.to_warehouse)
                        setFormLineItems(transfer.line_items)
                        setFormSubmitted(false)
                        setWizardStep(1)
                        setIsFormOpen(true)
                      }}
                      className="p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-800 transition-colors"
                      title="Edit Transfer"
                    >
                      <Edit className="size-3.5" />
                    </button>
                  )}

                </div>
              </td>
            </>
          )
        }}
      />

      {/* =========================================================================
          3. CREATE / EDIT DRAFT WIZARD PANEL (SCREEN 2 & SCREEN 3)
          ========================================================================= */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            {/* Center Modal Container */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 border-b border-zinc-200/60 shrink-0 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      Stock Register
                    </span>
                    <h2 className="text-xl font-black text-zinc-950 dark:text-white tracking-tight leading-none">
                      {formMode === "create" ? "New Transfer Entry" : "Edit Transfer Entry"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="size-8 rounded-full border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center transition-colors text-zinc-500"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* SCROLLABLE BODY CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* STEP PROGRESS BAR */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`h-1 rounded-full ${wizardStep >= 1 ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200"}`} />
                    <div className={`h-1 rounded-full ${wizardStep >= 2 ? "bg-zinc-950 dark:bg-white" : "bg-zinc-200"}`} />
                  </div>

                  {/* WIZARD STEP 1: FORM EDITING (SCREEN 2) */}
                  {wizardStep === 1 && (
                    <div className="space-y-5">
                      {/* Warehouses configuration */}
                      <div className="grid grid-cols-2 gap-4 bg-zinc-100/50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-700/40">
                        <div>
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">
                            From Warehouse (Origin)
                          </label>
                          <select
                            value={formFromW}
                            onChange={e => setFormFromW(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-xl text-xs font-black outline-none cursor-pointer focus:border-zinc-950 dark:focus:border-white text-zinc-800 dark:text-zinc-200"
                          >
                            {availableWarehouses.map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                          <span className="text-[9px] text-zinc-400 mt-1 block font-bold leading-tight">
                            Select dispatching storage facility.
                          </span>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">
                            To Warehouse (Destination)
                          </label>
                          <select
                            value={formToW}
                            onChange={e => setFormToW(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-xl text-xs font-black outline-none cursor-pointer focus:border-zinc-950 dark:focus:border-white text-zinc-800 dark:text-zinc-200"
                          >
                            {warehouseOptions.filter(w => w !== formFromW).map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                          <span className="text-[9px] text-zinc-400 mt-1 block font-bold leading-tight">
                            Select receiving storage vault.
                          </span>
                        </div>
                      </div>

                      {/* Line Items Container */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-zinc-200/50">
                          <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                            Material Line Items List
                          </h4>
                          <button
                            type="button"
                            onClick={handleAddLineRow}
                            className="flex items-center gap-1 text-[10px] font-black text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors uppercase tracking-tight"
                          >
                            <Plus className="size-3.5" /> Add Row
                          </button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                          {formLineItems.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-zinc-850 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm relative">
                              {/* Product Selection */}
                              <div className="col-span-4">
                                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block mb-0.5">Product</label>
                                <div className={`flex items-center rounded-lg px-2 py-1 transition-all ${
                                  formSubmitted && (!row.item || !row.item.trim())
                                    ? "bg-red-50 dark:bg-red-950/30 border border-red-500 shadow-sm shadow-red-100"
                                    : "border border-zinc-200/60 dark:border-zinc-700 focus-within:border-zinc-400 focus-within:bg-zinc-50/50"
                                }`}>
                                  <input
                                    type="text"
                                    list="products-suggestions"
                                    placeholder="Enter product name..."
                                    value={row.item}
                                    onChange={e => handleUpdateLineItem(idx, "item", e.target.value)}
                                    className="w-full bg-transparent border-0 text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200 outline-none p-0"
                                  />
                                </div>
                                <datalist id="products-suggestions">
                                  {products.map(p => (
                                    <option key={p.id} value={p.name} />
                                  ))}
                                </datalist>
                              </div>

                              {/* UOM */}
                              <div className="col-span-2">
                                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block mb-0.5">UOM</label>
                                <select
                                  value={row.UOM}
                                  onChange={e => handleUpdateLineItem(idx, "UOM", e.target.value)}
                                  className="w-full bg-transparent border-0 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 outline-none p-0 cursor-pointer"
                                >
                                  {Array.from(new Set(products.map((product) => product.unit).filter(Boolean))).map(u => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Quantity */}
                              <div className="col-span-2">
                                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block mb-0.5">Qty</label>
                                {(() => {
                                  const availableStock = getAvailableStock(row.item)
                                  const exceedsStock = row.item && row.quantity && Number(row.quantity) > availableStock
                                  return (
                                    <>
                                      <div className={`flex items-center rounded-lg px-2 py-1 transition-all border ${
                                        exceedsStock
                                          ? "bg-rose-50 dark:bg-rose-950/30 border-rose-500 shadow-sm shadow-rose-100"
                                          : "border-zinc-200/60 dark:border-zinc-700 focus-within:border-zinc-400"
                                      }`}>
                                        <input
                                          type="number"
                                          required
                                          value={row.quantity}
                                          min="1"
                                          onChange={e => handleUpdateLineItem(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                                          className="w-full bg-transparent border-0 text-[11px] font-mono font-black text-zinc-900 dark:text-zinc-100 outline-none p-0"
                                        />
                                      </div>
                                      {row.item && (
                                        <span className={`text-[8px] font-black block mt-0.5 tracking-tight ${
                                          exceedsStock ? "text-rose-600 dark:text-rose-400" : "text-zinc-400 dark:text-zinc-500"
                                        }`}>
                                          Avail: {availableStock}
                                        </span>
                                      )}
                                    </>
                                  )
                                })()}
                              </div>

                              {/* Remark */}
                              <div className="col-span-3">
                                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block mb-0.5">Remark</label>
                                <input
                                  type="text"
                                  placeholder="Notes..."
                                  value={row.remark || ""}
                                  onChange={e => handleUpdateLineItem(idx, "remark", e.target.value)}
                                  className="w-full bg-transparent border-0 text-[11px] text-zinc-500 outline-none p-0 font-medium"
                                />
                              </div>

                              {/* Trash action */}
                              <div className="col-span-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineRow(idx)}
                                  className="p-1 rounded text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* LIVE AUTO-CALC TOTAL DISPLAY */}
                        <div className="flex items-center justify-between p-3.5 bg-zinc-900 rounded-xl text-white shadow-md">
                          <span className="text-[10px] font-black uppercase tracking-wider">Total:</span>
                          <strong className="font-mono text-xs font-black uppercase">
                            {formTotalQuantity.toLocaleString()} Units
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WIZARD STEP 2: SUMMARY & DIGITAL DISPATCH SIGNATURE (SCREEN 3) */}
                  {wizardStep === 2 && (
                    <div className="space-y-6">
                      <div className="border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-5 rounded-2xl shadow-inner space-y-4 relative">
                        <div className="border-b border-zinc-150 dark:border-zinc-700 pb-3 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Document Registry #</span>
                            <strong className="font-mono text-sm font-black text-zinc-950 dark:text-white">{formRefNum}</strong>
                          </div>
                          <span className="bg-blue-50 dark:bg-blue-950/45 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                            Ready for Dispatch
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block mb-0.5">Dispatched Origin (Sender)</span>
                            <span className="font-extrabold text-zinc-800 dark:text-zinc-200">{formFromW}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block mb-0.5">Designated Destination (Receiver)</span>
                            <span className="font-extrabold text-zinc-800 dark:text-zinc-200">{formToW}</span>
                          </div>
                        </div>

                        {/* Summary Table */}
                        <div className="border-t border-zinc-150 dark:border-zinc-700 pt-3">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block mb-2">Validated Material Ledger</span>
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="text-[8px] font-black text-zinc-400 uppercase border-b border-zinc-100 dark:border-zinc-700 pb-1">
                                <th className="py-1">No.</th>
                                <th className="py-1">Product Description</th>
                                <th className="py-1 text-center">UOM</th>
                                <th className="py-1 text-right">Dispatch Qty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700 font-bold text-zinc-700 dark:text-zinc-300">
                              {formLineItems.map((line, index) => (
                                <tr key={index}>
                                  <td className="py-1.5 font-mono text-zinc-400">{line.line_no}</td>
                                  <td className="py-1.5 text-zinc-950 dark:text-white">{line.item}</td>
                                  <td className="py-1.5 text-center text-zinc-500">{line.UOM}</td>
                                  <td className="py-1.5 text-right font-mono text-zinc-950 dark:text-white">{line.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Grand total */}
                        <div className="border-t border-zinc-150 dark:border-zinc-700 pt-3 flex justify-between text-xs font-black">
                          <span className="uppercase text-zinc-400">Total:</span>
                          <span className="font-mono text-zinc-950 dark:text-white">{formTotalQuantity} units</span>
                        </div>
                      </div>

                      {/* DIGITAL CERTIFICATION & REGISTERED SIGNATURE BOX */}
                      <div className="bg-zinc-150/40 dark:bg-zinc-800/40 p-4.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-3.5">
                        <div className="flex items-center gap-1.5">
                          <Shield className="size-4.5 text-zinc-800 dark:text-zinc-200 shrink-0" />
                          <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                            Digital Dispatch Certification
                          </h4>
                        </div>
                        <p className="text-[10px] font-bold text-zinc-500 leading-normal">
                          By authorizing this Material Transfer, you authenticate the shipment under compliance standards. 
                          Your registered digital signature will be embedded dynamically into the locked document below:
                        </p>

                        <div className="bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-750 rounded-xl p-4 flex items-center justify-between shadow-sm">
                          <div className="space-y-0.5">
                            <span className="text-[8px] font-black text-zinc-400 uppercase block">Authorized Operator</span>
                            <h5 className="text-xs font-black text-zinc-800 dark:text-zinc-200">{currentOperator}</h5>
                            <span className="text-[8px] font-bold text-zinc-400 uppercase block">{formFromW || "No warehouse"}</span>
                          </div>
                          <div className="text-right space-y-0.5">
                            <span className="text-[8px] font-black text-zinc-400 uppercase block mb-1">Pre-registered Digital Sig</span>
                            <span className="font-serif italic text-xs font-bold text-emerald-700 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800 px-3 py-1 rounded-md">
                              {currentSignature}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-zinc-200/80 bg-zinc-100/50 dark:bg-zinc-850 shrink-0 flex items-center justify-between">
                  {wizardStep === 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-4.5 py-2.5 rounded-full border border-zinc-300 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-black transition-colors uppercase tracking-tight"
                      >
                        Cancel Draft
                      </button>
                      <button
                        type="button"
                        onClick={handleContinueToConfirm}
                        className="px-5 py-2.5 rounded-full bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-150 text-white dark:text-zinc-950 text-xs font-black transition-all shadow-md active:scale-95 uppercase tracking-tight flex items-center gap-1"
                      >
                        Continue to Dispatch <ArrowRight className="size-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="px-4.5 py-2.5 rounded-full border border-zinc-300 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-black transition-colors uppercase tracking-tight"
                      >
                        Back to Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmAndIssue}
                        className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md active:scale-95 uppercase tracking-tight flex items-center gap-1"
                      >
                        <Check className="size-4" /> Sign & Dispatch Stock
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* =========================================================================
          4. MTN DETAIL & COMPLIANCE DOCUMENT VIEWER (SCREEN 5)
          ========================================================================= */}
      <AnimatePresence>
        {selectedTransfer && !isFormOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTransfer(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            {/* Center Compliance Document Modal Container */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 border-b border-zinc-200/60 shrink-0 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Transfer Form</span>
                    <h2 className="text-base font-black text-zinc-950 dark:text-white tracking-tight leading-none uppercase">
                      {selectedTransfer.reference_number}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedTransfer(null)}
                    className="size-8 rounded-full border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center transition-colors text-zinc-500"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* DOCUMENT SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="border border-zinc-250/60 dark:border-zinc-850 bg-white dark:bg-zinc-955 p-6 rounded-2xl shadow-sm space-y-5">
                    {/* Compliance header banner */}
                    <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h4 className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                          Material Transfer Note (MTN)
                        </h4>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase block mt-0.5">
                          Official internal transport clearance registry
                        </span>
                      </div>
                      <span className={`text-[9px] font-black px-2.5 py-0.5 rounded border uppercase tracking-wider ${
                        selectedTransfer.status === "Received" ? "bg-emerald-50 text-emerald-850 border-emerald-200" :
                        selectedTransfer.status === "Issued" ? "bg-blue-50 text-blue-800 border-blue-200" :
                        "bg-amber-50 text-amber-800 border-amber-300"
                      }`}>
                        {selectedTransfer.status}
                      </span>
                    </div>

                    {/* Routing section info card */}
                    <div className="grid grid-cols-2 gap-4 bg-zinc-100/50 dark:bg-zinc-800/40 p-4 rounded-xl text-xs">
                      <div>
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Origin (Sending Facility)</span>
                        <strong className="text-zinc-800 dark:text-zinc-200 block text-[11px] mt-0.5">{selectedTransfer.from_warehouse}</strong>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Destination (Receiving Vault)</span>
                        <strong className="text-zinc-800 dark:text-zinc-200 block text-[11px] mt-0.5">{selectedTransfer.to_warehouse}</strong>
                      </div>
                    </div>

                    {/* Material inventory lines table */}
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">Registered inventory items</span>
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[8px] font-black text-zinc-400 uppercase">
                            <th className="pb-1 w-10">No.</th>
                            <th className="pb-1">Item SKU & Name</th>
                            <th className="pb-1 text-center w-20">UOM</th>
                            <th className="pb-1 text-right w-24">Cleared Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-bold text-zinc-700 dark:text-zinc-300">
                          {selectedTransfer.line_items.map((line, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-850/40">
                              <td className="py-2.5 font-mono text-zinc-400">{line.line_no}</td>
                              <td className="py-2.5">
                                <span className="text-zinc-950 dark:text-white font-extrabold">{line.item}</span>
                                {line.remark && (
                                  <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">Remark: {line.remark}</span>
                                )}
                              </td>
                              <td className="py-2.5 text-center font-bold text-zinc-500">{line.UOM}</td>
                              <td className="py-2.5 text-right font-mono text-zinc-950 dark:text-white font-black">{line.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Total units count */}
                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex justify-between text-xs font-black">
                      <span className="uppercase text-zinc-400">Total volume size:</span>
                      <span className="font-mono text-zinc-950 dark:text-white">{selectedTransfer.total_quantity} units</span>
                    </div>

                    {/* MTN Audit Logs */}
                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 grid grid-cols-2 gap-4 text-[10px] leading-relaxed">
                      {/* Dispatch compliance sign block */}
                      <div className="bg-zinc-50/50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block mb-2">
                          1. Issuance Sign-off (Origin)
                        </span>
                        <div className="space-y-1">
                          <div>
                            Date/Time: <strong className="text-zinc-700 dark:text-zinc-300">{selectedTransfer.issued_at || selectedTransfer.date}</strong>
                          </div>
                          <div>
                            Dispatcher: <strong className="text-zinc-700 dark:text-zinc-300">{selectedTransfer.issued_by}</strong>
                          </div>
                          <div className="pt-2 flex items-center gap-1.5">
                            <span className="text-[8px] text-zinc-400 uppercase font-black">Sig:</span>
                            <span className="font-serif italic font-extrabold text-emerald-700 dark:text-emerald-500 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded">
                              {selectedTransfer.issued_signature || "SYSTEM"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Reception compliance sign block */}
                      <div className="bg-zinc-50/50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block mb-2">
                          2. Receipt Verification (Receiver)
                        </span>
                        {selectedTransfer.status === "Received" ? (
                          <div className="space-y-1">
                            <div>
                              Date/Time: <strong className="text-zinc-700 dark:text-zinc-300">{selectedTransfer.received_at || selectedTransfer.date}</strong>
                            </div>
                            <div>
                              Verified By: <strong className="text-zinc-700 dark:text-zinc-300">{selectedTransfer.received_by}</strong>
                            </div>
                            <div className="pt-2 flex items-center gap-1.5">
                              <span className="text-[8px] text-zinc-400 uppercase font-black">Sig:</span>
                              <span className="font-serif italic font-extrabold text-emerald-700 dark:text-emerald-500 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded">
                                {selectedTransfer.received_signature}
                              </span>
                            </div>
                          </div>
                        ) : selectedTransfer.status === "Discrepancy" ? (
                          <div className="space-y-1">
                            <div className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="size-3" /> QA Review Required
                            </div>
                            <div className="text-[9px] text-zinc-500 mt-1">
                              Comment: {selectedTransfer.discrepancy_remark}
                            </div>
                          </div>
                        ) : (
                          <div className="text-zinc-400 flex items-center gap-1 py-4 justify-center">
                            <Clock className="size-3.5" /> Pending receipt delivery
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTION TOOLBAR AT FOOTER */}
                <div className="p-6 border-t border-zinc-200/80 bg-zinc-100/50 dark:bg-zinc-850 shrink-0 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedTransfer(null)}
                    className="px-4.5 py-2.5 rounded-full border border-zinc-300 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-black transition-colors uppercase tracking-tight"
                  >
                    Close Document
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadPDF(selectedTransfer.reference_number)}
                      disabled={isExporting}
                      className="px-4.5 py-2.5 rounded-full border border-zinc-300 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 text-xs font-black transition-colors uppercase tracking-tight flex items-center gap-1.5"
                    >
                      <Download className={`size-4 ${isExporting ? "animate-spin" : ""}`} />
                      {isExporting ? "Exporting..." : "Export TIN"}
                    </button>

                    {/* Edit Transfer action from document view */}
                    {(selectedTransfer.status === "Issued" || selectedTransfer.status === "Discrepancy") && (
                      <button
                        onClick={() => {
                          const tr = selectedTransfer
                          setSelectedTransfer(null)
                          setFormMode("edit")
                          setFormRefNum(tr.reference_number)
                          setFormFromW(tr.from_warehouse)
                          setFormToW(tr.to_warehouse)
                          setFormLineItems(tr.line_items)
                          setFormSubmitted(false)
                          setWizardStep(1)
                          setIsFormOpen(true)
                        }}
                        className="px-4.5 py-2.5 rounded-full bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-150 text-white dark:text-zinc-950 text-xs font-black transition-colors uppercase tracking-tight flex items-center gap-1.5"
                      >
                        <Edit className="size-4" />
                        Edit Transfer
                      </button>
                    )}

                    {/* Confirm Receipt Action inside document (SCREEN 4) */}
                    {selectedTransfer.status === "Issued" && (
                      <button
                        onClick={() => {
                          setReceiptMode("match")
                          setIsReceiptOpen(true)}
                        }
                        className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md active:scale-95 uppercase tracking-tight"
                      >
                        Process Receipt
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* =========================================================================
          5. CONFIRM RECEIPT MODAL / SUB-PANEL (SCREEN 4 CHOICE DIALOGUE)
          ========================================================================= */}
      <AnimatePresence>
        {isReceiptOpen && selectedTransfer && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReceiptOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 m-auto h-fit w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 shadow-2xl p-6 rounded-3xl z-[111] overflow-hidden flex flex-col justify-between"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Verification & Audit</span>
                  <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase">
                    Confirm Receipt: {selectedTransfer.reference_number}
                  </h3>
                </div>
                <button
                  onClick={() => setIsReceiptOpen(false)}
                  className="size-7 rounded-full border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center transition-colors text-zinc-500"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Sub-header Context Banner */}
              <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 mb-4 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 leading-snug flex items-center gap-2">
                <Shield className="size-4 text-zinc-500" />
                <div>
                  Receiving Manager: <strong className="text-zinc-800 dark:text-zinc-200">{currentOperator}</strong>
                  <span className="text-zinc-400 px-1">|</span> Facility: <strong className="text-zinc-800 dark:text-zinc-200">{selectedTransfer.to_warehouse}</strong>
                </div>
              </div>

              {/* TWO CHOICE INTERACTION PATHWAYS */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: Quantities match */}
                  <button
                    type="button"
                    onClick={() => setReceiptMode("match")}
                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 ${
                      receiptMode === "match"
                        ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-inner"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 hover:border-zinc-450 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="size-6 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                      <Check className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <strong className="text-xs font-black text-zinc-950 dark:text-white uppercase tracking-tight block">Quantities Match</strong>
                      <span className="text-[9px] font-semibold text-zinc-400 leading-none">Perfect compliance delivery</span>
                    </div>
                  </button>

                  {/* Option 2: Report a discrepancy */}
                  <button
                    type="button"
                    onClick={() => setReceiptMode("discrepancy")}
                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 ${
                      receiptMode === "discrepancy"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-955/20 shadow-inner"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 hover:border-zinc-450 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="size-6 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="size-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <strong className="text-xs font-black text-zinc-950 dark:text-white uppercase tracking-tight block">Report Discrepancy</strong>
                      <span className="text-[9px] font-semibold text-zinc-400 leading-none">Damaged items or mismatches</span>
                    </div>
                  </button>
                </div>

                {/* Conditional Textarea for discrepancy remark (STRICT REQUIREMENT) */}
                <AnimatePresence>
                  {receiptMode === "discrepancy" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-1.5"
                    >
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">
                        Discrepancy Report Detail <span className="text-amber-600">*</span>
                      </label>
                      <textarea
                        required
                        value={discrepancyText}
                        onChange={e => setDiscrepancyText(e.target.value)}
                        placeholder="Detail the exact count discrepancy, damages, temperature breaches, or packaging damage..."
                        className="w-full bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none focus:border-amber-500 h-20 transition-all font-sans resize-none text-zinc-800 dark:text-zinc-200"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Terms Disclaimer */}
                <div className="text-[9px] text-zinc-400 leading-normal font-bold pt-1">
                  * Submission of this audit will automatically register your digital signature 
                  <strong className="text-zinc-650 dark:text-zinc-300"> "{currentSignature}"</strong> and timestamp on the Transfer Document.
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReceiptOpen(false)}
                  className="px-4.5 py-2 rounded-full border border-zinc-300 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-black transition-colors uppercase tracking-tight"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReceiptSubmit}
                  disabled={receiptMode === "discrepancy" && !discrepancyText.trim()}
                  className={`px-5 py-2 rounded-full text-white text-xs font-black transition-all shadow-md active:scale-95 uppercase tracking-tight ${
                    receiptMode === "discrepancy" && !discrepancyText.trim()
                      ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                      : receiptMode === "discrepancy"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  Confirm receipt
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
