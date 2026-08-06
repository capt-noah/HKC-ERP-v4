import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Edit,
  Trash2,
  Receipt,
  PieChart,
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import { useFinanceStore } from "@/lib/financeStore"
import type { TaxRule } from "@/lib/financeStore"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

const TAX_TYPES: TaxRule["type"][] = ["VAT/GST", "Withholding Tax (TDS)", "Import Duty"]

const typeColorMap: Record<string, string> = {
  "VAT/GST": "bg-blue-100 text-blue-700",
  "Withholding Tax (TDS)": "bg-amber-100 text-amber-700",
  "Import Duty": "bg-purple-100 text-purple-700",
}

import { Skeleton } from "@/components/ui/skeleton"

export default function Taxes() {
  const { showToast } = useFeedback()
  const store = useFinanceStore()
  const isLoading = store.isLoading()
  const taxRules = store.getTaxRules()
  const accounts = store.getAccounts()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("ALL")

  const filteredTaxRules = taxRules.filter((rule) => {
    if (filterType !== "ALL" && rule.type !== filterType) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      rule.name.toLowerCase().includes(q) ||
      rule.id.toLowerCase().includes(q) ||
      rule.accountCode.toLowerCase().includes(q) ||
      (rule.description?.toLowerCase().includes(q) ?? false)
    )
  })

  // Add Tax Rule state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState("")
  const [addRate, setAddRate] = useState("")
  const [addType, setAddType] = useState<TaxRule["type"]>("VAT/GST")
  const [addAccount, setAddAccount] = useState("2200")
  const [addInclusive, setAddInclusive] = useState(false)
  const [addDescription, setAddDescription] = useState("")

  // Edit Tax Rule state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null)
  const [editName, setEditName] = useState("")
  const [editRate, setEditRate] = useState("")
  const [editType, setEditType] = useState<TaxRule["type"]>("VAT/GST")
  const [editAccount, setEditAccount] = useState("")
  const [editInclusive, setEditInclusive] = useState(false)
  const [editDescription, setEditDescription] = useState("")

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const rate = parseFloat(addRate)
    if (!addName || isNaN(rate)) return
    store.addTaxRule({
      name: addName,
      ratePercent: rate,
      type: addType,
      accountCode: addAccount,
      isInclusive: addInclusive,
      description: addDescription,
    })
    setShowAddModal(false)
    setAddName("")
    setAddRate("")
    setAddDescription("")
    showToast("Tax Rule Created", "success", `Tax template '${addName}' at ${rate}% has been added.`)
  }

  const handleEditOpen = (rule: TaxRule) => {
    setEditingRule(rule)
    setEditName(rule.name)
    setEditRate(String(rule.ratePercent))
    setEditType(rule.type)
    setEditAccount(rule.accountCode)
    setEditInclusive(rule.isInclusive)
    setEditDescription(rule.description || "")
    setShowEditModal(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRule) return
    const rate = parseFloat(editRate)
    if (!editName || isNaN(rate)) return
    store.updateTaxRule(editingRule.id, {
      name: editName,
      ratePercent: rate,
      type: editType,
      accountCode: editAccount,
      isInclusive: editInclusive,
      description: editDescription,
    })
    setShowEditModal(false)
    setEditingRule(null)
    showToast("Tax Rule Updated", "success", `Template '${editName}' updated successfully.`)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete tax rule '${name}'?`)) {
      store.deleteTaxRule(id)
      showToast("Tax Rule Deleted", "info", `Tax template '${name}' removed.`)
    }
  }

  const vatRules = taxRules.filter((r) => r.type === "VAT/GST")
  const whtRules = taxRules.filter((r) => r.type === "Withholding Tax (TDS)")
  const importRules = taxRules.filter((r) => r.type === "Import Duty")

  const columns: TableColumn[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Template Name" },
    { key: "type", label: "Type" },
    { key: "ratePercent", label: "Rate %", align: "center" },
    { key: "accountCode", label: "GL Account" },
    { key: "isInclusive", label: "Inclusive", align: "center" },
    { key: "description", label: "Description" },
    { key: "_actions", label: "Actions", align: "right", noSort: true },
  ]

  const {
    colWidths,
    sortKey,
    sortDir,
    openMenuCol,
    handleResizeStart,
    toggleMenu,
    setSortAsc,
    setSortDesc,
    clearSort,
    sorted,
  } = useResizableTable(columns, filteredTaxRules)

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />
      {store.getLoadError() && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-800 shadow-lg flex items-center gap-3">
            <span className="size-2 rounded-full bg-rose-500 shrink-0" />
            Server unavailable — tax rules cannot be loaded. {store.getLoadError()}
          </div>
        </div>
      )}

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Tax Templates & Rates</h1>
            <p className="text-sm text-gray-400 mt-1">Configure VAT, withholding, and duty templates.</p>
          </div>
          <div className="flex items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/finance")} />
          </div>
        </motion.div>

        {/* KPI Banner */}
        <motion.div variants={fade} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <GlassCard className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
              <Receipt className="size-5 text-blue-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">VAT / GST Rules</span>
              <p className="text-xl font-black text-black font-mono">{vatRules.length}</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
              <PieChart className="size-5 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Withholding Tax Rules</span>
              <p className="text-xl font-black text-black font-mono">{whtRules.length}</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
              <Receipt className="size-5 text-purple-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Import Duty Rules</span>
              <p className="text-xl font-black text-black font-mono">{importRules.length}</p>
            </div>
          </GlassCard>
        </motion.div>

        {/* Tax Rules Table */}
        <motion.div variants={fade}>
          <GlassCard className="flex flex-col">
            <FinanceTableToolbar
              title="All Tax Templates"
              subtitle={`${taxRules.length} templates configured for invoice automation.`}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search name, ID, account..."
              filters={[
                {
                  value: filterType,
                  onChange: setFilterType,
                  ariaLabel: "Tax type filter",
                  options: [
                    { value: "ALL", label: "All Types" },
                    { value: "VAT/GST", label: "VAT / GST" },
                    { value: "Withholding Tax (TDS)", label: "Withholding Tax" },
                    { value: "Import Duty", label: "Import Duty" },
                  ],
                },
              ]}
              actions={[{ label: "Add Tax Rule", onClick: () => setShowAddModal(true) }]}
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-[10px] font-black text-zinc-400 uppercase tracking-wider select-none">
                    {columns.map((col) => (
                      <ResizableTh
                        key={col.key}
                        col={col}
                        width={colWidths[col.key] ?? 140}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        openMenuCol={openMenuCol}
                        onResizeStart={handleResizeStart}
                        onToggleMenu={toggleMenu}
                        onSortAsc={setSortAsc}
                        onSortDesc={setSortDesc}
                        onClearSort={clearSort}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse text-xs">
                        <td className="py-3.5 pl-2"><Skeleton className="h-4 w-16 bg-zinc-200/80" /></td>
                        <td className="py-3.5"><Skeleton className="h-4 w-32 bg-zinc-200/80" /></td>
                        <td className="py-3.5"><Skeleton className="h-4 w-24 bg-zinc-200/80" /></td>
                        <td className="py-3.5 text-right"><Skeleton className="h-4 w-16 bg-zinc-200/80 ml-auto" /></td>
                        <td className="py-3.5 font-mono"><Skeleton className="h-4 w-20 bg-zinc-200/80" /></td>
                        <td className="py-3.5 text-center"><Skeleton className="h-4 w-16 bg-zinc-200/80 mx-auto" /></td>
                        <td className="py-3.5"><Skeleton className="h-4 w-36 bg-zinc-200/80" /></td>
                        <td className="py-3.5 text-right pr-2"><Skeleton className="h-4 w-12 bg-zinc-200/80 ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredTaxRules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        No tax rules configured. Click &quot;Add Tax Rule&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    sorted().map((rule) => (
                      <tr key={rule.id} className="hover:bg-black/[0.01]">
                        <td className="py-3.5 pl-2 font-mono text-xs font-bold text-gray-500">{rule.id}</td>
                        <td className="py-3.5 font-bold text-black">{rule.name}</td>
                        <td className="py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColorMap[rule.type] || "bg-zinc-100 text-zinc-600"}`}>
                            {rule.type}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="font-mono font-black text-black text-sm">{rule.ratePercent}%</span>
                        </td>
                        <td className="py-3.5 font-mono text-zinc-600">{rule.accountCode}</td>
                        <td className="py-3.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rule.isInclusive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
                            {rule.isInclusive ? "Inclusive" : "Exclusive"}
                          </span>
                        </td>
                        <td className="py-3.5 text-zinc-500 max-w-[200px] truncate">{rule.description || "—"}</td>
                        <td className="py-3.5 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditOpen(rule)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              title="Edit Tax Rule"
                            >
                              <Edit className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id, rule.name)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Delete Tax Rule"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* MODAL: Add Tax Rule */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <h3 className="text-base font-black text-zinc-900">Add Tax Template</h3>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600"><X className="size-5" /></button>
              </div>
              <form onSubmit={handleAddSubmit} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="font-bold text-zinc-700 mb-1 block">Template Name</label>
                  <input type="text" value={addName} onChange={(e) => setAddName(e.target.value)} required
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold"
                    placeholder="e.g. Standard VAT 15%" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Tax Type</label>
                    <select value={addType} onChange={(e) => setAddType(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold">
                      {TAX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Rate (%)</label>
                    <input type="number" value={addRate} onChange={(e) => setAddRate(e.target.value)} required
                      step="0.01" min="0" max="100"
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono font-bold"
                      placeholder="15" />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 mb-1 block">GL Account (Tax Payable / Receivable)</label>
                  <select value={addAccount} onChange={(e) => setAddAccount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold">
                    {accounts.filter((a) => !a.is_group).map((a) => (
                      <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-800">
                    <input type="checkbox" checked={addInclusive} onChange={(e) => setAddInclusive(e.target.checked)}
                      className="accent-emerald-600 rounded" />
                    <span>Tax is Inclusive in Price (price already includes tax)</span>
                  </label>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 mb-1 block">Description (optional)</label>
                  <textarea value={addDescription} onChange={(e) => setAddDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold resize-none"
                    rows={2} placeholder="e.g. Applied to all domestic sales to VAT-registered customers" />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-700 font-bold">Cancel</button>
                  <button type="submit"
                    className="px-4 py-2 rounded-full bg-black text-white font-bold hover:bg-zinc-800">Create Template</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Edit Tax Rule */}
      <AnimatePresence>
        {showEditModal && editingRule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <h3 className="text-base font-black text-zinc-900">Edit Tax Template: {editingRule.id}</h3>
                <button onClick={() => setShowEditModal(false)} className="text-zinc-400 hover:text-zinc-600"><X className="size-5" /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="font-bold text-zinc-700 mb-1 block">Template Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Tax Type</label>
                    <select value={editType} onChange={(e) => setEditType(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold">
                      {TAX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 mb-1 block">Rate (%)</label>
                    <input type="number" value={editRate} onChange={(e) => setEditRate(e.target.value)} required
                      step="0.01" min="0" max="100"
                      className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono font-bold" />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 mb-1 block">GL Account</label>
                  <select value={editAccount} onChange={(e) => setEditAccount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold">
                    {accounts.filter((a) => !a.is_group).map((a) => (
                      <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-800">
                    <input type="checkbox" checked={editInclusive} onChange={(e) => setEditInclusive(e.target.checked)}
                      className="accent-emerald-600 rounded" />
                    <span>Tax is Inclusive in Price</span>
                  </label>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 mb-1 block">Description</label>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold resize-none"
                    rows={2} />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                  <button type="button"
                    onClick={() => { handleDelete(editingRule.id, editingRule.name); setShowEditModal(false) }}
                    className="px-4 py-2 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold">
                    Delete Rule
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-700 font-bold">Cancel</button>
                    <button type="submit"
                      className="px-4 py-2 rounded-full bg-black text-white font-bold hover:bg-zinc-800">Save Changes</button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
