import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  Search, 
  Download, 
  X, 
  Pencil, 
  Upload, 
  Paperclip, 
  Eye, 
  FileText 
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import { useFinanceStore, type Invoice, type InvoiceLineItem } from "@/lib/financeStore"
import { isDateInPreset } from "@/lib/peachtreeExportUtils"
import { FinanceDateFilter } from "@/components/FinanceTableToolbar"
import { Skeleton } from "@/components/ui/skeleton"
import { EditModalHeader } from "@/components/EditModalHeader"
import { RecordDeleteModal } from "@/components/RecordDeleteModal"
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal"
import InvoicePrintModal from "@/components/finance/InvoicePrintModal"
import { LoadingDots } from "@/components/ui/LoadingDots"
import { API_BASE } from "@/lib/apiPersistence"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export interface InvoiceAttachment {
  id: string
  record_id: string
  document_type: string
  file_name: string
  file_size: number
}

export default function Invoices() {
  const { showToast } = useFeedback()
  const store = useFinanceStore()
  const isLoading = store.isLoading()
  const invoices = store.getInvoices()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [filterDateRange, setFilterDateRange] = useState<string>("ALL")
  const [invCustomStart, setInvCustomStart] = useState<string>("")
  const [invCustomEnd, setInvCustomEnd] = useState<string>("")

  // Currently selected preview invoice
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Attachments State for Active Invoice
  const [invoiceAttachments, setInvoiceAttachments] = useState<InvoiceAttachment[]>([])
  const [previewDocUrl, setPreviewDocUrl] = useState("")
  const [previewDocName, setPreviewDocName] = useState("")

  // Export / Print Modal State
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null)

  // Edit Modal State (issue date, due date, terms removed per design)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)
  const [editCustName, setEditCustName] = useState("")
  const [editStatus, setEditStatus] = useState<"Paid" | "Unpaid">("Unpaid")
  const [editNotes, setEditNotes] = useState("")
  const [editAdviceFile, setEditAdviceFile] = useState<File | null>(null)

  // Create Invoice Slide-In Drawer State
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [custName, setCustName] = useState("")
  const todayStr = new Date().toISOString().split("T")[0]
  const defaultDueObj = new Date()
  defaultDueObj.setDate(defaultDueObj.getDate() + 30)
  const defaultDueStr = defaultDueObj.toISOString().split("T")[0]

  const [invNumber, setInvNumber] = useState(`INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`)
  const [issueDate, setIssueDate] = useState(todayStr)
  const [dueDate, setDueDate] = useState(defaultDueStr)
  const [currency, setCurrency] = useState("ETB")
  const [newItems, setNewItems] = useState<InvoiceLineItem[]>([
    { description: "", quantity: 1, unit_price: 0, line_total: 0 }
  ])
  const taxRules = store.getTaxRules()
  const defaultTaxRule = taxRules.find((t) => t.type === "VAT/GST" && Number(t.ratePercent || 0) > 0) || taxRules[0]
  const [selectedTaxRuleId, setSelectedTaxRuleId] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("Net 30")
  const [discountVal, setDiscountVal] = useState("0")

  // Streamlined Filter Rules: ALL, PAID, UNPAID
  const getFilteredInvoices = (status: string, query: string, datePreset: string, customStart = invCustomStart, customEnd = invCustomEnd) => {
    return invoices.filter((inv) => {
      if (!isDateInPreset(inv.issue_date, datePreset, customStart, customEnd)) return false
      const q = query.toLowerCase()
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        (inv.sales_order_id && inv.sales_order_id.toLowerCase().includes(q)) ||
        (inv.sales_issue_id && inv.sales_issue_id.toLowerCase().includes(q)) ||
        (inv.fs_no && inv.fs_no.toLowerCase().includes(q))
      
      const isPaid = inv.status === "Paid" || Number(inv.balance_due ?? 0) <= 0 || (inv.amount_paid > 0 && inv.amount_paid >= inv.total)
      if (status === "ALL") return matchesSearch
      if (status === "PAID") return matchesSearch && isPaid
      if (status === "UNPAID") return matchesSearch && !isPaid && inv.status !== "Cancelled" && inv.status !== "Void"
      return matchesSearch
    })
  }

  const filteredInvoices = getFilteredInvoices(filterStatus, searchQuery, filterDateRange, invCustomStart, invCustomEnd)

  const handleFilterStatusChange = (newStatus: string) => {
    setFilterStatus(newStatus)
    const matches = getFilteredInvoices(newStatus, searchQuery, filterDateRange, invCustomStart, invCustomEnd)
    setSelectedInvoice(matches[0] || null)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    const matches = getFilteredInvoices(filterStatus, query, filterDateRange, invCustomStart, invCustomEnd)
    setSelectedInvoice(matches[0] || null)
  }

  const handleDateFilterChange = (newDateFilter: string) => {
    setFilterDateRange(newDateFilter)
    const matches = getFilteredInvoices(filterStatus, searchQuery, newDateFilter, invCustomStart, invCustomEnd)
    setSelectedInvoice(matches[0] || null)
  }

  const handleCustomStartChange = (start: string) => {
    setInvCustomStart(start)
    const matches = getFilteredInvoices(filterStatus, searchQuery, filterDateRange, start, invCustomEnd)
    setSelectedInvoice(matches[0] || null)
  }

  const handleCustomEndChange = (end: string) => {
    setInvCustomEnd(end)
    const matches = getFilteredInvoices(filterStatus, searchQuery, filterDateRange, invCustomStart, end)
    setSelectedInvoice(matches[0] || null)
  }

  // Determine active invoice for preview
  const liveSelectedInvoice = selectedInvoice ? invoices.find((inv) => inv.id === selectedInvoice.id) || null : null
  const isSelectedInFiltered = liveSelectedInvoice ? filteredInvoices.some((inv) => inv.id === liveSelectedInvoice.id) : false
  const activeInvoice = isSelectedInFiltered ? liveSelectedInvoice : (filteredInvoices.length > 0 ? filteredInvoices[0] : null)
  const isSelectedInvoicePaid = activeInvoice ? (activeInvoice.status === "Paid" || Number(activeInvoice.balance_due ?? 0) <= 0) : false

  // Fetch Attachments for Active Invoice
  useEffect(() => {
    if (!activeInvoice) {
      setInvoiceAttachments([])
      return
    }
    let cancelled = false
    const invId = activeInvoice.id
    const siId = activeInvoice.sales_issue_id || ""
    const soId = activeInvoice.sales_order_id || ""
    const fsNo = activeInvoice.fs_no || ""

    fetch(`${API_BASE}/api/shipment_documents`)
      .then((res) => (res.ok ? res.json() : []))
      .then((docs: any[]) => {
        if (!cancelled && Array.isArray(docs)) {
          const matches = docs.filter((d) => 
            d.record_id === invId ||
            (siId && d.record_id === siId) ||
            (soId && d.record_id === soId) ||
            (fsNo && d.record_id === fsNo) ||
            (activeInvoice.invoice_number && d.record_id === activeInvoice.invoice_number)
          )
          setInvoiceAttachments(matches)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activeInvoice?.id, activeInvoice?.sales_issue_id, activeInvoice?.sales_order_id, activeInvoice?.fs_no])

  // Calculate KPI metrics
  const totalARExposure = invoices.reduce((s, inv) => s + (inv.status !== "Cancelled" && inv.status !== "Void" ? Number(inv.balance_due || 0) : 0), 0)
  const totalCollections = invoices.reduce((s, inv) => s + Number(inv.amount_paid || 0), 0)
  const activeCount = invoices.filter((inv) => (inv.status === "Sent" || inv.status === "Partially Paid" || Number(inv.balance_due || 0) > 0) && inv.status !== "Paid" && inv.status !== "Cancelled").length

  // Add line item in creation form
  const handleAddLineItem = () => {
    setNewItems([...newItems, { description: "", quantity: 1, unit_price: 0, line_total: 0 }])
  }

  const handleUpdateItem = (index: number, field: keyof InvoiceLineItem, val: any) => {
    const updated = [...newItems]
    const item = { ...updated[index], [field]: val }
    if (field === "quantity" || field === "unit_price") {
      const q = parseFloat(field === "quantity" ? val : item.quantity) || 0
      const p = parseFloat(field === "unit_price" ? val : item.unit_price) || 0
      item.line_total = q * p
    }
    updated[index] = item
    setNewItems(updated)
  }

  const handleRemoveLineItem = (index: number) => {
    if (newItems.length > 1) {
      setNewItems(newItems.filter((_, i) => i !== index))
    }
  }

  const subtotalCalc = newItems.reduce((s, item) => s + (item.line_total || 0), 0)
  const discountCalc = parseFloat(discountVal) || 0
  const netSubtotalCalc = Math.max(0, subtotalCalc - discountCalc)
  const activeTaxRule = taxRules.find((r) => r.id === selectedTaxRuleId) || defaultTaxRule
  const taxRateNum = activeTaxRule ? Number(activeTaxRule.ratePercent ?? 0) : store.getDefaultVatRate()
  const taxCalc = netSubtotalCalc * (taxRateNum / 100)
  const totalCalc = netSubtotalCalc + taxCalc

  const handleCreateInvoiceSubmit = (e: React.FormEvent, submitStatus: "Sent" | "Draft" = "Sent") => {
    e.preventDefault()
    if (!custName.trim() || newItems.length === 0) {
      showToast("Validation Error", "warning", "Please provide customer name and line items.")
      return
    }

    const created = store.createInvoice({
      invoice_number: invNumber,
      customer_name: custName,
      issue_date: issueDate,
      due_date: dueDate,
      currency,
      line_items: newItems,
      subtotal: subtotalCalc,
      tax_amount: taxCalc,
      tax_rate: taxRateNum,
      discount_amount: discountCalc,
      payment_terms: paymentTerms,
      total: totalCalc,
      status: submitStatus,
    })

    showToast("Invoice Created", "success", `Sales Invoice ${created.invoice_number} has been created.`)
    setShowCreateDrawer(false)
    setSelectedInvoice(created)
    setCustName("")
    setNewItems([{ description: "", quantity: 1, unit_price: 0, line_total: 0 }])
    setInvNumber(`INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`)
  }

  // Open Edit Modal (only for unpaid invoices)
  const handleOpenEditModal = (inv: Invoice) => {
    setEditingInvoice(inv)
    setEditCustName(inv.customer_name)
    setEditStatus((inv.status === "Paid" || Number(inv.balance_due ?? 0) <= 0) ? "Paid" : "Unpaid")
    setEditNotes(inv.notes || "")
    setEditAdviceFile(null)
    setIsEditModalOpen(true)
  }

  // Save Edit Modal with Strict Payment Advice Validation for Paid Status
  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingInvoice) return

    const wantsPaid = editStatus === "Paid"
    const hasExistingPaymentAdvice = invoiceAttachments.some(
      (a) => a.document_type?.toLowerCase().includes("advice") || a.file_name?.toLowerCase().includes("advice")
    )

    // Strict validation: cannot change from Unpaid to Paid without Payment Advice
    if (wantsPaid && !editAdviceFile && !hasExistingPaymentAdvice) {
      showToast(
        "Payment Advice Required",
        "warning",
        "You must attach a Payment Advice receipt to mark this invoice as Paid."
      )
      return
    }

    try {
      setIsSavingEdit(true)
      // 1. Upload Payment Advice if attached
      if (editAdviceFile) {
        try {
          const form = new FormData()
          form.append("file", editAdviceFile)
          form.append("record_id", editingInvoice.id)
          form.append("record_type", "sales_order")
          form.append("document_type", "Payment Advice")
          await fetch(`${API_BASE}/api/shipment_documents`, { method: "POST", body: form })

          if (editingInvoice.sales_issue_id) {
            const siForm = new FormData()
            siForm.append("file", editAdviceFile)
            siForm.append("record_id", editingInvoice.sales_issue_id)
            siForm.append("record_type", "sales_order")
            siForm.append("document_type", "Payment Advice")
            await fetch(`${API_BASE}/api/shipment_documents`, { method: "POST", body: siForm })
          }
        } catch (err) {
          console.warn("Payment advice upload failed:", err)
        }
      }

      // 2. If marked as Paid, record payment and settle
      if (wantsPaid) {
        const settleAmount = Number(editingInvoice.balance_due || editingInvoice.total || 0)
        store.recordPayment({
          linked_invoice_id: editingInvoice.id,
          amount: settleAmount,
          currency: editingInvoice.currency,
          date: new Date().toISOString().split("T")[0],
          method: "Cash",
          reference: `PAID-${Date.now().toString().slice(-4)}`,
          direction: "Received",
        })

        // Sync linked sales issue to Cash
        if (editingInvoice.sales_issue_id) {
          try {
            await fetch(`${API_BASE}/api/sales_issues/${editingInvoice.sales_issue_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payment_type: "Cash" }),
            })
          } catch (err) {
            console.warn("Sales issue sync failed:", err)
          }
        }

        store.updateInvoice(editingInvoice.id, {
          customer_name: editCustName,
          payment_terms: "Cash",
          status: "Paid",
          amount_paid: editingInvoice.total,
          balance_due: 0,
          notes: editNotes,
        })

        showToast("Invoice Settled & Paid", "success", `Invoice ${editingInvoice.invoice_number} is now marked as Paid with Payment Advice attached.`)
      } else {
        store.updateInvoice(editingInvoice.id, {
          customer_name: editCustName,
          notes: editNotes,
        })

        showToast("Invoice Updated", "success", `Invoice ${editingInvoice.invoice_number} has been updated.`)
      }

      setIsEditModalOpen(false)
      setEditingInvoice(null)
    } catch (err) {
      showToast("Update Failed", "warning", "Failed to update invoice.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Delete Invoice
  const handleConfirmDeleteInvoice = () => {
    if (!deletingInvoice) return
    store.deleteInvoice(deletingInvoice.id)
    showToast("Invoice Deleted", "success", `Invoice ${deletingInvoice.invoice_number} removed.`)
    setDeletingInvoice(null)
    setIsEditModalOpen(false)
    setEditingInvoice(null)
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <main className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        <motion.div initial="hidden" animate="visible" variants={fade} className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Sales Invoices</h1>
            <p className="text-xs font-semibold text-zinc-500 mt-1">
              Issue receivables, synchronize sales vouchers, and track customer collections.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubPageNav items={getSectionChildren("/finance")} />
          </div>
        </motion.div>

        {/* Top KPI Cards */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <GlassCard className="p-4 flex flex-col justify-between border border-black/5">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total AR Exposure</span>
            {isLoading ? (
              <Skeleton className="h-7 w-32 bg-zinc-200/80 my-1" />
            ) : (
              <p className="text-xl font-black text-black font-mono mt-1">
                ETB {totalARExposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
            <span className="text-[10px] text-gray-400 mt-0.5">Outstanding balance across all invoices</span>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col justify-between border border-black/5">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total Collections</span>
            {isLoading ? (
              <Skeleton className="h-7 w-32 bg-zinc-200/80 my-1" />
            ) : (
              <p className="text-xl font-black text-emerald-700 font-mono mt-1">
                ETB {totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
            <span className="text-[10px] text-gray-400 mt-0.5">Recorded cash & bank settlements</span>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col justify-between border border-black/5">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Active Billing Count</span>
            {isLoading ? (
              <Skeleton className="h-7 w-20 bg-zinc-200/80 my-1" />
            ) : (
              <p className="text-xl font-black text-black font-mono mt-1">{activeCount}</p>
            )}
            <span className="text-[10px] text-gray-400 mt-0.5">Unpaid or partially settled invoices</span>
          </GlassCard>
        </motion.div>

        {/* Master-Detail Split Container: Preview on Left (8 cols / 67%), List on Right (4 cols / 33%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Invoice Preview Section & Attached Documents (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {activeInvoice ? (
              <GlassCard className="p-6 border border-black/5 shadow-md space-y-6">
                {/* Header Status & Numbers */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
                      Sales Invoice Details
                    </span>
                    <h2 className="text-xl font-black text-black mt-0.5">
                      #{activeInvoice.invoice_number}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${
                        isSelectedInvoicePaid
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-amber-100 text-amber-900 border-amber-200"
                      }`}
                    >
                      {isSelectedInvoicePaid ? "Paid" : "Unpaid"}
                    </span>
                  </div>
                </div>

                {/* Billed To & Issue Date Grid (Due Date and Terms removed per design) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">Billed To</span>
                    <span className="font-bold text-zinc-950 mt-1 block">{activeInvoice.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">Issue Date</span>
                    <span className="font-mono font-bold text-zinc-800 mt-1 block">{activeInvoice.issue_date}</span>
                  </div>
                </div>

                {/* Itemized Table */}
                <div>
                  <div className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider mb-2">Invoice Items & Charges</div>
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-600">
                        <tr>
                          <th className="py-2.5 px-3">Item Details</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {(activeInvoice.line_items || []).map((item, i) => {
                          const q = Number(item.quantity ?? 1)
                          const p = Number(item.unit_price ?? 0)
                          const t = Number(item.line_total ?? q * p)
                          return (
                            <tr key={i}>
                              <td className="py-2.5 px-3 font-bold text-zinc-950">{item.description || "Invoice Item"}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-600">{q}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-zinc-600">{activeInvoice.currency} {p.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-zinc-950">{activeInvoice.currency} {t.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary Breakdown */}
                {(() => {
                  const totalVal = Number(activeInvoice.total ?? 0)
                  const subtotalVal = Number(activeInvoice.subtotal ?? totalVal)
                  const taxVal = Number(activeInvoice.tax_amount ?? 0)
                  const discVal = Number(activeInvoice.discount_amount ?? 0)
                  const paidVal = Number(activeInvoice.amount_paid ?? 0)
                  const dueVal = Number(activeInvoice.balance_due ?? Math.max(0, totalVal - paidVal))
                  const recordedTaxRate = activeInvoice.tax_rate !== undefined
                    ? activeInvoice.tax_rate
                    : (subtotalVal > 0 && taxVal > 0 ? Math.round((taxVal / Math.max(1, subtotalVal - discVal)) * 100) : (taxVal > 0 ? 15 : 0))

                  return (
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
                      <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span className="font-mono">{activeInvoice.currency} {subtotalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      {discVal > 0 && <div className="flex justify-between text-emerald-700 font-bold"><span>Discount Applied</span><span className="font-mono">-{activeInvoice.currency} {discVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
                      <div className="flex justify-between text-zinc-600"><span>Tax (VAT {recordedTaxRate}%)</span><span className="font-mono">{activeInvoice.currency} {taxVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between font-black text-zinc-950 text-sm pt-2 border-t border-zinc-200"><span>Total Receivable</span><span className="font-mono">{activeInvoice.currency} {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between font-bold text-emerald-700"><span>Amount Received</span><span className="font-mono">{activeInvoice.currency} {paidVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between font-black text-red-700 text-sm"><span>Balance</span><span className="font-mono">{activeInvoice.currency} {dueVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    </div>
                  )
                })()}

                {/* Attached Supporting Documents & Payment Advice */}
                <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Paperclip className="size-3.5" /> Attached Supporting Documents & Payment Advice
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400">
                      {invoiceAttachments.length} {invoiceAttachments.length === 1 ? "file" : "files"}
                    </span>
                  </div>

                  {invoiceAttachments.length === 0 ? (
                    <p className="text-xs text-zinc-400 font-medium italic">
                      No payment advice or supporting documents attached yet. Click "Edit" to attach payment advice.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {invoiceAttachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => {
                            setPreviewDocUrl(`${API_BASE}/api/shipment_documents/${att.id}/file`)
                            setPreviewDocName(att.file_name)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <FileText className="size-3.5 text-zinc-500" />
                          <span className="truncate max-w-[160px]">{att.file_name}</span>
                          <Eye className="size-3 text-zinc-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer: Aligned to the Right (Edit for Unpaid only, Export for all) */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/5">
                  {!isSelectedInvoicePaid && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(activeInvoice)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-[11px] transition-all border border-zinc-200/80 active:scale-95 shadow-2xs cursor-pointer"
                      title="Edit Invoice & Attach Payment Advice"
                    >
                      <Pencil className="size-3 text-zinc-700" /> Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPrintingInvoice(activeInvoice)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-[11px] transition-all border border-zinc-200/80 active:scale-95 shadow-2xs cursor-pointer"
                    title="Export Sales Invoice"
                  >
                    <Download className="size-3 text-zinc-700" /> Export
                  </button>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-12 text-center text-gray-400 text-sm border border-black/5 flex flex-col items-center justify-center min-h-[500px] space-y-3">
                <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-gray-400">
                  <Search className="size-6 text-gray-400" />
                </div>
                <p className="font-bold text-gray-700 text-base">Nothing to show</p>
                <p className="text-xs text-gray-400 max-w-sm">There are no invoices to display for the "{filterStatus}" filter.</p>
              </GlassCard>
            )}
          </div>

          {/* RIGHT COLUMN: Master Invoices List (4 cols / 33%) */}
          <GlassCard className="lg:col-span-4 p-5 border border-black/5 shadow-sm flex flex-col space-y-3 sticky top-24 max-h-[calc(100vh-120px)]">
            <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
              <h3 className="font-bold text-base text-black">Invoices List</h3>
              <button
                type="button"
                onClick={() => setShowCreateDrawer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-md transition-all uppercase tracking-wider h-[32px] cursor-pointer"
              >
                <Plus className="size-3.5" /> Create Invoice
              </button>
            </div>
            
            {/* Search, Status Filter Dropdown & Date Filter in a single compact row */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-white/80 border border-black/5 rounded-xl pl-8 pr-2 py-1.5 text-xs font-semibold text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black/10 transition-all h-[34px]"
                />
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={filterStatus}
                onChange={(e) => handleFilterStatusChange(e.target.value)}
                className="bg-white/90 border border-black/5 rounded-xl px-2 py-1.5 text-[11px] font-bold text-zinc-900 focus:outline-none h-[34px] cursor-pointer shadow-2xs"
              >
                <option value="ALL">All</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>

              <FinanceDateFilter
                value={filterDateRange}
                onChange={handleDateFilterChange}
                startDate={invCustomStart}
                endDate={invCustomEnd}
                onCustomDateChange={(start, end) => {
                  handleCustomStartChange(start)
                  handleCustomEndChange(end)
                }}
              />
            </div>

            {/* Scrollable Invoices Cards Stack */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin max-h-[calc(100vh-230px)] min-h-[480px]">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="p-3.5 rounded-2xl bg-white/60 border border-black/5 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24 bg-zinc-200/80" />
                      <Skeleton className="h-4 w-16 bg-zinc-200/80" />
                    </div>
                    <Skeleton className="h-5 w-40 bg-zinc-200/80" />
                    <Skeleton className="h-3 w-32 bg-zinc-200/80" />
                  </div>
                ))
              ) : filteredInvoices.length === 0 ? (
                <div className="p-8 text-center bg-white/50 backdrop-blur-xs rounded-2xl border border-black/5 text-gray-400 text-xs font-medium space-y-2">
                  <Search className="size-5 mx-auto text-gray-300" />
                  <p className="font-semibold text-gray-600">Nothing to show</p>
                  <p className="text-[11px] text-gray-400">No invoices match the selected filter criteria.</p>
                </div>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSelected = activeInvoice?.id === inv.id
                  const isPaid = inv.status === "Paid" || Number(inv.balance_due ?? 0) <= 0
                  return (
                    <div
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                        isSelected
                          ? "bg-[#1c1c1f] text-white border-black/10 shadow-xl shadow-black/10 scale-[1.01]"
                          : "bg-white/80 hover:bg-white text-black border-black/5 shadow-xs"
                      }`}
                    >
                      {/* Top Row: Invoice ID & Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-gray-400">
                          #{inv.invoice_number}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-[#27272a] text-white border border-white/10"
                              : isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </div>

                      {/* Middle Row: Customer Name */}
                      <h4 className={`text-sm font-black mt-1.5 tracking-tight truncate ${isSelected ? "text-white" : "text-black"}`}>
                        {inv.customer_name}
                      </h4>

                      {/* Bottom Row: Due Date & Amount */}
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-gray-400 text-[10px]">
                          Due: {inv.due_date}
                        </span>
                        <span className={`font-mono font-black text-xs ${isSelected ? "text-[#10b981]" : "text-black"}`}>
                          {inv.currency} {(inv.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </GlassCard>
        </div>
      </main>

      {/* Edit Invoice Modal with Safe 3-Dots Delete & Payment Advice Requirement */}
      <AnimatePresence>
        {isEditModalOpen && editingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-zinc-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative z-10 space-y-4"
            >
              <EditModalHeader
                title="Edit Sales Invoice"
                subtitle={editingInvoice.invoice_number}
                onRequestDelete={() => setDeletingInvoice(editingInvoice)}
                onClose={() => setIsEditModalOpen(false)}
                deleteLabel="Delete"
              />

              <form onSubmit={handleSaveEditInvoice} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={editCustName}
                    onChange={(e) => setEditCustName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "Paid" | "Unpaid")}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Notes / Remarks</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Optional billing or delivery notes..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-medium text-black focus:outline-none"
                  />
                </div>

                {/* Payment Advice Receipt Attachment */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">
                      Attach Payment Advice Receipt {editStatus === "Paid" && <span className="text-red-500 font-black">* (Required for Paid)</span>}
                    </label>
                  </div>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-xl cursor-pointer bg-zinc-50/60 hover:bg-zinc-50 transition-colors">
                    <Upload className="size-5 text-zinc-400 mb-1" />
                    <span className="text-xs font-bold text-zinc-700">
                      {editAdviceFile ? editAdviceFile.name : "Choose or drag payment advice file"}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">PDF, PNG, JPG up to 10MB</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditAdviceFile(e.target.files[0])
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="min-w-[125px] inline-flex items-center justify-center px-5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSavingEdit ? <LoadingDots color="bg-white" size="sm" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <RecordDeleteModal
        isOpen={!!deletingInvoice}
        onClose={() => setDeletingInvoice(null)}
        onConfirmDelete={handleConfirmDeleteInvoice}
        title="Delete Sales Invoice"
        recordName={deletingInvoice?.invoice_number || "this invoice"}
        description="Are you sure you want to delete this invoice? This will remove the invoice record."
      />

      {/* Export / Print Modal */}
      <InvoicePrintModal
        isOpen={!!printingInvoice}
        invoice={printingInvoice}
        onClose={() => setPrintingInvoice(null)}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDocUrl}
        onClose={() => {
          setPreviewDocUrl("")
          setPreviewDocName("")
        }}
        fileUrl={previewDocUrl}
        fileName={previewDocName}
      />

      {/* Create Invoice Slide-In Drawer */}
      <AnimatePresence>
        {showCreateDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateDrawer(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-black/10 mb-6">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-400 block uppercase">Billing Creation</span>
                    <h2 className="text-xl font-black text-black">Create Sales Invoice</h2>
                  </div>
                  <button type="button" onClick={() => setShowCreateDrawer(false)} className="p-1.5 text-gray-400 hover:text-black cursor-pointer">
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={(e) => handleCreateInvoiceSubmit(e, "Sent")} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="e.g. Apex Healthcare Ltd"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Invoice #</label>
                      <input
                        type="text"
                        value={invNumber}
                        onChange={(e) => setInvNumber(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-black focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none"
                      >
                        <option value="ETB">ETB - Ethiopian Birr</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Issue Date</label>
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Due Date</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tax Template</label>
                      <select
                        value={activeTaxRule?.id || ""}
                        onChange={(e) => setSelectedTaxRuleId(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-2 text-xs font-bold text-black focus:outline-none"
                      >
                        {taxRules.map((rule) => (
                          <option key={rule.id} value={rule.id}>
                            {rule.name} ({rule.ratePercent}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payment Terms</label>
                      <select
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-2 text-xs font-bold text-black focus:outline-none"
                      >
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Immediate">Immediate Cash</option>
                        <option value="50% Advance">50% Advance / 50% Delivery</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Discount Amount</label>
                      <input
                        type="number"
                        min="0"
                        value={discountVal}
                        onChange={(e) => setDiscountVal(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-black focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Dynamic Line Items */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Line Items</label>
                      <button
                        type="button"
                        onClick={handleAddLineItem}
                        className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="size-3" /> Add Item
                      </button>
                    </div>

                    <div className="space-y-2">
                      {newItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                          <input
                            type="text"
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-xs font-bold text-black focus:outline-none"
                          />
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                              className="w-20 bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-black focus:outline-none"
                            />
                            <input
                              type="number"
                              placeholder="Unit Price"
                              value={item.unit_price}
                              onChange={(e) => handleUpdateItem(idx, "unit_price", e.target.value)}
                              className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-black focus:outline-none"
                            />
                            <span className="text-xs font-mono font-bold text-black w-24 text-right">
                              ETB {item.line_total.toFixed(2)}
                            </span>
                            {newItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="text-gray-400 hover:text-red-500 cursor-pointer"
                              >
                                <X className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calculations readout */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/5 text-xs space-y-1">
                    <div className="flex justify-between text-gray-500">
                      <span>Gross Line Subtotal</span>
                      <span className="font-mono">{currency} {subtotalCalc.toFixed(2)}</span>
                    </div>
                    {discountCalc > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Discount</span>
                        <span className="font-mono">-{currency} {discountCalc.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-500">
                      <span>Tax Amount ({taxRateNum}%)</span>
                      <span className="font-mono">{currency} {taxCalc.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-black pt-1 border-t border-black/5 text-sm">
                      <span>Total Payable</span>
                      <span className="font-mono">{currency} {totalCalc.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCreateInvoiceSubmit(e, "Draft")}
                      className="px-3 py-2.5 border border-zinc-300 hover:bg-zinc-100 rounded-xl text-xs font-bold text-black uppercase cursor-pointer"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateDrawer(false)}
                      className="px-3 py-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-gray-500 uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCreateInvoiceSubmit(e, "Sent")}
                      className="flex-1 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase shadow-lg shadow-black/10 cursor-pointer"
                    >
                      Issue & Post Invoice
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
