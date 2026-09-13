import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Check, 
  X, 
  Download,
  Plus,
  Edit3,
  Receipt,
  Percent,
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import { useFinanceStore, type OneOffExpense } from "@/lib/financeStore"
import { useAuthStore } from "@/lib/authStore"
import { exportToExcel } from "@/lib/exportUtils"
import { isDateInPreset } from "@/lib/peachtreeExportUtils"
import { EditModalHeader } from "@/components/EditModalHeader"
import { RecordDeleteModal } from "@/components/RecordDeleteModal"
import { LoadingDots } from "@/components/ui/LoadingDots"
import { Skeleton } from "@/components/ui/skeleton"
import { TableScrollWrapper } from "@/components/TableScrollWrapper"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export default function Expenses() {
  const { showToast } = useFeedback()
  const store = useFinanceStore()
  const { user } = useAuthStore()
  const isLoading = store.isLoading()

  const currentUserName = user?.fullname || user?.username || (user as any)?.email || "Finance Officer"

  // One-off Expenses state
  const expenses = store.getOneOffExpenses()
  const [searchQuery, setSearchQuery] = useState("")
  const [expenseDateFilter, setExpenseDateFilter] = useState("ALL")
  const [expenseCustomStart, setExpenseCustomStart] = useState("")
  const [expenseCustomEnd, setExpenseCustomEnd] = useState("")
  const [filterCategory, setFilterCategory] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<OneOffExpense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<OneOffExpense | null>(null)
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // COA Dynamic Accounts
  const accounts = store.getAccounts()
  
  const expenseAccounts = useMemo(() => {
    const list = accounts.filter((a) => a.account_type === "Expense" && !a.is_group)
    if (list.length > 0) return list
    return [
      { id: "8000-08", code: "8000-08", name: "OFFICE RENT" },
      { id: "8000-09", code: "8000-09", name: "TELEPHONE AND INTERNET" },
      { id: "8000-07", code: "8000-07", name: "STATIONERY, PRINTING & OFF SUP" },
      { id: "8000-16", code: "8000-16", name: "INSURANCE" },
      { id: "8000-18", code: "8000-18", name: "AUDIT FEE & PROFFESSIONAL FEE" },
      { id: "8000-25", code: "8000-25", name: "BANK SERVICE CHARGE" },
      { id: "8000-28", code: "8000-28", name: "PENALITY" },
      { id: "8000-30", code: "8000-30", name: "MICELLANOUS" },
      { id: "6000-04", code: "6000-04", name: "PACKING AND BAGING" },
      { id: "6000-08", code: "6000-08", name: "TRANSPORT COST" },
      { id: "6000-10", code: "6000-10", name: "LOADING UNLOADING" },
    ]
  }, [accounts])

  const cashBankAccounts = useMemo(() => {
    const list = accounts.filter(
      (a) => a.account_type === "Asset" && (a.peachtree_type === "Cash" || a.code.startsWith("1000")) && !a.is_group
    )
    if (list.length > 0) return list
    return [
      { id: "1000-01-01", code: "1000-01-01", name: "PETTY CASH-HEAD OFFICE" },
      { id: "1000-02-26", code: "1000-02-26", name: "CBE_ECB_AC_1000465135224" },
      { id: "1000-02-13", code: "1000-02-13", name: "AIB_GFB_AC_01304807538500" },
      { id: "1000-02-10", code: "1000-02-10", name: "ABAY_TAB_AC_1722015651591011" },
      { id: "1000-02-17", code: "1000-02-17", name: "BOA_RDB_35292853" },
      { id: "1000-02-20", code: "1000-02-20", name: "OIB_DRB_1074/3834909/001/3001/" },
      { id: "1000-02-33", code: "1000-02-33", name: "CBO_CATB_AC_1059900010301" },
      { id: "1000-02-41", code: "1000-02-41", name: "AHADU" },
    ]
  }, [accounts])

  // Add Form State
  const [addMerchant, setAddMerchant] = useState("")
  const [addEmployee, setAddEmployee] = useState(currentUserName)
  const [addCategory, setAddCategory] = useState("Miscellaneous")
  const [addCostCenter, setAddCostCenter] = useState("CC-100 Corporate HQ")
  const [addGlAccount, setAddGlAccount] = useState("8000-30")
  const [addPaymentAccount, setAddPaymentAccount] = useState("1000-01-01")
  const [addPaymentMethod, setAddPaymentMethod] = useState<OneOffExpense["payment_method"]>("Cash")
  const [addVoucherRef, setAddVoucherRef] = useState("")
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10))
  const [addAmount, setAddAmount] = useState("")
  const [addApplyVat, setAddApplyVat] = useState(false)
  const [addTaxAmount, setAddTaxAmount] = useState("0")
  const [addApplyWht, setAddApplyWht] = useState(false)
  const [addWhtAmount, setAddWhtAmount] = useState("0")
  const [addNotes, setAddNotes] = useState("")

  // Edit Form State
  const [editMerchant, setEditMerchant] = useState("")
  const [editEmployee, setEditEmployee] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editCostCenter, setEditCostCenter] = useState("")
  const [editGlAccount, setEditGlAccount] = useState("")
  const [editPaymentAccount, setEditPaymentAccount] = useState("")
  const [editPaymentMethod, setEditPaymentMethod] = useState<OneOffExpense["payment_method"]>("Cash")
  const [editVoucherRef, setEditVoucherRef] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editApplyVat, setEditApplyVat] = useState(false)
  const [editTaxAmount, setEditTaxAmount] = useState("0")
  const [editApplyWht, setEditApplyWht] = useState(false)
  const [editWhtAmount, setEditWhtAmount] = useState("0")
  const [editStatus, setEditStatus] = useState<OneOffExpense["status"]>("PENDING")
  const [editNotes, setEditNotes] = useState("")

  // Calculate Executive Summary Metrics
  const totalApproved = expenses.filter((e) => e.status === "APPROVED").reduce((s, e) => s + Number(e.amount || 0), 0)
  const pendingCount = expenses.filter((e) => e.status === "PENDING").length
  const pendingValue = expenses.filter((e) => e.status === "PENDING").reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalClaimsCount = expenses.length
  const totalExpensesValue = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)

  // Real-time tax math for Add Modal
  const parsedAddAmount = parseFloat(addAmount) || 0
  const parsedAddVat = addApplyVat ? (parseFloat(addTaxAmount) || parsedAddAmount * 0.15) : 0
  const parsedAddWht = addApplyWht ? (parseFloat(addWhtAmount) || parsedAddAmount * 0.02) : 0
  const addNetDisbursed = Math.max(0, parsedAddAmount + parsedAddVat - parsedAddWht)

  // Real-time tax math for Edit Modal
  const parsedEditAmount = parseFloat(editAmount) || 0
  const parsedEditVat = editApplyVat ? (parseFloat(editTaxAmount) || parsedEditAmount * 0.15) : 0
  const parsedEditWht = editApplyWht ? (parseFloat(editWhtAmount) || parsedEditAmount * 0.02) : 0
  const editNetDisbursed = Math.max(0, parsedEditAmount + parsedEditVat - parsedEditWht)

  const openAddModal = () => {
    setAddMerchant("")
    setAddEmployee(currentUserName)
    setAddCategory("Miscellaneous")
    setAddCostCenter("CC-100 Corporate HQ")
    setAddGlAccount(expenseAccounts[0]?.code || "8000-30")
    setAddPaymentAccount(cashBankAccounts[0]?.code || "1000-01-01")
    setAddPaymentMethod("Cash")
    setAddVoucherRef("")
    setAddDate(new Date().toISOString().slice(0, 10))
    setAddAmount("")
    setAddApplyVat(false)
    setAddTaxAmount("0")
    setAddApplyWht(false)
    setAddWhtAmount("0")
    setAddNotes("")
    setIsAddModalOpen(true)
  }

  const openEditModal = (exp: OneOffExpense) => {
    setEditingExpense(exp)
    setEditMerchant(exp.merchant || "")
    setEditEmployee(exp.employee || "")
    setEditCategory(exp.category || "Miscellaneous")
    setEditCostCenter(exp.cost_center || "CC-100 Corporate HQ")
    setEditGlAccount(exp.gl_account_id || expenseAccounts[0]?.code || "8000-30")
    setEditPaymentAccount(exp.payment_account_id || cashBankAccounts[0]?.code || "1000-01-01")
    setEditPaymentMethod(exp.payment_method || "Cash")
    setEditVoucherRef(exp.receipt_ref || exp.cheque_no || "")
    setEditDate(exp.date || new Date().toISOString().slice(0, 10))
    setEditAmount(String(exp.amount || 0))
    setEditApplyVat(Boolean(exp.apply_vat || (exp.tax_amount && exp.tax_amount > 0)))
    setEditTaxAmount(String(exp.tax_amount || 0))
    setEditApplyWht(Boolean(exp.apply_wht || (exp.wht_amount && exp.wht_amount > 0)))
    setEditWhtAmount(String(exp.wht_amount || 0))
    setEditStatus(exp.status || "PENDING")
    setEditNotes(exp.notes || "")
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addMerchant.trim() || !addEmployee.trim() || !addAmount) {
      showToast("Validation Error", "warning", "Please fill in all required fields (Merchant, Claimant, and Amount).")
      return
    }

    const amtVal = parseFloat(addAmount)
    if (!Number.isFinite(amtVal) || amtVal <= 0) {
      showToast("Validation Error", "warning", "Please enter a valid expense amount greater than 0.")
      return
    }

    setIsSubmittingAdd(true)
    try {
      const vatVal = addApplyVat ? (parseFloat(addTaxAmount) || amtVal * 0.15) : 0
      const whtVal = addApplyWht ? (parseFloat(addWhtAmount) || amtVal * 0.02) : 0
      const netVal = Math.max(0, amtVal + vatVal - whtVal)

      store.addOneOffExpense({
        merchant: addMerchant.trim(),
        employee: addEmployee.trim(),
        category: addCategory,
        cost_center: addCostCenter,
        gl_account_id: addGlAccount,
        payment_account_id: addPaymentAccount,
        payment_method: addPaymentMethod,
        receipt_ref: addVoucherRef.trim() || `PV-${Math.floor(1000 + Math.random() * 9000)}`,
        date: addDate,
        amount: amtVal,
        currency: "ETB",
        status: "PENDING",
        apply_vat: addApplyVat,
        tax_amount: vatVal,
        apply_wht: addApplyWht,
        wht_amount: whtVal,
        wht_rate: addApplyWht ? 0.02 : 0,
        net_disbursed: netVal,
        notes: addNotes.trim(),
      })

      showToast("Expense Recorded", "success", `Expense for ${addMerchant.trim()} recorded and queued for treasury audit.`)
      setIsAddModalOpen(false)
    } catch (err: any) {
      showToast("Error", "warning", err.message || "Failed to record expense.")
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    if (!editMerchant.trim() || !editEmployee.trim() || !editAmount) {
      showToast("Validation Error", "warning", "Please fill in all required fields.")
      return
    }

    const amtVal = parseFloat(editAmount)
    if (!Number.isFinite(amtVal) || amtVal <= 0) {
      showToast("Validation Error", "warning", "Please enter a valid expense amount.")
      return
    }

    setIsSubmittingEdit(true)
    try {
      const vatVal = editApplyVat ? (parseFloat(editTaxAmount) || amtVal * 0.15) : 0
      const whtVal = editApplyWht ? (parseFloat(editWhtAmount) || amtVal * 0.02) : 0
      const netVal = Math.max(0, amtVal + vatVal - whtVal)

      store.updateOneOffExpense(editingExpense.id, {
        merchant: editMerchant.trim(),
        employee: editEmployee.trim(),
        category: editCategory,
        cost_center: editCostCenter,
        gl_account_id: editGlAccount,
        payment_account_id: editPaymentAccount,
        payment_method: editPaymentMethod,
        receipt_ref: editVoucherRef.trim(),
        date: editDate,
        amount: amtVal,
        apply_vat: editApplyVat,
        tax_amount: vatVal,
        apply_wht: editApplyWht,
        wht_amount: whtVal,
        wht_rate: editApplyWht ? 0.02 : 0,
        net_disbursed: netVal,
        status: editStatus,
        notes: editNotes.trim(),
      })

      showToast("Expense Updated", "success", `Expense record ${editingExpense.id} updated successfully.`)
      setEditingExpense(null)
    } catch (err: any) {
      showToast("Update Failed", "warning", err.message || "Failed to update expense record.")
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return
    setIsDeleting(true)
    try {
      store.deleteOneOffExpense(deletingExpense.id)
      showToast("Expense Deleted", "info", `Expense record ${deletingExpense.id} has been safely removed.`)
      setDeletingExpense(null)
      setEditingExpense(null)
    } catch (err: any) {
      showToast("Delete Failed", "warning", err.message || "Failed to delete expense record.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleApprove = (id: string) => {
    store.approveOneOffExpense(id)
    showToast("Claim Approved", "success", `Expense claim ${id} approved & posted to General Ledger.`)
  }

  const handleReject = (id: string) => {
    store.rejectOneOffExpense(id)
    showToast("Claim Rejected", "warning", `Expense claim ${id} marked rejected.`)
  }

  const filteredExpenses = expenses.filter((exp) => {
    if (!isDateInPreset((exp as any).date || (exp as any).created_at, expenseDateFilter, expenseCustomStart, expenseCustomEnd)) return false
    const q = (searchQuery || "").toLowerCase()
    const merchant = (exp.merchant || "").toLowerCase()
    const employee = (exp.employee || "").toLowerCase()
    const expId = (exp.id || "").toLowerCase()
    const voucher = (exp.receipt_ref || "").toLowerCase()
    const matchesSearch = merchant.includes(q) || employee.includes(q) || expId.includes(q) || voucher.includes(q)
    const matchesCategory = filterCategory === "ALL" || exp.category === filterCategory
    const matchesStatus = filterStatus === "ALL" || exp.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const expColumns: TableColumn[] = [
    { key: "id", label: "ID" },
    { key: "merchant", label: "Merchant / Payee" },
    { key: "category", label: "Category" },
    { key: "employee", label: "Claimant" },
    { key: "date", label: "Date" },
    { key: "payment_account", label: "Paid Via" },
    { key: "amount", label: "Gross (ETB)", align: "right" },
    { key: "net_disbursed", label: "Net Outflow", align: "right" },
    { key: "status", label: "Audit Status", align: "center" },
    { key: "_actions", label: "Treasury Actions", align: "center", noSort: true }
  ]
  
  const expTable = useResizableTable(expColumns, filteredExpenses)

  const [expPage, setExpPage] = useState(1)
  const [expPageSize, setExpPageSize] = useState(10)

  useEffect(() => {
    setExpPage(1)
  }, [searchQuery, filterCategory, filterStatus, expenseDateFilter, filteredExpenses.length])

  const sortedExpenses = expTable.sorted()
  const totalExpPages = Math.max(1, Math.ceil(sortedExpenses.length / expPageSize))
  const displayedExpenses = sortedExpenses.slice((expPage - 1) * expPageSize, expPage * expPageSize)

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />
      {store.getLoadError() && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-800 shadow-lg flex items-center gap-3">
            <span className="size-2 rounded-full bg-rose-500 shrink-0" />
            Server unavailable — expense data cannot be loaded. {store.getLoadError()}
          </div>
        </div>
      )}

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Operating Expenses</h1>
            <p className="text-sm text-gray-400 mt-1">Manage operating expenditure, payment accounts, Peachtree tax checkboxes & treasury audits.</p>
          </div>
          <div className="flex items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/finance")} />
          </div>
        </motion.div>

        {/* Expenses Executive Summary KPI Banner */}
        <motion.div variants={fade} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <GlassCard className="p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Approved Expenses YTD</span>
            {isLoading ? (
              <Skeleton className="h-7 w-36 bg-zinc-200/80 my-1" />
            ) : (
              <p className="text-xl font-black text-black font-mono mt-1">
                ETB {totalApproved.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            )}
            <span className="text-[10px] text-emerald-600 font-semibold mt-1">GL Cash Disbursements Posted</span>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending Claims Audit</span>
            {isLoading ? (
              <Skeleton className="h-7 w-36 bg-zinc-200/80 my-1" />
            ) : (
              <p className="text-xl font-black text-amber-600 font-mono mt-1">
                {pendingCount} claims <span className="text-xs font-normal text-gray-500">(ETB {pendingValue.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
              </p>
            )}
            <span className="text-[10px] text-amber-600 font-semibold mt-1">Awaiting Treasury Manager Approval</span>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Claims Recorded</span>
            {isLoading ? (
              <Skeleton className="h-7 w-36 bg-zinc-200/80 my-1" />
            ) : (
              <p className="text-xl font-black text-black font-mono mt-1">
                {totalClaimsCount} claims <span className="text-xs font-normal text-gray-500">(ETB {totalExpensesValue.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
              </p>
            )}
            <span className="text-[10px] text-gray-400 mt-1">Operating & Overhead Ledger</span>
          </GlassCard>
        </motion.div>

        {/* Operating Expenses Table Card */}
        <div className="grid grid-cols-1 gap-4">
          <GlassCard transition={{ delay: 0.12, duration: 0.4, ease: "easeOut" }} className="flex flex-col">
            <FinanceTableToolbar
              title="Audit Expenses & Claims"
              subtitle="Claims requiring corporate treasury approval."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search merchant, employee, voucher..."
              dateFilter={{
                value: expenseDateFilter,
                onChange: setExpenseDateFilter,
                startDate: expenseCustomStart,
                endDate: expenseCustomEnd,
                onCustomDateChange: (start, end) => {
                  setExpenseCustomStart(start)
                  setExpenseCustomEnd(end)
                },
              }}
              filters={[
                {
                  value: filterCategory,
                  onChange: setFilterCategory,
                  ariaLabel: "Category filter",
                  options: [
                    { value: "ALL", label: "All Categories" },
                    { value: "Office Rent", label: "Office Rent" },
                    { value: "Vehicle Cost", label: "Vehicle Cost" },
                    { value: "Transport & Logistics", label: "Transport & Logistics" },
                    { value: "Software & SaaS", label: "Software & SaaS" },
                    { value: "Infrastructure", label: "Infrastructure" },
                    { value: "Travel & Lodging", label: "Travel & Lodging" },
                    { value: "Meals & Entertaining", label: "Meals" },
                    { value: "Miscellaneous", label: "Miscellaneous" },
                  ],
                },
                {
                  value: filterStatus,
                  onChange: setFilterStatus,
                  ariaLabel: "Status filter",
                  options: [
                    { value: "ALL", label: "All Status" },
                    { value: "APPROVED", label: "Approved" },
                    { value: "PENDING", label: "Pending" },
                    { value: "REJECTED", label: "Rejected" },
                  ],
                },
              ]}
              actions={[
                {
                  label: `Export (${filteredExpenses.length})`,
                  onClick: () => {
                    exportToExcel({
                      fileName: `HKC_Expenses_${new Date().toISOString().split("T")[0]}`,
                      title: "HKC Trading - Corporate Expense Claims",
                      headers: ["Expense ID", "Merchant / Payee", "Employee", "Category", "Cost Center", "Debit GL", "Paid Via", "Gross (ETB)", "VAT (ETB)", "WHT (ETB)", "Net Disbursed", "Status"],
                      rows: filteredExpenses.map((e) => [
                        e.id || "",
                        e.merchant || "",
                        e.employee || "",
                        e.category || "",
                        e.cost_center || "HQ",
                        e.gl_account_id || "8000-30",
                        e.payment_account_id || "1000-01-01",
                        Number(e.amount) || 0,
                        Number(e.tax_amount) || 0,
                        Number(e.wht_amount) || 0,
                        Number(e.net_disbursed ?? e.amount) || 0,
                        e.status || "",
                      ]),
                    })
                    showToast("Expenses Exported", "success", `Exported ${filteredExpenses.length} expense claims to Excel.`)
                  },
                  icon: <Download className="size-3.5" />,
                  variant: "emeraldLight",
                },
                {
                  label: "Log Expense Claim",
                  onClick: openAddModal,
                  icon: <Plus className="size-3.5 stroke-[2.5]" />,
                  variant: "primary",
                },
              ]}
            />

            {/* Expense Table List */}
            <TableScrollWrapper>
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                    {expColumns.map(col => (
                      <ResizableTh
                        key={col.key}
                        col={col}
                        width={expTable.colWidths[col.key] ?? 140}
                        sortKey={expTable.sortKey}
                        sortDir={expTable.sortDir}
                        openMenuCol={expTable.openMenuCol}
                        onResizeStart={expTable.handleResizeStart}
                        onToggleMenu={expTable.toggleMenu}
                        onSortAsc={expTable.setSortAsc}
                        onSortDesc={expTable.setSortDesc}
                        onClearSort={expTable.clearSort}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse text-xs">
                        <td className="py-3.5 pl-4"><Skeleton className="h-4 w-24 bg-zinc-200/80" /></td>
                        <td className="py-3.5"><Skeleton className="h-4 w-32 bg-zinc-200/80" /></td>
                        <td className="py-3.5"><Skeleton className="h-4 w-24 bg-zinc-200/80" /></td>
                        <td className="py-3.5"><Skeleton className="h-4 w-20 bg-zinc-200/80" /></td>
                        <td className="py-3.5"><Skeleton className="h-4 w-20 bg-zinc-200/80" /></td>
                        <td className="py-3.5"><Skeleton className="h-4 w-24 bg-zinc-200/80" /></td>
                        <td className="py-3.5 text-right"><Skeleton className="h-4 w-20 bg-zinc-200/80 ml-auto" /></td>
                        <td className="py-3.5 text-right"><Skeleton className="h-4 w-20 bg-zinc-200/80 ml-auto" /></td>
                        <td className="py-3.5 text-center"><Skeleton className="h-4 w-16 bg-zinc-200/80 mx-auto" /></td>
                        <td className="py-3.5 text-center pr-4"><Skeleton className="h-4 w-16 bg-zinc-200/80 mx-auto" /></td>
                      </tr>
                    ))
                  ) : sortedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-gray-400 text-sm">
                        No expense entries match your filter.
                      </td>
                    </tr>
                  ) : (
                    displayedExpenses.map((exp) => {
                      const netAmt = exp.net_disbursed != null ? Number(exp.net_disbursed) : Number(exp.amount)
                      const isApproved = exp.status === "APPROVED"
                      const isRejected = exp.status === "REJECTED"

                      return (
                        <tr
                          key={exp.id}
                          onClick={() => openEditModal(exp)}
                          className="text-sm hover:bg-black/[0.02] cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 pl-4 font-mono text-xs font-bold text-gray-500">{exp.id}</td>
                          <td className="py-3.5 font-bold text-black truncate" title={exp.merchant}>
                            {exp.merchant}
                          </td>
                          <td className="py-3.5 text-xs text-gray-500">
                            <span className="bg-black/[0.03] text-gray-700 px-2 py-0.5 rounded font-medium">{exp.category}</span>
                          </td>
                          <td className="py-3.5 text-gray-600 font-medium truncate" title={exp.employee}>{exp.employee}</td>
                          <td className="py-3.5 text-xs text-gray-400 font-mono">{exp.date}</td>
                          <td className="py-3.5 text-xs text-zinc-600 font-mono">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200/70">
                              {exp.payment_account_id ? exp.payment_account_id.replace(/^1000-/, "") : "Petty Cash"}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-mono font-black text-black">
                            ETB {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 text-right font-mono font-bold text-emerald-800">
                            ETB {netAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isApproved
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : isRejected
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-amber-50 text-amber-800 border border-amber-300"
                            }`}>
                              {exp.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-center pr-4">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {exp.status === "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(exp.id)}
                                    className="size-7 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors border border-emerald-200 shadow-2xs cursor-pointer"
                                    title="Approve Claim"
                                  >
                                    <Check className="size-3.5 stroke-[2.5]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReject(exp.id)}
                                    className="size-7 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center transition-colors border border-rose-200 shadow-2xs cursor-pointer"
                                    title="Reject Claim"
                                  >
                                    <X className="size-3.5 stroke-[2.5]" />
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditModal(exp)}
                                className="px-2.5 py-1 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 text-[10px] font-extrabold inline-flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                                title="Edit Claim"
                              >
                                <Edit3 className="size-3 text-zinc-500" /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </TableScrollWrapper>

            {!isLoading && sortedExpenses.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-black/5 px-6 py-4 bg-white/40 dark:bg-white/[0.02] gap-3">
                <div className="flex items-center gap-3 text-xs font-bold text-zinc-500">
                  <span>
                    Showing {Math.min((expPage - 1) * expPageSize + 1, sortedExpenses.length)} to {Math.min(expPage * expPageSize, sortedExpenses.length)} of {sortedExpenses.length} entries
                  </span>
                  <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-zinc-700">
                    <span className="text-[11px] font-semibold text-zinc-400">Rows:</span>
                    <select
                      value={expPageSize}
                      onChange={(e) => {
                        setExpPageSize(Number(e.target.value))
                        setExpPage(1)
                      }}
                      className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-0.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={expPage === 1}
                    onClick={() => setExpPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-all"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-black text-zinc-700 dark:text-zinc-300 px-2 font-mono">
                    Page {expPage} of {totalExpPages}
                  </span>
                  <button
                    type="button"
                    disabled={expPage >= totalExpPages}
                    onClick={() => setExpPage((p) => p + 1)}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </motion.div>

      {/* =========================================================================
          ADD EXPENSE MODAL: WEBSITE STANDARD (Rounded-3xl, P-6/8, Light Green Section)
          ========================================================================= */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl border border-zinc-200 z-[121] relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-950 tracking-tight flex items-center gap-2">
                    <Receipt className="size-5 text-emerald-700" />
                    Record Operating Expense
                  </h3>
                  <p className="text-xs font-medium text-zinc-500 mt-0.5">
                    Log operating disbursement, assign cost center, payment account & taxes (Peachtree-ready).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="size-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                {/* Light Green Summary Calculation Panel */}
                <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-4 text-emerald-950">
                  <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider text-emerald-900">
                    <Percent className="size-4 text-emerald-700" />
                    Live Cash Disbursement & Tax Summary
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white/70 p-2.5 rounded-xl border border-emerald-200/60">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Base Expense</span>
                      <span className="font-mono font-black text-zinc-950 text-sm">
                        ETB {parsedAddAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-white/70 p-2.5 rounded-xl border border-emerald-200/60">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">15% VAT (Debit)</span>
                      <span className="font-mono font-black text-emerald-700 text-sm">
                        {addApplyVat ? `+ETB ${parsedAddVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                      </span>
                    </div>
                    <div className="bg-white/70 p-2.5 rounded-xl border border-emerald-200/60">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">2% WHT (Credit)</span>
                      <span className="font-mono font-black text-rose-700 text-sm">
                        {addApplyWht ? `-ETB ${parsedAddWht.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                      </span>
                    </div>
                    <div className="bg-white/70 p-2.5 rounded-xl border border-emerald-200/60">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Net Cash Outflow</span>
                      <span className="font-mono font-black text-emerald-950 text-sm">
                        ETB {addNetDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Payee / Merchant */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">
                      Merchant / Payee <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="text"
                      value={addMerchant}
                      onChange={(e) => setAddMerchant(e.target.value)}
                      placeholder="e.g. Ethiopian Electric Utility, AWS, Nile Insurance"
                      required
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold"
                    />
                  </label>

                  {/* Claimant Employee */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">
                      Claimant Employee <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="text"
                      value={addEmployee}
                      onChange={(e) => setAddEmployee(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold"
                    />
                  </label>

                  {/* Cost Category */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Expense Category</span>
                    <select
                      value={addCategory}
                      onChange={(e) => setAddCategory(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      <option value="Office Rent">Office Rent</option>
                      <option value="Vehicle Cost">Vehicle Cost</option>
                      <option value="Transport & Logistics">Transport & Logistics</option>
                      <option value="Software & SaaS">Software & SaaS</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Travel & Lodging">Travel & Lodging</option>
                      <option value="Meals & Entertaining">Meals & Entertaining</option>
                      <option value="Stationery & Supplies">Stationery & Supplies</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </label>

                  {/* Cost Center Allocation */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Cost Center Allocation</span>
                    <select
                      value={addCostCenter}
                      onChange={(e) => setAddCostCenter(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      <option value="CC-100 Corporate HQ">CC-100 Corporate HQ</option>
                      <option value="CC-200 Logistics & Warehouse">CC-200 Logistics & Warehouse</option>
                      <option value="CC-300 Sales & Field Ops">CC-300 Sales & Field Ops</option>
                    </select>
                  </label>

                  {/* Expense GL Account (Debit) */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">
                      Expense GL Account (Debit) <span className="text-rose-600">*</span>
                    </span>
                    <select
                      value={addGlAccount}
                      onChange={(e) => setAddGlAccount(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 font-mono font-bold cursor-pointer"
                    >
                      {expenseAccounts.map((acc) => (
                        <option key={acc.id} value={acc.code}>
                          {acc.code} — {acc.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Disbursing Cash / Bank Account (Credit) */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">
                      Paid From (Credit Account) <span className="text-rose-600">*</span>
                    </span>
                    <select
                      value={addPaymentAccount}
                      onChange={(e) => setAddPaymentAccount(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 font-mono font-bold cursor-pointer"
                    >
                      {cashBankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.code}>
                          {acc.code} — {acc.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Payment Method */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Payment Method</span>
                    <select
                      value={addPaymentMethod}
                      onChange={(e) => setAddPaymentMethod(e.target.value as any)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="CPO">CPO</option>
                      <option value="Telebirr">Telebirr</option>
                    </select>
                  </label>

                  {/* Voucher / Cheque Ref */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Payment Voucher / Cheque Ref</span>
                    <input
                      type="text"
                      value={addVoucherRef}
                      onChange={(e) => setAddVoucherRef(e.target.value)}
                      placeholder="e.g. PV-1049 or CHQ-9902"
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono outline-none focus:border-emerald-500"
                    />
                  </label>

                  {/* Expense Date */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">
                      Expense Date <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="date"
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono outline-none focus:border-emerald-500"
                    />
                  </label>

                  {/* Base Amount */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">
                      Base Amount (ETB) <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={addAmount}
                      onChange={(e) => {
                        const val = e.target.value
                        setAddAmount(val)
                        const n = parseFloat(val) || 0
                        if (addApplyVat) setAddTaxAmount((n * 0.15).toFixed(2))
                        if (addApplyWht) setAddWhtAmount((n * 0.02).toFixed(2))
                      }}
                      placeholder="e.g. 5000.00"
                      required
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono font-black outline-none focus:border-emerald-500"
                    />
                  </label>
                </div>

                {/* Peachtree Tax Checkboxes Section */}
                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/60 space-y-3">
                  <span className="text-[11px] font-black uppercase text-zinc-700 block tracking-wider">
                    Statutory Taxes & Withholding (Peachtree Rules)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 15% VAT Checkbox */}
                    <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addApplyVat}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setAddApplyVat(checked)
                            setAddTaxAmount(checked ? (parsedAddAmount * 0.15).toFixed(2) : "0")
                          }}
                          className="size-4 rounded accent-emerald-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-zinc-900">
                          Apply 15% VAT (Value Added Tax)
                        </span>
                      </label>
                      {addApplyVat && (
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">VAT Amount:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={addTaxAmount}
                            onChange={(e) => setAddTaxAmount(e.target.value)}
                            className="h-8 w-28 rounded-lg border border-zinc-200 px-2 text-xs font-mono font-bold"
                          />
                          <span className="text-[10px] text-zinc-400 font-mono">Debit: 1320-06-02</span>
                        </div>
                      )}
                    </div>

                    {/* 2% Withholding Tax Checkbox */}
                    <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addApplyWht}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setAddApplyWht(checked)
                            setAddWhtAmount(checked ? (parsedAddAmount * 0.02).toFixed(2) : "0")
                          }}
                          className="size-4 rounded accent-rose-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-zinc-900">
                          Deduct 2% Withholding Tax (WHT)
                        </span>
                      </label>
                      {addApplyWht && (
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">WHT Amount:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={addWhtAmount}
                            onChange={(e) => setAddWhtAmount(e.target.value)}
                            className="h-8 w-28 rounded-lg border border-zinc-200 px-2 text-xs font-mono font-bold"
                          />
                          <span className="text-[10px] text-zinc-400 font-mono">Credit: 2000-04</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Purpose / Remarks */}
                <label className="space-y-1 block">
                  <span className="text-[11px] font-black uppercase text-zinc-700 block">Purpose / Audit Notes</span>
                  <input
                    type="text"
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                    placeholder="Brief description of the business expenditure"
                    className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500"
                  />
                </label>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 mt-6">
                  <button
                    type="button"
                    disabled={isSubmittingAdd}
                    onClick={() => setIsAddModalOpen(false)}
                    className="h-10 rounded-full border border-zinc-200 px-4 font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdd}
                    className="h-10 rounded-full bg-zinc-950 px-5 font-bold text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                  >
                    {isSubmittingAdd ? <LoadingDots color="bg-white" size="sm" /> : "Record Expense"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          EDIT EXPENSE MODAL: STANDARD WITH EditModalHeader & 3-DOTS DELETE
          ========================================================================= */}
      <AnimatePresence>
        {editingExpense && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingExpense(null)}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl border border-zinc-200 z-[121] relative"
            >
              <EditModalHeader
                title={`Edit Expense: ${editingExpense.merchant}`}
                subtitle={`Ref: ${editingExpense.id} • Date: ${editingExpense.date} • Debit GL: ${editingExpense.gl_account_id || "8000-30"}`}
                onClose={() => setEditingExpense(null)}
                onRequestDelete={() => setDeletingExpense(editingExpense)}
                deleteLabel="Delete Expense Record"
              />

              <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs font-semibold">
                {/* Light Green Summary Section */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800/70 block">Merchant / Payee</span>
                    <span className="font-bold text-zinc-950 truncate block">{editingExpense.merchant}</span>
                    <span className="font-mono text-[10px] text-zinc-500 block">{editingExpense.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800/70 block">Gross Amount</span>
                    <span className="font-mono font-bold text-zinc-950">
                      ETB {parsedEditAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800/70 block">Net Disbursed</span>
                    <span className="font-mono font-black text-emerald-900">
                      ETB {editNetDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800/70 block">Audit Status</span>
                    <span className={`inline-block font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${
                      editingExpense.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                      editingExpense.status === "REJECTED" ? "bg-rose-100 text-rose-800 border border-rose-300" :
                      "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}>
                      {editingExpense.status}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Payee / Merchant */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">
                      Merchant / Payee <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="text"
                      value={editMerchant}
                      onChange={(e) => setEditMerchant(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 font-bold"
                    />
                  </label>

                  {/* Claimant Employee */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">
                      Claimant Employee <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="text"
                      value={editEmployee}
                      onChange={(e) => setEditEmployee(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500 font-bold"
                    />
                  </label>

                  {/* Cost Category */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Category</span>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      <option value="Office Rent">Office Rent</option>
                      <option value="Vehicle Cost">Vehicle Cost</option>
                      <option value="Transport & Logistics">Transport & Logistics</option>
                      <option value="Software & SaaS">Software & SaaS</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Travel & Lodging">Travel & Lodging</option>
                      <option value="Meals & Entertaining">Meals & Entertaining</option>
                      <option value="Stationery & Supplies">Stationery & Supplies</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </label>

                  {/* Cost Center Allocation */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Cost Center Allocation</span>
                    <select
                      value={editCostCenter}
                      onChange={(e) => setEditCostCenter(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      <option value="CC-100 Corporate HQ">CC-100 Corporate HQ</option>
                      <option value="CC-200 Logistics & Warehouse">CC-200 Logistics & Warehouse</option>
                      <option value="CC-300 Sales & Field Ops">CC-300 Sales & Field Ops</option>
                    </select>
                  </label>

                  {/* Expense GL Account (Debit) */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Expense GL Account (Debit)</span>
                    <select
                      value={editGlAccount}
                      onChange={(e) => setEditGlAccount(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 font-mono font-bold cursor-pointer"
                    >
                      {expenseAccounts.map((acc) => (
                        <option key={acc.id} value={acc.code}>
                          {acc.code} — {acc.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Paid From (Credit) */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Paid From (Credit Account)</span>
                    <select
                      value={editPaymentAccount}
                      onChange={(e) => setEditPaymentAccount(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 font-mono font-bold cursor-pointer"
                    >
                      {cashBankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.code}>
                          {acc.code} — {acc.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Payment Method */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Payment Method</span>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="CPO">CPO</option>
                      <option value="Telebirr">Telebirr</option>
                    </select>
                  </label>

                  {/* Voucher Reference */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Voucher / Cheque Reference</span>
                    <input
                      type="text"
                      value={editVoucherRef}
                      onChange={(e) => setEditVoucherRef(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono outline-none focus:border-emerald-500"
                    />
                  </label>

                  {/* Expense Date */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Expense Date</span>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono outline-none focus:border-emerald-500"
                    />
                  </label>

                  {/* Base Amount */}
                  <label className="space-y-1">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Base Amount (ETB)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => {
                        const val = e.target.value
                        setEditAmount(val)
                        const n = parseFloat(val) || 0
                        if (editApplyVat) setEditTaxAmount((n * 0.15).toFixed(2))
                        if (editApplyWht) setEditWhtAmount((n * 0.02).toFixed(2))
                      }}
                      required
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs font-mono font-black outline-none focus:border-emerald-500"
                    />
                  </label>

                  {/* Audit Status */}
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-black uppercase text-zinc-700 block">Audit Status</span>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs bg-white outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      <option value="PENDING">PENDING (Awaiting Treasury Audit)</option>
                      <option value="APPROVED">APPROVED (Posted to General Ledger)</option>
                      <option value="REJECTED">REJECTED (Declined Claim)</option>
                    </select>
                  </label>
                </div>

                {/* Peachtree Tax Checkboxes Section */}
                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/60 space-y-3">
                  <span className="text-[11px] font-black uppercase text-zinc-700 block tracking-wider">
                    Statutory Taxes & Withholding (Peachtree Rules)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 15% VAT Checkbox */}
                    <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editApplyVat}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setEditApplyVat(checked)
                            setEditTaxAmount(checked ? (parsedEditAmount * 0.15).toFixed(2) : "0")
                          }}
                          className="size-4 rounded accent-emerald-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-zinc-900">
                          Apply 15% VAT (Value Added Tax)
                        </span>
                      </label>
                      {editApplyVat && (
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">VAT Amount:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editTaxAmount}
                            onChange={(e) => setEditTaxAmount(e.target.value)}
                            className="h-8 w-28 rounded-lg border border-zinc-200 px-2 text-xs font-mono font-bold"
                          />
                          <span className="text-[10px] text-zinc-400 font-mono">Debit: 1320-06-02</span>
                        </div>
                      )}
                    </div>

                    {/* 2% Withholding Tax Checkbox */}
                    <div className="p-3 rounded-xl border border-zinc-200 bg-white space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editApplyWht}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setEditApplyWht(checked)
                            setEditWhtAmount(checked ? (parsedEditAmount * 0.02).toFixed(2) : "0")
                          }}
                          className="size-4 rounded accent-rose-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-zinc-900">
                          Deduct 2% Withholding Tax (WHT)
                        </span>
                      </label>
                      {editApplyWht && (
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">WHT Amount:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editWhtAmount}
                            onChange={(e) => setEditWhtAmount(e.target.value)}
                            className="h-8 w-28 rounded-lg border border-zinc-200 px-2 text-xs font-mono font-bold"
                          />
                          <span className="text-[10px] text-zinc-400 font-mono">Credit: 2000-04</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Purpose / Remarks */}
                <label className="space-y-1 block">
                  <span className="text-[11px] font-black uppercase text-zinc-700 block">Purpose / Remarks</span>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-emerald-500"
                  />
                </label>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 mt-6">
                  <button
                    type="button"
                    disabled={isSubmittingEdit}
                    onClick={() => setEditingExpense(null)}
                    className="h-10 rounded-full border border-zinc-200 px-4 font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="h-10 rounded-full bg-zinc-950 px-5 font-bold text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                  >
                    {isSubmittingEdit ? <LoadingDots color="bg-white" size="sm" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          CONFIRMATION MODAL: RecordDeleteModal FOR EXPENSE DELETION
          ========================================================================= */}
      <RecordDeleteModal
        isOpen={Boolean(deletingExpense)}
        title="Delete Expense Record?"
        recordId={deletingExpense?.id}
        recordName={
          deletingExpense
            ? `${deletingExpense.merchant} (ETB ${Number(deletingExpense.amount || 0).toLocaleString()})`
            : undefined
        }
        description="Are you sure you want to delete this expense record? This action will permanently remove the record from the operating ledger."
        isDeleting={isDeleting}
        onClose={() => setDeletingExpense(null)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  )
}
