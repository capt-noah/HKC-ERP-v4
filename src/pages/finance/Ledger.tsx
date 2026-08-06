import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, 
  Plus, 
  ChevronRight, 
  FileText, 
  ChevronDown, 
  X,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  FolderTree,
  Folder,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  Edit
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import { useFinanceStore } from "@/lib/financeStore"
import type { JournalEntry } from "@/lib/financeStore"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"

import { Skeleton } from "@/components/ui/skeleton"

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

export default function Ledger() {
  const { showToast } = useFeedback()
  const store = useFinanceStore()
  const isLoading = store.isLoading()

  const [activeTab, setActiveTab] = useState<
    "Entries" | "Chart" | "Periods" | "Revaluation"
  >("Entries")

  // Store data
  const entries = store.getJournalEntries()
  const lines = store.getJournalEntryLines()
  const accounts = store.getAccounts()
  const periods = store.getAccountingPeriods()
  const revaluations = store.getRevaluations()

  const [searchEntries, setSearchEntries] = useState("")
  const [jeSourceFilter, setJeSourceFilter] = useState("ALL")
  const [periodSearch, setPeriodSearch] = useState("")
  const [periodStatusFilter, setPeriodStatusFilter] = useState("ALL")
  const [revalSearch, setRevalSearch] = useState("")
  const [revalStatusFilter, setRevalStatusFilter] = useState("ALL")

  const periodColumns: TableColumn[] = [
    {key:'period_label',label:'Period Label'},
    {key:'start_date',label:'Start Date'},
    {key:'end_date',label:'End Date'},
    {key:'is_closed',label:'Status',align:'center'},
    {key:'_actions',label:'Action',align:'right',noSort:true}
  ]

  // Journal Entries Column Resizing & Sorting State
  const defaultJeColWidths: Record<string, number> = {
    id: 110,
    entry_date: 115,
    description: 180,
    account_lines: 200,
    party: 150,
    debit_amount: 125,
    credit_amount: 125,
    source_type: 130,
    actions: 100,
  }

  const [jeColWidths, setJeColWidths] = useState<Record<string, number>>(defaultJeColWidths)
  const [jeSortKey, setJeSortKey] = useState<string | null>(null)
  const [jeSortDir, setJeSortDir] = useState<"asc" | "desc">("asc")
  const [openJeSortMenuCol, setOpenJeSortMenuCol] = useState<string | null>(null)

  const handleJeResizeStart = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = jeColWidths[colKey] || 120

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const newWidth = Math.max(65, startWidth + deltaX)
      setJeColWidths((prev) => ({ ...prev, [colKey]: newWidth }))
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  const jeColumns: { key: string; label: string; align?: "left" | "right" | "center" }[] = [
    { key: "id", label: "JE ID", align: "left" },
    { key: "entry_date", label: "Posting Date", align: "left" },
    { key: "description", label: "Description", align: "left" },
    { key: "account_lines", label: "Account Lines", align: "left" },
    { key: "party", label: "Party", align: "left" },
    { key: "debit_amount", label: "Debit (ETB)", align: "right" },
    { key: "credit_amount", label: "Credit (ETB)", align: "right" },
    { key: "source_type", label: "Voucher Type", align: "center" },
    { key: "actions", label: "Actions", align: "right" },
  ]
  
  // COA state
  const [coaSearch, setCoaSearch] = useState("")
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    Asset: true,
    Liability: true,
    Equity: true,
    Revenue: true,
    Expense: true,
    "1100": true,
    "1400": true,
    "2050": true,
    "3050": true,
    "4050": true,
    "5050": true,
    "5150": true,
  })
  const [showAddAccountModal, setShowAddAccountModal] = useState(false)
  const [newAccCode, setNewAccCode] = useState("")
  const [newAccName, setNewAccName] = useState("")
  const [newAccType, setNewAccType] = useState<"Asset" | "Liability" | "Equity" | "Revenue" | "Expense">("Asset")
  const [newAccParent, setNewAccParent] = useState<string>("")
  const [newAccIsGroup, setNewAccIsGroup] = useState(false)

  // Edit Account state
  const [showEditAccountModal, setShowEditAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [editAccCode, setEditAccCode] = useState("")
  const [editAccName, setEditAccName] = useState("")
  const [editAccType, setEditAccType] = useState<"Asset" | "Liability" | "Equity" | "Revenue" | "Expense">("Asset")
  const [editAccParent, setEditAccParent] = useState("")
  const [editAccIsGroup, setEditAccIsGroup] = useState(false)
  const [editAccIsActive, setEditAccIsActive] = useState(true)

  // Accounting Period addition states
  const [showAddPeriodModal, setShowAddPeriodModal] = useState(false)
  const [newPeriodLabel, setNewPeriodLabel] = useState("")
  const [newPeriodStart, setNewPeriodStart] = useState("")
  const [newPeriodEnd, setNewPeriodEnd] = useState("")

  // Period Closing states
  const [showClosingModal, setShowClosingModal] = useState(false)
  const [closingPeriodId, setClosingPeriodId] = useState("")
  const [closingRetainedEarningsCode, setClosingRetainedEarningsCode] = useState("3000")

  // Posting modal state
  const todayStr = new Date().toISOString().split("T")[0]
  const [showPostModal, setShowPostModal] = useState(false)
  const [newDate, setNewDate] = useState(todayStr)
  const [newDesc, setNewDesc] = useState("")
  const [newSourceType, setNewSourceType] = useState<JournalEntry["source_type"]>("Manual Adjustment")
  const [newSourceId, setNewSourceId] = useState(`JV-${Date.now().toString().slice(-4)}`)
  const newCurrency = "ETB"

  const [formLines, setFormLines] = useState<Array<{
    account_id: string
    debit: string
    credit: string
    party_type: "Customer" | "Supplier" | "Employee" | ""
    party_id: string
    party_name: string
  }>>([
    { account_id: accounts.find((a) => a.is_active)?.id || "", debit: "", credit: "", party_type: "", party_id: "", party_name: "" },
    { account_id: accounts.filter((a) => a.is_active)[1]?.id || "", debit: "", credit: "", party_type: "", party_id: "", party_name: "" },
  ])

  // Revaluation modal
  const [showRevalModal, setShowRevalModal] = useState(false)
  const [revalDate, setRevalDate] = useState(todayStr)
  const [revalCurrency, setRevalCurrency] = useState("USD")
  const [revalTargetAcc, setRevalTargetAcc] = useState(accounts.find(a => a.code === "1000")?.id || "")
  const [revalOrigBalance, setRevalOrigBalance] = useState("")
  const [revalNewRate, setRevalNewRate] = useState("")

  // Reversal computation
  const reversedEntryIds = new Set(
    entries
      .map((e) => e.is_reversal_of)
      .filter((id): id is string => id !== null && id !== undefined)
  )

  // Handlers
  const handlePostEntry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDesc.trim()) {
      showToast("Validation Error", "warning", "Please provide an accounting description.")
      return
    }

    const payloadLines = formLines.map((l) => ({
      account_id: l.account_id,
      debit_amount: parseFloat(l.debit) || 0,
      credit_amount: parseFloat(l.credit) || 0,
      party_type: l.party_type ? (l.party_type as any) : null,
      party_id: l.party_id || (l.party_name ? `PARTY-${l.party_name.replace(/\s+/g, "").toUpperCase()}` : null),
      party_name: l.party_name || null,
    }))

    const result = store.postJournalEntry(
      {
        entry_date: newDate,
        description: newDesc,
        source_type: newSourceType,
        source_id: newSourceId,
        created_by: "Senior Accountant",
        currency: newCurrency,
        exchange_rate: 1.0,
      },
      payloadLines
    )

    if (!result.success) {
      showToast("Posting Blocked", "warning", result.error || "Validation error.")
      return
    }

    setShowPostModal(false)
    setNewDesc("")
    setFormLines([
      { account_id: accounts.find((a) => a.is_active)?.id || "", debit: "", credit: "", party_type: "", party_id: "", party_name: "" },
      { account_id: accounts.filter((a) => a.is_active)[1]?.id || "", debit: "", credit: "", party_type: "", party_id: "", party_name: "" },
    ])

    if (result.autoRounded) {
      showToast(
        "Journal Entry Posted",
        "info",
        `Entry ${result.entry?.id} posted with auto-round off line of ETB ${result.roundOffAmount?.toFixed(2)}.`
      )
    } else {
      showToast("Journal Entry Posted", "success", `Entry ${result.entry?.id} posted to General Ledger.`)
    }
  }

  const handleReverseEntry = (entryId: string, lineId?: string) => {
    const res = store.reverseJournalEntry(entryId, lineId)
    if (res.success) {
      showToast(
        "Reversal Journal Entry Created",
        "success",
        `Created entry ${res.reversalEntry?.id} reversing ${lineId ? "line " + lineId : entryId}.`
      )
    } else {
      showToast("Reversal Failed", "warning", res.error || "Could not reverse entry.")
    }
  }

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccCode.trim() || !newAccName.trim()) {
      showToast("Validation Error", "warning", "Code and Name are required.")
      return
    }
    const res = store.addAccount({
      code: newAccCode,
      name: newAccName,
      account_type: newAccType,
      parent_account_id: newAccParent || null,
      is_active: true,
      is_group: newAccIsGroup,
    })
    if (res.success) {
      setShowAddAccountModal(false)
      setNewAccCode("")
      setNewAccName("")
      setNewAccParent("")
      setNewAccIsGroup(false)
      showToast("Account Created", "success", `Account ${newAccCode} - ${newAccName} added to Chart of Accounts.`)
    } else {
      showToast("Account Creation Failed", "warning", res.error || "Could not create account.")
    }
  }

  const handleUpdateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAccount) return
    if (!editAccCode.trim() || !editAccName.trim()) {
      showToast("Validation Error", "warning", "Code and Name are required.")
      return
    }

    const res = store.updateAccount(editingAccount.id, {
      code: editAccCode,
      name: editAccName,
      account_type: editAccType,
      parent_account_id: editAccParent || null,
      is_group: editAccIsGroup,
      is_active: editAccIsActive,
    })

    if (res.success) {
      setShowEditAccountModal(false)
      setEditingAccount(null)
      showToast("Account Updated", "success", `Account ${editAccCode} - ${editAccName} successfully updated.`)
    } else {
      showToast("Account Update Failed", "warning", res.error || "Could not update account.")
    }
  }

  const handleDeleteAccountSubmit = (id: string) => {
    if (confirm("Are you sure you want to delete this account node?")) {
      const res = store.deleteAccount(id)
      if (res.success) {
        setShowEditAccountModal(false)
        setEditingAccount(null)
        showToast("Account Deleted", "success", "Account node has been deleted from Chart of Accounts.")
      } else {
        showToast("Account Deletion Failed", "warning", res.error || "Could not delete account.")
      }
    }
  }

  const handleAddPeriodSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPeriodLabel.trim() || !newPeriodStart || !newPeriodEnd) {
      showToast("Validation Error", "warning", "All fields are required to create a period.")
      return
    }
    store.addAccountingPeriod({
      period_label: newPeriodLabel,
      start_date: newPeriodStart,
      end_date: newPeriodEnd,
      is_closed: false,
    })
    setShowAddPeriodModal(false)
    setNewPeriodLabel("")
    setNewPeriodStart("")
    setNewPeriodEnd("")
    showToast("Accounting Period Added", "success", `Period ${newPeriodLabel} is now open.`)
  }

  const handleDeletePeriod = (id: string) => {
    if (confirm("Are you sure you want to delete this accounting period?")) {
      store.deleteAccountingPeriod(id)
      showToast("Accounting Period Deleted", "info", `Period ${id} has been deleted.`)
    }
  }

  const handleClosePeriodVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!closingPeriodId) return
    const res = store.closeAccountingPeriod(closingPeriodId, closingRetainedEarningsCode)
    if (res.success) {
      setShowClosingModal(false)
      setClosingPeriodId("")
      showToast("Period Closed", "success", "Voucher posted. Revenue & expense accounts rolled to retained earnings.")
    } else {
      showToast("Closing Process Failed", "warning", res.error || "Could not execute period closing.")
    }
  }

  const handleLockPeriod = (periodId: string) => {
    store.toggleLockPeriod(periodId)
    const updated = store.getAccountingPeriods().find(p => p.id === periodId)
    showToast(
      updated?.is_closed ? "Accounting Period Locked" : "Accounting Period Unlocked",
      updated?.is_closed ? "warning" : "info",
      `Period ${periodId} is now ${updated?.is_closed ? "LOCKED (no entries allowed)" : "OPEN"}.`
    )
  }

  const handleCreateRevaluation = (e: React.FormEvent) => {
    e.preventDefault()
    const origBal = parseFloat(revalOrigBalance) || 0
    const rate = parseFloat(revalNewRate) || 0

    if (origBal <= 0 || rate <= 0) {
      showToast("Invalid Input", "warning", "Balance and exchange rate must be positive numbers.")
      return
    }

    const res = store.createRevaluation({
      currency: revalCurrency,
      target_account_id: revalTargetAcc,
      original_balance: origBal,
      current_rate: rate,
      revaluation_date: revalDate,
    })

    if (res.success) {
      setShowRevalModal(false)
      showToast("Draft Revaluation Created", "info", `Revaluation ${res.revaluation?.id} created as 'Draft'. Click 'Post' to execute.`)
    } else {
      showToast("Revaluation Creation Failed", "warning", res.error || "Could not create revaluation.")
    }
  }

  const handlePostRevaluation = (revId: string) => {
    const res = store.postRevaluation(revId)
    if (res.success) {
      showToast("Revaluation Posted", "success", `Journal entry ${res.entryId} created and posted to General Ledger.`)
    } else {
      showToast("Revaluation Posting Blocked", "warning", res.error || "Could not post revaluation.")
    }
  }

  // Filter entries
  const filteredEntries = entries.filter((ent) => {
    if (jeSourceFilter !== "ALL" && ent.source_type !== jeSourceFilter) return false
    const q = (searchEntries || "").toLowerCase()
    const desc = (ent.description || "").toLowerCase()
    const entId = (ent.id || "").toLowerCase()
    const srcId = (ent.source_id || "").toLowerCase()
    return desc.includes(q) || entId.includes(q) || srcId.includes(q)
  })

  const jeSourceTypes = Array.from(new Set(entries.map((e) => e.source_type)))

  const filteredPeriods = periods.filter((p) => {
    if (periodStatusFilter === "OPEN" && p.is_closed) return false
    if (periodStatusFilter === "LOCKED" && !p.is_closed) return false
    if (!periodSearch.trim()) return true
    const q = periodSearch.toLowerCase()
    return (p.period_label || "").toLowerCase().includes(q) || (p.id || "").toLowerCase().includes(q)
  })
  const periodTable = useResizableTable(periodColumns, filteredPeriods)

  const filteredRevaluations = revaluations.filter((rev) => {
    if (revalStatusFilter !== "ALL" && rev.status !== revalStatusFilter) return false
    if (!revalSearch.trim()) return true
    const q = revalSearch.toLowerCase()
    return (rev.id || "").toLowerCase().includes(q) || (rev.currency || "").toLowerCase().includes(q)
  })

  // Sort entries
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (jeSortKey) {
      const entryLinesA = lines.filter((l) => l.journal_entry_id === a.id)
      const entryLinesB = lines.filter((l) => l.journal_entry_id === b.id)
      const totalDebitA = entryLinesA.reduce((s, l) => s + l.debit_amount, 0)
      const totalDebitB = entryLinesB.reduce((s, l) => s + l.debit_amount, 0)
      const totalCreditA = entryLinesA.reduce((s, l) => s + l.credit_amount, 0)
      const totalCreditB = entryLinesB.reduce((s, l) => s + l.credit_amount, 0)

      let valA: any = ""
      let valB: any = ""

      if (jeSortKey === "id") {
        valA = a.id
        valB = b.id
      } else if (jeSortKey === "entry_date") {
        valA = a.entry_date
        valB = b.entry_date
      } else if (jeSortKey === "description") {
        valA = a.description || ""
        valB = b.description || ""
      } else if (jeSortKey === "account_lines") {
        valA = entryLinesA.map((l) => l.account_id).join(",")
        valB = entryLinesB.map((l) => l.account_id).join(",")
      } else if (jeSortKey === "party") {
        valA = entryLinesA.map((l) => l.party_name || "").filter(Boolean).join(",")
        valB = entryLinesB.map((l) => l.party_name || "").filter(Boolean).join(",")
      } else if (jeSortKey === "debit_amount") {
        valA = totalDebitA
        valB = totalDebitB
      } else if (jeSortKey === "credit_amount") {
        valA = totalCreditA
        valB = totalCreditB
      } else if (jeSortKey === "source_type") {
        valA = a.source_type || ""
        valB = b.source_type || ""
      }

      if (typeof valA === "number" && typeof valB === "number") {
        if (valA !== valB) {
          return jeSortDir === "asc" ? valA - valB : valB - valA
        }
      } else if (typeof valA === "string" && typeof valB === "string") {
        const comp = valA.localeCompare(valB)
        if (comp !== 0) {
          return jeSortDir === "asc" ? comp : -comp
        }
      }
    }
    return 0
  })

  // Group accounts
  const accountsByType = {
    Asset: accounts.filter((a) => a.account_type === "Asset"),
    Liability: accounts.filter((a) => a.account_type === "Liability"),
    Equity: accounts.filter((a) => a.account_type === "Equity"),
    Revenue: accounts.filter((a) => a.account_type === "Revenue"),
    Expense: accounts.filter((a) => a.account_type === "Expense"),
  }

  // COA Tree Helpers
  const getAccountNetBalance = (acc: any) => {
    const accLines = lines.filter((l) => l.account_id === acc.id || l.account_id === acc.code)
    const debitSum = accLines.reduce((s, l) => s + l.debit_amount, 0)
    const creditSum = accLines.reduce((s, l) => s + l.credit_amount, 0)
    if (acc.account_type === "Asset" || acc.account_type === "Expense") {
      return debitSum - creditSum
    }
    return creditSum - debitSum
  }

  const isGroupAccount = (acc: any) => {
    if (acc.is_group === true) return true
    return accounts.some((a) => a.parent_account_id === acc.code || a.parent_account_id === acc.id)
  }

  const getGroupNetBalance = (acc: any): number => {
    let sum = getAccountNetBalance(acc)
    const children = accounts.filter((a) => a.parent_account_id === acc.code || a.parent_account_id === acc.id)
    for (const child of children) {
      if (isGroupAccount(child)) {
        sum += getGroupNetBalance(child)
      } else {
        sum += getAccountNetBalance(child)
      }
    }
    return sum
  }

  const handleExpandAllCoa = () => {
    const newExpanded: Record<string, boolean> = {
      Asset: true,
      Liability: true,
      Equity: true,
      Revenue: true,
      Expense: true,
    }
    accounts.forEach((acc) => {
      if (isGroupAccount(acc)) {
        newExpanded[acc.code] = true
        newExpanded[acc.id] = true
      }
    })
    setExpandedNodes(newExpanded)
  }

  const handleCollapseAllCoa = () => {
    setExpandedNodes({
      Asset: false,
      Liability: false,
      Equity: false,
      Revenue: false,
      Expense: false,
    })
  }

  const renderAccountTreeNode = (acc: any, level = 1) => {
    const isGroup = isGroupAccount(acc)
    const children = accounts.filter((a) => a.parent_account_id === acc.code || a.parent_account_id === acc.id)
    const nodeKey = acc.code || acc.id
    const isExpanded = !!expandedNodes[nodeKey] || coaSearch.trim().length > 0
    const netBalance = isGroup ? getGroupNetBalance(acc) : getAccountNetBalance(acc)

    // Filter check
    const searchTerm = coaSearch.toLowerCase().trim()
    if (searchTerm) {
      const selfMatches = acc.code.toLowerCase().includes(searchTerm) || acc.name.toLowerCase().includes(searchTerm)
      const childMatches = children.some((c) => c.code.toLowerCase().includes(searchTerm) || c.name.toLowerCase().includes(searchTerm))
      if (!selfMatches && !childMatches) return null
    }

    const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation()
      setExpandedNodes((prev) => ({ ...prev, [nodeKey]: !prev[nodeKey] }))
    }

    const handleAddChild = (e: React.MouseEvent) => {
      e.stopPropagation()
      setNewAccType(acc.account_type)
      setNewAccParent(acc.code)
      setNewAccIsGroup(false)
      setShowAddAccountModal(true)
    }

    const handleEditAccount = (e: React.MouseEvent) => {
      e.stopPropagation()
      setEditingAccount(acc)
      setEditAccCode(acc.code)
      setEditAccName(acc.name)
      setEditAccType(acc.account_type)
      setEditAccParent(acc.parent_account_id || "")
      setEditAccIsGroup(!!acc.is_group)
      setEditAccIsActive(!!acc.is_active)
      setShowEditAccountModal(true)
    }

    return (
      <div key={acc.id} className="flex flex-col gap-1.5 w-full">
        <div
          onClick={isGroup ? toggleExpand : undefined}
          className={`flex items-center justify-between p-2.5 rounded-2xl transition-all border text-xs select-none ${
            isGroup
              ? "bg-zinc-100/90 hover:bg-zinc-200/80 border-zinc-200/90 font-bold text-zinc-900 cursor-pointer shadow-sm"
              : "bg-white/90 hover:bg-emerald-50/50 border-zinc-200/70 font-semibold text-zinc-800"
          }`}
          style={{ paddingLeft: `${Math.max(12, level * 20)}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {/* Chevron for Groups */}
            {isGroup ? (
              <button
                onClick={toggleExpand}
                className="p-1 rounded-md hover:bg-zinc-300/70 text-zinc-700 shrink-0 transition-colors"
              >
                {isExpanded ? <ChevronDown className="size-3.5 text-zinc-900" /> : <ChevronRight className="size-3.5 text-zinc-500" />}
              </button>
            ) : (
              <span className="size-3.5 shrink-0 flex items-center justify-center">
                <span className="size-1.5 rounded-full bg-emerald-500" />
              </span>
            )}

            {/* Folder / File Icon */}
            {isGroup ? (
              isExpanded ? <FolderOpen className="size-4 text-amber-600 shrink-0" /> : <Folder className="size-4 text-amber-600 shrink-0" />
            ) : (
              <FileText className="size-3.5 text-emerald-600 shrink-0" />
            )}

            {/* Code & Name */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-black text-zinc-900 bg-zinc-200/90 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                {acc.code}
              </span>
              <span className="truncate font-bold text-zinc-900">{acc.name}</span>

              {/* Badges */}
              {isGroup ? (
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100/90 border border-purple-200/80 px-1.5 py-0.5 rounded-full shrink-0">
                  Group
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/90 border border-emerald-200/80 px-1.5 py-0.5 rounded-full shrink-0">
                  Ledger
                </span>
              )}

              {!acc.is_active && (
                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full shrink-0">
                  Inactive
                </span>
              )}
            </div>
          </div>

          {/* Right Balance & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right mr-1">
              <div className={`font-mono font-black text-xs ${isGroup ? "text-zinc-950" : "text-zinc-800"}`}>
                ETB {netBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {isGroup && (
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                  {children.length} sub-account{children.length === 1 ? "" : "s"}
                </div>
              )}
            </div>

            <button
              onClick={handleEditAccount}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2 py-1 rounded-full transition-all"
              title={`Edit ${acc.name}`}
            >
              <Edit className="size-3" /> Edit
            </button>

            {isGroup && (
              <button
                onClick={handleAddChild}
                className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2 py-1 rounded-full transition-all"
                title={`Add sub-account under ${acc.code} - ${acc.name}`}
              >
                <Plus className="size-3" /> Child
              </button>
            )}
          </div>
        </div>

        {/* Children List */}
        {isGroup && isExpanded && children.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-0.5 relative before:absolute before:left-5 before:top-1 before:bottom-3 before:w-0.5 before:bg-zinc-200/60">
            {children.map((childAcc) => renderAccountTreeNode(childAcc, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />
      {store.getLoadError() && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-800 shadow-lg flex items-center gap-3">
            <span className="size-2 rounded-full bg-rose-500 shrink-0" />
            Server unavailable — ledger data cannot be loaded. {store.getLoadError()}
          </div>
        </div>
      )}

      <motion.div 
        variants={stagger} 
        initial="hidden" 
        animate="visible" 
        className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12"
      >
        {/* Title Header Block */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Journal Entries & Ledger Engine</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-2xl leading-relaxed mt-1">
              Double-entry journal vouchers, chart of accounts, and period locking.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/finance")} />
          </div>
        </motion.div>

        {/* Tab Selection Switcher Bar */}
        <motion.div variants={fade} className="flex border-b border-zinc-200/60 mb-6 pb-px items-center justify-between overflow-x-auto scrollbar-none">
          <div className="flex gap-1 min-w-max">
            {[
              { id: "Entries", label: "Journal Entries", icon: FileText },
              { id: "Chart", label: "Chart of Accounts", icon: FolderTree },
              { id: "Periods", label: "Accounting Periods", icon: ShieldCheck },
              { id: "Revaluation", label: "Forex Revaluation", icon: TrendingUp },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black relative tracking-tight transition-colors uppercase whitespace-nowrap"
                >
                  <Icon className={`size-3.5 ${isActive ? "text-emerald-600" : "text-zinc-400"}`} />
                  <span className={isActive ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-700"}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="ledger-tabs"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="text-[10px] font-mono font-black text-emerald-700 uppercase hidden lg:flex items-center gap-1.5 shrink-0 ml-4">
            <CheckCircle2 className="size-3.5" /> Ledger State: Balanced
          </div>
        </motion.div>

        {/* Tab Content Rendering */}
        <AnimatePresence mode="wait">
          {/* TAB 1: Journal Entries */}
          {activeTab === "Entries" && (
            <motion.div
              key="entries-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <GlassCard className="flex flex-col overflow-hidden p-0">
                <div className="px-6 pt-6">
                  <FinanceTableToolbar
                    title="Journal Entry Ledger"
                    subtitle={`${filteredEntries.length} double-entry vouchers posted to the general ledger`}
                    searchValue={searchEntries}
                    onSearchChange={setSearchEntries}
                    searchPlaceholder="Search description, JE ID, source..."
                    filters={[
                      {
                        value: jeSourceFilter,
                        onChange: setJeSourceFilter,
                        ariaLabel: "Voucher type filter",
                        options: [
                          { value: "ALL", label: "All Voucher Types" },
                          ...jeSourceTypes.map((t) => ({ value: t, label: t })),
                        ],
                      },
                    ]}
                    actions={[{ label: "Post Entry", onClick: () => setShowPostModal(true) }]}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase tracking-wider select-none">
                        {jeColumns.map((col) => {
                          const width = jeColWidths[col.key] || 120
                          const isSorted = jeSortKey === col.key
                          const isMenuOpen = openJeSortMenuCol === col.key

                          return (
                            <th
                              key={col.key}
                              style={{ width: `${width}px`, minWidth: `${width}px` }}
                              className="relative px-3 py-3 group border-r border-zinc-200/50 last:border-r-0"
                            >
                              <div
                                className={`flex items-center justify-between gap-1 ${
                                  col.align === "right"
                                    ? "flex-row-reverse text-right"
                                    : col.align === "center"
                                    ? "justify-center"
                                    : ""
                                }`}
                              >
                                <span className="truncate">{col.label}</span>

                                {/* Dropdown Icon & Active Sort Indicator */}
                                {col.key !== "actions" && (
                                  <div className="relative flex items-center shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenJeSortMenuCol(isMenuOpen ? null : col.key)
                                      }}
                                      className={`p-1 rounded hover:bg-zinc-200/80 transition-colors flex items-center gap-0.5 ${
                                        isSorted
                                          ? "text-emerald-700 font-bold bg-emerald-100/80"
                                          : "text-zinc-400 opacity-0 group-hover:opacity-100"
                                      }`}
                                      title="Sort & Filter options"
                                    >
                                      {isSorted ? (
                                        jeSortDir === "asc" ? (
                                          <ArrowUp className="size-3" />
                                        ) : (
                                          <ArrowDown className="size-3" />
                                        )
                                      ) : (
                                        <ChevronDown className="size-3" />
                                      )}
                                    </button>

                                    {/* Dropdown Menu Popover */}
                                    {isMenuOpen && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-20 cursor-default"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setOpenJeSortMenuCol(null)
                                          }}
                                        />
                                        <div
                                          className={`absolute top-full mt-1.5 z-30 bg-white border border-zinc-200 shadow-xl rounded-xl p-1.5 min-w-[150px] text-xs font-semibold normal-case tracking-normal ${
                                            col.align === "right" ? "right-0 text-left" : "left-0 text-left"
                                          }`}
                                        >
                                          <div className="px-2 py-1 text-[10px] font-bold uppercase text-zinc-400 border-b border-zinc-100 mb-1">
                                            Sort {col.label}
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setJeSortKey(col.key)
                                              setJeSortDir("asc")
                                              setOpenJeSortMenuCol(null)
                                            }}
                                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
                                              isSorted && jeSortDir === "asc"
                                                ? "bg-emerald-50 text-emerald-800 font-bold"
                                                : "text-zinc-700 hover:bg-zinc-100"
                                            }`}
                                          >
                                            <ArrowUp className="size-3 text-emerald-600" />
                                            Sort Ascending
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setJeSortKey(col.key)
                                              setJeSortDir("desc")
                                              setOpenJeSortMenuCol(null)
                                            }}
                                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
                                              isSorted && jeSortDir === "desc"
                                                ? "bg-emerald-50 text-emerald-800 font-bold"
                                                : "text-zinc-700 hover:bg-zinc-100"
                                            }`}
                                          >
                                            <ArrowDown className="size-3 text-emerald-600" />
                                            Sort Descending
                                          </button>
                                          {isSorted && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setJeSortKey(null)
                                                setOpenJeSortMenuCol(null)
                                              }}
                                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 transition-colors border-t border-zinc-100 mt-1 pt-1.5"
                                            >
                                              <RotateCcw className="size-3" />
                                              Clear Sort
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Column Resizer Handle */}
                              <div
                                onMouseDown={(e) => handleJeResizeStart(e, col.key)}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-emerald-500/60 active:bg-emerald-600 z-10 transition-colors"
                                title="Drag to resize column"
                              />
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <tr key={idx} className="animate-pulse text-xs">
                            <td className="px-3 py-3"><Skeleton className="h-4 w-20 bg-zinc-200/80" /></td>
                            <td className="px-3 py-3"><Skeleton className="h-4 w-24 bg-zinc-200/80" /></td>
                            <td className="px-3 py-3"><Skeleton className="h-4 w-36 bg-zinc-200/80" /></td>
                            <td className="px-3 py-3"><Skeleton className="h-4 w-28 bg-zinc-200/80" /></td>
                            <td className="px-3 py-3"><Skeleton className="h-4 w-24 bg-zinc-200/80" /></td>
                            <td className="px-3 py-3 text-right"><Skeleton className="h-4 w-20 bg-zinc-200/80 ml-auto" /></td>
                            <td className="px-3 py-3 text-right"><Skeleton className="h-4 w-20 bg-zinc-200/80 ml-auto" /></td>
                            <td className="px-3 py-3 text-center"><Skeleton className="h-4 w-16 bg-zinc-200/80 mx-auto" /></td>
                            <td className="px-3 py-3 text-right"><Skeleton className="h-4 w-12 bg-zinc-200/80 ml-auto" /></td>
                          </tr>
                        ))
                      ) : sortedEntries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-xs font-semibold text-zinc-400">
                            No journal entries found matching search criteria.
                          </td>
                        </tr>
                      ) : (
                        sortedEntries.map((ent, idx) => {
                          const entryLines = lines.filter((l) => l.journal_entry_id === ent.id)
                          const isReversal = ent.is_reversal_of !== null
                          const isReversed = reversedEntryIds.has(ent.id)

                          const totalDebit = entryLines.reduce((s, l) => s + l.debit_amount, 0)
                          const totalCredit = entryLines.reduce((s, l) => s + l.credit_amount, 0)

                          return (
                            <tr key={`${ent.id}-${idx}`} className="hover:bg-zinc-50/60 transition-colors text-xs">
                              <td
                                style={{ width: `${jeColWidths.id}px` }}
                                className="px-3 py-3 whitespace-nowrap font-mono font-bold text-zinc-900 truncate"
                              >
                                {ent.id}
                              </td>
                              <td
                                style={{ width: `${jeColWidths.entry_date}px` }}
                                className="px-3 py-3 whitespace-nowrap font-medium text-zinc-700 truncate"
                              >
                                {ent.entry_date}
                              </td>
                              <td
                                style={{ width: `${jeColWidths.description}px` }}
                                className="px-3 py-3 truncate"
                              >
                                <div className="font-semibold text-zinc-800 truncate">{ent.description}</div>
                                <div className="text-[10px] font-mono text-zinc-400 truncate">By: {ent.created_by}</div>
                              </td>
                              <td
                                style={{ width: `${jeColWidths.account_lines}px` }}
                                className="px-3 py-3 truncate"
                              >
                                <div className="flex flex-col gap-1 max-w-sm">
                                  {entryLines.map((l) => {
                                    const acc = accounts.find((a) => a.id === l.account_id || a.code === l.account_id)
                                    return (
                                      <div key={l.id} className="flex items-center text-[11px] truncate">
                                        <span className="font-mono text-zinc-700 truncate">
                                          {acc ? `${acc.code} - ${acc.name}` : l.account_id}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </td>
                              <td
                                style={{ width: `${jeColWidths.party}px` }}
                                className="px-3 py-3 truncate"
                              >
                                <div className="flex flex-col gap-1 max-w-xs">
                                  {entryLines.map((l) => (
                                    <div key={l.id} className="flex items-center text-[11px] truncate min-h-[18px]">
                                      {l.party_name ? (
                                        <span className="font-sans font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] truncate">
                                          [{l.party_type ? `${l.party_type}: ` : ""}{l.party_name}]
                                        </span>
                                      ) : (
                                        <span className="text-zinc-300 font-mono text-[11px]">-</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td
                                style={{ width: `${jeColWidths.debit_amount}px` }}
                                className="px-3 py-3 text-right font-mono font-bold text-zinc-900 whitespace-nowrap truncate"
                              >
                                ETB {totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td
                                style={{ width: `${jeColWidths.credit_amount}px` }}
                                className="px-3 py-3 text-right font-mono font-bold text-zinc-900 whitespace-nowrap truncate"
                              >
                                ETB {totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td
                                style={{ width: `${jeColWidths.source_type}px` }}
                                className="px-3 py-3 text-center whitespace-nowrap truncate"
                              >
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 truncate">
                                  {ent.source_type}
                                </span>
                              </td>
                              <td
                                style={{ width: `${jeColWidths.actions}px` }}
                                className="px-3 py-3 text-right pr-4 whitespace-nowrap"
                              >
                                {!isReversal && !isReversed ? (
                                  <button
                                    onClick={() => handleReverseEntry(ent.id)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-full transition-colors"
                                  >
                                    <RotateCcw className="size-3" /> Reverse
                                  </button>
                                ) : isReversed ? (
                                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                    Reversed
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    Reversal Entry
                                  </span>
                                )}
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

          {/* TAB 2: Chart of Accounts Tree */}
          {activeTab === "Chart" && (
            <motion.div
              key="chart-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {/* Header & Stats Banner */}
              <GlassCard className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                    <FolderTree className="size-5 text-emerald-600" />
                    ERPNext Hierarchical Chart of Accounts
                  </h3>
                  <p className="text-xs font-semibold text-zinc-500 mt-0.5">
                    Structured double-entry ledger tree with 5 Root Types, Group Parent Folders, Sub-Classifications, and Postable Ledger Accounts.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <div className="flex items-center gap-1.5 bg-zinc-100 px-3 py-1.5 rounded-full text-xs font-bold text-zinc-700 border border-zinc-200/60">
                    <span className="text-zinc-400">Total:</span>
                    <span className="font-mono text-zinc-900">{accounts.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-full text-xs font-bold text-purple-700 border border-purple-200/60">
                    <Folder className="size-3.5 text-purple-600" />
                    <span>Groups:</span>
                    <span className="font-mono">{accounts.filter(isGroupAccount).length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 border border-emerald-200/60">
                    <FileText className="size-3.5 text-emerald-600" />
                    <span>Ledgers:</span>
                    <span className="font-mono">{accounts.filter(a => !isGroupAccount(a)).length}</span>
                  </div>

                  <button
                    onClick={() => {
                      setNewAccCode("")
                      setNewAccName("")
                      setNewAccParent("")
                      setNewAccIsGroup(false)
                      setShowAddAccountModal(true)
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-all shadow-sm ml-2"
                  >
                    <Plus className="size-3.5" /> Add Account Node
                  </button>
                </div>
              </GlassCard>

              {/* Toolbar: Search & Expand/Collapse All */}
              <GlassCard className="p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-zinc-100/90 rounded-full px-3 h-9 w-full max-w-md border border-zinc-200/60">
                  <Search className="size-4 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by Account Code or Name (e.g. 1100, Cash, Inventory)..."
                    value={coaSearch}
                    onChange={(e) => setCoaSearch(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold focus:outline-none text-zinc-900 py-2"
                  />
                  {coaSearch && (
                    <button onClick={() => setCoaSearch("")} className="text-zinc-400 hover:text-zinc-600">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExpandAllCoa}
                    className="text-xs font-bold text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-full transition-all border border-zinc-200/60"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={handleCollapseAllCoa}
                    className="text-xs font-bold text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-full transition-all border border-zinc-200/60"
                  >
                    Collapse All
                  </button>
                </div>
              </GlassCard>

              {/* 5 Root Types Hierarchy Tree Cards */}
              <div className="flex flex-col gap-4">
                {(
                  [
                    { type: "Asset", title: "Asset Accounts", code: "1", color: "emerald" },
                    { type: "Liability", title: "Liability Accounts", code: "2", color: "amber" },
                    { type: "Equity", title: "Equity & Capital Accounts", code: "3", color: "purple" },
                    { type: "Revenue", title: "Income & Revenue Accounts", code: "4", color: "teal" },
                    { type: "Expense", title: "Expense Accounts", code: "5", color: "rose" },
                  ] as const
                ).map((rootCat) => {
                  const typeAccounts = accountsByType[rootCat.type as keyof typeof accountsByType] || []
                  const rootAccounts = typeAccounts.filter(
                    (a) => !a.parent_account_id || !accounts.some((p) => p.code === a.parent_account_id || p.id === a.parent_account_id)
                  )
                  const isRootExpanded = expandedNodes[rootCat.type] !== false
                  const rootTotalNet = typeAccounts
                    .filter((a) => !isGroupAccount(a))
                    .reduce((sum, a) => sum + getAccountNetBalance(a), 0)

                  return (
                    <GlassCard key={rootCat.type} className="p-4 flex flex-col gap-3 overflow-hidden">
                      {/* Root Category Header */}
                      <div
                        onClick={() =>
                          setExpandedNodes((prev) => ({
                            ...prev,
                            [rootCat.type]: !isRootExpanded,
                          }))
                        }
                        className="flex items-center justify-between cursor-pointer border-b border-zinc-200/80 pb-3"
                      >
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded-md hover:bg-zinc-200/80 text-zinc-700 transition-colors">
                            {isRootExpanded ? <ChevronDown className="size-4 text-zinc-900" /> : <ChevronRight className="size-4 text-zinc-500" />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                                {rootCat.code}
                              </span>
                              <h4 className="text-sm font-black text-zinc-950 uppercase tracking-wide">
                                {rootCat.title}
                              </h4>
                              <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-full">
                                {typeAccounts.length} accounts
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total Net Balance</span>
                            <span className="text-xs font-mono font-black text-zinc-950">
                              ETB {rootTotalNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tree Level Content */}
                      {isRootExpanded && (
                        <div className="flex flex-col gap-2 pt-1 pl-2">
                          {rootAccounts.length === 0 ? (
                            <div className="text-xs text-zinc-400 italic py-2 pl-4">No root accounts in this classification.</div>
                          ) : (
                            rootAccounts.map((acc) => renderAccountTreeNode(acc, 1))
                          )}
                        </div>
                      )}
                    </GlassCard>
                  )
                })}
              </div>
            </motion.div>
          )}



          {/* TAB 3: Accounting Periods */}
          {activeTab === "Periods" && (
            <motion.div
              key="periods-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <GlassCard className="flex flex-col overflow-hidden">
                <FinanceTableToolbar
                  title="Accounting Periods & Fiscal Year Closing"
                  subtitle="Lock accounting periods to prevent retroactive journal entries and perform year-end closing."
                  searchValue={periodSearch}
                  onSearchChange={setPeriodSearch}
                  searchPlaceholder="Search period label or ID..."
                  filters={[
                    {
                      value: periodStatusFilter,
                      onChange: setPeriodStatusFilter,
                      ariaLabel: "Period status filter",
                      options: [
                        { value: "ALL", label: "All Periods" },
                        { value: "OPEN", label: "Open" },
                        { value: "LOCKED", label: "Locked" },
                      ],
                    },
                  ]}
                  actions={[
                    {
                      label: "Period Closing Voucher",
                      variant: "secondary",
                      icon: <ShieldCheck className="size-4" />,
                      onClick: () => {
                        setClosingPeriodId("")
                        setShowClosingModal(true)
                      },
                    },
                    {
                      label: "Add Period",
                      variant: "primary",
                      onClick: () => {
                        setNewPeriodLabel("")
                        setNewPeriodStart("")
                        setNewPeriodEnd("")
                        setShowAddPeriodModal(true)
                      },
                    },
                  ]}
                />
                <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-left border-collapse table-fixed text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase tracking-wider select-none">
                      {periodColumns.map(col => <ResizableTh key={col.key} col={col} width={periodTable.colWidths[col.key] ?? 140} sortKey={periodTable.sortKey} sortDir={periodTable.sortDir} openMenuCol={periodTable.openMenuCol} onResizeStart={periodTable.handleResizeStart} onToggleMenu={periodTable.toggleMenu} onSortAsc={periodTable.setSortAsc} onSortDesc={periodTable.setSortDesc} onClearSort={periodTable.clearSort} />)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {periodTable.sorted().map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-3 font-bold text-zinc-900">{p.period_label}</td>
                        <td className="px-4 py-3 font-mono text-zinc-600">{p.start_date}</td>
                        <td className="px-4 py-3 font-mono text-zinc-600">{p.end_date}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.is_closed ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {p.is_closed ? "LOCKED" : "OPEN"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right pr-4 flex justify-end gap-1.5">
                          <button
                            onClick={() => handleLockPeriod(p.id)}
                            className="text-[11px] font-bold text-black bg-zinc-100 hover:bg-zinc-200 px-3 py-1 rounded-full transition-all"
                          >
                            {p.is_closed ? "Unlock Period" : "Lock Period"}
                          </button>
                          <button
                            onClick={() => handleDeletePeriod(p.id)}
                            className="text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-full transition-all"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* TAB 4: Forex Revaluation */}
          {activeTab === "Revaluation" && (
            <motion.div
              key="reval-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <FinanceTableToolbar
                title="Multi-Currency Exchange Rate Revaluation"
                subtitle="Revalue foreign asset/liability balances at period-end market rates."
                searchValue={revalSearch}
                onSearchChange={setRevalSearch}
                searchPlaceholder="Search ID, currency..."
                filters={[
                  {
                    value: revalStatusFilter,
                    onChange: setRevalStatusFilter,
                    ariaLabel: "Revaluation status filter",
                    options: [
                      { value: "ALL", label: "All Status" },
                      { value: "Draft", label: "Draft" },
                      { value: "Posted", label: "Posted" },
                    ],
                  },
                ]}
                actions={[
                  {
                    label: "Initiate Revaluation",
                    onClick: () => setShowRevalModal(true),
                  },
                ]}
              />

              <GlassCard className="overflow-hidden p-0">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Reval ID / Date</th>
                      <th className="px-4 py-3">Currency & Rate</th>
                      <th className="px-4 py-3 text-right">Orig Balance</th>
                      <th className="px-4 py-3 text-right">New Base Balance</th>
                      <th className="px-4 py-3 text-right">Unrealized Gain/Loss</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredRevaluations.map((rev) => (
                      <tr key={rev.id} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-3 font-mono font-bold text-zinc-900">
                          {rev.id} <span className="text-[10px] text-zinc-400">({rev.revaluation_date})</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-700">{rev.currency} @ {rev.current_rate}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-900">{rev.currency} {rev.original_balance.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900">ETB {rev.new_balance_in_base.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${rev.unrealized_gain_loss >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                          ETB {rev.unrealized_gain_loss.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rev.status === "Posted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {rev.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right pr-4">
                          {rev.status === "Draft" && (
                            <button
                              onClick={() => handlePostRevaluation(rev.id)}
                              className="text-[11px] font-bold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded-full transition-all"
                            >
                              Post Revaluation
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL 1: Post Journal Entry */}
        <AnimatePresence>
          {showPostModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-zinc-200 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
                  <h3 className="text-base font-black text-zinc-900">Post New Journal Entry</h3>
                  <button onClick={() => setShowPostModal(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handlePostEntry} className="flex flex-col gap-4 text-xs">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-zinc-700 mb-1 block">Entry Date</label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-700 mb-1 block">Source Type</label>
                      <select
                        value={newSourceType}
                        onChange={(e) => setNewSourceType(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold text-xs"
                      >
                        <option value="Manual Adjustment">Manual Adjustment</option>
                        <option value="Sales Invoice">Sales Invoice</option>
                        <option value="Purchase Invoice">Purchase Invoice</option>
                        <option value="Payroll">Payroll</option>
                        <option value="Exchange Revaluation">Exchange Revaluation</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-zinc-700 mb-1 block">Source Ref ID</label>
                      <input
                        type="text"
                        value={newSourceId}
                        onChange={(e) => setNewSourceId(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Accounting Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Monthly Office Utility Bill Settlement"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                    />
                  </div>

                  {/* Lines */}
                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-zinc-700">Journal Lines (Debits = Credits)</label>
                    {formLines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <select
                          value={line.account_id}
                          onChange={(e) => {
                            const updated = [...formLines]
                            updated[idx].account_id = e.target.value
                            setFormLines(updated)
                          }}
                          className="col-span-6 p-2 rounded-xl border border-zinc-200 bg-zinc-50 font-medium text-xs"
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Debit"
                          value={line.debit}
                          onChange={(e) => {
                            const updated = [...formLines]
                            updated[idx].debit = e.target.value
                            updated[idx].credit = ""
                            setFormLines(updated)
                          }}
                          className="col-span-3 p-2 rounded-xl border border-zinc-200 bg-zinc-50 font-mono font-bold"
                        />
                        <input
                          type="number"
                          placeholder="Credit"
                          value={line.credit}
                          onChange={(e) => {
                            const updated = [...formLines]
                            updated[idx].credit = e.target.value
                            updated[idx].debit = ""
                            setFormLines(updated)
                          }}
                          className="col-span-3 p-2 rounded-xl border border-zinc-200 bg-zinc-50 font-mono font-bold"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setShowPostModal(false)}
                      className="px-4 py-2.5 rounded-full bg-zinc-100 text-zinc-700 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-full bg-black text-white font-bold hover:bg-zinc-800"
                    >
                      Post Entry
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: Add Account */}
        <AnimatePresence>
          {showAddAccountModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                  <h3 className="text-base font-black text-zinc-900">Add Chart of Accounts Node</h3>
                  <button onClick={() => setShowAddAccountModal(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateAccount} className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Account Code (e.g. 1120)</label>
                    <input
                      type="text"
                      value={newAccCode}
                      onChange={(e) => setNewAccCode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono font-bold"
                      placeholder="1120"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Account Name</label>
                    <input
                      type="text"
                      value={newAccName}
                      onChange={(e) => setNewAccName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                      placeholder="Commercial Bank of Ethiopia - USD"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Account Classification Node Type</label>
                    <div className="flex items-center gap-4 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-800">
                        <input
                          type="radio"
                          name="accGroupType"
                          checked={!newAccIsGroup}
                          onChange={() => setNewAccIsGroup(false)}
                          className="accent-emerald-600"
                        />
                        <span>Ledger Account (Postable)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-800">
                        <input
                          type="radio"
                          name="accGroupType"
                          checked={newAccIsGroup}
                          onChange={() => setNewAccIsGroup(true)}
                          className="accent-purple-600"
                        />
                        <span>Group Account (Parent Folder)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Account Type</label>
                    <select
                      value={newAccType}
                      onChange={(e) => {
                        const selectedType = e.target.value as any
                        setNewAccType(selectedType)
                        setNewAccParent("")
                      }}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                    >
                      <option value="Asset">Asset</option>
                      <option value="Liability">Liability</option>
                      <option value="Equity">Equity</option>
                      <option value="Revenue">Revenue</option>
                      <option value="Expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Parent Group Account ({newAccType} Accounts)</label>
                    <select
                      value={newAccParent}
                      onChange={(e) => setNewAccParent(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                    >
                      <option value="">(Root {newAccType} Account - No Parent)</option>
                      {accounts
                        .filter((a) => a.account_type === newAccType)
                        .map((a) => (
                          <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                        ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setShowAddAccountModal(false)}
                      className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-700 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-full bg-black text-white font-bold hover:bg-zinc-800"
                    >
                      Create Node
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3: Edit Account */}
        <AnimatePresence>
          {showEditAccountModal && editingAccount && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                  <h3 className="text-base font-black text-zinc-900">Edit Chart of Accounts Node</h3>
                  <button onClick={() => setShowEditAccountModal(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateAccountSubmit} className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Account Code</label>
                    <input
                      type="text"
                      value={editAccCode}
                      onChange={(e) => setEditAccCode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Account Name</label>
                    <input
                      type="text"
                      value={editAccName}
                      onChange={(e) => setEditAccName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Account Classification Node Type</label>
                    <div className="flex items-center gap-4 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-800">
                        <input
                          type="radio"
                          name="editAccGroupType"
                          checked={!editAccIsGroup}
                          onChange={() => setEditAccIsGroup(false)}
                          className="accent-emerald-600"
                        />
                        <span>Ledger Account</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-800">
                        <input
                          type="radio"
                          name="editAccGroupType"
                          checked={editAccIsGroup}
                          onChange={() => setEditAccIsGroup(true)}
                          className="accent-purple-600"
                        />
                        <span>Group Account</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Account Type</label>
                    <select
                      value={editAccType}
                      onChange={(e) => setEditAccType(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                    >
                      <option value="Asset">Asset</option>
                      <option value="Liability">Liability</option>
                      <option value="Equity">Equity</option>
                      <option value="Revenue">Revenue</option>
                      <option value="Expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Parent Group Account</label>
                    <select
                      value={editAccParent}
                      onChange={(e) => setEditAccParent(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                    >
                      <option value="">(Root Account - No Parent)</option>
                      {accounts
                        .filter((a) => a.account_type === editAccType && a.id !== editingAccount.id && a.code !== editingAccount.code)
                        .map((a) => (
                          <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-800">
                      <input
                        type="checkbox"
                        checked={editAccIsActive}
                        onChange={(e) => setEditAccIsActive(e.target.checked)}
                        className="accent-emerald-600 rounded"
                      />
                      <span>Account Active (Allowed for postings)</span>
                    </label>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => handleDeleteAccountSubmit(editingAccount.id)}
                      className="px-4 py-2 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold"
                    >
                      Delete Account
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEditAccountModal(false)}
                        className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-700 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-full bg-black text-white font-bold hover:bg-zinc-800"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3.5: Add Accounting Period */}
        <AnimatePresence>
          {showAddPeriodModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                  <h3 className="text-base font-black text-zinc-900">Add Accounting Period</h3>
                  <button onClick={() => setShowAddPeriodModal(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleAddPeriodSubmit} className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Period Label (e.g. FY 2026 Q3)</label>
                    <input
                      type="text"
                      value={newPeriodLabel}
                      onChange={(e) => setNewPeriodLabel(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-bold"
                      placeholder="e.g. FY 2026 Q3"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Start Date</label>
                    <input
                      type="date"
                      value={newPeriodStart}
                      onChange={(e) => setNewPeriodStart(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={newPeriodEnd}
                      onChange={(e) => setNewPeriodEnd(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setShowAddPeriodModal(false)}
                      className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-700 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-full bg-black text-white font-bold hover:bg-zinc-800"
                    >
                      Create Period
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3.8: Period Closing Voucher */}
        <AnimatePresence>
          {showClosingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                  <h3 className="text-base font-black text-zinc-900">Period Closing Voucher</h3>
                  <button onClick={() => setShowClosingModal(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleClosePeriodVoucherSubmit} className="flex flex-col gap-3 text-xs">
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 leading-relaxed font-semibold mb-2">
                    This action will zero out all Revenue and Expense account balances for the selected period and roll the net balance into the Equity Retained Earnings account. The period will be locked.
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Accounting Period to Close</label>
                    <select
                      value={closingPeriodId}
                      onChange={(e) => setClosingPeriodId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                      required
                    >
                      <option value="">(Select Open Period)</option>
                      {periods
                        .filter((p) => !p.is_closed)
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.period_label} ({p.start_date} to {p.end_date})</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Retained Earnings Account (Equity)</label>
                    <select
                      value={closingRetainedEarningsCode}
                      onChange={(e) => setClosingRetainedEarningsCode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                      required
                    >
                      {accounts
                        .filter((a) => a.account_type === "Equity" && !a.is_group)
                        .map((a) => (
                          <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                        ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setShowClosingModal(false)}
                      className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-700 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-full bg-emerald-700 text-white font-bold hover:bg-emerald-800"
                    >
                      Post Closing Voucher & Lock
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 4: Forex Revaluation */}
        <AnimatePresence>
          {showRevalModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                  <h3 className="text-base font-black text-zinc-900">Initiate Forex Revaluation</h3>
                  <button onClick={() => setShowRevalModal(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateRevaluation} className="flex flex-col gap-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-zinc-700 mb-1 block">Revaluation Date</label>
                      <input
                        type="date"
                        value={revalDate}
                        onChange={(e) => setRevalDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-700 mb-1 block">Currency</label>
                      <select
                        value={revalCurrency}
                        onChange={(e) => setRevalCurrency(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-bold"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Target Account to Revalue</label>
                    <select
                      value={revalTargetAcc}
                      onChange={(e) => setRevalTargetAcc(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Foreign Currency Balance</label>
                    <input
                      type="number"
                      value={revalOrigBalance}
                      onChange={(e) => setRevalOrigBalance(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">New Period-End Market Rate (ETB/FX)</label>
                    <input
                      type="number"
                      value={revalNewRate}
                      onChange={(e) => setRevalNewRate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono font-bold"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setShowRevalModal(false)}
                      className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-700 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-full bg-black text-white font-bold hover:bg-zinc-800"
                    >
                      Create Draft
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
