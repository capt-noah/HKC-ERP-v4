import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Pencil, FileText, Plus, Send, Trash2, X, Check, Download, AlertTriangle, Lock, Upload, CheckCircle2 } from "lucide-react"
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
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal"
import { EditModalHeader } from "@/components/EditModalHeader"
import SalesIssuePrintModal from "@/components/sales/SalesIssuePrintModal"

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

import { API_BASE } from "@/lib/apiPersistence"

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

async function uploadShipmentDoc(doc: Partial<ShipmentDocAttachment>): Promise<ShipmentDocAttachment> {
  const res = await fetch(`${API_BASE}/api/shipment-documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
  if (!res.ok) {
    throw new Error('Failed to upload shipment document.')
  }
  return res.json()
}

import {
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
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SalesIssue | null>(null)
  const [printingIssue, setPrintingIssue] = useState<SalesIssue | null>(null)
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

  // Staged documentation & payment advice
  const [stagedPaymentAdviceName, setStagedPaymentAdviceName] = useState("")
  const [stagedPaymentAdviceUrl, setStagedPaymentAdviceUrl] = useState("")
  const [stagedTradePaperName, setStagedTradePaperName] = useState("")
  const [stagedTradePaperUrl, setStagedTradePaperUrl] = useState("")
  const [previewDocUrl, setPreviewDocUrl] = useState("")
  const [previewDocName, setPreviewDocName] = useState("")

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
      setPaymentType("Cash")
      setStagedPaymentAdviceName("")
      setStagedPaymentAdviceUrl("")
      setStagedTradePaperName("")
      setStagedTradePaperUrl("")
      setItems([blankItem()])
      return
    }

    const firstSo = activeOrders[0]
    setCustomerName(firstSo.customer)
    const matchedWh = warehouses.find((w) => w.code === firstSo.warehouse || w.id === firstSo.warehouse || w.name === firstSo.warehouse)
    const targetWhId = matchedWh ? matchedWh.id : canonicalWarehouseId(firstSo.warehouse)
    setWarehouseId(targetWhId)
    setPaymentType(firstSo.paymentType === "Credit" ? "Credit" : "Cash")
    setReferenceNo("")
    if (!saleDate) setSaleDate(new Date().toISOString().split("T")[0])

    // Pull attached docs from referenced sales orders
    const soDocs = soAttachmentsMap[firstSo.id] || []
    const tradeDoc = soDocs.find((d) => d.document_type === "Trade License" || d.document_type === "Trade Paper")
    const adviceDoc = soDocs.find((d) => d.document_type === "Payment Advice")
    if (tradeDoc) {
      setStagedTradePaperName(tradeDoc.file_name)
      setStagedTradePaperUrl(tradeDoc.file_url)
    } else {
      setStagedTradePaperName("")
      setStagedTradePaperUrl("")
    }
    if (adviceDoc) {
      setStagedPaymentAdviceName(adviceDoc.file_name)
      setStagedPaymentAdviceUrl(adviceDoc.file_url)
    } else {
      setStagedPaymentAdviceName("")
      setStagedPaymentAdviceUrl("")
    }

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
    setStagedPaymentAdviceName("")
    setStagedPaymentAdviceUrl("")
    setStagedTradePaperName("")
    setStagedTradePaperUrl("")

    const isRealSo = Boolean(preselectedSo && typeof preselectedSo === "object" && Array.isArray(preselectedSo.items))
    setReferenceNo("")
    setSaleDate(new Date().toISOString().split("T")[0])
    setCustomerName(isRealSo ? preselectedSo.customer : "")
    
    if (isRealSo) {
      const matchedWh = warehouses.find((w) => w.code === preselectedSo.warehouse || w.id === preselectedSo.warehouse || w.name === preselectedSo.warehouse)
      setWarehouseId(matchedWh ? matchedWh.id : canonicalWarehouseId(preselectedSo.warehouse))
      setSelectedSoIds([preselectedSo.id])
      setPaymentType(preselectedSo.paymentType === "Credit" ? "Credit" : "Cash")

      // Pull attached docs from sales order
      const soDocs = soAttachmentsMap[preselectedSo.id] || []
      const tradeDoc = soDocs.find((d) => d.document_type === "Trade License" || d.document_type === "Trade Paper")
      const adviceDoc = soDocs.find((d) => d.document_type === "Payment Advice")
      if (tradeDoc) {
        setStagedTradePaperName(tradeDoc.file_name)
        setStagedTradePaperUrl(tradeDoc.file_url)
      }
      if (adviceDoc) {
        setStagedPaymentAdviceName(adviceDoc.file_name)
        setStagedPaymentAdviceUrl(adviceDoc.file_url)
      }

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
      setPaymentType("Cash")
      setItems([blankItem()])
    }

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
    if (statusLower === "cancelled") {
      showToast("Cancelled record locked", "warning", "Cancelled sales issues cannot be edited.")
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

      // Fetch existing documents for this sales issue and its referenced sales orders
      const issueDocs = await fetchShipmentDocs(issue.id, "sales_issue")
      let adviceDoc = issueDocs.find((d) => d.document_type === "Payment Advice")
      let tradeDoc = issueDocs.find((d) => d.document_type === "Trade License" || d.document_type === "Trade Paper")

      if (!adviceDoc && issue.reference_no) {
        const refDocs = await fetchShipmentDocs(issue.reference_no, "sales_order")
        adviceDoc = refDocs.find((d) => d.document_type === "Payment Advice")
        if (!tradeDoc) {
          tradeDoc = refDocs.find((d) => d.document_type === "Trade License" || d.document_type === "Trade Paper")
        }
      }

      setStagedPaymentAdviceName(adviceDoc?.file_name || "")
      setStagedPaymentAdviceUrl(adviceDoc?.file_url || "")
      setStagedTradePaperName(tradeDoc?.file_name || "")
      setStagedTradePaperUrl(tradeDoc?.file_url || "")

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

    if (patch.item_id && warehouseId) {
      const batches = await getAvailableBatches(patch.item_id, canonicalWarehouseId(warehouseId)).catch(() => [])
      setBatchOptions((current) => ({ ...current, [index]: batches }))
    }
  }

  const handleWarehouseChange = async (nextWarehouseId: string) => {
    setWarehouseId(nextWarehouseId)
    const options = await Promise.all(
      items.map((item) =>
        item.item_id ? getAvailableBatches(item.item_id, canonicalWarehouseId(nextWarehouseId)).catch(() => []) : Promise.resolve([])
      )
    )
    setBatchOptions(Object.fromEntries(options.map((batches, index) => [index, batches])))
  }

  const handleSave = async () => {
    if (!fsNo.trim()) {
      showToast("FS No required", "warning", "Provide an FS number.")
      return
    }
    if (!saleDate) {
      showToast("Date required", "warning", "Select a sale date.")
      return
    }
    if (!customerName.trim()) {
      showToast("Customer required", "warning", "Customer name cannot be empty.")
      return
    }
    if (!warehouseId) {
      showToast("Warehouse required", "warning", "Pick an active warehouse.")
      return
    }

    const isPostedEdit = editing && (editing.status || "").toLowerCase() === "posted"

    if (!isPostedEdit) {
      const invalidItem = items.some((item) => {
        return !item.item_id || !item.batch_no || Number(item.quantity) <= 0 || Number(item.unit_price) < 0
      })
      if (invalidItem) {
        showToast("Check item rows", "warning", "Each row needs an item, batch number, valid quantity (> 0), and price.")
        return
      }
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
      if (editing) {
        await updateSalesIssue(editing.id, payload)
      } else {
        await createSalesIssue(payload)
      }

      // Persist newly attached Payment Advice if uploaded
      if (stagedPaymentAdviceName && stagedPaymentAdviceUrl) {
        const issueId = editing?.id || payload.id || fsNo.trim()
        try {
          await uploadShipmentDoc({
            record_id: issueId,
            record_type: "sales_order",
            document_type: "Payment Advice",
            file_name: stagedPaymentAdviceName,
            file_size: 102400,
            file_url: stagedPaymentAdviceUrl,
            uploaded_at: new Date().toISOString(),
            uploaded_by: "Sales Officer",
          })
        } catch (docErr) {
          console.warn("Payment advice upload notice:", docErr)
        }
      }

      // If converted from Credit to Cash, also update referenced Sales Orders in ERP store and linked Invoice in Finance
      if (editing && paymentType === "Cash") {
        const refStr = editing.reference_no || ""
        const linkedOrders = salesOrders.filter((so) => refStr.includes(so.id) || so.id === editing.reference_no)
        linkedOrders.forEach((so) => {
          if (so.paymentType !== "Cash") {
            erp.updateSalesOrder({ ...so, paymentType: "Cash" })
          }
        })

        const totalAmt = Number(editing.total_amount || 0)
        financeStore.updateInvoice(`INV-SI-${editing.id}`, {
          status: "Paid",
          amount_paid: totalAmt,
          balance_due: 0,
          payment_terms: "Cash",
        })
      }

      // Mark linked Sales Orders as Fully Delivered / Shipped to prevent duplicate issue creation
      if (selectedSoIds.length > 0) {
        selectedSoIds.forEach((soId) => {
          erp.updateSalesOrderStage(soId, "Shipped")
        })
      }

      showToast(
        "Sales Issue Saved",
        "success",
        isPostedEdit
          ? `Sales issue ${fsNo} payment terms updated to ${paymentType}${stagedPaymentAdviceName ? " with Payment Advice attached." : "."}`
          : `Sales issue ${fsNo} saved successfully.`
      )
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
    _actions: 210,
  })

  const isPostedEditing = Boolean(editing && (editing.status || "").toLowerCase() === "posted")

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
                    <td style={{ width: `${salesTable.colWidths._actions}px` }} className="py-4 px-4 text-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={row.status === "Cancelled"}
                          onClick={() => void openEdit(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-[11px] transition-all border border-zinc-200/80 active:scale-95 shadow-2xs disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer"
                          title="Edit Sales Issue"
                        >
                          <Pencil className="size-3 text-zinc-700" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintingIssue(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-[11px] transition-all border border-zinc-200/80 active:scale-95 shadow-2xs cursor-pointer"
                          title="Export Sales Issue Voucher"
                        >
                          <Download className="size-3 text-zinc-700" /> Export
                        </button>
                        {row.status === "Draft" && (
                          <button
                            type="button"
                            onClick={() => doPost(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[11px] transition-all border border-emerald-200/80 active:scale-95 shadow-2xs cursor-pointer"
                            title="Post and deduct stock"
                          >
                            <Send className="size-3 text-emerald-700" /> Post
                          </button>
                        )}
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
            <motion.div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              {editing ? (
                <EditModalHeader
                  title={isPostedEditing ? `Edit Posted Sales Issue (${editing.fs_no})` : `Edit Sales Issue (${editing.fs_no})`}
                  subtitle={isPostedEditing ? "Update payment settlement terms from Credit to Cash and attach Payment Advice." : "Amount is calculated automatically per row."}
                  onClose={() => setFormOpen(false)}
                  onRequestDelete={editing.status === "Draft" ? () => doDelete(editing) : undefined}
                  deleteLabel="Delete Sales Issue"
                />
              ) : (
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-black text-zinc-950">Add Sales Issue</h2>
                    <p className="text-xs font-semibold text-zinc-500">Amount is calculated automatically per row.</p>
                  </div>
                  <button onClick={() => setFormOpen(false)} className="rounded-xl border border-zinc-200 p-2 hover:bg-zinc-100 transition-colors">
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* POSTED SETTLEMENT NOTICE BANNER */}
              {isPostedEditing && (
                <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs font-semibold flex items-center gap-2.5">
                  <AlertTriangle className="size-4 text-blue-700 shrink-0" />
                  <div>
                    <span className="font-black uppercase tracking-wider block">Posted Record: Stock Deductions Locked</span>
                    <span className="text-[11px] text-blue-800 block mt-0.5">
                      Batch stock quantities and accounting journal vouchers are already posted. You can update payment terms (e.g. convert from <strong>Credit</strong> to <strong>Cash</strong>) and attach <strong>Payment Advice</strong>.
                    </span>
                  </div>
                </div>
              )}

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
                      Select 1 or multiple orders to auto-fill contract items & documents
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {pendingSalesOrders.map((so) => {
                      const isSelected = selectedSoIds.includes(so.id)
                      const docs = soAttachmentsMap[so.id] || []
                      const hasTrade = docs.some((d) => d.document_type === "Trade License" || d.document_type === "Trade Paper")
                      const hasAdvice = docs.some((d) => d.document_type === "Payment Advice")
                      const isCredit = so.paymentType === "Credit"

                      // Cash requires both; Credit requires only Trade License
                      const isTradeMissing = !hasTrade
                      const isAdviceMissing = !isCredit && !hasAdvice
                      const isLocked = isTradeMissing || isAdviceMissing

                      return (
                        <button
                          key={so.id}
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            if (isLocked) {
                              if (isTradeMissing) {
                                showToast("Missing Document", "warning", "Trade License is required before issuing stock.")
                              } else if (isAdviceMissing) {
                                showToast("Payment Advice Required", "warning", "Payment Advice is mandatory before issuing stock for Cash sales.")
                              }
                              return
                            }
                            handleTogglePullSalesOrder(so)
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                            isLocked
                              ? "bg-amber-50/80 border-amber-200/90 text-amber-900 cursor-not-allowed opacity-80"
                              : isSelected 
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-sm" 
                              : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-100"
                          }`}
                        >
                          <div>
                            <div className="font-bold font-mono text-xs flex items-center gap-1.5 flex-wrap">
                              {so.id} • {so.customer}
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold ${isCredit ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}>
                                {isCredit ? "Credit" : "Cash"}
                              </span>
                              {isLocked && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="size-2.5 text-amber-700" />
                                  {isTradeMissing && isAdviceMissing
                                    ? "Trade & Advice Missing"
                                    : isAdviceMissing
                                    ? "Payment Advice Missing"
                                    : "Trade License Missing"}
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] mt-0.5 ${isLocked ? "text-amber-800 font-semibold" : isSelected ? "text-emerald-100" : "text-zinc-500"}`}>
                              {so.warehouse} • ETB {so.amount.toLocaleString()} ({so.items.length} contract items)
                            </div>
                          </div>
                          <div className={`size-5 rounded-full border flex items-center justify-center shrink-0 ${isLocked ? "bg-amber-100 border-amber-300 text-amber-800" : isSelected ? "bg-white text-emerald-700 border-white" : "border-zinc-300"}`}>
                            {isLocked ? <Lock className="size-3 text-amber-700" /> : isSelected ? <Check className="size-3 stroke-[3]" /> : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* PRIMARY HEADER INPUTS */}
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">FS Number</span>
                  <input
                    disabled={isPostedEditing}
                    value={fsNo}
                    onChange={(e) => setFsNo(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Ref Number</span>
                  <input
                    disabled={isPostedEditing}
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Date</span>
                  <input
                    type="date"
                    disabled={isPostedEditing}
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Customer</span>
                  <input
                    disabled={isPostedEditing}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Warehouse</span>
                  <select
                    disabled={isPostedEditing}
                    value={warehouseId}
                    onChange={(e) => handleWarehouseChange(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold disabled:bg-zinc-100 disabled:text-zinc-500"
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name || w.code || w.id}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-zinc-500">Payment Terms</span>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-bold bg-white text-zinc-900 cursor-pointer outline-none focus:border-emerald-500"
                  >
                    <option value="Cash">Cash (Immediate Settlement)</option>
                    <option value="Credit">Credit (Receivable)</option>
                  </select>
                </label>
              </div>

              {/* DOCUMENTATION & PAYMENT ADVICE ATTACHMENTS SECTION */}
              <div className="mt-5 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-800 block">
                      Order Documentation & Payment Advice
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-500 block mt-0.5">
                      {paymentType === "Cash"
                        ? "Payment Advice is mandatory / recommended for Cash sales proof"
                        : "Payment Advice is optional for Credit sales (can be attached upon settlement)"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Trade License (read-only preview or inherit) */}
                  <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                        <FileText className="size-3.5 text-emerald-600" /> Customer Trade License
                      </span>
                      {stagedTradePaperName ? (
                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Attached
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                          Not on file
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[11px] font-mono text-zinc-600 truncate">
                        {stagedTradePaperName || "No file attached from order"}
                      </span>
                      {stagedTradePaperUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewDocUrl(stagedTradePaperUrl)
                            setPreviewDocName(stagedTradePaperName || "Trade License")
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md inline-flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          View Doc ↗
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment Advice Dropzone */}
                  <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-blue-600" /> Payment Advice Receipt
                      </span>
                      {stagedPaymentAdviceName ? (
                        <span className="text-[9px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          Attached
                        </span>
                      ) : (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${paymentType === "Cash" ? "text-amber-700 bg-amber-50" : "text-zinc-500 bg-zinc-100"}`}>
                          {paymentType === "Cash" ? "Required for Cash" : "Optional"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="cursor-pointer px-3 py-1 rounded-lg bg-zinc-900 text-white font-bold text-[11px] hover:bg-zinc-800 flex items-center gap-1 shrink-0">
                        <Upload className="size-3" /> Select File
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) {
                              const reader = new FileReader()
                              reader.onload = () => {
                                setStagedPaymentAdviceName(f.name)
                                setStagedPaymentAdviceUrl(reader.result as string)
                              }
                              reader.readAsDataURL(f)
                            }
                          }}
                        />
                      </label>
                      <span className="text-[11px] font-mono text-zinc-600 truncate flex-1">
                        {stagedPaymentAdviceName || "No slip uploaded"}
                      </span>
                      {stagedPaymentAdviceUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewDocUrl(stagedPaymentAdviceUrl)
                            setPreviewDocName(stagedPaymentAdviceName || "Payment Advice")
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md inline-flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          View Doc ↗
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ITEM ROWS */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wide text-zinc-500">
                    {isPostedEditing ? "Item Rows (Locked)" : "Item Rows"}
                  </h3>
                  {!isPostedEditing && (
                    <button onClick={() => setItems((current) => [...current, blankItem()])} className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-xs font-black"><Plus className="size-4" /> Add Item Row</button>
                  )}
                </div>
                {items.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-500">Row {index + 1}</span>
                      {!isPostedEditing && (
                        <button disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-rose-200 bg-white p-2 text-rose-700 disabled:cursor-not-allowed disabled:opacity-35" title="Remove row"><Trash2 className="size-3.5" /></button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-12">
                      <label className="md:col-span-6">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Item</span>
                        {isPostedEditing ? (
                          <div className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 flex items-center text-xs font-bold text-zinc-700 font-mono">
                            {item.item_name}
                          </div>
                        ) : (
                          <select disabled={!warehouseId} value={item.item_id} onChange={(e) => { const product = selectableProducts.find((p) => p.id === e.target.value); void updateItem(index, { item_id: e.target.value, item_name: product?.name || "", packaging_unit: product?.unit || "", unit_price: product?.sellingPrice || 0, batch_id: "", batch_no: "", available_quantity: 0 }) }} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold disabled:cursor-not-allowed disabled:bg-zinc-100">
                            <option value="">{warehouseId ? "Select item" : "Select warehouse first"}</option>{selectableProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        )}
                      </label>
                      <label className="md:col-span-2">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Batch No</span>
                        {isPostedEditing ? (
                          <div className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 flex items-center text-xs font-bold text-zinc-700 font-mono">
                            {item.batch_no || "—"}
                          </div>
                        ) : (
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
                        )}
                      </label>
                      <label className="md:col-span-1">
                        <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Qty</span>
                        {isPostedEditing ? (
                          <div className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 flex items-center text-xs font-mono font-black text-zinc-700">
                            {item.quantity}
                          </div>
                        ) : (
                          <input type="number" min="1" value={item.quantity} onChange={(e) => void updateItem(index, { quantity: Number(e.target.value) })} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold" />
                        )}
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
                <div className="text-xs font-bold text-zinc-500">
                  {isPostedEditing ? "Stock balances are already updated in GL ledger." : "Posting deducts the selected batch quantity from inventory in one server transaction."}
                </div>
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

      {/* Document preview modal for inspecting trade licenses & payment advices */}
      <DocumentPreviewModal
        isOpen={!!previewDocUrl}
        onClose={() => setPreviewDocUrl("")}
        fileUrl={previewDocUrl}
        fileName={previewDocName}
      />

      {/* Sales Issue Export & Print Modal */}
      <SalesIssuePrintModal
        isOpen={!!printingIssue}
        issue={printingIssue}
        onClose={() => setPrintingIssue(null)}
      />
    </div>
  )
}
