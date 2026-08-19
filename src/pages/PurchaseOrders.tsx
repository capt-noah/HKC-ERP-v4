import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  Printer, 
  X, 
  Pencil, 
  Upload, 
  Paperclip,
  Eye,
  Trash2
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore, type PurchaseOrder, type PurchaseOrderAttachment, type VoucherAccountRow } from "@/lib/erpStore"
import { useFinanceStore } from "@/lib/financeStore"
import { useFeedback } from "@/context/FeedbackContext"
import { DataTable } from "@/components/DataTable"
import { type TableColumn } from "@/components/ResizableTable"
import { EditModalHeader } from "@/components/EditModalHeader"
import { RecordDeleteModal } from "@/components/RecordDeleteModal"
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal"
import { numberToBirrWords } from "@/lib/numberToWords"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

export default function PurchaseOrders() {
  const { showToast } = useFeedback()
  const erp = useErpStore()
  const finance = useFinanceStore()
  const isLoading = erp.isLoading()

  const purchaseOrders = erp.getPurchaseOrders()
  const coaAccounts = finance.getAccounts()
  const postableAccounts = finance.getPostableAccounts()

  // Filter & Search State
  const [filterTab, setFilterTab] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null)
  const [deletingPo, setDeletingPo] = useState<PurchaseOrder | null>(null)
  const [printingPo, setPrintingPo] = useState<PurchaseOrder | null>(null)

  // Document Preview State
  const [previewUrl, setPreviewUrl] = useState("")
  const [previewName, setPreviewName] = useState("")

  // Voucher Form State
  const [voucherNo, setVoucherNo] = useState("")
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0])
  const [paidTo, setPaidTo] = useState("")
  const [reasonForPayment, setReasonForPayment] = useState("")
  const [chequeNo, setChequeNo] = useState("")
  const [paidAmount, setPaidAmount] = useState<number | "">("")
  const [status, setStatus] = useState<"PAID" | "DRAFT">("PAID")

  // Account Distribution Rows (Account No, Description, Debit, Credit)
  const [accountRows, setAccountRows] = useState<VoucherAccountRow[]>([
    { accountCode: "1410", description: "", debit: 0, credit: 0 }
  ])

  // Attachments
  const [attachments, setAttachments] = useState<PurchaseOrderAttachment[]>([])

  // Calculate Table Totals
  const totalDebit = useMemo(() => {
    return accountRows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0)
  }, [accountRows])

  const totalCredit = useMemo(() => {
    return accountRows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0)
  }, [accountRows])

  // Table Columns
  const defaultColWidths: Record<string, number> = {
    voucherNo: 130,
    date: 110,
    paidTo: 220,
    reason: 220,
    account: 180,
    chequeNo: 130,
    amount: 160,
    status: 110,
    _actions: 130,
  }

  const columns: TableColumn[] = [
    { key: "voucherNo", label: "Voucher ID", align: "left" },
    { key: "date", label: "Date", align: "left" },
    { key: "paidTo", label: "Paid To", align: "left" },
    { key: "reason", label: "Reason", align: "left" },
    { key: "account", label: "Account", align: "left" },
    { key: "chequeNo", label: "Cheque Ref", align: "left" },
    { key: "amount", label: "Amount (ETB)", align: "right" },
    { key: "status", label: "Status", align: "center" },
    { key: "_actions", label: "Action", align: "center", noSort: true },
  ]

  // Filtered List
  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      // Filter tab
      if (filterTab === "PAID" && po.status !== "PAID" && po.status !== "COMPLETED") return false
      if (filterTab === "DRAFT" && (po.status === "PAID" || po.status === "COMPLETED")) return false

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchVoucher = (po.voucherNo || po.poNumber || "").toLowerCase().includes(query)
        const matchPaidTo = (po.paidTo || po.supplier || "").toLowerCase().includes(query)
        const matchReason = (po.reasonForPayment || po.category || "").toLowerCase().includes(query)
        const matchCheque = (po.chequeNo || "").toLowerCase().includes(query)
        if (!matchVoucher && !matchPaidTo && !matchReason && !matchCheque) return false
      }

      return true
    })
  }, [purchaseOrders, filterTab, searchQuery])

  // Open Create Modal (DO NOT auto-generate voucher number)
  const handleOpenCreateModal = () => {
    setVoucherNo("")
    setVoucherDate(new Date().toISOString().split("T")[0])
    setPaidTo("")
    setReasonForPayment("")
    setChequeNo("")
    setPaidAmount("")
    setStatus("PAID")
    setAccountRows([
      { accountCode: "1410", description: "", debit: 0, credit: 0 }
    ])
    setAttachments([])
    setEditingPo(null)
    setIsCreateModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (po: PurchaseOrder) => {
    setEditingPo(po)
    setVoucherNo(po.voucherNo || po.poNumber)
    setVoucherDate(po.date || new Date().toISOString().split("T")[0])
    setPaidTo(po.paidTo || po.supplier || "")
    setReasonForPayment(po.reasonForPayment || po.category || "")
    setChequeNo(po.chequeNo || "")
    setPaidAmount(po.amount || "")
    setStatus((po.status === "PAID" || po.status === "COMPLETED") ? "PAID" : "DRAFT")

    // Process account entries
    if (Array.isArray(po.accountEntries) && po.accountEntries.length > 0) {
      setAccountRows(po.accountEntries.map(e => ({ ...e })))
    } else {
      setAccountRows([
        { 
          accountCode: po.targetAccountCode || "1410", 
          description: po.reasonForPayment || "", 
          debit: po.amount || 0, 
          credit: 0 
        }
      ])
    }
    
    // Process attachments
    if (Array.isArray(po.attachments)) {
      const parsedAttachments: PurchaseOrderAttachment[] = po.attachments.map((att, idx) => {
        if (typeof att === "string") {
          return {
            id: `att-${idx}`,
            name: `Attachment ${idx + 1}`,
            size: 102400,
            url: att,
            uploadedAt: new Date().toISOString(),
          }
        }
        return att
      })
      setAttachments(parsedAttachments)
    } else {
      setAttachments([])
    }

    setIsEditModalOpen(true)
  }

  // Account Rows Management
  const handleAddAccountRow = () => {
    setAccountRows((prev) => [
      ...prev,
      { accountCode: "1410", description: "", debit: 0, credit: 0 }
    ])
  }

  const handleRemoveAccountRow = (index: number) => {
    if (accountRows.length <= 1) return
    setAccountRows((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleAccountRowChange = (index: number, field: keyof VoucherAccountRow, value: any) => {
    setAccountRows((prev) => {
      const next = [...prev]
      const row = { ...next[index] }

      if (field === "accountCode") {
        row.accountCode = value
        const matched = coaAccounts.find((a) => a.code === value)
        row.accountId = matched?.id
        row.accountName = matched?.name
      } else if (field === "debit" || field === "credit") {
        row[field] = value === "" ? 0 : Number(value)
      } else {
        (row as any)[field] = value
      }

      next[index] = row
      return next
    })
  }

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const newAttachment: PurchaseOrderAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          url: event.target?.result as string,
          uploadedAt: new Date().toISOString(),
        }
        setAttachments((prev) => [...prev, newAttachment])
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ""
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  // Save Create Voucher
  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault()

    if (!voucherNo.trim()) {
      showToast("Missing Information", "warning", "Please enter Voucher No.")
      return
    }

    if (!paidTo.trim()) {
      showToast("Missing Information", "warning", "Please enter Paid To.")
      return
    }

    const numericAmount = Number(paidAmount) || (totalDebit > 0 ? totalDebit : 0)
    if (numericAmount <= 0) {
      showToast("Invalid Amount", "warning", "Please enter a valid paid amount.")
      return
    }

    // Populate full account names on rows
    const enrichedRows = accountRows.map((r) => {
      const acc = coaAccounts.find((a) => a.code === r.accountCode)
      return {
        ...r,
        accountId: acc?.id,
        accountName: acc?.name || "Inventory Asset",
      }
    })

    const primaryRow = enrichedRows[0]
    const amountInWords = numberToBirrWords(numericAmount)

    const newPo: PurchaseOrder = {
      id: `PO-${Date.now().toString().slice(-4)}`,
      poNumber: voucherNo.trim(),
      voucherNo: voucherNo.trim(),
      date: voucherDate,
      paidTo: paidTo.trim(),
      supplier: paidTo.trim(),
      reasonForPayment: reasonForPayment.trim(),
      targetAccountId: primaryRow?.accountId,
      targetAccountCode: primaryRow?.accountCode || "1410",
      targetAccountName: primaryRow?.accountName || "Inventory Asset",
      chequeNo: chequeNo.trim(),
      amount: numericAmount,
      amountInWords,
      accountEntries: enrichedRows,
      currency: "ETB",
      status,
      statusColor: status === "PAID" ? "bg-emerald-500" : "bg-amber-500",
      attachments,
    }
    erp.addPurchaseOrder(newPo)
    showToast(
      "Voucher Created",
      "success",
      status === "PAID"
        ? `Payment Voucher ${voucherNo} has been registered and posted to the General Ledger.`
        : `Payment Voucher ${voucherNo} saved as Draft.`
    )
    setIsCreateModalOpen(false)
  }

  // Save Edit Voucher
  const handleSaveEditVoucher = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPo) return

    if (!voucherNo.trim()) {
      showToast("Missing Information", "warning", "Please enter Voucher No.")
      return
    }

    if (!paidTo.trim()) {
      showToast("Missing Information", "warning", "Please enter Paid To.")
      return
    }

    const numericAmount = Number(paidAmount) || (totalDebit > 0 ? totalDebit : 0)
    if (numericAmount <= 0) {
      showToast("Invalid Amount", "warning", "Please enter a valid paid amount.")
      return
    }

    // Populate full account names on rows
    const enrichedRows = accountRows.map((r) => {
      const acc = coaAccounts.find((a) => a.code === r.accountCode)
      return {
        ...r,
        accountId: acc?.id,
        accountName: acc?.name || "Inventory Asset",
      }
    })

    const primaryRow = enrichedRows[0]
    const amountInWords = numberToBirrWords(numericAmount)

    erp.updatePurchaseOrder(editingPo.id, {
      voucherNo: voucherNo.trim(),
      poNumber: voucherNo.trim(),
      date: voucherDate,
      paidTo: paidTo.trim(),
      supplier: paidTo.trim(),
      reasonForPayment: reasonForPayment.trim(),
      targetAccountId: primaryRow?.accountId,
      targetAccountCode: primaryRow?.accountCode || "1410",
      targetAccountName: primaryRow?.accountName || "Inventory Asset",
      chequeNo: chequeNo.trim(),
      amount: numericAmount,
      amountInWords,
      accountEntries: enrichedRows,
      status,
      statusColor: status === "PAID" ? "bg-emerald-500" : "bg-amber-500",
      attachments,
    })
    showToast(
      "Voucher Updated",
      "success",
      status === "PAID"
        ? `Payment Voucher ${voucherNo} updated and synced with the General Ledger.`
        : `Payment Voucher ${voucherNo} updated.`
    )
    setIsEditModalOpen(false)
  }

  // Delete Voucher
  const handleConfirmDelete = () => {
    if (!deletingPo) return
    erp.deletePurchaseOrder(deletingPo.id)
    showToast("Voucher Deleted", "success", `Payment voucher ${deletingPo.voucherNo || deletingPo.poNumber} has been removed.`)
    setDeletingPo(null)
    setIsEditModalOpen(false)
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={fade} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-black tracking-tight">Purchase Orders & Vouchers</h1>
            </div>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Manage procurement contracts, payment vouchers, and expense attachments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SubPageNav items={getSectionChildren("/sales")} />
          </div>
        </div>

        {/* PURCHASE ORDERS REGISTER */}
        <DataTable
          title="Purchase Orders Register"
          subtitle={`Total: ${filteredPurchaseOrders.length} purchase vouchers`}
          columns={columns}
          data={filteredPurchaseOrders}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search voucher no, paid to, reason, cheque no..."
          filters={[
            {
              value: filterTab,
              onChange: setFilterTab,
              ariaLabel: "Filter by Status",
              options: [
                { value: "ALL", label: "All Vouchers" },
                { value: "PAID", label: "Paid" },
                { value: "DRAFT", label: "Draft" },
              ],
            },
          ]}
          actions={[
            {
              label: "New Voucher",
              onClick: handleOpenCreateModal,
              icon: <Plus className="size-4" />,
              variant: "primary",
            },
          ]}
          defaultWidths={defaultColWidths}
          keyExtractor={(po) => po.id}
          renderRow={(po, colWidths) => (
            <>
              {/* Voucher ID */}
              <td style={{ width: `${colWidths.voucherNo}px` }} className="py-4 px-6 overflow-hidden">
                <span className="font-black text-zinc-950 text-xs tracking-tight leading-tight truncate font-mono block">
                  {po.voucherNo || po.poNumber}
                </span>
              </td>

              {/* Date */}
              <td style={{ width: `${colWidths.date}px` }} className="py-4 px-4 overflow-hidden">
                <span className="font-mono text-xs text-zinc-700 font-bold">
                  {po.date}
                </span>
              </td>

              {/* Paid To */}
              <td style={{ width: `${colWidths.paidTo}px` }} className="py-4 px-4 overflow-hidden">
                <span className="font-black text-zinc-950 text-xs tracking-tight leading-tight truncate block">
                  {po.paidTo || po.supplier || "—"}
                </span>
              </td>

              {/* Reason */}
              <td style={{ width: `${colWidths.reason}px` }} className="py-4 px-4 overflow-hidden">
                <span className="text-xs text-zinc-600 font-medium tracking-tight truncate block">
                  {po.reasonForPayment || po.category || "—"}
                </span>
              </td>

              {/* Account */}
              <td style={{ width: `${colWidths.account}px` }} className="py-4 px-4 overflow-hidden">
                {Array.isArray(po.accountEntries) && po.accountEntries.length > 1 ? (
                  <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 border border-zinc-200/50 px-2 py-0.5 rounded-full inline-block truncate">
                    {po.accountEntries.length} Account Splits
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-tight bg-zinc-100 border border-zinc-200/50 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                    {po.targetAccountCode || "1410"} • {po.targetAccountName || "Inventory"}
                  </span>
                )}
              </td>

              {/* Cheque No */}
              <td style={{ width: `${colWidths.chequeNo}px` }} className="py-4 px-4 overflow-hidden">
                <span className="font-mono text-xs font-bold text-zinc-700">
                  {po.chequeNo || "—"}
                </span>
              </td>

              {/* Paid Amount */}
              <td style={{ width: `${colWidths.amount}px` }} className="py-4 px-4 text-right font-mono text-xs overflow-hidden">
                <div className="font-black text-zinc-950">
                  ETB {Number(po.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </td>

              {/* Status */}
              <td style={{ width: `${colWidths.status}px` }} className="py-4 px-4 text-center overflow-hidden">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  po.status === "PAID" || po.status === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-900 border border-amber-200"
                }`}>
                  {po.status === "PAID" || po.status === "COMPLETED" ? "Paid" : "Draft"}
                </span>
              </td>

              {/* Actions */}
              <td style={{ width: `${colWidths._actions}px` }} className="py-4 px-4 text-center whitespace-nowrap overflow-hidden">
                <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenEditModal(po)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-[11px] transition-all border border-zinc-200/80 active:scale-95 shadow-2xs"
                    title="Edit Voucher"
                  >
                    <Pencil className="size-3 text-zinc-700" /> Edit
                  </button>
                  <button
                    onClick={() => setPrintingPo(po)}
                    className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200/80 transition-all"
                    title="Print Voucher"
                  >
                    <Printer className="size-3.5" />
                  </button>
                </div>
              </td>
            </>
          )}
        />
      </motion.div>

      {/* MODAL: CREATE PAYMENT VOUCHER */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-zinc-950 mb-0.5">Create Payment Voucher</h2>
                  <p className="text-xs font-semibold text-zinc-500">Record a cheque payment voucher with account debit/credit allocations and supporting files.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                  title="Close modal"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreateVoucher} className="space-y-4">
                {/* Top Section Fields */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Row 1: Voucher No (3 cols - MANUAL INPUT), Date (3 cols), Cheque No (3 cols), Status (3 cols) */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Voucher No. *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 00004375"
                      value={voucherNo}
                      onChange={(e) => setVoucherNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Cheque No. / Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. CHQ-009823"
                      value={chequeNo}
                      onChange={(e) => setChequeNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "PAID" | "DRAFT")}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      <option value="PAID">Paid (Post to GL)</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                  </div>

                  {/* Row 2: Paid To (6 cols), Reason for Payment (6 cols) */}
                  <div className="md:col-span-6">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Paid To *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. National Oil Ethiopia NOC / Addis Transport"
                      value={paidTo}
                      onChange={(e) => setPaidTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Reason for Payment *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Warehouse Rent / Fleet Fuel & Maintenance"
                      value={reasonForPayment}
                      onChange={(e) => setReasonForPayment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Row 3: Amount in figure */}
                  <div className="md:col-span-12">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Amount in figure (ETB) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono font-black outline-none"
                    />
                  </div>
                </div>

                {/* ACCOUNT ENTRIES TABLE (Account No, Description, Debit, Credit) */}
                <div className="border border-zinc-200 rounded-2xl p-3 bg-zinc-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs text-zinc-900 uppercase tracking-wider">
                        Account Distribution & Entries
                      </h4>
                      <p className="text-[10px] text-zinc-500">Specify general ledger accounts, line descriptions, debit, and credit amounts.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAccountRow}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all"
                    >
                      <Plus className="size-3.5" /> Add Row
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 font-bold text-[11px]">
                          <th className="py-2 px-2 w-[240px]">Account No.</th>
                          <th className="py-2 px-2">Description</th>
                          <th className="py-2 px-2 w-[140px] text-right">Debit (ETB)</th>
                          <th className="py-2 px-2 w-[140px] text-right">Credit (ETB)</th>
                          <th className="py-2 px-2 w-[40px] text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {accountRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/60">
                            <td className="py-1.5 px-2">
                              <select
                                value={row.accountCode}
                                onChange={(e) => handleAccountRowChange(idx, "accountCode", e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-semibold outline-none"
                              >
                                {postableAccounts.map((a) => (
                                  <option key={a.id} value={a.code}>
                                    {a.code} - {a.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                placeholder="Line description..."
                                value={row.description}
                                onChange={(e) => handleAccountRowChange(idx, "description", e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-medium outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.debit === 0 ? "" : row.debit}
                                onChange={(e) => handleAccountRowChange(idx, "debit", e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-mono font-bold text-right outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.credit === 0 ? "" : row.credit}
                                onChange={(e) => handleAccountRowChange(idx, "credit", e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-mono font-bold text-right outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {accountRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAccountRow(idx)}
                                  className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Remove Row"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-300 font-bold text-xs bg-white/80">
                          <td colSpan={2} className="py-2 px-2 text-right text-zinc-600">Total:</td>
                          <td className="py-2 px-2 text-right font-mono font-black text-zinc-950">
                            ETB {totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-black text-zinc-950">
                            ETB {totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Supporting Attachments Section - Taller & Dedicated */}
                <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs text-zinc-900 uppercase tracking-wider">
                        Supporting Attachments
                      </h4>
                      <p className="text-[10px] text-zinc-500">Attach cheque scan, proforma, bank receipts, or invoices.</p>
                    </div>
                    {attachments.length > 0 && (
                      <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
                        {attachments.length} file{attachments.length === 1 ? "" : "s"} attached
                      </span>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-2xl p-5 text-center transition-colors bg-white">
                    <input
                      type="file"
                      id="create-voucher-attachment"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="create-voucher-attachment"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                    >
                      <div className="size-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
                        <Upload className="size-4" />
                      </div>
                      <span className="text-xs font-bold text-zinc-800">
                        Click to upload or drag & drop files
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Scanned cheques, receipts, proformas, invoices (PNG, JPG, PDF up to 10MB)
                      </span>
                    </label>
                  </div>

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {attachments.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-zinc-200 text-[11px] font-semibold text-zinc-800 shadow-2xs"
                        >
                          <Paperclip className="size-3 text-zinc-500 shrink-0" />
                          <span className="truncate max-w-[160px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewUrl(file.url)
                              setPreviewName(file.name)
                            }}
                            className="text-blue-600 hover:text-blue-800 p-0.5"
                            title="Preview file"
                          >
                            <Eye className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(file.id)}
                            className="text-rose-500 hover:text-rose-700 p-0.5"
                            title="Remove file"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md"
                  >
                    Create Voucher
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT PAYMENT VOUCHER */}
      <AnimatePresence>
        {isEditModalOpen && editingPo && (
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
              className="relative z-10 bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              {/* Header with 3-Dot Options Dropdown */}
              <EditModalHeader
                title={`Edit Payment Voucher (${voucherNo})`}
                subtitle="Update payee, reason, account allocations, debit/credit entries, and supporting files."
                onClose={() => setIsEditModalOpen(false)}
                onRequestDelete={() => setDeletingPo(editingPo)}
                deleteLabel="Delete Payment Voucher"
              />

              <form onSubmit={handleSaveEditVoucher} className="space-y-4">
                {/* Top Section Fields */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Row 1: Voucher No (3 cols), Date (3 cols), Cheque No (3 cols), Status (3 cols) */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Voucher No. *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 00004375"
                      value={voucherNo}
                      onChange={(e) => setVoucherNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Cheque No. / Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. CHQ-009823"
                      value={chequeNo}
                      onChange={(e) => setChequeNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "PAID" | "DRAFT")}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      <option value="PAID">Paid (Post to GL)</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                  </div>

                  {/* Row 2: Paid To (6 cols), Reason for Payment (6 cols) */}
                  <div className="md:col-span-6">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Paid To *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. National Oil Ethiopia NOC"
                      value={paidTo}
                      onChange={(e) => setPaidTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Reason for Payment *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Warehouse Rent / Fleet Fuel & Maintenance"
                      value={reasonForPayment}
                      onChange={(e) => setReasonForPayment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Row 3: Amount in figure */}
                  <div className="md:col-span-12">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Amount in figure (ETB) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono font-black outline-none"
                    />
                  </div>
                </div>

                {/* ACCOUNT ENTRIES TABLE (Account No, Description, Debit, Credit) */}
                <div className="border border-zinc-200 rounded-2xl p-3 bg-zinc-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs text-zinc-900 uppercase tracking-wider">
                        Account Distribution & Entries
                      </h4>
                      <p className="text-[10px] text-zinc-500">Specify general ledger accounts, line descriptions, debit, and credit amounts.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAccountRow}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-all"
                    >
                      <Plus className="size-3.5" /> Add Row
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 font-bold text-[11px]">
                          <th className="py-2 px-2 w-[240px]">Account No.</th>
                          <th className="py-2 px-2">Description</th>
                          <th className="py-2 px-2 w-[140px] text-right">Debit (ETB)</th>
                          <th className="py-2 px-2 w-[140px] text-right">Credit (ETB)</th>
                          <th className="py-2 px-2 w-[40px] text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {accountRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/60">
                            <td className="py-1.5 px-2">
                              <select
                                value={row.accountCode}
                                onChange={(e) => handleAccountRowChange(idx, "accountCode", e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-semibold outline-none"
                              >
                                {postableAccounts.map((a) => (
                                  <option key={a.id} value={a.code}>
                                    {a.code} - {a.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                placeholder="Line description..."
                                value={row.description}
                                onChange={(e) => handleAccountRowChange(idx, "description", e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-medium outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.debit === 0 ? "" : row.debit}
                                onChange={(e) => handleAccountRowChange(idx, "debit", e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-mono font-bold text-right outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.credit === 0 ? "" : row.credit}
                                onChange={(e) => handleAccountRowChange(idx, "credit", e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-mono font-bold text-right outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {accountRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAccountRow(idx)}
                                  className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Remove Row"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-300 font-bold text-xs bg-white/80">
                          <td colSpan={2} className="py-2 px-2 text-right text-zinc-600">Total:</td>
                          <td className="py-2 px-2 text-right font-mono font-black text-zinc-950">
                            ETB {totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-black text-zinc-950">
                            ETB {totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Supporting Attachments Section - Taller & Dedicated */}
                <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs text-zinc-900 uppercase tracking-wider">
                        Supporting Attachments
                      </h4>
                      <p className="text-[10px] text-zinc-500">Attach cheque scan, proforma, bank receipts, or invoices.</p>
                    </div>
                    {attachments.length > 0 && (
                      <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
                        {attachments.length} file{attachments.length === 1 ? "" : "s"} attached
                      </span>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-2xl p-5 text-center transition-colors bg-white">
                    <input
                      type="file"
                      id="edit-voucher-attachment"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-voucher-attachment"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                    >
                      <div className="size-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
                        <Upload className="size-4" />
                      </div>
                      <span className="text-xs font-bold text-zinc-800">
                        Click to upload or drag & drop files
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Scanned cheques, receipts, proformas, invoices (PNG, JPG, PDF up to 10MB)
                      </span>
                    </label>
                  </div>

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {attachments.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-zinc-200 text-[11px] font-semibold text-zinc-800 shadow-2xs"
                        >
                          <Paperclip className="size-3 text-zinc-500 shrink-0" />
                          <span className="truncate max-w-[160px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewUrl(file.url)
                              setPreviewName(file.name)
                            }}
                            className="text-blue-600 hover:text-blue-800 p-0.5"
                            title="Preview file"
                          >
                            <Eye className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(file.id)}
                            className="text-rose-500 hover:text-rose-700 p-0.5"
                            title="Remove file"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECORD DELETE CONFIRMATION MODAL */}
      <RecordDeleteModal
        isOpen={!!deletingPo}
        onClose={() => setDeletingPo(null)}
        onConfirmDelete={handleConfirmDelete}
        title="Delete Payment Voucher"
        recordName={deletingPo?.voucherNo || deletingPo?.poNumber || "this voucher"}
        description="This action will permanently delete this payment voucher."
      />

      {/* PRINTABLE OFFICIAL VOUCHER SLIP MODAL */}
      <AnimatePresence>
        {printingPo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl border border-zinc-200 my-8 flex flex-col gap-6 text-zinc-900"
            >
              {/* Header Action Bar */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 no-print">
                <div className="flex items-center gap-2">
                  <Printer className="size-4 text-zinc-600" />
                  <span className="font-bold text-xs text-zinc-600">Cheque Payment Voucher Slip</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-950 text-white font-bold text-xs hover:bg-zinc-800"
                  >
                    <Printer className="size-3.5" /> Print Voucher
                  </button>
                  <button
                    onClick={() => setPrintingPo(null)}
                    className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              {/* Official Voucher Printable Area */}
              <div className="p-6 border-2 border-zinc-900 rounded-2xl flex flex-col gap-5 bg-white">
                {/* Header */}
                <div className="text-center border-b-2 border-zinc-900 pb-4">
                  <h2 className="text-xl font-black uppercase tracking-wider">
                    HABTOM KEBEDE CHIMSA IMPORT & EXPORT
                  </h2>
                  <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
                    CHEQUE PAYMENT VOUCHER
                  </p>
                </div>

                {/* Top Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-600">Voucher No:</span>
                    <span className="font-mono font-black text-zinc-950 border-b border-zinc-400 pb-0.5 flex-1">
                      {printingPo.voucherNo || printingPo.poNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-600">Date:</span>
                    <span className="font-semibold text-zinc-950 border-b border-zinc-400 pb-0.5 flex-1">
                      {printingPo.date}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="font-bold text-zinc-600">Paid To:</span>
                    <span className="font-bold text-zinc-950 border-b border-zinc-400 pb-0.5 flex-1">
                      {printingPo.paidTo || printingPo.supplier}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="font-bold text-zinc-600">Reason for Payment:</span>
                    <span className="font-medium text-zinc-900 border-b border-zinc-400 pb-0.5 flex-1">
                      {printingPo.reasonForPayment || printingPo.category || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-600">Cheque No:</span>
                    <span className="font-mono font-bold text-zinc-950 border-b border-zinc-400 pb-0.5 flex-1">
                      {printingPo.chequeNo || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-600">Amount in Figure:</span>
                    <span className="font-mono font-black text-zinc-950 border-b border-zinc-400 pb-0.5 flex-1">
                      ETB {Number(printingPo.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Amount in words */}
                <div className="text-xs flex items-center gap-2 border-t border-b border-zinc-200 py-2">
                  <span className="font-bold text-zinc-600 shrink-0">Amount in Words:</span>
                  <span className="font-bold text-zinc-950 italic flex-1 border-b border-zinc-300 pb-0.5">
                    {printingPo.amountInWords || numberToBirrWords(printingPo.amount)}
                  </span>
                </div>

                {/* Account Entries Table */}
                <table className="w-full text-xs border border-zinc-900 border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-900 font-bold">
                      <th className="border-r border-zinc-900 py-1.5 px-2 text-left w-[120px]">Account No.</th>
                      <th className="border-r border-zinc-900 py-1.5 px-2 text-left">Description</th>
                      <th className="border-r border-zinc-900 py-1.5 px-2 text-right w-[110px]">Debit</th>
                      <th className="py-1.5 px-2 text-right w-[110px]">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(printingPo.accountEntries) && printingPo.accountEntries.length > 0 ? (
                      printingPo.accountEntries.map((row, idx) => (
                        <tr key={idx} className="border-b border-zinc-300">
                          <td className="border-r border-zinc-900 py-1.5 px-2 font-mono font-bold">{row.accountCode}</td>
                          <td className="border-r border-zinc-900 py-1.5 px-2">{row.description || printingPo.reasonForPayment || "—"}</td>
                          <td className="border-r border-zinc-900 py-1.5 px-2 text-right font-mono font-semibold">
                            {row.debit > 0 ? Number(row.debit).toLocaleString("en-US", { minimumFractionDigits: 2 }) : ""}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-semibold">
                            {row.credit > 0 ? Number(row.credit).toLocaleString("en-US", { minimumFractionDigits: 2 }) : ""}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-zinc-300">
                        <td className="border-r border-zinc-900 py-1.5 px-2 font-mono font-bold">{printingPo.targetAccountCode || "1410"}</td>
                        <td className="border-r border-zinc-900 py-1.5 px-2">{printingPo.reasonForPayment || "Payment"}</td>
                        <td className="border-r border-zinc-900 py-1.5 px-2 text-right font-mono font-semibold">
                          {Number(printingPo.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold"></td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Attached Files List */}
                {Array.isArray(printingPo.attachments) && printingPo.attachments.length > 0 && (
                  <div className="text-xs border border-zinc-200 rounded-xl p-3 bg-zinc-50/60">
                    <span className="font-bold text-zinc-700 block mb-1">Attached Supporting Documents:</span>
                    <div className="flex flex-wrap gap-2">
                      {printingPo.attachments.map((att, idx) => (
                        <span key={idx} className="font-medium text-zinc-600 bg-white px-2 py-0.5 rounded border border-zinc-200">
                          {typeof att === "string" ? `File ${idx + 1}` : att.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DOCUMENT / FILE PREVIEW MODAL */}
      <DocumentPreviewModal
        isOpen={!!previewUrl}
        onClose={() => {
          setPreviewUrl("")
          setPreviewName("")
        }}
        fileUrl={previewUrl}
        fileName={previewName}
      />
    </div>
  )
}
