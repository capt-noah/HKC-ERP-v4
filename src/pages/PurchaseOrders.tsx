import { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  X, 
  Pencil, 
  Upload, 
  Paperclip, 
  Eye, 
  Download,
  Check,
  ChevronDown,
  FileCheck,
  Building2,
  Receipt,
  CreditCard,
  Coins
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore, type PurchaseOrder, type PurchaseOrderAttachment } from "@/lib/erpStore"
import { useFinanceStore } from "@/lib/financeStore"
import { useFeedback } from "@/context/FeedbackContext"
import { DataTable } from "@/components/DataTable"
import { type TableColumn } from "@/components/ResizableTable"
import { EditModalHeader } from "@/components/EditModalHeader"
import { RecordDeleteModal } from "@/components/RecordDeleteModal"
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal"
import { numberToBirrWords } from "@/lib/numberToWords"
import PurchaseOrderPrintModal from "@/components/purchase/PurchaseOrderPrintModal"
import { LoadingDots } from "@/components/ui/LoadingDots"
import { ETHIOPIAN_BANKS } from "@/lib/ethiopianBanks"
import { uploadFile } from "@/lib/fileUpload"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

export default function PurchaseOrders() {
  const { showToast } = useFeedback()
  const erp = useErpStore()
  const financeStore = useFinanceStore()
  const isLoading = erp.isLoading()

  const purchaseOrders = erp.getPurchaseOrders()
  const suppliers = erp.getSuppliers()

  // Filter & Search State
  const [filterTab, setFilterTab] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null)
  const [deletingPo, setDeletingPo] = useState<PurchaseOrder | null>(null)
  const [printingPo, setPrintingPo] = useState<PurchaseOrder | null>(null)
  const [isSubmittingVoucher, setIsSubmittingVoucher] = useState(false)
  const [isSavingEditVoucher, setIsSavingEditVoucher] = useState(false)

  // Installment Payment Modal State
  const [payingPo, setPayingPo] = useState<PurchaseOrder | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])
  const [payBank, setPayBank] = useState("1000-02-26")
  const [payMethod, setPayMethod] = useState("Bank Transfer")
  const [payRef, setPayRef] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [payAdviceFile, setPayAdviceFile] = useState<File | null>(null)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  // Document Preview State
  const [previewUrl, setPreviewUrl] = useState("")
  const [previewName, setPreviewName] = useState("")

  // Voucher Form State
  const [voucherNo, setVoucherNo] = useState("")
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0])
  const [paidTo, setPaidTo] = useState("")
  const [reasonForPayment, setReasonForPayment] = useState("")
  const [bankName, setBankName] = useState<string>("Commercial Bank of Ethiopia (CBE)")
  const [paymentMethod, setPaymentMethod] = useState<"Cheque" | "Bank Transfer" | "RTGS" | "Cash">("Cheque")
  const [chequeNo, setChequeNo] = useState("")
  const [paidAmount, setPaidAmount] = useState<number | "">("")
  const [paymentType, setPaymentType] = useState<"Cash" | "Credit">("Cash")
  const [paymentTerms, setPaymentTerms] = useState("Net 30")
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split("T")[0]
  })
  const [status, setStatus] = useState<"PAID" | "DRAFT">("PAID")

  // Combobox Dropdown States & Refs
  const [showCreateBankDropdown, setShowCreateBankDropdown] = useState(false)
  const [showEditBankDropdown, setShowEditBankDropdown] = useState(false)
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const createBankRef = useRef<HTMLDivElement>(null)
  const editBankRef = useRef<HTMLDivElement>(null)
  const supplierRef = useRef<HTMLDivElement>(null)

  // Dedicated Payment Advice (Mandatory for PAID status)
  const [paymentAdvice, setPaymentAdvice] = useState<PurchaseOrderAttachment | null>(null)

  // Optional Supporting Attachments
  const [attachments, setAttachments] = useState<PurchaseOrderAttachment[]>([])

  // Close bank dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createBankRef.current && !createBankRef.current.contains(e.target as Node)) {
        setShowCreateBankDropdown(false)
      }
      if (editBankRef.current && !editBankRef.current.contains(e.target as Node)) {
        setShowEditBankDropdown(false)
      }
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Auto-calculate Due Date when paymentTerms changes
  const handlePaymentTermsChange = (terms: string, baseDateStr: string = voucherDate) => {
    setPaymentTerms(terms)
    const base = new Date(baseDateStr || new Date().toISOString().split("T")[0])
    if (terms === "Net 15") base.setDate(base.getDate() + 15)
    else if (terms === "Net 30") base.setDate(base.getDate() + 30)
    else if (terms === "Net 60") base.setDate(base.getDate() + 60)
    else if (terms === "Net 90") base.setDate(base.getDate() + 90)
    else if (terms === "Cash on Delivery") base.setDate(base.getDate() + 0)
    setDueDate(base.toISOString().split("T")[0])
  }

  // Table Columns
  const defaultColWidths: Record<string, number> = {
    voucherNo: 160,
    date: 100,
    paidTo: 170,
    bankName: 150,
    paymentMethod: 110,
    chequeNo: 120,
    amount: 140,
    adviceStatus: 125,
    supportingStatus: 130,
    status: 160,
    _actions: 200,
  }

  const columns: TableColumn[] = [
    { key: "voucherNo", label: "Voucher / PO Ref", align: "left" },
    { key: "date", label: "Date", align: "left" },
    { key: "paidTo", label: "Supplier / Paid To", align: "left" },
    { key: "bankName", label: "Bank", align: "left" },
    { key: "paymentMethod", label: "Method", align: "left" },
    { key: "chequeNo", label: "Cheque / Ref", align: "left" },
    { key: "amount", label: "Amount (ETB)", align: "right" },
    { key: "adviceStatus", label: "Payment Advice", align: "center", noSort: true },
    { key: "supportingStatus", label: "Supporting Docs", align: "center", noSort: true },
    { key: "status", label: "Status / Settlement", align: "center" },
    { key: "_actions", label: "Action", align: "center", noSort: true },
  ]

  // Filtered List
  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const isCredit = (po.paymentType || po.payment_type) === "Credit"
      const totalVal = Number(po.amount || 0)
      const paidVal = isCredit ? Number(po.amountPaid ?? po.amount_paid ?? 0) : totalVal
      const dueVal = isCredit ? (typeof po.balanceDue === "number" ? po.balanceDue : Math.max(0, totalVal - paidVal)) : 0
      const isSettled = !isCredit ? (po.status === "PAID" || po.status === "COMPLETED") : (dueVal <= 0.01 || po.settlementStatus === "Fully Settled")

      // Filter tab
      if (filterTab === "PAID" && !isSettled) return false
      if (filterTab === "CREDIT" && (!isCredit || isSettled)) return false
      if (filterTab === "DRAFT" && po.status !== "DRAFT") return false

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchVoucher = (po.voucherNo || po.poNumber || "").toLowerCase().includes(query)
        const matchPaidTo = (po.paidTo || po.supplier || "").toLowerCase().includes(query)
        const matchReason = (po.reasonForPayment || po.category || "").toLowerCase().includes(query)
        const matchCheque = (po.chequeNo || "").toLowerCase().includes(query)
        const matchBank = (po.bankName || "").toLowerCase().includes(query)
        const matchMethod = (po.paymentMethod || "").toLowerCase().includes(query)
        if (!matchVoucher && !matchPaidTo && !matchReason && !matchCheque && !matchBank && !matchMethod) return false
      }

      return true
    })
  }, [purchaseOrders, filterTab, searchQuery])

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setVoucherNo(`PV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`)
    setVoucherDate(new Date().toISOString().split("T")[0])
    setPaidTo("")
    setReasonForPayment("")
    setBankName("Commercial Bank of Ethiopia (CBE)")
    setPaymentMethod("Cheque")
    setChequeNo("")
    setPaidAmount("")
    setPaymentType("Cash")
    setPaymentTerms("Net 30")
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setDueDate(d.toISOString().split("T")[0])
    setStatus("PAID")
    setPaymentAdvice(null)
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
    setBankName(po.bankName || "Commercial Bank of Ethiopia (CBE)")
    setPaymentMethod((po.paymentMethod as any) || "Cheque")
    setChequeNo(po.chequeNo || "")
    setPaidAmount(po.amount || "")
    setPaymentType((po.paymentType || po.payment_type) === "Credit" ? "Credit" : "Cash")
    setPaymentTerms(po.paymentTerms || po.payment_terms || "Net 30")
    setDueDate(po.dueDate || po.due_date || new Date().toISOString().split("T")[0])
    setStatus((po.status === "PAID" || po.status === "COMPLETED") ? "PAID" : "DRAFT")

    // Process payment advice
    if (po.paymentAdviceAttachment) {
      setPaymentAdvice(po.paymentAdviceAttachment)
    } else {
      setPaymentAdvice(null)
    }

    // Process optional attachments
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

  // Open Installment Payment Modal
  const openRecordPayment = (po: PurchaseOrder) => {
    const isCredit = (po.paymentType || po.payment_type) === "Credit"
    const totalVal = Number(po.amount || 0)
    const paidVal = isCredit ? Number(po.amountPaid ?? po.amount_paid ?? 0) : totalVal
    const dueVal = Number(Math.max(0, totalVal - paidVal).toFixed(2))

    setPayingPo(po)
    setPayAmount(dueVal > 0 ? String(dueVal) : "")
    setPayDate(new Date().toISOString().split("T")[0])
    setPayBank(po.bankName || "1000-02-26")
    setPayMethod("Bank Transfer")
    setPayRef(`PAY-PO-${Date.now().toString().slice(-4)}`)
    setPayNotes("")
    setPayAdviceFile(null)
  }

  // Submit Installment Payment
  const handleRecordInstallmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payingPo || isSubmittingPayment) return
    const numAmount = parseFloat(payAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast("Invalid Amount", "warning", "Please enter a valid payment amount.")
      return
    }

    const totalVal = Number(payingPo.amount || 0)
    const alreadyPaid = Number(payingPo.amountPaid ?? payingPo.amount_paid ?? 0)
    const currentDue = Number(Math.max(0, totalVal - alreadyPaid).toFixed(2))

    if (numAmount > currentDue + 0.01) {
      showToast("Overpayment Notice", "warning", `Payment amount (ETB ${numAmount.toLocaleString()}) cannot exceed remaining balance due (ETB ${currentDue.toLocaleString()}).`)
      return
    }

    setIsSubmittingPayment(true)
    try {
      let stagedSlipUrl = ""
      let stagedSlipName = ""
      if (payAdviceFile) {
        try {
          const uploadRes = await uploadFile(payAdviceFile, "purchase_orders")
          stagedSlipName = uploadRes.originalName
          stagedSlipUrl = uploadRes.url
        } catch (uploadErr) {
          console.warn("Server upload failed, falling back to data URL:", uploadErr)
          stagedSlipName = payAdviceFile.name
          stagedSlipUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(payAdviceFile)
          })
        }
      }

      // Record in Finance Store (Accounts Payable GL Double Entry)
      financeStore.recordPayment({
        direction: "Made",
        linked_invoice_id: `INV-PO-${payingPo.id}`,
        purchase_order_id: payingPo.id,
        supplier_name: payingPo.paidTo || payingPo.supplier,
        amount: numAmount,
        currency: "ETB",
        date: payDate,
        method: payMethod,
        bank_account_code: payBank,
        reference: payRef || `PAY-PO-${Date.now().toString().slice(-4)}`,
        payment_advice_url: stagedSlipUrl || undefined,
        payment_advice_filename: stagedSlipName || undefined,
        notes: payNotes,
      })

      // Record in ERP Store
      erp.recordPurchaseOrderInstallment(payingPo.id, {
        amount: numAmount,
        date: payDate,
        bankAccountCode: payBank,
        reference: payRef || `PAY-PO-${Date.now().toString().slice(-4)}`,
        paymentAdviceUrl: stagedSlipUrl || undefined,
        paymentAdviceFilename: stagedSlipName || undefined,
        notes: payNotes,
      })

      const newDue = Number(Math.max(0, currentDue - numAmount).toFixed(2))
      showToast(
        "Payment Recorded",
        "success",
        `Installment of ETB ${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} paid to ${payingPo.paidTo || payingPo.supplier}. Remaining: ETB ${newDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`
      )
      setPayingPo(null)
    } catch (err) {
      showToast("Payment Failed", "warning", "Could not record supplier payment installment.")
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // Payment Advice Upload Handler
  const handlePaymentAdviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const newAdvice: PurchaseOrderAttachment = {
        id: `adv-${Date.now()}`,
        name: file.name,
        size: file.size,
        url: event.target?.result as string,
        uploadedAt: new Date().toISOString(),
      }
      setPaymentAdvice(newAdvice)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // Supporting Files Upload Handler
  const handleSupportingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleRemoveSupportingAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  // Save Create Voucher
  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingVoucher) return

    if (!voucherNo.trim()) {
      showToast("Missing Information", "warning", "Please enter Cheque Payment Voucher number.")
      return
    }

    if (!paidTo.trim()) {
      showToast("Missing Information", "warning", "Please enter Supplier / Paid To.")
      return
    }

    if (paymentType === "Cash" && !bankName.trim()) {
      showToast("Missing Information", "warning", "Please select or enter the issuing Bank.")
      return
    }

    const numericAmount = Number(paidAmount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast("Invalid Amount", "warning", "Please enter a valid purchase amount.")
      return
    }

    if (paymentType === "Cash" && status === "PAID" && !paymentAdvice) {
      showToast("Payment Advice Required", "warning", "Please attach the Payment Advice document before saving a Paid Cash voucher.")
      return
    }

    const isCredit = paymentType === "Credit"
    const amountInWords = numberToBirrWords(numericAmount)

    const newPo: PurchaseOrder = {
      id: `PO-${Date.now().toString().slice(-4)}`,
      poNumber: voucherNo.trim(),
      voucherNo: voucherNo.trim(),
      date: voucherDate,
      paidTo: paidTo.trim(),
      supplier: paidTo.trim(),
      reasonForPayment: reasonForPayment.trim(),
      bankName: bankName.trim(),
      paymentMethod,
      chequeNo: chequeNo.trim(),
      amount: numericAmount,
      amountPaid: isCredit ? 0 : numericAmount,
      amount_paid: isCredit ? 0 : numericAmount,
      balanceDue: isCredit ? numericAmount : 0,
      balance_due: isCredit ? numericAmount : 0,
      settlementStatus: isCredit ? "Unpaid" : "Fully Settled",
      settlement_status: isCredit ? "Unpaid" : "Fully Settled",
      paymentType,
      payment_type: paymentType,
      paymentTerms: isCredit ? paymentTerms : undefined,
      payment_terms: isCredit ? paymentTerms : undefined,
      dueDate: isCredit ? dueDate : undefined,
      due_date: isCredit ? dueDate : undefined,
      amountInWords,
      currency: "ETB",
      status: isCredit ? "PAID" : status,
      statusColor: status === "PAID" ? "bg-emerald-500" : "bg-amber-500",
      paymentAdviceAttachment: paymentAdvice,
      attachments,
    }

    try {
      setIsSubmittingVoucher(true)
      erp.addPurchaseOrder(newPo)
      showToast(
        "Voucher Created",
        "success",
        isCredit
          ? `Purchase Credit Voucher ${voucherNo} for ${paidTo} created with ${paymentTerms} terms.`
          : `Payment Voucher ${voucherNo} registered and posted.`
      )
      setIsCreateModalOpen(false)
    } catch (err) {
      showToast("Create Failed", "warning", "Could not create payment voucher.")
    } finally {
      setIsSubmittingVoucher(false)
    }
  }

  // Save Edit Voucher
  const handleSaveEditVoucher = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPo || isSavingEditVoucher) return

    if (!voucherNo.trim()) {
      showToast("Missing Information", "warning", "Please enter Cheque Payment Voucher number.")
      return
    }

    if (!paidTo.trim()) {
      showToast("Missing Information", "warning", "Please enter Paid To.")
      return
    }

    const numericAmount = Number(paidAmount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast("Invalid Amount", "warning", "Please enter a valid amount.")
      return
    }

    if (paymentType === "Cash" && status === "PAID" && !paymentAdvice) {
      showToast("Payment Advice Required", "warning", "Please attach the Payment Advice document before saving a Paid Cash voucher.")
      return
    }

    const isCredit = paymentType === "Credit"
    const amountInWords = numberToBirrWords(numericAmount)
    const prevPaid = isCredit ? Number(editingPo.amountPaid ?? editingPo.amount_paid ?? 0) : numericAmount
    const newDue = isCredit ? Number(Math.max(0, numericAmount - prevPaid).toFixed(2)) : 0
    const settlement = isCredit ? (newDue <= 0.01 ? "Fully Settled" : (prevPaid > 0 ? "Ongoing" : "Unpaid")) : "Fully Settled"

    try {
      setIsSavingEditVoucher(true)
      erp.updatePurchaseOrder(editingPo.id, {
        voucherNo: voucherNo.trim(),
        poNumber: voucherNo.trim(),
        date: voucherDate,
        paidTo: paidTo.trim(),
        supplier: paidTo.trim(),
        reasonForPayment: reasonForPayment.trim(),
        bankName: bankName.trim(),
        paymentMethod,
        chequeNo: chequeNo.trim(),
        amount: numericAmount,
        amountPaid: prevPaid,
        amount_paid: prevPaid,
        balanceDue: newDue,
        balance_due: newDue,
        settlementStatus: settlement,
        settlement_status: settlement,
        paymentType,
        payment_type: paymentType,
        paymentTerms: isCredit ? paymentTerms : undefined,
        payment_terms: isCredit ? paymentTerms : undefined,
        dueDate: isCredit ? dueDate : undefined,
        due_date: isCredit ? dueDate : undefined,
        amountInWords,
        status: isCredit ? (settlement === "Fully Settled" ? "PAID" : "PAID") : status,
        paymentAdviceAttachment: paymentAdvice,
        attachments,
      })
      showToast(
        "Voucher Updated",
        "success",
        `Purchase voucher ${voucherNo} details updated.`
      )
      setIsEditModalOpen(false)
    } catch (err) {
      showToast("Update Failed", "warning", "Could not update payment voucher.")
    } finally {
      setIsSavingEditVoucher(false)
    }
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
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-black tracking-tight">Purchase Orders & Vouchers</h1>
            </div>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Manage procurement payment vouchers, vendor credit payables, partial credit installments, bank details, and attachments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SubPageNav items={getSectionChildren("/sales")} />
          </div>
        </div>

        {/* PURCHASE ORDERS REGISTER */}
        <DataTable<PurchaseOrder>
          title="Purchases & Payment Vouchers Register"
          subtitle={`Total: ${filteredPurchaseOrders.length} records`}
          columns={columns}
          data={filteredPurchaseOrders}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search voucher no, supplier, bank, method, cheque ref..."
          filters={[
            {
              value: filterTab,
              onChange: setFilterTab,
              ariaLabel: "Filter by Status",
              options: [
                { value: "ALL", label: "All Purchases" },
                { value: "PAID", label: "Paid / Settled" },
                { value: "CREDIT", label: "Credit (Unpaid & Ongoing)" },
                { value: "DRAFT", label: "Draft" },
              ],
            },
          ]}
          actions={[
            {
              label: "New Purchase Voucher",
              onClick: handleOpenCreateModal,
              icon: <Plus className="size-4" />,
              variant: "primary",
            },
          ]}
          defaultWidths={defaultColWidths}
          keyExtractor={(po) => po.id}
          renderRow={(po: PurchaseOrder, colWidths: Record<string, number>) => {
            const isCredit = (po.paymentType || po.payment_type) === "Credit"
            const totalVal = Number(po.amount || 0)
            const paidVal = isCredit ? Number(po.amountPaid ?? po.amount_paid ?? 0) : totalVal
            const dueVal = isCredit ? (typeof po.balanceDue === "number" ? po.balanceDue : Math.max(0, totalVal - paidVal)) : 0
            const pct = totalVal > 0 ? Math.min(100, Math.round((paidVal / totalVal) * 100)) : 0

            return (
              <>
                {/* Voucher ID */}
                <td style={{ width: `${colWidths.voucherNo}px` }} className="py-4 px-4 font-mono font-black text-xs text-zinc-950 overflow-hidden">
                  <div className="flex flex-col">
                    <span className="truncate">{po.voucherNo || po.poNumber}</span>
                    {isCredit && (
                      <span className="text-[10px] font-sans font-bold text-amber-700">
                        Credit • {po.paymentTerms || "Net 30"}
                      </span>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td style={{ width: `${colWidths.date}px` }} className="py-4 px-4 text-xs font-semibold text-zinc-600 overflow-hidden">
                  <div>{po.date}</div>
                  {isCredit && po.dueDate && (
                    <div className="text-[10px] text-zinc-400 font-mono">Due: {po.dueDate}</div>
                  )}
                </td>

                {/* Paid To */}
                <td style={{ width: `${colWidths.paidTo}px` }} className="py-4 px-4 overflow-hidden">
                  <div className="font-black text-zinc-950 text-xs truncate" title={po.paidTo || po.supplier}>
                    {po.paidTo || po.supplier}
                  </div>
                  {po.reasonForPayment && (
                    <div className="text-[11px] font-medium text-zinc-500 truncate" title={po.reasonForPayment}>
                      {po.reasonForPayment}
                    </div>
                  )}
                </td>

                {/* Bank */}
                <td style={{ width: `${colWidths.bankName}px` }} className="py-4 px-4 overflow-hidden">
                  <span className="text-xs font-bold text-zinc-800 truncate block" title={po.bankName || "Commercial Bank of Ethiopia (CBE)"}>
                    {po.bankName || "Commercial Bank of Ethiopia (CBE)"}
                  </span>
                </td>

                {/* Payment Method */}
                <td style={{ width: `${colWidths.paymentMethod}px` }} className="py-4 px-4 overflow-hidden">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-zinc-100 text-zinc-800 border border-zinc-200">
                    {po.paymentMethod || "Cheque"}
                  </span>
                </td>

                {/* Cheque / Ref No. */}
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
                  {isCredit && dueVal > 0 && (
                    <div className="text-[10px] font-bold text-rose-600">
                      Due: ETB {dueVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </td>

                {/* Payment Advice Status */}
                <td style={{ width: `${colWidths.adviceStatus}px` }} className="py-4 px-4 text-center overflow-hidden">
                  {po.paymentAdviceAttachment ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewUrl(po.paymentAdviceAttachment!.url)
                        setPreviewName(po.paymentAdviceAttachment!.name)
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 transition-colors cursor-pointer"
                      title="Preview Payment Advice"
                    >
                      <FileCheck className="size-3 text-emerald-700" /> Attached
                    </button>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200">
                      None
                    </span>
                  )}
                </td>

                {/* Supporting Documents Status */}
                <td style={{ width: `${colWidths.supportingStatus}px` }} className="py-4 px-4 text-center overflow-hidden">
                  {Array.isArray(po.attachments) && po.attachments.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Paperclip className="size-3 text-emerald-700" /> Attached ({po.attachments.length})
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-400 border border-zinc-200">
                      None
                    </span>
                  )}
                </td>

                {/* Status / Settlement */}
                <td style={{ width: `${colWidths.status}px` }} className="py-4 px-2 text-center overflow-hidden">
                  {!isCredit ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      po.status === "PAID" || po.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-900 border border-amber-200"
                    }`}>
                      {po.status === "PAID" || po.status === "COMPLETED" ? "Cash • Paid" : "Draft"}
                    </span>
                  ) : dueVal <= 0.01 || po.settlementStatus === "Fully Settled" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Fully Settled (100%)
                    </span>
                  ) : paidVal > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                        Credit • Ongoing ({pct}%)
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">
                        Paid: {paidVal.toLocaleString()} • Due: {dueVal.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                        Credit • Unpaid (0%)
                      </span>
                      <span className="text-[9px] font-mono text-rose-600 font-bold">
                        Due: ETB {dueVal.toLocaleString()}
                      </span>
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td style={{ width: `${colWidths._actions}px` }} className="py-4 px-2 text-center whitespace-nowrap overflow-hidden">
                  <div className="flex items-center justify-center gap-1.5 flex-nowrap" onClick={(e) => e.stopPropagation()}>
                    {isCredit && dueVal > 0 && (
                      <button
                        type="button"
                        onClick={() => openRecordPayment(po)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[11px] transition-all border border-emerald-200/80 active:scale-95 shadow-2xs cursor-pointer"
                        title="Record Supplier Payment Installment"
                      >
                        <Receipt className="size-3 text-emerald-700" /> Pay
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(po)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-[11px] transition-all border border-zinc-200/80 active:scale-95 shadow-2xs cursor-pointer"
                      title="Edit Voucher"
                    >
                      <Pencil className="size-3 text-zinc-700" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintingPo(po)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-[11px] transition-all border border-zinc-200/80 active:scale-95 shadow-2xs cursor-pointer"
                      title="Export Payment Voucher"
                    >
                      <Download className="size-3 text-zinc-700" /> Export
                    </button>
                  </div>
                </td>
              </>
            )
          }}
        />
      </motion.div>

      {/* MODAL: RECORD SUPPLIER PAYMENT INSTALLMENT */}
      <AnimatePresence>
        {payingPo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPayingPo(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-4 border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-zinc-950 flex items-center gap-2">
                    <Receipt className="size-5 text-emerald-600" />
                    Pay Supplier Credit
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Record installment payment for voucher <span className="font-mono font-bold text-zinc-900">{payingPo.voucherNo || payingPo.poNumber}</span>
                  </p>
                </div>
                <button
                  onClick={() => setPayingPo(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Outstanding Summary Card */}
              {(() => {
                const totalVal = Number(payingPo.amount || 0)
                const paidVal = Number(payingPo.amountPaid ?? payingPo.amount_paid ?? 0)
                const dueVal = Number(Math.max(0, totalVal - paidVal).toFixed(2))

                return (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-amber-900 uppercase">Supplier / Payee</p>
                      <p className="text-sm font-black text-amber-950">{payingPo.paidTo || payingPo.supplier}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-amber-900 uppercase">Remaining Due</p>
                      <p className="text-base font-mono font-black text-rose-700">
                        ETB {dueVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )
              })()}

              <form onSubmit={handleRecordInstallmentSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Payment Amount (ETB) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter installment amount..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-mono font-black text-zinc-950 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {Number(payAmount) > 0 && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1 italic">
                      {numberToBirrWords(Number(payAmount))}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Method *</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="RTGS">RTGS</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Bank / Cash Account *</label>
                    <input
                      type="text"
                      value={payBank}
                      onChange={(e) => setPayBank(e.target.value)}
                      placeholder="e.g. Commercial Bank of Ethiopia (CBE)"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Reference / Cheque No *</label>
                    <input
                      type="text"
                      required
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      placeholder="e.g. TXN-109249"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Proof of Payment / Bank Slip (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPayAdviceFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zinc-100 file:text-zinc-800 hover:file:bg-zinc-200 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. 1st installment paid via CBE online"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={isSubmittingPayment}
                    onClick={() => setPayingPo(null)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    {isSubmittingPayment ? <LoadingDots color="bg-white" size="sm" /> : "Post Supplier Payment"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE CHEQUE PAYMENT VOUCHER */}
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
              className="relative z-10 bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-zinc-200 overflow-y-auto no-scrollbar max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-zinc-950 mb-0.5">Create Purchase Voucher</h2>
                  <p className="text-xs font-semibold text-zinc-500">Record a cash purchase payment voucher or register a supplier purchase credit (Accounts Payable).</p>
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
                {/* PAYMENT TYPE SELECTOR (Cash vs Credit) */}
                <div className="p-3 rounded-2xl bg-zinc-100/80 border border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-900 uppercase tracking-wider">Purchase Terms:</span>
                    <div className="flex items-center gap-1 p-0.5 bg-white rounded-xl border border-zinc-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setPaymentType("Cash")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          paymentType === "Cash" ? "bg-zinc-900 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                        }`}
                      >
                        <Coins className="size-3.5" /> Cash / Immediate Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType("Credit")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          paymentType === "Credit" ? "bg-amber-600 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                        }`}
                      >
                        <CreditCard className="size-3.5" /> Credit / Buy on Terms (AP)
                      </button>
                    </div>
                  </div>

                  {paymentType === "Credit" && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                      Accounts Payable Enabled
                    </span>
                  )}
                </div>

                {/* Top Section Fields */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Row 1: Voucher No (4 cols), Date (4 cols), Status / Terms (4 cols) */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Voucher / PO Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PV-2026-0043"
                      value={voucherNo}
                      onChange={(e) => setVoucherNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Purchase Date *</label>
                    <input
                      type="date"
                      required
                      value={voucherDate}
                      onChange={(e) => {
                        setVoucherDate(e.target.value)
                        handlePaymentTermsChange(paymentTerms, e.target.value)
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  {paymentType === "Cash" ? (
                    <div className="md:col-span-4">
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
                  ) : (
                    <div className="md:col-span-4">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Payment Terms *</label>
                      <select
                        value={paymentTerms}
                        onChange={(e) => handlePaymentTermsChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none font-sans"
                      >
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                        <option value="Net 90">Net 90 Days</option>
                        <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                        <option value="Custom">Custom Terms</option>
                      </select>
                    </div>
                  )}

                  {/* Row 2: Paid To / Supplier (6 cols), Reason / Description (6 cols) */}
                  <div className="md:col-span-6 relative" ref={supplierRef}>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Supplier / Paid To *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Search or type supplier name..."
                        value={paidTo}
                        onFocus={() => setShowSupplierDropdown(true)}
                        onChange={(e) => {
                          setPaidTo(e.target.value)
                          setShowSupplierDropdown(true)
                        }}
                        className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSupplierDropdown((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>

                    {showSupplierDropdown && suppliers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-xl z-30 py-1 divide-y divide-zinc-50">
                        {suppliers.filter((s) => (s.name || "").toLowerCase().includes(paidTo.toLowerCase())).map((supp) => (
                          <button
                            key={supp.id}
                            type="button"
                            onClick={() => {
                              setPaidTo(supp.name)
                              setShowSupplierDropdown(false)
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span>{supp.name}</span>
                            {paidTo === supp.name && <Check className="size-3.5 text-emerald-600 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-6">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Reason for Payment / Category *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pharmaceutical Raw Materials / Warehouse Supplies"
                      value={reasonForPayment}
                      onChange={(e) => setReasonForPayment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  {paymentType === "Credit" && (
                    <div className="md:col-span-6">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Credit Due Date *</label>
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* BANK & PAYMENT DETAILS */}
                <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/70 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-zinc-600" />
                        {paymentType === "Credit" ? "Credit Value & Bank Details" : "Bank & Payment Information"}
                      </h4>
                      <p className="text-[10px] text-zinc-500">
                        {paymentType === "Credit" 
                          ? "Enter the total credit invoice amount and primary settlement bank."
                          : "Select issuing bank in Ethiopia, payment method, amount paid, and cheque/ref number."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Bank Selection */}
                    <div className="md:col-span-6 relative" ref={createBankRef}>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Bank (Which Bank) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Search or type bank name..."
                          value={bankName}
                          onFocus={() => setShowCreateBankDropdown(true)}
                          onChange={(e) => {
                            setBankName(e.target.value)
                            setShowCreateBankDropdown(true)
                          }}
                          className="w-full pl-3 pr-8 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreateBankDropdown((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                        >
                          <ChevronDown className="size-4" />
                        </button>
                      </div>

                      {showCreateBankDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-xl z-30 py-1 divide-y divide-zinc-50">
                          {ETHIOPIAN_BANKS.filter((b) =>
                            b.toLowerCase().includes((bankName || "").toLowerCase())
                          ).map((bank) => (
                            <button
                              key={bank}
                              type="button"
                              onClick={() => {
                                setBankName(bank)
                                setShowCreateBankDropdown(false)
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span>{bank}</span>
                              {bankName === bank && <Check className="size-3.5 text-emerald-600 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Payment Method Dropdown */}
                    <div className="md:col-span-6">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Payment Method *
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="RTGS">RTGS</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>

                    {/* Total Amount */}
                    <div className="md:col-span-6">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        {paymentType === "Credit" ? "Total Credit Amount (ETB) *" : "Amount Paid in figure (ETB) *"}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-mono font-black text-zinc-950 outline-none"
                      />
                      {Number(paidAmount) > 0 && (
                        <div className="mt-1 text-[11px] text-emerald-800 font-semibold italic truncate">
                          {numberToBirrWords(Number(paidAmount))}
                        </div>
                      )}
                    </div>

                    {/* Cheque / Reference Number */}
                    <div className="md:col-span-6">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        {paymentType === "Credit" ? "Supplier Invoice / PO Ref" : (paymentMethod === "Cheque" ? "Cheque Number *" : `${paymentMethod} Reference Number *`)}
                      </label>
                      <input
                        type="text"
                        required={paymentType === "Cash"}
                        placeholder={paymentType === "Credit" ? "e.g. SUP-INV-00421" : (paymentMethod === "Cheque" ? "e.g. CHQ-009823" : "e.g. TXN-98421098")}
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* DEDICATED PAYMENT ADVICE ATTACHMENT */}
                <div className="border border-emerald-200 rounded-2xl p-4 bg-emerald-50/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                          Payment Advice Attachment
                        </h4>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${paymentType === "Cash" ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-700"}`}>
                          {paymentType === "Cash" ? "Mandatory for Paid" : "Optional for Credit"}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-700">Attach bank confirmation, transfer advice slip, or scanned cheque.</p>
                    </div>
                  </div>

                  {paymentAdvice ? (
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                          <FileCheck className="size-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-zinc-900 truncate">{paymentAdvice.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono font-medium">
                            {(paymentAdvice.size / 1024).toFixed(1)} KB • Uploaded {new Date(paymentAdvice.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUrl(paymentAdvice.url)
                            setPreviewName(paymentAdvice.name)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold cursor-pointer"
                        >
                          <Eye className="size-3.5" /> Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentAdvice(null)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                          title="Remove Advice"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl p-4 text-center transition-colors bg-white/90">
                      <input
                        type="file"
                        id="create-payment-advice-upload"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handlePaymentAdviceUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="create-payment-advice-upload"
                        className="cursor-pointer flex flex-col items-center justify-center gap-1"
                      >
                        <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                          <Upload className="size-4" />
                        </div>
                        <span className="text-xs font-bold text-emerald-950">
                          Click to upload Payment Advice (Receipt / Cheque Slip / Transfer Confirmation)
                        </span>
                        <span className="text-[10px] text-emerald-700">
                          PDF, PNG, JPG up to 15MB
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* SUPPORTING ATTACHMENTS SECTION (OPTIONAL) */}
                <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-xs text-zinc-900 uppercase tracking-wider">
                          Supporting Documents
                        </h4>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                          Optional
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500">Attach proforma invoices, supplier bills, delivery slips, or contracts.</p>
                    </div>
                    {attachments.length > 0 && (
                      <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
                        {attachments.length} file{attachments.length === 1 ? "" : "s"} attached
                      </span>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-2xl p-4 text-center transition-colors bg-white">
                    <input
                      type="file"
                      id="create-voucher-attachment"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleSupportingFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="create-voucher-attachment"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1"
                    >
                      <div className="size-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
                        <Upload className="size-4" />
                      </div>
                      <span className="text-xs font-bold text-zinc-800">
                        Click to upload or drag & drop optional supporting files
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Proformas, bills, delivery slips, invoices (PNG, JPG, PDF up to 10MB)
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
                            className="text-blue-600 hover:text-blue-800 p-0.5 cursor-pointer"
                            title="Preview file"
                          >
                            <Eye className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSupportingAttachment(file.id)}
                            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
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
                    disabled={isSubmittingVoucher}
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingVoucher}
                    className="min-w-[150px] inline-flex items-center justify-center px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {isSubmittingVoucher ? <LoadingDots color="bg-white" size="sm" /> : "Create Cheque Voucher"}
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
              className="relative z-10 bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-zinc-200 overflow-y-auto no-scrollbar max-h-[90vh]"
            >
              {/* Header with 3-Dot Options Dropdown */}
              <EditModalHeader
                title={`Edit Cheque Payment Voucher (${voucherNo})`}
                subtitle="Update payee, reason, bank details, payment method, advice slip, and supporting attachments."
                onClose={() => setIsEditModalOpen(false)}
                onRequestDelete={() => setDeletingPo(editingPo)}
                deleteLabel="Delete Payment Voucher"
              />

              <form onSubmit={handleSaveEditVoucher} className="space-y-4">
                {/* Top Section Fields */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Row 1: Voucher No (4 cols), Date (4 cols), Status (4 cols) */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Cheque Payment Voucher *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 00004375"
                      value={voucherNo}
                      onChange={(e) => setVoucherNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="md:col-span-4">
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
                </div>

                {/* BANK & PAYMENT DETAILS (Replaces Account Distribution Section) */}
                <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/70 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-zinc-600" />
                        Bank & Payment Information
                      </h4>
                      <p className="text-[10px] text-zinc-500">Select issuing bank in Ethiopia, payment method, amount paid, and cheque/ref number.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Bank Selection (Combobox: Searchable Dropdown + Typed Input) */}
                    <div className="md:col-span-6 relative" ref={editBankRef}>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Bank (Which Bank) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Search or type bank name..."
                          value={bankName}
                          onFocus={() => setShowEditBankDropdown(true)}
                          onChange={(e) => {
                            setBankName(e.target.value)
                            setShowEditBankDropdown(true)
                          }}
                          className="w-full pl-3 pr-8 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditBankDropdown((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                        >
                          <ChevronDown className="size-4" />
                        </button>
                      </div>

                      {/* Matching Ethiopian Banks Dropdown */}
                      {showEditBankDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-xl z-30 py-1 divide-y divide-zinc-50">
                          {ETHIOPIAN_BANKS.filter((b) =>
                            b.toLowerCase().includes((bankName || "").toLowerCase())
                          ).map((bank) => (
                            <button
                              key={bank}
                              type="button"
                              onClick={() => {
                                setBankName(bank)
                                setShowEditBankDropdown(false)
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span>{bank}</span>
                              {bankName === bank && <Check className="size-3.5 text-emerald-600 shrink-0" />}
                            </button>
                          ))}
                          {ETHIOPIAN_BANKS.filter((b) =>
                            b.toLowerCase().includes((bankName || "").toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-2 text-xs text-zinc-400 italic">
                              Custom bank name "{bankName}" will be used.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Payment Method Dropdown */}
                    <div className="md:col-span-6">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Payment Method *
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="RTGS">RTGS</option>
                      </select>
                    </div>

                    {/* Amount Paid in figure */}
                    <div className="md:col-span-6">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Amount Paid in figure (ETB) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-mono font-black text-zinc-950 outline-none"
                      />
                      {Number(paidAmount) > 0 && (
                        <div className="mt-1 text-[11px] text-emerald-800 font-semibold italic truncate">
                          {numberToBirrWords(Number(paidAmount))}
                        </div>
                      )}
                    </div>

                    {/* Cheque / Reference Number */}
                    <div className="md:col-span-6">
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        {paymentMethod === "Cheque" ? "Cheque Number *" : `${paymentMethod} Reference Number *`}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={paymentMethod === "Cheque" ? "e.g. CHQ-009823" : "e.g. TXN-98421098"}
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* DEDICATED PAYMENT ADVICE ATTACHMENT (MANDATORY) */}
                <div className="border border-emerald-200 rounded-2xl p-4 bg-emerald-50/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                          Payment Advice Attachment
                        </h4>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                          Mandatory for Paid
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-700">Attach bank confirmation, transfer advice slip, or scanned cheque.</p>
                    </div>
                  </div>

                  {paymentAdvice ? (
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                          <FileCheck className="size-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-zinc-900 truncate">{paymentAdvice.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono font-medium">
                            {(paymentAdvice.size / 1024).toFixed(1)} KB • Uploaded {new Date(paymentAdvice.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUrl(paymentAdvice.url)
                            setPreviewName(paymentAdvice.name)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold cursor-pointer"
                        >
                          <Eye className="size-3.5" /> Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentAdvice(null)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                          title="Remove Advice"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl p-4 text-center transition-colors bg-white/90">
                      <input
                        type="file"
                        id="edit-payment-advice-upload"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handlePaymentAdviceUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-payment-advice-upload"
                        className="cursor-pointer flex flex-col items-center justify-center gap-1"
                      >
                        <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                          <Upload className="size-4" />
                        </div>
                        <span className="text-xs font-bold text-emerald-950">
                          Click to upload Payment Advice (Receipt / Cheque Slip / Transfer Confirmation)
                        </span>
                        <span className="text-[10px] text-emerald-700">
                          PDF, PNG, JPG up to 15MB
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* SUPPORTING ATTACHMENTS SECTION (OPTIONAL) */}
                <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-xs text-zinc-900 uppercase tracking-wider">
                          Supporting Documents
                        </h4>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                          Optional
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500">Attach proforma invoices, supplier bills, delivery slips, or contracts.</p>
                    </div>
                    {attachments.length > 0 && (
                      <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
                        {attachments.length} file{attachments.length === 1 ? "" : "s"} attached
                      </span>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-2xl p-4 text-center transition-colors bg-white">
                    <input
                      type="file"
                      id="edit-voucher-attachment"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleSupportingFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-voucher-attachment"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1"
                    >
                      <div className="size-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
                        <Upload className="size-4" />
                      </div>
                      <span className="text-xs font-bold text-zinc-800">
                        Click to upload or drag & drop optional supporting files
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Proformas, bills, delivery slips, invoices (PNG, JPG, PDF up to 10MB)
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
                            className="text-blue-600 hover:text-blue-800 p-0.5 cursor-pointer"
                            title="Preview file"
                          >
                            <Eye className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSupportingAttachment(file.id)}
                            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
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
                    disabled={isSavingEditVoucher}
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSavingEditVoucher}
                    className="min-w-[150px] inline-flex items-center justify-center px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {isSavingEditVoucher ? <LoadingDots color="bg-white" size="sm" /> : "Save Changes"}
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
        title="Delete Cheque Payment Voucher"
        recordName={deletingPo?.voucherNo || deletingPo?.poNumber || "this voucher"}
        description="This action will permanently delete this cheque payment voucher."
      />

      {/* PRINTABLE OFFICIAL VOUCHER SLIP MODAL */}
      <PurchaseOrderPrintModal
        isOpen={!!printingPo}
        po={printingPo}
        onClose={() => setPrintingPo(null)}
      />

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
