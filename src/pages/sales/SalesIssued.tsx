import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Edit3, Eye, FileText, Plus, Printer, Send, Trash2, X, Check, Download, AlertTriangle, Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore } from "@/lib/erpStore"
import { financeStore } from "@/lib/financeStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { useFeedback } from "@/context/FeedbackContext"
import { Skeleton } from "@/components/ui/skeleton"

export interface ShipmentDocAttachment {
  id: string
  record_id: string
  record_type: 'purchase_order' | 'sales_order' | 'processing_service'
  document_type: string
  file_name: string
  file_size: number
  file_url: string
  uploaded_at: string
  uploaded_by: string
}

const API_BASE = import.meta.env.VITE_API_URL ?? ""

async function fetchShipmentDocs(recordId: string, recordType: string): Promise<ShipmentDocAttachment[]> {
  try {
    const url = new URL(`${API_BASE}/api/shipment-documents`, window.location.origin)
    url.searchParams.set('record_id', recordId)
    url.searchParams.set('record_type', recordType)
    const res = await fetch(url.toString())
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data
    }
  } catch (err) {
    console.warn('fetchShipmentDocs error:', err)
  }
  return []
}
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

const salesIssueColumns: TableColumn[] = [
  { key: "fs_no", label: "FS No", align: "left" },
  { key: "reference_no", label: "Reference", align: "left" },
  { key: "sale_date", label: "Date", align: "left" },
  { key: "item", label: "Item", align: "left" },
  { key: "customer_name", label: "Customer", align: "left" },
  { key: "batch_no", label: "Batch No", align: "left" },
  { key: "total_quantity", label: "Quantity", align: "right" },
  { key: "unit_price", label: "Unit Price", align: "right" },
  { key: "total_amount", label: "Amount", align: "right" },
  { key: "_actions", label: "Actions", align: "center", noSort: true },
]

function money(value: number) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function blankItem(): SalesIssueItem {
  return { item_id: "", item_name: "", batch_id: "", batch_no: "", packaging_unit: "", available_quantity: 0, quantity: 0, unit_price: 0, amount: 0 }
}



function SalesIssuedSkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <tr key={index}>
          <td className="px-4 py-4"><Skeleton className="h-3 w-24 bg-zinc-200/80" /></td>
          <td className="px-4 py-4"><Skeleton className="h-3 w-24 bg-zinc-200/80" /></td>
          <td className="px-4 py-4"><Skeleton className="h-3 w-20 bg-zinc-200/80" /></td>
          <td className="px-4 py-4"><Skeleton className="h-3 w-40 bg-zinc-200/80" /></td>
          <td className="px-4 py-4"><Skeleton className="h-3 w-32 bg-zinc-200/80" /></td>
          <td className="px-4 py-4"><Skeleton className="h-3 w-24 bg-zinc-200/80" /></td>
          <td className="px-4 py-4"><Skeleton className="ml-auto h-3 w-16 bg-zinc-200/80" /></td>
          <td className="px-4 py-4"><Skeleton className="ml-auto h-3 w-20 bg-zinc-200/80" /></td>
          <td className="px-4 py-4"><Skeleton className="ml-auto h-3 w-24 bg-zinc-200/80" /></td>
          <td className="px-4 py-4"><div className="flex items-center gap-1"><Skeleton className="size-7 rounded-lg bg-zinc-200/80" /><Skeleton className="size-7 rounded-lg bg-zinc-200/80" /><Skeleton className="size-7 rounded-lg bg-zinc-200/80" /></div></td>
        </tr>
      ))}
    </>
  )
}

export default function SalesIssued() {
  const navigate = useNavigate()
  const erp = useErpStore()
  const { showToast, confirm } = useFeedback()
  const products = erp.getProducts()
  const warehouses = withOperatingWarehouses(erp.getWarehouses())

  const [rows, setRows] = useState<SalesIssue[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState("")
  const [batchFilter, setBatchFilter] = useState("ALL")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<SalesIssue | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SalesIssue | null>(null)
  const [batchOptions, setBatchOptions] = useState<Record<number, AvailableBatch[]>>({})
  const [selectedSoIds, setSelectedSoIds] = useState<string[]>([])

  const [soAttachmentsMap, setSoAttachmentsMap] = useState<Record<string, ShipmentDocAttachment[]>>({})
  const [fsNo, setFsNo] = useState("")
  const [referenceNo, setReferenceNo] = useState("")
  const [saleDate, setSaleDate] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [paymentType, setPaymentType] = useState<PaymentType>("Cash")
  const [items, setItems] = useState<SalesIssueItem[]>([blankItem()])

  const salesOrders = erp.getSalesOrders()

  useEffect(() => {
    if (salesOrders.length > 0) {
      salesOrders.forEach((so) => {
        fetchShipmentDocs(so.id, "sales_order").then((docs) => {
          setSoAttachmentsMap((prev) => ({ ...prev, [so.id]: docs }))
        })
      })
    }
  }, [salesOrders.length])

  const pendingSalesOrders = useMemo(() => {
    return salesOrders.filter((so) => {
      if (so.deliveryStatus === "Fully Delivered") return false
      // Also filter out if reference_no or sales issue rows match so.id
      const alreadyIssued = rows.some((row) => (row.reference_no || "").includes(so.id))
      return !alreadyIssued
    })
  }, [salesOrders, rows])

  const canonicalWarehouseId = (value: string) => {
    const warehouse = warehouses.find((entry) => entry.id === value || entry.code === value || entry.name === value)
    return warehouse?.id || value
  }

  const handleTogglePullSalesOrder = (so: any) => {
    let nextSelected = [...selectedSoIds]
    if (nextSelected.includes(so.id)) {
      nextSelected = nextSelected.filter((id) => id !== so.id)
    } else {
      nextSelected.push(so.id)
    }
    setSelectedSoIds(nextSelected)

    const activeOrders = pendingSalesOrders.filter((s) => nextSelected.includes(s.id))
    if (activeOrders.length === 0) {
      setCustomerName("")
      setWarehouseId("")
      setReferenceNo("")
      setItems([blankItem()])
      return
    }

    const firstSo = activeOrders[0]
    setCustomerName(firstSo.customer)
    const matchedWh = warehouses.find((w) => w.code === firstSo.warehouse || w.id === firstSo.warehouse || w.name === firstSo.warehouse)
    const targetWhId = matchedWh ? matchedWh.id : canonicalWarehouseId(firstSo.warehouse)
    setWarehouseId(targetWhId)
    setReferenceNo("")
    if (!saleDate) setSaleDate(new Date().toISOString().split("T")[0])

    const pulledItems: SalesIssueItem[] = []
    activeOrders.forEach((order) => {
      order.items.forEach((line) => {
        const prod = products.find((p) => p.id === line.productId || p.name === line.name)
        const batchNo = prod?.batch || "BATCH-MAIN"
        pulledItems.push({
          item_id: prod?.id || line.productId,
          item_name: line.name || prod?.name || "Product",
          batch_id: batchNo,
          batch_no: batchNo,
          packaging_unit: line.unit || prod?.unit || "Box",
          available_quantity: prod?.quantity || 1000,
          quantity: line.qty,
          unit_price: line.unitPrice,
          amount: line.total || line.qty * line.unitPrice,
        })
      })
    })

    setItems(pulledItems.length > 0 ? pulledItems : [blankItem()])
  }

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort: "sale_date.desc" })
      if (search) params.set("search", search)
      if (batchFilter !== "ALL") params.set("batch_no", batchFilter)
      const result = await listSalesIssues(params)
      const safeRows = Array.isArray(result?.rows) ? result.rows : Array.isArray(result) ? result : []
      const safeTotal = typeof result?.total === "number" ? result.total : safeRows.length
      setRows(safeRows)
      setTotal(safeTotal)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sales issued records.")
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [page, pageSize, search, batchFilter])

  const batchFilters = useMemo(() => Array.from(new Set(products.flatMap((product) => product.batches.map((batch) => batch.batchNo)))), [products])
  const selectableProducts = useMemo(() => {
    if (!warehouseId) return []
    const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === warehouseId || warehouse.code === warehouseId)
    const warehouseKeys = new Set([warehouseId, selectedWarehouse?.id, selectedWarehouse?.code].filter(Boolean))
    return products.filter((product) => {
      return product.stockBreakdown.some((entry) => warehouseKeys.has(entry.warehouse) && Number(entry.qty || 0) > 0)
    })
  }, [products, warehouseId, warehouses])
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const grandTotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const openCreate = (preselectedSo?: any) => {
    setEditing(null)
    setFsNo("")

    const isRealSo = Boolean(preselectedSo && typeof preselectedSo === "object" && Array.isArray(preselectedSo.items))
    setReferenceNo("")
    setSaleDate(new Date().toISOString().split("T")[0])
    setCustomerName(isRealSo ? preselectedSo.customer : "")
    
    if (isRealSo) {
      const matchedWh = warehouses.find((w) => w.code === preselectedSo.warehouse || w.id === preselectedSo.warehouse || w.name === preselectedSo.warehouse)
      setWarehouseId(matchedWh ? matchedWh.id : canonicalWarehouseId(preselectedSo.warehouse))
      setSelectedSoIds([preselectedSo.id])
      const pulledItems: SalesIssueItem[] = (preselectedSo.items || []).map((line: any) => {
        const prod = products.find((p) => p.id === line.productId || p.name === line.name)
        const batchNo = prod?.batch || "BATCH-MAIN"
        return {
          item_id: prod?.id || line.productId,
          item_name: line.name || prod?.name || "Product",
          batch_id: batchNo,
          batch_no: batchNo,
          packaging_unit: line.unit || prod?.unit || "Box",
          available_quantity: prod?.quantity || 1000,
          quantity: line.qty,
          unit_price: line.unitPrice,
          amount: line.total || line.qty * line.unitPrice,
        }
      })
      setItems(pulledItems.length > 0 ? pulledItems : [blankItem()])
    } else {
      setWarehouseId("")
      setSelectedSoIds([])
      setItems([blankItem()])
    }

    setPaymentType("Cash")
    setBatchOptions({})
    setFormOpen(true)
  }

  // Handle URL pre-selected Sales Order query parameter ?soId=SO-xxxx
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlSoId = urlParams.get("soId")
    if (urlSoId) {
      const targetSo = salesOrders.find((s) => s.id === urlSoId)
      if (targetSo) {
        openCreate(targetSo)
      }
    }
  }, [salesOrders])

  const openEdit = async (issue: SalesIssue) => {
    const statusLower = (issue.status || "").toLowerCase()
    if (statusLower === "posted") {
      showToast("Posted record locked", "warning", "Posted sales issues cannot be edited directly.")
      return
    }
    try {
      let detail = issue
      try {
        const fetchRes = await getSalesIssue(issue.id)
        if (fetchRes && typeof fetchRes === "object" && fetchRes.id) {
          detail = fetchRes
        }
      } catch {
        detail = issue
      }

      const targetWh = detail.warehouse_id || (detail as any).warehouse || issue.warehouse_id || (issue as any).warehouse || ""
      const normalizedWarehouseId = canonicalWarehouseId(targetWh)

      setEditing(detail)
      setFsNo(detail.fs_no || (detail as any).fsNo || issue.fs_no || "")
      setReferenceNo(detail.reference_no || (detail as any).referenceNo || issue.reference_no || "")
      setSaleDate(detail.sale_date || (detail as any).issueDate || issue.sale_date || new Date().toISOString().split("T")[0])
      setCustomerName(detail.customer_name || (detail as any).customer || detail.customer_id || issue.customer_name || "")
      setWarehouseId(normalizedWarehouseId)
      setPaymentType(((detail.payment_type || (detail as any).paymentType || issue.payment_type || "Cash") === "Credit" ? "Credit" : "Cash") as PaymentType)

      const rawItems = (detail.items && detail.items.length > 0) ? detail.items : (issue.items && issue.items.length > 0) ? issue.items : [blankItem()]
      const populatedItems = rawItems.map((item) => {
        const product = products.find((entry) => entry.id === item.item_id || entry.name === item.item_name)
        return {
          ...item,
          item_id: item.item_id || product?.id || "",
          item_name: item.item_name || product?.name || "",
          batch_no: item.batch_no || product?.batch || "BATCH-MAIN",
          batch_id: item.batch_id || item.batch_no || product?.batch || "BATCH-MAIN",
          packaging_unit: item.packaging_unit || product?.unit || "Box",
          quantity: Number(item.quantity || (item as any).qty || 1),
          unit_price: Number(item.unit_price ?? (item as any).price ?? product?.sellingPrice ?? 0),
          amount: Number(item.amount || (item.quantity * item.unit_price) || 0),
        }
      })

      setItems(populatedItems)

      if (normalizedWarehouseId) {
        const options = await Promise.all(
          populatedItems.map((row) =>
            row.item_id ? getAvailableBatches(row.item_id, normalizedWarehouseId).catch(() => []) : Promise.resolve([])
          )
        )
        setBatchOptions(Object.fromEntries(options.map((batches, index) => [index, batches])))
      }

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
          const batches = await getAvailableBatches(itemId, canonicalWarehouseId(warehouseId))
          setBatchOptions((current) => ({ ...current, [index]: batches }))
        } catch {
          setBatchOptions((current) => ({ ...current, [index]: [] }))
        }
      }
    }
  }

  const handleWarehouseChange = (value: string) => {
    setWarehouseId(canonicalWarehouseId(value))
    setItems([blankItem()])
    setBatchOptions({})
  }

  const handleSave = async () => {
    if (!fsNo.trim() || !saleDate || !customerName.trim() || !warehouseId) {
      showToast("Missing details", "warning", "FS No, date, customer, and warehouse are required.")
      return
    }
    const invalidItem = items.find((item) => {
      const hasItem = Boolean(item.item_id || item.item_name)
      const hasBatch = Boolean(item.batch_no)
      const validQty = Number(item.quantity) > 0
      const validPrice = Number(item.unit_price) >= 0
      return !hasItem || !hasBatch || !validQty || !validPrice
    })
    if (invalidItem) {
      showToast("Check item rows", "warning", "Each row needs an item, batch number, valid quantity (> 0), and price.")
      return
    }
    const enteredCustomer = customerName.trim()
    const payload = {
      id: editing?.id,
      fs_no: fsNo.trim(),
      reference_no: referenceNo.trim() || `REF-${fsNo.trim()}`,
      sale_date: saleDate,
      customer_id: enteredCustomer,
      customer_name: enteredCustomer,
      warehouse_id: canonicalWarehouseId(warehouseId),
      payment_type: paymentType,
      items: items.map((item, index) => ({
        ...item,
        id: item.id || `${editing?.id || fsNo}-ITEM-${index + 1}`,
        batch_no: item.batch_no || "BATCH-MAIN",
        batch_id: item.batch_id || item.batch_no || "BATCH-MAIN",
      })),
    }
    try {
      if (editing) await updateSalesIssue(editing.id, payload)
      else await createSalesIssue(payload)

      // Mark linked Sales Orders as Fully Delivered to prevent duplicate issue creation
      if (selectedSoIds.length > 0) {
        selectedSoIds.forEach((soId) => {
          erp.updateSalesOrderStage(soId, "Shipped")
        })
      }

      showToast("Sales Issue Saved", "success", `Sales issue ${fsNo} saved successfully.`)
      setFormOpen(false)
      await load()
    } catch (err) {
      showToast("Save failed", "warning", err instanceof Error ? err.message : "Could not save sales issue.")
    }
  }

  useEffect(() => {
    if (!formOpen || !warehouseId) return
    let cancelled = false
    const refresh = async () => {
      const options = await Promise.all(
        items.map((item) =>
          item.item_id
            ? getAvailableBatches(item.item_id, canonicalWarehouseId(warehouseId)).catch(() => [])
            : Promise.resolve([])
        )
      )
      if (!cancelled) {
        const batchMap = Object.fromEntries(options.map((batches, index) => [index, batches]))
        setBatchOptions(batchMap)

        // Auto-select the first available batch if item has no batch selected yet
        setItems((currentItems) =>
          currentItems.map((row, idx) => {
            const availableForIdx = options[idx] || []
            if (!row.batch_no && availableForIdx.length > 0) {
              const firstBatch = availableForIdx[0]
              return {
                ...row,
                batch_no: firstBatch.batch_no,
                batch_id: firstBatch.batch_no,
                available_quantity: firstBatch.available_quantity,
                unit_price: firstBatch.unit_price ?? row.unit_price,
              }
            }
            return row
          })
        )
      }
    }
    void refresh()
    return () => {
      cancelled = true
    }
  }, [warehouseId, formOpen, items.map((i) => i.item_id).join(",")])

  const doPost = (issue: SalesIssue) => {
    confirm({
      title: "Post Sales Issue?",
      message: "Posting reduces batch stock and creates balanced journal entries. This can happen only once.",
      confirmLabel: "Post",
      onConfirm: async () => {
        try {
          await postSalesIssue(issue.id)
          
          // Mark any linked Sales Orders in reference_no as Fully Delivered
          const refStr = issue.reference_no || ""
          const matchingOrders = salesOrders.filter((so) => refStr.includes(so.id))
          matchingOrders.forEach((so) => {
            erp.updateSalesOrderStage(so.id, "Shipped")
          })

          showToast("Sales issue posted", "success", `${issue.fs_no} posted, inventory stock reduced, and linked Sales Orders fulfilled.`)
          await erp.reloadFromApi()
          await financeStore.reloadFromApi()
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

  const salesTable = useResizableTable<SalesIssue>(salesIssueColumns, rows, {
    fs_no: 120,
    reference_no: 130,
    sale_date: 110,
    item: 180,
    customer_name: 180,
    batch_no: 120,
    total_quantity: 110,
    unit_price: 110,
    total_amount: 120,
    _actions: 140,
  })

  const openAttachment = (issue: SalesIssue) => {
    navigate(`/sales/sales-issued/${encodeURIComponent(issue.id)}/attachment`, { state: { issue } })
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
                { value: batchFilter, onChange: setBatchFilter, ariaLabel: "Batch", options: [{ value: "ALL", label: "All Batches" }, ...batchFilters.map((b) => ({ value: b, label: b }))] },
              ]}
              actions={[
                {
                  label: "Add Sales Issue",
                  onClick: openCreate,
                  icon: <Plus className="size-4" />,
                  variant: "primary",
                },
              ]}
            />
          </div>

          {error && <div className="mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-black/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                  {salesIssueColumns.map((col) => (
                    <ResizableTh
                      key={col.key}
                      col={col}
                      width={salesTable.colWidths[col.key] || 120}
                      sortKey={salesTable.sortKey}
                      sortDir={salesTable.sortDir}
                      openMenuCol={salesTable.openMenuCol}
                      onResizeStart={salesTable.handleResizeStart}
                      onToggleMenu={salesTable.toggleMenu}
                      onSortAsc={salesTable.setSortAsc}
                      onSortDesc={salesTable.setSortDesc}
                      onClearSort={salesTable.clearSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {loading ? (
                  <SalesIssuedSkeletonRows />
                ) : salesTable.sorted().length === 0 ? (
                  <tr><td colSpan={salesIssueColumns.length} className="py-16 text-center text-xs font-bold text-zinc-400">No sales issued records match your filters.</td></tr>
                ) : salesTable.sorted().map((row) => (
                  <tr key={row.id} className="border-b border-zinc-150/40 hover:bg-zinc-50/60 transition-colors text-xs">
                    <td style={{ width: `${salesTable.colWidths.fs_no}px` }} className="px-3 py-3 font-mono text-xs font-black text-zinc-950 truncate">{row.fs_no}</td>
                    <td style={{ width: `${salesTable.colWidths.reference_no}px` }} className="px-3 py-3 font-mono text-xs font-bold text-zinc-700 truncate">{row.reference_no}</td>
                    <td style={{ width: `${salesTable.colWidths.sale_date}px` }} className="px-3 py-3 text-xs font-bold text-zinc-700 truncate">{row.sale_date}</td>
                    <td style={{ width: `${salesTable.colWidths.item}px` }} className="px-3 py-3 text-xs font-black text-zinc-900 truncate">{row.items?.[0]?.item_name || "Multiple items"}</td>
                    <td style={{ width: `${salesTable.colWidths.customer_name}px` }} className="px-3 py-3 text-xs font-bold text-zinc-700 truncate">{row.customer_name}</td>
                    <td style={{ width: `${salesTable.colWidths.batch_no}px` }} className="px-3 py-3 font-mono text-xs font-bold text-zinc-700 truncate">{row.items?.[0]?.batch_no || "-"}</td>
                    <td style={{ width: `${salesTable.colWidths.total_quantity}px` }} className="px-3 py-3 text-right font-mono text-xs font-black truncate">{Number(row.total_quantity).toLocaleString()}</td>
                    <td style={{ width: `${salesTable.colWidths.unit_price}px` }} className="px-3 py-3 text-right font-mono text-xs font-bold truncate">{money(row.items?.[0]?.unit_price || 0)}</td>
                    <td style={{ width: `${salesTable.colWidths.total_amount}px` }} className="px-3 py-3 text-right font-mono text-xs font-black truncate">{money(row.total_amount)}</td>
                    <td style={{ width: `${salesTable.colWidths._actions}px` }} className="px-3 py-3 pr-4 truncate">
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={() => setSelected(row)} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50" title="View"><Eye className="size-3.5" /></button>
                        <button disabled={row.status !== "Draft"} onClick={() => void openEdit(row)} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-35" title="Edit"><Edit3 className="size-3.5" /></button>
                        <button onClick={() => openAttachment(row)} className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50" title="Print Attachment"><Printer className="size-3.5" /></button>
                        {row.status === "Draft" && <button onClick={() => doPost(row)} className="rounded-lg border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-50" title="Post and deduct stock"><Send className="size-3.5" /></button>}
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

              {/* PULL PENDING SALES ORDERS PICKER BAR */}
              {!editing && pendingSalesOrders.length > 0 && (
                <div className="mb-6 p-4 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Download className="size-4 text-emerald-700" />
                      <span className="text-xs font-black uppercase text-emerald-950 tracking-wide">
                        Pull From Pending Sales Orders ({pendingSalesOrders.length} Available)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700">
                      Select 1 or multiple orders to auto-fill contract items
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {pendingSalesOrders.map((so) => {
                      const isSelected = selectedSoIds.includes(so.id)
                      const docs = soAttachmentsMap[so.id] || []
                      const hasTrade = docs.some((d) => d.document_type === "Trade License")
                      const hasAdvice = docs.some((d) => d.document_type === "Payment Advice")
                      const isDocsMissing = !hasTrade || !hasAdvice

                      return (
                        <button
                          key={so.id}
                          type="button"
                          disabled={isDocsMissing}
                          onClick={() => {
                            if (isDocsMissing) {
                              showToast(
                                "Missing Documents",
                                "warning",
                                "Cannot issue stock for this order until Trade License and Payment Advice are attached."
                              )
                              return
                            }
                            handleTogglePullSalesOrder(so)
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                            isDocsMissing
                              ? "bg-amber-50/80 border-amber-200/90 text-amber-900 cursor-not-allowed opacity-80"
                              : isSelected 
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-sm" 
                              : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-100"
                          }`}
                        >
                          <div>
                            <div className="font-bold font-mono text-xs flex items-center gap-1.5">
                              {so.id} • {so.customer}
                              {isDocsMissing && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="size-2.5 text-amber-700" /> {!hasTrade && !hasAdvice ? "Trade License & Advice Missing" : !hasAdvice ? "Payment Advice Missing" : "Trade License Missing"}
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] mt-0.5 ${isDocsMissing ? "text-amber-800 font-semibold" : isSelected ? "text-emerald-100" : "text-zinc-500"}`}>
                              {so.warehouse} • ETB {so.amount.toLocaleString()} ({so.items.length} contract items)
                            </div>
                          </div>
                          <div className={`size-5 rounded-full border flex items-center justify-center shrink-0 ${isDocsMissing ? "bg-amber-100 border-amber-300 text-amber-800" : isSelected ? "bg-white text-emerald-700 border-white" : "border-zinc-300"}`}>
                            {isDocsMissing ? <Lock className="size-3 text-amber-700" /> : isSelected ? <Check className="size-3 stroke-[3]" /> : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">FS Number</span>
                  <input value={fsNo} onChange={(e) => setFsNo(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Ref Number</span>
                  <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Date</span>
                  <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Customer</span>
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Warehouse</span>
                  <select value={warehouseId} onChange={(e) => handleWarehouseChange(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold">
                    <option value="">Select warehouse</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name || w.code || w.id}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Payment Type</span>
                  <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold"><option>Cash</option><option>Credit</option></select>
                </label>
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
                      <label className="md:col-span-6">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Item</span>
                        <select disabled={!warehouseId} value={item.item_id} onChange={(e) => { const product = selectableProducts.find((p) => p.id === e.target.value); void updateItem(index, { item_id: e.target.value, item_name: product?.name || "", packaging_unit: product?.unit || "", unit_price: product?.sellingPrice || 0, batch_id: "", batch_no: "", available_quantity: 0 }) }} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold disabled:cursor-not-allowed disabled:bg-zinc-100">
                          <option value="">{warehouseId ? "Select item" : "Select warehouse first"}</option>{selectableProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </label>
                      <label className="md:col-span-2">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Batch No</span>
                        <select
                          value={item.batch_no}
                          onChange={(e) => {
                            const rawOpts = batchOptions[index] || []
                            const batch = rawOpts.find((b) => b.batch_no === e.target.value)
                            void updateItem(index, {
                              batch_no: e.target.value,
                              batch_id: e.target.value,
                              packaging_unit: batch?.packaging_unit || item.packaging_unit,
                              available_quantity: batch?.available_quantity || item.available_quantity || 1000,
                              unit_price: batch?.unit_price ?? item.unit_price,
                            })
                          }}
                          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold"
                        >
                          <option value="">Select batch</option>
                          {(() => {
                            const opts = batchOptions[index] || []
                            const hasSelected = opts.some((b) => b.batch_no === item.batch_no)
                            const displayOpts = item.batch_no && !hasSelected
                              ? [{ batch_no: item.batch_no, available_quantity: item.available_quantity || 1000, unit_price: item.unit_price, packaging_unit: item.packaging_unit }, ...opts]
                              : opts
                            return displayOpts.map((b) => (
                              <option key={b.batch_no} value={b.batch_no}>
                                {b.batch_no}
                              </option>
                            ))
                          })()}
                        </select>
                      </label>
                      <label className="md:col-span-1">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Qty</span>
                        <input type="number" min="1" value={item.quantity} onChange={(e) => void updateItem(index, { quantity: Number(e.target.value) })} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold" />
                      </label>
                      <label className="md:col-span-1">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Price</span>
                        <input readOnly value={money(item.unit_price)} className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-2 text-right font-mono text-xs font-black text-zinc-700" />
                      </label>
                      <label className="md:col-span-2">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Amount</span>
                        <input readOnly value={money(item.amount)} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-right font-mono text-xs font-black text-zinc-950" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-bold text-zinc-500">Posting deducts the selected batch quantity from inventory in one server transaction.</div>
                <div className="flex gap-4 text-sm font-black"><span>Total Quantity: {totalQuantity.toLocaleString()}</span><span>Grand Total: {money(grandTotal)}</span></div>
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button onClick={() => setFormOpen(false)} className="h-10 rounded-xl border border-zinc-200 px-4 text-xs font-black">Cancel</button>
                <button onClick={() => void handleSave()} className="h-10 rounded-xl bg-emerald-700 px-5 text-xs font-black text-white">Save</button>
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
          <div className="mt-4 grid gap-2">
            <button onClick={() => openAttachment(selected)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-xs font-black text-white"><FileText className="size-4" /> View Attachment</button>
            <button onClick={() => openAttachment(selected)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-800"><Printer className="size-4" /> Print Attachment</button>
            <button onClick={() => openAttachment(selected)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-800"><FileText className="size-4" /> Generate Attachment</button>
          </div>
        </div>
      )}
    </div>
  )
}
