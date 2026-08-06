import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  Search, 
  Download, 
  X, 
  CreditCard,
  Trash2,
  Printer,
  Mail,
  Calendar
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import { useFinanceStore } from "@/lib/financeStore"
import type { Invoice, InvoiceLineItem } from "@/lib/financeStore"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export default function Invoices() {
  const { showToast } = useFeedback()
  const store = useFinanceStore()
  const invoices = store.getInvoices()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")

  // Currently selected preview invoice
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Record Payment Modal inside detail panel
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Wire Transfer")
  const [paymentRef, setPaymentRef] = useState("")

  // Create Invoice Slide-In Drawer State
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [custName, setCustName] = useState("")
  const [invNumber, setInvNumber] = useState(`INV-2026-${103 + invoices.length}`)
  const [issueDate, setIssueDate] = useState("2026-07-20")
  const [dueDate, setDueDate] = useState("2026-08-20")
  const [currency, setCurrency] = useState("ETB")
  const [newItems, setNewItems] = useState<InvoiceLineItem[]>([
    { description: "Personal Protective Equipment Packs", quantity: 1000, unit_price: 35, line_total: 35000 }
  ])

  const getFilteredInvoices = (status: string, query: string) => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(query.toLowerCase()) ||
        inv.customer_name.toLowerCase().includes(query.toLowerCase())
      
      if (status === "ALL") return matchesSearch
      if (status === "PAID") return matchesSearch && inv.status === "Paid"
      if (status === "UNPAID") return matchesSearch && (inv.status === "Sent" || inv.status === "Partially Paid" || (inv.balance_due > 0 && inv.status !== "Paid" && inv.status !== "Cancelled"))
      if (status === "OVERDUE") return matchesSearch && inv.status === "Overdue"
      if (status === "DRAFT") return matchesSearch && inv.status === "Draft"
      return matchesSearch
    })
  }

  const filteredInvoices = getFilteredInvoices(filterStatus, searchQuery)

  // Auto select first invoice on filter tab change
  const handleFilterStatusChange = (newStatus: string) => {
    setFilterStatus(newStatus)
    const matches = getFilteredInvoices(newStatus, searchQuery)
    setSelectedInvoice(matches[0] || null)
  }

  // Auto select first matching invoice on search change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    const matches = getFilteredInvoices(filterStatus, query)
    setSelectedInvoice(matches[0] || null)
  }

  // Determine active invoice for preview
  const isSelectedInFiltered = selectedInvoice ? filteredInvoices.some((inv) => inv.id === selectedInvoice.id) : false
  const activeInvoice = isSelectedInFiltered ? selectedInvoice : (filteredInvoices.length > 0 ? filteredInvoices[0] : null)

  // Calculate KPI metrics
  const totalARExposure = invoices.reduce((s, inv) => s + (inv.status !== "Cancelled" && inv.status !== "Void" ? inv.balance_due : 0), 0)
  const totalCollections = invoices.reduce((s, inv) => s + inv.amount_paid, 0)
  const overdueAR = invoices.reduce((s, inv) => s + (inv.status === "Overdue" ? inv.balance_due : 0), 0)
  const activeCount = invoices.filter((inv) => inv.status === "Sent" || inv.status === "Partially Paid" || inv.status === "Overdue").length

  const [taxTemplate, setTaxTemplate] = useState("VAT_15")
  const [paymentTerms, setPaymentTerms] = useState("Net 30")
  const [discountVal, setDiscountVal] = useState("0")

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
  const taxRateNum = taxTemplate === "VAT_15" ? 15 : taxTemplate === "WHT_3" ? 3 : 0
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
      discount_amount: discountCalc,
      payment_terms: paymentTerms,
      total: totalCalc,
      status: submitStatus,
    })

    setShowCreateDrawer(false)
    setCustName("")
    setDiscountVal("0")
    setSelectedInvoice(created)
    setNewItems([{ description: "", quantity: 1, unit_price: 0, line_total: 0 }])
    showToast(
      submitStatus === "Draft" ? "Invoice Saved as Draft" : "Invoice Issued & Posted",
      "success",
      `Invoice ${created.invoice_number} ${submitStatus === "Draft" ? "saved to drafts." : "posted to Accounts Receivable GL."}`
    )
  }

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeInvoice) return

    const amt = parseFloat(paymentAmount)
    if (isNaN(amt) || amt <= 0) {
      showToast("Invalid Amount", "warning", "Please enter a valid payment amount.")
      return
    }

    const res = store.recordPayment({
      linked_invoice_id: activeInvoice.id,
      amount: amt,
      currency: activeInvoice.currency,
      date: new Date().toISOString().split("T")[0],
      method: paymentMethod,
      reference: paymentRef || `WIRE-${Math.floor(1000 + Math.random() * 9000)}`,
      direction: "Received",
    })

    setShowPaymentModal(false)
    setPaymentAmount("")
    setPaymentRef("")

    if (res.invoice) {
      setSelectedInvoice(res.invoice)
    }

    showToast(
      "Payment Recorded",
      "success",
      `Recorded ETB ${amt.toLocaleString()} for Invoice ${activeInvoice.invoice_number}. Ledger updated!`
    )
  }

  return (
    <div className="min-h-screen page-gradient text-black">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Top Header Row */}
        <motion.div variants={fade} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Accounts Receivable Invoices</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Manage customer billing and collections.</p>
          </div>
          <div className="flex items-center gap-3">
            <SubPageNav items={getSectionChildren("/finance")} />
          </div>
        </motion.div>

        {/* AR Executive Summary Metrics Banner */}
        <motion.div variants={fade} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <GlassCard className="p-4 flex flex-col justify-between border border-black/5">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total AR Exposure</span>
            <p className="text-xl font-black text-black font-mono mt-1">
              ETB {totalARExposure.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-gray-400 mt-0.5">Uncollected receivables balance</span>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col justify-between border border-black/5">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Collections Received</span>
            <p className="text-xl font-black text-emerald-700 font-mono mt-1">
              ETB {totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Cleared in cash/bank</span>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col justify-between border border-black/5">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Overdue AR Amount</span>
            <p className="text-xl font-black text-red-600 font-mono mt-1">
              ETB {overdueAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-red-500 font-semibold mt-0.5">Past due date</span>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col justify-between border border-black/5">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Active Billing Count</span>
            <p className="text-xl font-black text-black font-mono mt-1">{activeCount}</p>
            <span className="text-[10px] text-gray-400 mt-0.5">Sent, partial, or overdue</span>
          </GlassCard>
        </motion.div>

        {/* Master-Detail Split Container conforming to User Design */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Master List Column (35% width / col-span-4) inside a GlassCard container */}
          <GlassCard className="lg:col-span-4 p-5 border border-black/5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-black">Invoices</h3>
              <button
                onClick={() => setShowCreateDrawer(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-md transition-all uppercase tracking-wider h-[34px]"
              >
                <Plus className="size-3.5" /> Create Invoice
              </button>
            </div>
            
            {/* Search Input Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search invoices..."
                className="w-full bg-white/70 backdrop-blur-xs border border-black/5 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black/10 transition-all"
              />
            </div>

            {/* Filter Pill Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {["ALL", "PAID", "UNPAID", "OVERDUE", "DRAFT"].map((status) => {
                const isActive = filterStatus === status
                return (
                  <button
                    key={status}
                    onClick={() => handleFilterStatusChange(status)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-[#18181b] text-white shadow-sm"
                        : "text-gray-500 hover:text-black hover:bg-black/5"
                    }`}
                  >
                    {status}
                  </button>
                )
              })}
            </div>

            {/* Invoices Cards Stack */}
            <div className="space-y-3">
              {filteredInvoices.length === 0 ? (
                <div className="p-8 text-center bg-white/50 backdrop-blur-xs rounded-2xl border border-black/5 text-gray-400 text-xs font-medium space-y-2">
                  <Search className="size-5 mx-auto text-gray-300" />
                  <p className="font-semibold text-gray-600">Nothing to show</p>
                  <p className="text-[11px] text-gray-400">No invoices match the selected filter criteria.</p>
                </div>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSelected = activeInvoice?.id === inv.id
                  return (
                    <div
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
                        isSelected
                          ? "bg-[#1c1c1f] text-white border-black/10 shadow-xl shadow-black/10 scale-[1.01]"
                          : "bg-white/80 hover:bg-white text-black border-black/5 shadow-xs"
                      }`}
                    >
                      {/* Top Row: Invoice ID & Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-mono font-bold ${isSelected ? "text-gray-400" : "text-gray-400"}`}>
                          #{inv.invoice_number}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-[#27272a] text-white border border-white/10"
                              : inv.status === "Paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : inv.status === "Overdue"
                              ? "bg-red-100 text-red-700"
                              : inv.status === "Draft"
                              ? "bg-zinc-200 text-zinc-700"
                              : "bg-zinc-200 text-zinc-800"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>

                      {/* Middle Row: Customer Name */}
                      <h4 className={`text-base font-black mt-2 tracking-tight ${isSelected ? "text-white" : "text-black"}`}>
                        {inv.customer_name}
                      </h4>

                      {/* Bottom Row: Due Date & Amount */}
                      <div className="flex items-center justify-between mt-3 text-xs">
                        <span className={isSelected ? "text-gray-400 text-[11px]" : "text-gray-400 text-[11px]"}>
                          Due: {inv.due_date}
                        </span>
                        <span className={`font-mono font-black text-sm ${isSelected ? "text-[#10b981]" : "text-black"}`}>
                          {inv.currency} {inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </GlassCard>

          {/* Right Detail Column (65% width / col-span-8) */}
          <div className="lg:col-span-8">
            {activeInvoice ? (
              <GlassCard className="p-6 md:p-8 border border-black/5 shadow-sm flex flex-col justify-between min-h-[600px]">
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">INVOICE PREVIEW</span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          activeInvoice.status === "Paid"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : activeInvoice.status === "Overdue"
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {activeInvoice.status}
                        </span>
                      </div>

                      <h2 className="text-3xl font-black text-black tracking-tight mt-2">{activeInvoice.customer_name}</h2>
                      <p className="text-xs text-gray-400 font-medium">
                        finance@{activeInvoice.customer_name.toLowerCase().replace(/[^a-z0-9]/g, "")}.co
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block">INVOICE ID</span>
                      <span className="text-xl font-black text-black font-mono tracking-tight">#{activeInvoice.invoice_number}</span>
                    </div>
                  </div>

                  {/* 3 Metrics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-6 pt-6 border-t border-black/5">
                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">DATE OF ISSUE</span>
                      <div className="flex items-center gap-1.5 text-sm font-black text-black">
                        <Calendar className="size-4 text-gray-400" />
                        <span>{activeInvoice.issue_date}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">PAYMENT DUE DATE</span>
                      <div className="flex items-center gap-1.5 text-sm font-black text-black">
                        <Calendar className="size-4 text-gray-400" />
                        <span>{activeInvoice.due_date}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">TOTAL RECEIVABLE</span>
                      <span className="text-xl font-black text-black font-mono">
                        {activeInvoice.currency} {activeInvoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <div className="mt-8">
                    <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-3 block">INVOICE ITEMS & CHARGES</span>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 px-4 py-2 bg-black/[0.03] rounded-xl text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">
                      <span className="col-span-6">ITEM DETAILS</span>
                      <span className="col-span-2 text-center">QTY</span>
                      <span className="col-span-2 text-right">UNIT PRICE</span>
                      <span className="col-span-2 text-right">TOTAL</span>
                    </div>

                    {/* Item Rows */}
                    <div className="divide-y divide-black/5">
                      {activeInvoice.line_items.map((item, i) => (
                        <div key={i} className="grid grid-cols-12 px-4 py-3.5 text-xs items-center font-semibold">
                          <span className="col-span-6 font-bold text-black">{item.description}</span>
                          <span className="col-span-2 text-center font-mono text-gray-600">{item.quantity}</span>
                          <span className="col-span-2 text-right font-mono text-gray-600">
                            {activeInvoice.currency} {item.unit_price.toFixed(2)}
                          </span>
                          <span className="col-span-2 text-right font-mono font-bold text-black">
                            {activeInvoice.currency} {item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Summary Breakdown & GL Impact */}
                  <div className="mt-8 p-4 rounded-2xl bg-white/60 backdrop-blur-xs border border-black/5 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span className="font-mono">{activeInvoice.currency} {activeInvoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {activeInvoice.discount_amount ? (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Discount Applied</span>
                        <span className="font-mono">-{activeInvoice.currency} {activeInvoice.discount_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-gray-500">
                      <span>Tax Amount</span>
                      <span className="font-mono">{activeInvoice.currency} {activeInvoice.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-black text-sm pt-2 border-t border-black/5">
                      <span>Total Receivable</span>
                      <span className="font-mono">{activeInvoice.currency} {activeInvoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Amount Received</span>
                      <span className="font-mono">{activeInvoice.currency} {activeInvoice.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-black text-red-600 text-sm">
                      <span>Balance Outstanding</span>
                      <span className="font-mono">{activeInvoice.currency} {activeInvoice.balance_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    {/* GL Posting Impact Box */}
                    <div className="pt-3 border-t border-black/5 text-[10px] font-mono space-y-1">
                      <span className="font-sans font-extrabold uppercase text-gray-400 block mb-1">GL Posting Entry Audit</span>
                      <div className="flex justify-between text-black">
                        <span>Debit ACC-1200 (Accounts Receivable)</span>
                        <span className="font-bold">ETB {activeInvoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-gray-500 pl-2">
                        <span>Credit ACC-4000 (Sales Revenue)</span>
                        <span>ETB {(activeInvoice.total - activeInvoice.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      {activeInvoice.tax_amount > 0 && (
                        <div className="flex justify-between text-gray-500 pl-2">
                          <span>Credit ACC-2210 (Tax Liability)</span>
                          <span>ETB {activeInvoice.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between pt-6 border-t border-black/5 mt-8">
                  <div className="flex items-center gap-5">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors"
                    >
                      <Printer className="size-4 text-gray-400" /> Print
                    </button>
                    <button
                      onClick={() => showToast("PDF Exported", "success", "Invoice PDF exported successfully.")}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors"
                    >
                      <Download className="size-4 text-gray-400" /> PDF
                    </button>
                    <button
                      onClick={() => showToast("Email Dispatched", "info", `Invoice emailed to finance@${activeInvoice.customer_name.toLowerCase().replace(/[^a-z0-9]/g, "")}.co`)}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors"
                    >
                      <Mail className="size-4 text-gray-400" /> Dispatch Email
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {activeInvoice.status !== "Cancelled" && (
                      <button
                        onClick={() => {
                          store.cancelInvoice(activeInvoice.id)
                          showToast("Invoice Cancelled", "info", `Invoice ${activeInvoice.invoice_number} voided & GL reversal entry posted.`)
                        }}
                        className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                        title="Void / Delete Invoice"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}

                    {activeInvoice.balance_due > 0 && activeInvoice.status !== "Cancelled" ? (
                      <button
                        onClick={() => {
                          setPaymentAmount(activeInvoice.balance_due.toString())
                          setShowPaymentModal(true)
                        }}
                        className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-black/10 flex items-center gap-2"
                      >
                        <CreditCard className="size-3.5" /> Mark Paid
                      </button>
                    ) : (
                      <span className="px-5 py-2 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-200">
                        {activeInvoice.status === "Cancelled" ? "Cancelled" : "Paid"}
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-12 text-center text-gray-400 text-sm border border-black/5 flex flex-col items-center justify-center min-h-[600px] space-y-3">
                <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-gray-400">
                  <Search className="size-6 text-gray-400" />
                </div>
                <p className="font-bold text-gray-700 text-base">Nothing to show</p>
                <p className="text-xs text-gray-400 max-w-sm">There are no invoices to display for the "{filterStatus}" filter. Select a different tab or create a new invoice.</p>
              </GlassCard>
            )}
          </div>
        </div>
      </motion.div>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && activeInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-zinc-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black uppercase text-black">Record Payment for #{activeInvoice.invoice_number}</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-black">
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payment Amount ({activeInvoice.currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-black focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Remaining balance: ETB {activeInvoice.balance_due.toFixed(2)}</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none"
                  >
                    <option value="Wire Transfer">Wire Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                    <option value="Corporate Card">Corporate Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Reference / Transaction #</label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. TXN-8849"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-zinc-50 uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase shadow-lg shadow-black/10"
                  >
                    Confirm & Post
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <button onClick={() => setShowCreateDrawer(false)} className="p-1.5 text-gray-400 hover:text-black">
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
                        value={taxTemplate}
                        onChange={(e) => setTaxTemplate(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-2 text-xs font-bold text-black focus:outline-none"
                      >
                        <option value="VAT_15">15% Standard VAT</option>
                        <option value="ZERO_0">0% Zero-Rated Tax</option>
                        <option value="WHT_3">3% Withholding Tax</option>
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
                        className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
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
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="size-3.5" />
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
                      className="px-3 py-2.5 border border-zinc-300 hover:bg-zinc-100 rounded-xl text-xs font-bold text-black uppercase"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateDrawer(false)}
                      className="px-3 py-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-gray-500 uppercase"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCreateInvoiceSubmit(e, "Sent")}
                      className="flex-1 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase shadow-lg shadow-black/10"
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
