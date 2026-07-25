import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Edit3, Eye, FileText, Plus, Printer, Send, Trash2, X } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore } from "@/lib/erpStore"
import { useFeedback } from "@/context/FeedbackContext"
import {
  cancelSalesIssue,
  createSalesIssue,
  deleteSalesIssue,
  getAvailableBatches,
  getSalesIssue,
  listSalesIssues,
  postSalesIssue,
  updateSalesIssue,
  type AvailableBatch,
  type PaymentType,
  type SalesIssue,
  type SalesIssueItem,
} from "@/lib/salesIssuesApi"

const sampleIssues: SalesIssue[] = [
  { id: "sample-409", fs_no: "FS00000409", reference_no: "CRSI0000153", sale_date: "2026-07-18", customer_id: "CUST-SILANTE", customer_name: "SILANTE", warehouse_id: "WH2", payment_type: "Credit", status: "Draft", total_quantity: 1000, total_amount: 239000, created_by: "Excel Import" },
  { id: "sample-411", fs_no: "FS00000411", reference_no: "CSI0000259", sale_date: "2026-07-18", customer_id: "CUST-AMANUEL", customer_name: "AMANUEL", warehouse_id: "WH2", payment_type: "Cash", status: "Draft", total_quantity: 600, total_amount: 546600, created_by: "Excel Import" },
]

function money(value: number) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function blankItem(): SalesIssueItem {
  return { item_id: "", item_name: "", batch_id: "", batch_no: "", available_quantity: 0, quantity: 1, unit_price: 0, amount: 0 }
}

export default function SalesIssued() {
  const erp = useErpStore()
  const { showToast, confirm } = useFeedback()
  const products = erp.getProducts()
  const customers = erp.getCustomers()
  const warehouses = erp.getWarehouses()

  const [rows, setRows] = useState<SalesIssue[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [sort, setSort] = useState("sale_date.desc")
  const [search, setSearch] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [customerFilter, setCustomerFilter] = useState("ALL")
  const [itemFilter, setItemFilter] = useState("ALL")
  const [batchFilter, setBatchFilter] = useState("ALL")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<SalesIssue | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SalesIssue | null>(null)
  const [batchOptions, setBatchOptions] = useState<Record<number, AvailableBatch[]>>({})

  const [fsNo, setFsNo] = useState("")
  const [referenceNo, setReferenceNo] = useState("")
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0])
  const [customerId, setCustomerId] = useState(customers[0]?.id || "")
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.code || warehouses[0]?.id || "WH1")
  const [paymentType, setPaymentType] = useState<PaymentType>("Cash")
  const [items, setItems] = useState<SalesIssueItem[]>([blankItem()])

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort })
      if (search) params.set("search", search)
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      if (customerFilter !== "ALL") params.set("customer_id", customerFilter)
      if (itemFilter !== "ALL") params.set("item_id", itemFilter)
      if (batchFilter !== "ALL") params.set("batch_no", batchFilter)
      const result = await listSalesIssues(params)
      setRows(result.rows)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sales issued records.")
      setRows(sampleIssues)
      setTotal(sampleIssues.length)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [page, pageSize, sort, search, from, to, customerFilter, itemFilter, batchFilter])

  const batchFilters = useMemo(() => Array.from(new Set(products.flatMap((product) => product.batches.map((batch) => batch.batchNo)))), [products])
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const grandTotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const openCreate = () => {
    setEditing(null)
    setFsNo("")
    setReferenceNo("")
    setSaleDate(new Date().toISOString().split("T")[0])
    setCustomerId(customers[0]?.id || "")
    setWarehouseId(warehouses[0]?.code || warehouses[0]?.id || "WH1")
    setPaymentType("Cash")
    setItems([blankItem()])
    setBatchOptions({})
    setFormOpen(true)
  }

  const openEdit = async (issue: SalesIssue) => {
    if (issue.status !== "Draft") {
      showToast("Posted record locked", "warning", "Posted sales issues cannot be edited directly.")
      return
    }
    try {
      const detail = await getSalesIssue(issue.id)
      const options = await Promise.all((detail.items || []).map((row) => row.item_id ? getAvailableBatches(row.item_id, detail.warehouse_id).catch(() => []) : Promise.resolve([])))
      setEditing(detail)
      setFsNo(detail.fs_no)
      setReferenceNo(detail.reference_no)
      setSaleDate(detail.sale_date)
      setCustomerId(detail.customer_id)
      setWarehouseId(detail.warehouse_id)
      setPaymentType(detail.payment_type)
      setItems(detail.items?.length ? detail.items : [blankItem()])
      setBatchOptions(Object.fromEntries(options.map((batches, index) => [index, batches])))
      setFormOpen(true)
    } catch (err) {
      showToast("Load failed", "warning", err instanceof Error ? err.message : "Could not load sales issue details.")
    }
  }

  const updateItem = async (index: number, patch: Partial<SalesIssueItem>) => {
    const next = items.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      const merged = { ...item, ...patch }
      merged.amount = Number(merged.quantity || 0) * Number(merged.unit_price || 0)
      return merged
    })
    setItems(next)

    if (patch.item_id || patch.batch_no) {
      const itemId = patch.item_id || next[index].item_id
      if (itemId && warehouseId) {
        try {
          const batches = await getAvailableBatches(itemId, warehouseId)
          setBatchOptions((current) => ({ ...current, [index]: batches }))
        } catch {
          setBatchOptions((current) => ({ ...current, [index]: [] }))
        }
      }
    }
  }

  const saveDraft = async () => {
    if (!fsNo || !referenceNo || !saleDate || !customerId || !warehouseId) {
      showToast("Missing details", "warning", "FS No, reference, date, customer, and warehouse are required.")
      return
    }
    const invalidItem = items.find((item) => !item.item_id || !item.batch_no || Number(item.quantity) <= 0 || Number(item.unit_price) < 0 || (Number(item.available_quantity || 0) > 0 && Number(item.quantity) > Number(item.available_quantity)))
    if (invalidItem) {
      showToast("Check item rows", "warning", "Each row needs an item, batch, valid quantity, and non-negative unit price.")
      return
    }
    const customer = customers.find((entry) => entry.id === customerId)
    const payload = {
      id: editing?.id,
      fs_no: fsNo,
      reference_no: referenceNo,
      sale_date: saleDate,
      customer_id: customerId,
      customer_name: customer?.name || customerId,
      warehouse_id: warehouseId,
      payment_type: paymentType,
      items: items.map((item, index) => ({ ...item, id: item.id || `${editing?.id || fsNo}-ITEM-${index + 1}` })),
    }
    try {
      if (editing) await updateSalesIssue(editing.id, payload)
      else await createSalesIssue(payload)
      showToast("Sales issue saved", "success", `${fsNo} saved as draft.`)
      setFormOpen(false)
      await load()
    } catch (err) {
      showToast("Save failed", "warning", err instanceof Error ? err.message : "Could not save sales issue.")
    }
  }

  useEffect(() => {
    if (!formOpen) return
    let cancelled = false
    const refresh = async () => {
      const options = await Promise.all(items.map((item) => item.item_id ? getAvailableBatches(item.item_id, warehouseId).catch(() => []) : Promise.resolve([])))
      if (!cancelled) setBatchOptions(Object.fromEntries(options.map((batches, index) => [index, batches])))
    }
    void refresh()
    return () => { cancelled = true }
  }, [warehouseId, formOpen])

  const doPost = (issue: SalesIssue) => {
    confirm({
      title: "Post Sales Issue?",
      message: "Posting reduces batch stock and creates balanced journal entries. This can happen only once.",
      confirmLabel: "Post",
      onConfirm: async () => {
        try {
          await postSalesIssue(issue.id)
          showToast("Sales issue posted", "success", `${issue.fs_no} posted and stock reduced.`)
          await load()
        } catch (err) {
          showToast("Posting failed", "warning", err instanceof Error ? err.message : "Could not post sales issue.")
        }
      },
    })
  }

  const doDelete = (issue: SalesIssue) => {
    confirm({
      title: "Delete Draft?",
      message: `Delete ${issue.fs_no}? Only draft records can be deleted.`,
      isDestructive: true,
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteSalesIssue(issue.id)
        showToast("Draft deleted", "success", `${issue.fs_no} removed.`)
        await load()
      },
    })
  }

  const doCancel = (issue: SalesIssue) => {
    confirm({
      title: "Cancel Sales Issue?",
      message: `Cancel ${issue.fs_no}? Cancelled records must not reduce stock.`,
      isDestructive: true,
      confirmLabel: "Cancel Issue",
      onConfirm: async () => {
        try {
          await cancelSalesIssue(issue.id)
          showToast("Sales issue cancelled", "success", `${issue.fs_no} cancelled.`)
          await load()
        } catch (err) {
          showToast("Cancel failed", "warning", err instanceof Error ? err.message : "Could not cancel sales issue.")
        }
      },
    })
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />
      <main className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Sales Issued</h1>
            <p className="text-xs font-semibold text-zinc-500 mt-1">Record and manage issued sales transactions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubPageNav items={getSectionChildren("/sales")} />
            <button onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-700 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-900/10 hover:bg-emerald-800">
              <Plus className="size-4" /> Add Sales Issue
            </button>
          </div>
        </div>

        <GlassCard className="p-0 overflow-hidden border border-white/65 shadow-md">
          <div className="px-6 pt-6">
            <FinanceTableToolbar
              title="Issued Sales Register"
              subtitle={`${total} records from the sales issue register`}
              searchValue={search}
              onSearchChange={(value) => { setSearch(value); setPage(1) }}
              searchPlaceholder="Search FS, reference, item, customer, batch..."
              filters={[
                { value: customerFilter, onChange: setCustomerFilter, ariaLabel: "Customer", options: [{ value: "ALL", label: "All Customers" }, ...customers.map((c) => ({ value: c.id, label: c.name }))] },
                { value: itemFilter, onChange: setItemFilter, ariaLabel: "Item", options: [{ value: "ALL", label: "All Items" }, ...products.map((p) => ({ value: p.id, label: p.name.slice(0, 24) }))] },
                { value: batchFilter, onChange: setBatchFilter, ariaLabel: "Batch", options: [{ value: "ALL", label: "All Batches" }, ...batchFilters.map((b) => ({ value: b, label: b }))] },
              ]}
            >
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-[38px] rounded-xl border border-transparent bg-black/[0.03] px-3 text-xs font-bold text-zinc-700 outline-none" />
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-[38px] rounded-xl border border-transparent bg-black/[0.03] px-3 text-xs font-bold text-zinc-700 outline-none" />
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-[38px] rounded-xl bg-black/[0.03] px-3 text-xs font-bold text-zinc-700 outline-none">
                <option value="sale_date.desc">Newest first</option>
                <option value="sale_date.asc">Oldest first</option>
                <option value="fs_no.asc">FS No A-Z</option>
                <option value="total_amount.desc">Amount high-low</option>
              </select>
            </FinanceTableToolbar>
          </div>

          {error && <div className="mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="bg-black/[0.02] border-y border-zinc-200/40 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  {["FS No", "Reference", "Date", "Item", "Customer", "Batch No", "Quantity", "Unit Price", "Amount", "Actions"].map((col) => <th key={col} className="px-4 py-3">{col}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr><td colSpan={10} className="py-16 text-center text-xs font-bold text-zinc-400">Loading sales issued records...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={10} className="py-16 text-center text-xs font-bold text-zinc-400">No sales issued records match your filters.</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/50">
                    <td className="px-4 py-4 font-mono text-xs font-black text-zinc-950">{row.fs_no}</td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-zinc-700">{row.reference_no}</td>
                    <td className="px-4 py-4 text-xs font-bold text-zinc-700">{row.sale_date}</td>
                    <td className="px-4 py-4 text-xs font-black text-zinc-900">{row.items?.[0]?.item_name || "Multiple items"}</td>
                    <td className="px-4 py-4 text-xs font-bold text-zinc-700">{row.customer_name}</td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-zinc-700">{row.items?.[0]?.batch_no || "-"}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs font-black">{Number(row.total_quantity).toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs font-bold">{money(row.items?.[0]?.unit_price || 0)}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs font-black">{money(row.total_amount)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(row)} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50" title="View"><Eye className="size-3.5" /></button>
                        <button disabled={row.status !== "Draft"} onClick={() => void openEdit(row)} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-35" title="Edit"><Edit3 className="size-3.5" /></button>
                        <button onClick={() => window.print()} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50" title="Print"><Printer className="size-3.5" /></button>
                        {row.status === "Draft" && <button onClick={() => doPost(row)} className="rounded-lg border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-50" title="Post"><Send className="size-3.5" /></button>}
                        {row.status === "Draft" && <button onClick={() => doDelete(row)} className="rounded-lg border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50" title="Delete"><Trash2 className="size-3.5" /></button>}
                        {row.status === "Draft" && <button onClick={() => doCancel(row)} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50" title="Cancel"><X className="size-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
            <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Previous</button>
            <span className="text-xs font-bold text-zinc-500">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
            <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Next</button>
          </div>
        </GlassCard>
      </main>

      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-black/35 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFormOpen(false)} />
            <motion.div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <div className="mb-5 flex items-start justify-between">
                <div><h2 className="text-xl font-black">{editing ? "Edit Sales Issue" : "Add Sales Issue"}</h2><p className="text-xs font-semibold text-zinc-500">Amount is calculated automatically per row.</p></div>
                <button onClick={() => setFormOpen(false)} className="rounded-xl border border-zinc-200 p-2"><X className="size-4" /></button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <input value={fsNo} onChange={(e) => setFsNo(e.target.value)} placeholder="FS No" className="h-11 rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Reference" className="h-11 rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-11 rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-11 rounded-xl border border-zinc-200 px-3 text-sm font-semibold">{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-11 rounded-xl border border-zinc-200 px-3 text-sm font-semibold">{warehouses.map((w) => <option key={w.id} value={w.code || w.id}>{w.name || w.code}</option>)}</select>
                <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)} className="h-11 rounded-xl border border-zinc-200 px-3 text-sm font-semibold"><option>Cash</option><option>Credit</option></select>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wide text-zinc-500">Item Rows</h3>
                  <button onClick={() => setItems((current) => [...current, blankItem()])} className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-xs font-black"><Plus className="size-4" /> Add Item Row</button>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-500">Row {index + 1}</span>
                      <button disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-rose-200 bg-white p-2 text-rose-700 disabled:cursor-not-allowed disabled:opacity-35" title="Remove row"><Trash2 className="size-3.5" /></button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-12">
                      <label className="md:col-span-4">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Item</span>
                        <select value={item.item_id} onChange={(e) => { const product = products.find((p) => p.id === e.target.value); void updateItem(index, { item_id: e.target.value, item_name: product?.name || "", unit_price: product?.sellingPrice || 0, batch_id: "", batch_no: "", available_quantity: 0 }) }} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold">
                          <option value="">Select item</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </label>
                      <label className="md:col-span-3">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Batch No</span>
                        <select value={item.batch_no} onChange={(e) => { const batch = (batchOptions[index] || []).find((b) => b.batch_no === e.target.value); void updateItem(index, { batch_no: e.target.value, batch_id: e.target.value, available_quantity: batch?.available_quantity || 0, unit_price: batch?.unit_price ?? item.unit_price }) }} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold">
                          <option value="">Select batch</option>{(batchOptions[index] || []).map((b) => <option key={b.batch_no} value={b.batch_no}>{b.batch_no} | {Number(b.available_quantity).toLocaleString()}</option>)}
                        </select>
                      </label>
                      <label className="md:col-span-2">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Available</span>
                        <input readOnly value={Number(item.available_quantity || 0).toLocaleString()} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-right font-mono text-xs font-black text-zinc-700" />
                      </label>
                      <label className="md:col-span-1">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Qty</span>
                        <input type="number" min="1" max={item.available_quantity || undefined} value={item.quantity} onChange={(e) => void updateItem(index, { quantity: Number(e.target.value) })} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold" />
                      </label>
                      <label className="md:col-span-1">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Price</span>
                        <input type="number" min="0" value={item.unit_price} onChange={(e) => void updateItem(index, { unit_price: Number(e.target.value) })} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold" />
                      </label>
                      <label className="md:col-span-1">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Amount</span>
                        <input readOnly value={money(item.amount)} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-right font-mono text-xs font-black text-zinc-950" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-bold text-zinc-500">Drafts can be edited until posting. Posting is handled on the server in one transaction.</div>
                <div className="flex gap-4 text-sm font-black"><span>Total Quantity: {totalQuantity.toLocaleString()}</span><span>Grand Total: {money(grandTotal)}</span></div>
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button onClick={() => setFormOpen(false)} className="h-10 rounded-xl border border-zinc-200 px-4 text-xs font-black">Cancel</button>
                <button onClick={() => void saveDraft()} className="h-10 rounded-xl bg-emerald-700 px-5 text-xs font-black text-white">Save Draft</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selected && (
        <div className="fixed bottom-6 right-6 z-[90] w-96 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between"><h3 className="font-black">{selected.fs_no}</h3><button onClick={() => setSelected(null)}><X className="size-4" /></button></div>
          <p className="mt-2 text-xs font-bold text-zinc-500">{selected.reference_no} · {selected.customer_name}</p>
          <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm font-black">Total: ETB {money(selected.total_amount)}</div>
          <button onClick={() => window.print()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-xs font-black text-white"><FileText className="size-4" /> Print Sales Issue</button>
        </div>
      )}
    </div>
  )
}
