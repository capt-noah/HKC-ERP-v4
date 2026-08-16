import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  CheckCircle2, 
  FileText, 
  X, 
  Pencil,
  Trash2,
  AlertTriangle,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Phone,
  ExternalLink,
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore, getTradeLicenseStatus, type SalesOrder, type Quotation, type SalesOrderItem } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { useFeedback } from "@/context/FeedbackContext"
import { type TableColumn } from "@/components/ResizableTable"
import { EditModalHeader } from "@/components/EditModalHeader"
import { RecordDeleteModal } from "@/components/RecordDeleteModal"
import { DataTable } from "@/components/DataTable"
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal"

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

function resolveSalesOrderDocs(
  soId: string,
  customerName: string,
  tradePaperUrl: string | undefined,
  tradePaperFileName: string | undefined,
  attachments: ShipmentDocAttachment[]
) {
  const docsList = [...attachments]
  let tradeLicense = attachments.find((d) => d.document_type === "Trade License" || d.document_type === "Trade Paper")
  const paymentAdvice = attachments.find((d) => d.document_type === "Payment Advice")

  if (!tradeLicense && tradePaperUrl) {
    tradeLicense = {
      id: `CUST-TL-${soId}`,
      record_id: soId,
      record_type: "sales_order",
      document_type: "Trade License",
      file_name: tradePaperFileName || "Trade License.pdf",
      file_size: 102400,
      file_url: tradePaperUrl,
      uploaded_at: new Date().toISOString(),
      uploaded_by: customerName,
    }
    docsList.push(tradeLicense)
  }

  return {
    docsList,
    tradeLicense,
    paymentAdvice,
  }
}

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const CONTAINER_UNITS = ["Box", "Bottle", "Vial"]

export default function SalesOrders() {
  const { showToast } = useFeedback()
  const erp = useErpStore()
  const isLoading = erp.isLoading()
  
  const salesOrders = erp.getSalesOrders()
  const customers = erp.getCustomers()
  const products = erp.getProducts()
  const warehouses = withOperatingWarehouses(erp.getWarehouses())
  const warehouseOptions = warehouses.map((warehouse) => ({ value: warehouse.code || warehouse.id, label: warehouse.name || warehouse.code || warehouse.id }))

  // Search & Filter states for Sales Orders
  const [soSearch, setSoSearch] = useState("")
  const [soWhFilter, setSoWhFilter] = useState("ALL")

  // Selected Sales Order for Inspection / Fulfillment / Invoicing
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)

  const [soAttachmentsMap, setSoAttachmentsMap] = useState<Record<string, ShipmentDocAttachment[]>>({})

  useEffect(() => {
    if (selectedOrder?.id) {
      fetchShipmentDocs(selectedOrder.id, "sales_order").then((docs) => {
        setSoAttachmentsMap((prev) => ({ ...prev, [selectedOrder.id]: docs }))
      })
    }
  }, [selectedOrder?.id])

  const customerComboboxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerComboboxRef.current && !customerComboboxRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (salesOrders.length > 0) {
      salesOrders.forEach((so) => {
        fetchShipmentDocs(so.id, "sales_order").then((docs) => {
          setSoAttachmentsMap((prev) => ({ ...prev, [so.id]: docs }))
        })
      })
    }
  }, [salesOrders.length])

  // Modals
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null)
  const [isNewQuotationOpen, setIsNewQuotationOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)

  // Billing form state
  const [taxPercent, setTaxPercent] = useState(0)
  const [paymentTerms, setPaymentTerms] = useState("")

  // New Sales Order Form State
  const [newCustomerId, setNewCustomerId] = useState("")
  const [customerSearchInput, setCustomerSearchInput] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [saveCustomerToRegistry, setSaveCustomerToRegistry] = useState(true)
  const [custPhone, setCustPhone] = useState("")
  const [custEmail, setCustEmail] = useState("")
  const [custAddress, setCustAddress] = useState("")

  // Staged Attachments
  const [stagedTradePaperName, setStagedTradePaperName] = useState("")
  const [stagedTradePaperUrl, setStagedTradePaperUrl] = useState("")
  const [stagedPaymentAdviceName, setStagedPaymentAdviceName] = useState("")
  const [stagedPaymentAdviceUrl, setStagedPaymentAdviceUrl] = useState("")

  // Document Preview Modal States
  const [previewUrl, setPreviewUrl] = useState("")
  const [previewName, setPreviewName] = useState("")

  const [newWarehouse, setNewWarehouse] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [orderItems, setOrderItems] = useState<SalesOrderItem[]>([])

  // New Quotation Form State
  const [quoteCustomerId, setQuoteCustomerId] = useState("")
  const [quoteWarehouse, setQuoteWarehouse] = useState("")
  const [quoteValidDays, setQuoteValidDays] = useState("")
  const [quoteDesc, setQuoteDesc] = useState("")
  const [quoteItems] = useState<SalesOrderItem[]>([])

  // Filtered data for tables
  const filteredOrders = salesOrders.filter((so) => {
    const matchesSearch =
      so.customer.toLowerCase().includes(soSearch.toLowerCase()) ||
      so.id.toLowerCase().includes(soSearch.toLowerCase()) ||
      so.desc.toLowerCase().includes(soSearch.toLowerCase())
    if (!matchesSearch) return false
    if (soWhFilter !== "ALL" && so.warehouse !== soWhFilter) return false
    return true
  })

  // Table Columns setup
  const salesOrderColumns: TableColumn[] = [
    { key: "id", label: "Order ID", align: "left" },
    { key: "customer", label: "Customer", align: "left" },
    { key: "warehouse", label: "Warehouse", align: "left" },
    { key: "docsStatus", label: "Required Docs", align: "left" },
    { key: "amount", label: "Amount (ETB)", align: "right" },
    { key: "_actions", label: "Action", align: "center", noSort: true },
  ]

function resolveWarehouseCode(rawWh: string | undefined, warehousesList: Array<{ id: string; code?: string; name?: string }>): string {
  if (!warehousesList || warehousesList.length === 0) return "WH1"
  if (!rawWh) return warehousesList[0].code || warehousesList[0].id
  const clean = rawWh.trim().toLowerCase()
  const match = warehousesList.find((w) => 
    (w.code && w.code.toLowerCase() === clean) ||
    (w.id && w.id.toLowerCase() === clean) ||
    (w.name && w.name.toLowerCase() === clean) ||
    (w.code && clean.includes(w.code.toLowerCase())) ||
    (w.id && clean.includes(w.id.toLowerCase()))
  )
  return match ? (match.code || match.id) : (warehousesList[0].code || warehousesList[0].id)
}

  // Open New Order modal prefilled with default line item and product warehouse
  const handleOpenNewOrderModal = () => {
    const defaultProduct = products[0] || { id: "PRD-001", name: "Amoxicillin 500mg", sku: "AMX-500", valuationRate: 150, unit: "Box", sellingPrice: 150, warehouse: "WH1" }
    const loadedPrice = defaultProduct.sellingPrice || defaultProduct.unitCost || defaultProduct.valuationRate || 150
    
    // Robustly resolve warehouse code
    const targetWh = resolveWarehouseCode(defaultProduct.warehouse, warehouses)
    setNewWarehouse(targetWh)

    setOrderItems([
      {
        productId: defaultProduct.id,
        name: defaultProduct.name,
        qty: 10,
        unit: defaultProduct.unit || "Box",
        unitPrice: loadedPrice,
        total: loadedPrice * 10,
      },
    ])
    setIsNewOrderOpen(true)
  }

  // Item Row Handlers for New/Edit Order
  const handleOrderItemChange = (index: number, field: keyof SalesOrderItem, value: any, isEditing = false) => {
    const setter = isEditing ? setEditingOrderItems : setOrderItems
    setter((prev) => {
      const next = [...prev]
      const current = { ...next[index] }

      if (field === "productId") {
        const prod = products.find((p) => p.id === value)
        if (prod) {
          const loadedPrice = prod.sellingPrice || prod.unitCost || prod.valuationRate || 150
          current.productId = prod.id
          current.name = prod.name
          current.unit = prod.unit || "Box"
          current.unitPrice = loadedPrice
          current.total = current.qty * current.unitPrice

          // Auto-bind warehouse to product's designated stock warehouse
          if (!isEditing) {
            const targetWh = resolveWarehouseCode(prod.warehouse, warehouses)
            setNewWarehouse(targetWh)
          }
        }
      } else if (field === "qty") {
        const parsed = Math.max(0, Number(value) || 0)
        current.qty = parsed
        current.total = current.qty * current.unitPrice
      } else if (field === "unitPrice") {
        const parsed = Math.max(0, Number(value) || 0)
        current.unitPrice = parsed
        current.total = current.qty * current.unitPrice
      } else if (field === "unit") {
        current.unit = String(value)
      }

      next[index] = current
      return next
    })
  }

  const handleAddOrderItemRow = (isEditing = false) => {
    const p = products[0] || { id: "PRD-001", name: "Amoxicillin 500mg", unit: "Box", valuationRate: 150, sellingPrice: 150 }
    const loadedPrice = p.sellingPrice || p.unitCost || p.valuationRate || 150
    const setter = isEditing ? setEditingOrderItems : setOrderItems
    setter((prev) => [
      ...prev,
      {
        productId: p.id,
        name: p.name,
        qty: 10,
        unit: p.unit || "Box",
        unitPrice: loadedPrice,
        total: loadedPrice * 10,
      },
    ])
  }

  const handleRemoveOrderItemRow = (index: number, isEditing = false) => {
    const setter = isEditing ? setEditingOrderItems : setOrderItems
    setter((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  // State for Editing Sales Order
  const [editingOrderItems, setEditingOrderItems] = useState<SalesOrderItem[]>([])
  const [editingCustPhone, setEditingCustPhone] = useState("")

  const handleOpenEditModal = async (so: SalesOrder) => {
    setEditingOrder(so)
    setEditingCustPhone(so.customerPhone || "")
    setCustomerSearchInput(so.customer)
    setEditingOrderItems(so.items.length > 0 ? [...so.items] : [
      {
        productId: products[0]?.id || "PRD-001",
        name: products[0]?.name || "Amoxicillin 500mg",
        qty: 10,
        unit: products[0]?.unit || "Box",
        unitPrice: products[0]?.valuationRate || 150,
        total: (products[0]?.valuationRate || 150) * 10,
      }
    ])

    // Load existing attached docs for editing using the unified resolution engine
    const existingDocs = await fetchShipmentDocs(so.id, "sales_order")
    const cust = customers.find((c) => c.id === so.customerId || c.name === so.customer)

    const resolved = resolveSalesOrderDocs(
      so.id,
      so.customer,
      cust?.tradePaperUrl,
      cust?.tradePaperFileName,
      existingDocs
    )

    setStagedTradePaperName(resolved.tradeLicense?.file_name || "")
    setStagedTradePaperUrl(resolved.tradeLicense?.file_url || "")
    setStagedPaymentAdviceName(resolved.paymentAdvice?.file_name || "")
    setStagedPaymentAdviceUrl(resolved.paymentAdvice?.file_url || "")

    setIsEditOrderOpen(true)
  }

  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrder) return

    const matchedCust = customers.find((c) => c.id === editingOrder.customerId || c.name === editingOrder.customer)
    if (matchedCust) {
      const evaluation = getTradeLicenseStatus(matchedCust)
      if (evaluation.status !== "valid" && (!stagedTradePaperUrl || !stagedTradePaperName)) {
        showToast("Validation Error", "warning", "An active (unexpired) Trade License must be uploaded for this customer.")
        return
      }
    }

    const sanitizedItems: SalesOrderItem[] = editingOrderItems.map((i) => {
      const q = Math.max(1, Number(i.qty) || 1)
      const p = Math.max(0, Number(i.unitPrice) || 0)
      return { ...i, qty: q, unitPrice: p, total: q * p }
    })

    const totalAmt = sanitizedItems.reduce((sum, i) => sum + i.total, 0)
    const updatedSo: SalesOrder = {
      ...editingOrder,
      customerPhone: editingCustPhone.trim(),
      items: sanitizedItems,
      amount: totalAmt,
    }

    erp.updateSalesOrder(updatedSo)

    // Sync attachments to customer registry profile
    if (matchedCust) {
      const isNewFile = stagedTradePaperUrl !== (matchedCust.tradePaperUrl || "")
      const uploadedAt = isNewFile ? new Date().toISOString() : matchedCust.tradePaperUploadedAt

      erp.updateCustomer(matchedCust.id, {
        tradePaperFileName: stagedTradePaperName || matchedCust.tradePaperFileName,
        tradePaperUrl: stagedTradePaperUrl || matchedCust.tradePaperUrl,
        tradePaperUploadedAt: uploadedAt,
      })
    }

    // Save/Upload staged files
    if (stagedTradePaperUrl && stagedTradePaperName) {
      try {
        await uploadShipmentDoc({
          record_id: editingOrder.id,
          record_type: "sales_order",
          document_type: "Trade License",
          file_name: stagedTradePaperName,
          file_size: 102400,
          file_url: stagedTradePaperUrl,
          uploaded_at: new Date().toISOString(),
          uploaded_by: "Sales Officer",
        })
      } catch (err) {
        console.error("Failed uploading Trade License:", err)
      }
    }

    if (stagedPaymentAdviceUrl && stagedPaymentAdviceName) {
      try {
        await uploadShipmentDoc({
          record_id: editingOrder.id,
          record_type: "sales_order",
          document_type: "Payment Advice",
          file_name: stagedPaymentAdviceName,
          file_size: 102400,
          file_url: stagedPaymentAdviceUrl,
          uploaded_at: new Date().toISOString(),
          uploaded_by: "Sales Officer",
        })
      } catch (err) {
        console.error("Failed uploading Payment Advice:", err)
      }
    }

    // Refresh attachments map for order
    const updatedDocs = await fetchShipmentDocs(editingOrder.id, "sales_order")
    setSoAttachmentsMap((prev) => ({ ...prev, [editingOrder.id]: updatedDocs }))

    setIsEditOrderOpen(false)
    setEditingOrder(null)
    showToast("Sales Order Updated", "success", `Sales Order contract ${updatedSo.id} updated successfully.`)
  }

  // Handle Create Sales Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    let finalCustName = customerSearchInput.trim()
    if (!finalCustName && newCustomerId) {
      const found = customers.find((c) => c.id === newCustomerId)
      if (found) finalCustName = found.name
    }

    if (!custPhone.trim()) {
      showToast("Validation Error", "warning", "Customer phone number is required.")
      return
    }

    let selectedCust = customers.find(
      (c) => c.id === newCustomerId || (c.name && c.name.toLowerCase() === finalCustName.toLowerCase())
    )

    if (selectedCust) {
      const evaluation = getTradeLicenseStatus(selectedCust)
      if (evaluation.status !== "valid" && (!stagedTradePaperUrl || !stagedTradePaperName)) {
        showToast("Validation Error", "warning", "An active (unexpired) Trade License must be uploaded for this customer.")
        return
      }
    } else {
      if (!stagedTradePaperUrl || !stagedTradePaperName) {
        showToast("Validation Error", "warning", "A Trade License must be uploaded for a new customer registration.")
        return
      }
    }

    if (!selectedCust) {
      const generatedCustId = `CUST-${Date.now().toString().slice(-4)}`
      selectedCust = {
        id: generatedCustId,
        name: finalCustName,
        country: "Ethiopia",
        category: "Commercial Union",
        phone: custPhone.trim(),
        email: custEmail,
        address: custAddress,
        tradePaperFileName: stagedTradePaperName,
        tradePaperUrl: stagedTradePaperUrl,
        tradePaperUploadedAt: stagedTradePaperUrl ? new Date().toISOString() : undefined,
        status: "Active",
      }
      if (saveCustomerToRegistry) {
        erp.addCustomer(selectedCust)
      }
    } else {
      const isNewFile = stagedTradePaperUrl !== (selectedCust.tradePaperUrl || "")
      const uploadedAt = isNewFile ? new Date().toISOString() : selectedCust.tradePaperUploadedAt

      erp.updateCustomer(selectedCust.id, {
        tradePaperFileName: stagedTradePaperName || selectedCust.tradePaperFileName,
        tradePaperUrl: stagedTradePaperUrl || selectedCust.tradePaperUrl,
        tradePaperUploadedAt: uploadedAt,
      })
    }

    const rawItems = orderItems.length > 0 ? orderItems : [
      {
        productId: products[0]?.id || "PRD-001",
        name: products[0]?.name || "Amoxicillin 500mg",
        qty: 10,
        unit: products[0]?.unit || "Box",
        unitPrice: products[0]?.valuationRate || 150,
        total: (products[0]?.valuationRate || 150) * 10,
      }
    ]

    const finalItems: SalesOrderItem[] = rawItems.map((i) => {
      const q = Math.max(1, Number(i.qty) || 1)
      const p = Math.max(0, Number(i.unitPrice) || 0)
      return { ...i, qty: q, unitPrice: p, total: q * p }
    })

    const totalAmt = finalItems.reduce((sum, item) => sum + item.total, 0)
    const targetWh = newWarehouse || (warehouses[0]?.code || "WH1")
    const wh = warehouses.find((w) => w.code === targetWh || w.id === targetWh)
    const soId = `SO-${Date.now().toString().slice(-4)}`

    const newSo: SalesOrder = {
      id: soId,
      customer: selectedCust.name,
      customerId: selectedCust.id,
      customerPhone: custPhone.trim(),
      customerGroup: selectedCust.category,
      warehouse: targetWh,
      warehouseName: wh ? `${wh.code} - ${wh.name}` : targetWh,
      date: new Date().toISOString().split("T")[0],
      amount: totalAmt,
      currency: "ETB",
      stage: "Quote",
      desc: newDesc || `Sales Order contract for ${selectedCust.name}`,
      initials: selectedCust.name.slice(0, 2).toUpperCase(),
      label: selectedCust.contactPerson || selectedCust.name,
      avatarBg: "bg-emerald-100 text-emerald-800",
      urgent: false,
      attachment: true,
      items: finalItems,
      deliveredAmount: 0,
      billedAmount: 0,
      deliveryStatus: "Not Delivered",
      billingStatus: "Not Billed",
      paymentTerms,
    }

    // Upload staged attachments
    if (stagedTradePaperUrl && stagedTradePaperName) {
      try {
        await uploadShipmentDoc({
          record_id: soId,
          record_type: "sales_order",
          document_type: "Trade License",
          file_name: stagedTradePaperName,
          file_size: 102400,
          file_url: stagedTradePaperUrl,
          uploaded_at: new Date().toISOString(),
          uploaded_by: "Sales Officer",
        })
      } catch (err) {
        console.error("Failed uploading Trade License:", err)
      }
    }

    if (stagedPaymentAdviceUrl && stagedPaymentAdviceName) {
      try {
        await uploadShipmentDoc({
          record_id: soId,
          record_type: "sales_order",
          document_type: "Payment Advice",
          file_name: stagedPaymentAdviceName,
          file_size: 102400,
          file_url: stagedPaymentAdviceUrl,
          uploaded_at: new Date().toISOString(),
          uploaded_by: "Sales Officer",
        })
      } catch (err) {
        console.error("Failed uploading Payment Advice:", err)
      }
    }

    const docs = await fetchShipmentDocs(soId, "sales_order")
    setSoAttachmentsMap((prev) => ({ ...prev, [soId]: docs }))

    erp.addSalesOrder(newSo)

    showToast("Sales Order Created", "success", `Contract ${newSo.id} created under Quote stage for ${selectedCust.name}.`)
    setIsNewOrderOpen(false)
    setNewDesc("")
    setCustomerSearchInput("")
    setNewCustomerId("")
    setStagedTradePaperName("")
    setStagedTradePaperUrl("")
    setStagedPaymentAdviceName("")
    setStagedPaymentAdviceUrl("")
  }

  // Handle Create Quotation
  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedCust = customers.find((c) => c.id === quoteCustomerId)
    if (!selectedCust || !quoteWarehouse || !quoteValidDays) {
      showToast("Validation Error", "warning", "Please select a customer, warehouse, and valid-until period.")
      return
    }

    const defaultItemProduct = products[0] || { id: "PRD-001", name: "Amoxicillin 500mg", sku: "AMX-500", valuationRate: 150 }
    const finalItems: SalesOrderItem[] = quoteItems.length > 0 ? quoteItems : [
      {
        productId: defaultItemProduct.id,
        name: defaultItemProduct.name,
        qty: 100,
        unit: "Pcs",
        unitPrice: defaultItemProduct.valuationRate || 150,
        total: (defaultItemProduct.valuationRate || 150) * 100,
      }
    ]

    const totalAmt = finalItems.reduce((sum, item) => sum + item.total, 0)
    const wh = warehouses.find((w) => w.code === quoteWarehouse)
    const validTillDate = new Date()
    validTillDate.setDate(validTillDate.getDate() + Number(quoteValidDays))

    const newQt: Quotation = {
      id: `QT-${Date.now().toString().slice(-4)}`,
      customer: selectedCust.name,
      customerId: selectedCust.id,
      customerGroup: selectedCust.category,
      warehouse: quoteWarehouse,
      warehouseName: wh ? `${wh.code} - ${wh.name}` : quoteWarehouse,
      date: new Date().toISOString().split("T")[0],
      validTill: validTillDate.toISOString().split("T")[0],
      amount: totalAmt,
      currency: "ETB",
      status: "Draft",
      desc: quoteDesc || `Pro-forma Quotation for ${selectedCust.name}`,
      paymentTerms,
      items: finalItems,
    }

    erp.addQuotation(newQt)
    showToast("Quotation Generated", "success", `Pro-Forma ${newQt.id} created for ${selectedCust.name}.`)
    setIsNewQuotationOpen(false)
    setQuoteDesc("")
  }

  // Confirm Sales Invoice Creation
  const handleConfirmInvoice = () => {
    if (!selectedOrder) return

    const res = erp.createSalesInvoiceForSalesOrder(selectedOrder.id, taxPercent, paymentTerms)
    if (res.success && res.invoiceId) {
      showToast(
        "Sales Invoice Generated",
        "success",
        `Invoice ${res.invoiceId} created in Finance Store with ${taxPercent}% Tax! Accounts Receivable GL entry updated.`
      )
      setIsInvoiceModalOpen(false)
      const updated = erp.getSalesOrderById(selectedOrder.id)
      if (updated) setSelectedOrder(updated)
    } else {
      showToast("Billing Error", "warning", res.error || "Could not generate Sales Invoice.")
    }
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={fade} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-black tracking-tight">Sales Orders & Contracts</h1>
            </div>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Manage sales contracts, fulfillment, and invoicing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SubPageNav items={getSectionChildren("/sales")} />
          </div>
        </div>

        {/* SALES ORDERS REGISTER */}
        <DataTable
          title="Sales Orders Register"
          subtitle={`Total: ${filteredOrders.length} sales contracts`}
          columns={salesOrderColumns}
          data={filteredOrders}
          isLoading={isLoading}
          searchQuery={soSearch}
          onSearchChange={setSoSearch}
          searchPlaceholder="Search order ID, client..."
          filters={[
            {
              value: soWhFilter,
              onChange: setSoWhFilter,
              ariaLabel: "Filter by Warehouse",
              options: [{ value: "ALL", label: "All Warehouses" }, ...warehouseOptions],
            },
          ]}
          actions={[
            {
              label: "New Order",
              onClick: handleOpenNewOrderModal,
              icon: <Plus className="size-4" />,
              variant: "primary",
            },
          ]}
          defaultWidths={{
            id: 120,
            customer: 260,
            warehouse: 140,
            docsStatus: 220,
            amount: 160,
            _actions: 120,
          }}
          keyExtractor={(so) => so.id}
          renderRow={(so, colWidths) => (
            <>
              <td style={{ width: `${colWidths.id}px` }} className="py-4 px-6 overflow-hidden">
                <div className="flex flex-col">
                  <span className="font-black text-zinc-950 text-xs tracking-tight leading-tight mb-0.5 truncate font-mono">
                    {so.id}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase">
                    {so.date}
                  </span>
                </div>
              </td>

              <td style={{ width: `${colWidths.customer}px` }} className="py-4 px-4 overflow-hidden">
                <div className="flex flex-col">
                  <span className="font-black text-zinc-950 text-xs tracking-tight leading-tight mb-0.5 truncate">
                    {so.customer}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold tracking-tight truncate">
                    {so.customerPhone ? `📞 ${so.customerPhone} • ` : ""}{so.customerGroup || "Client"}
                  </span>
                </div>
              </td>

              <td style={{ width: `${colWidths.warehouse}px` }} className="py-4 px-4 overflow-hidden">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight bg-zinc-100 border border-zinc-200/50 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                  {so.warehouse}
                </span>
              </td>

              <td style={{ width: `${colWidths.docsStatus}px` }} className="py-4 px-4 overflow-hidden">
                {(() => {
                  const docs = soAttachmentsMap[so.id] || []
                  const hasTrade = docs.some((d) => d.document_type === "Trade License" || d.document_type === "Trade Paper")
                  const hasAdvice = docs.some((d) => d.document_type === "Payment Advice")
                  if (hasTrade && hasAdvice) {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="size-3 text-emerald-600" /> Docs Complete
                      </span>
                    )
                  }
                  if (!hasTrade && !hasAdvice) {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        <AlertTriangle className="size-3 text-amber-600" /> Trade & Advice Missing
                      </span>
                    )
                  }
                  if (!hasAdvice) {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        <AlertTriangle className="size-3 text-amber-600" /> Advice Missing
                      </span>
                    )
                  }
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      <AlertTriangle className="size-3 text-amber-600" /> Trade License Missing
                    </span>
                  )
                })()}
              </td>

              <td style={{ width: `${colWidths.amount}px` }} className="py-4 px-4 text-right font-mono text-xs overflow-hidden">
                <div className="font-black text-zinc-950">ETB {so.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                <div className="mt-0.5 text-[9px] font-bold uppercase text-zinc-400">{so.items?.length || 0} items</div>
              </td>

              <td style={{ width: `${colWidths._actions}px` }} className="py-4 px-4 text-center whitespace-nowrap overflow-hidden">
                <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleOpenEditModal(so)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-[11px] transition-all border border-zinc-200/80 active:scale-95 shadow-2xs"
                    title="Edit Sales Order"
                  >
                    <Pencil className="size-3 text-zinc-700" /> Edit
                  </button>
                </div>
              </td>
            </>
          )}
        />
      </motion.div>

      {/* MODAL: GENERATE SALES INVOICE */}
      <AnimatePresence>
        {isInvoiceModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <h2 className="text-xl font-black text-zinc-950 mb-1">Generate Sales Invoice</h2>
              <p className="text-xs font-semibold text-zinc-500 mb-4">
                Creates an Accounts Receivable invoice in Finance for customer <span className="font-bold text-zinc-800">{selectedOrder.customer}</span>.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Tax Percent</label>
                  <input
                    type="number"
                    min="0"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Payment Terms</label>
                  <select 
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                  >
                    <option value="">Select payment terms</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Payment on Delivery">Payment on Delivery</option>
                  </select>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 font-mono text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Contract Subtotal:</span>
                    <span className="font-bold">ETB {selectedOrder.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tax Amount ({taxPercent}%):</span>
                    <span className="font-bold text-amber-700">ETB {(selectedOrder.amount * (taxPercent / 100)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-zinc-200 font-black">
                    <span>Total Invoiced Amount:</span>
                    <span className="text-emerald-700">ETB {(selectedOrder.amount * (1 + taxPercent / 100)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmInvoice}
                  className="px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md"
                >
                  Generate Sales Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: NEW SALES ORDER */}
      <AnimatePresence>
        {isNewOrderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop: Click outside to close */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewOrderOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-white rounded-3xl p-6 max-w-5xl w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              {/* Header with Close X Button */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-zinc-950 mb-0.5">Create HKC Sales Contract</h2>
                  <p className="text-xs font-semibold text-zinc-500">Draft a new sales contract with item quantities, packaging units, and prices.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewOrderOpen(false)}
                  className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                  title="Close modal"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                {/* ROW 1: Customer Name (Lengthy), Phone Number, Warehouse */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Customer Combobox - Lengthy (col-span-5) */}
                  <div className="md:col-span-5 relative" ref={customerComboboxRef}>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Customer / Union Name *</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        placeholder="Type to search or enter customer name..."
                        value={customerSearchInput}
                        onChange={(e) => {
                          const val = e.target.value
                          setCustomerSearchInput(val)
                          setShowCustomerDropdown(true)
                          const matched = customers.find((c) => c.name.toLowerCase() === val.trim().toLowerCase())
                          if (matched) {
                            setNewCustomerId(matched.id)
                            setCustPhone(matched.phone || "")
                            setCustEmail(matched.email || "")
                            setCustAddress(matched.address || "")

                            const evaluation = getTradeLicenseStatus(matched)
                            if (evaluation.status === "valid" && matched.tradePaperFileName && matched.tradePaperUrl) {
                              setStagedTradePaperName(matched.tradePaperFileName)
                              setStagedTradePaperUrl(matched.tradePaperUrl)
                            } else {
                              setStagedTradePaperName("")
                              setStagedTradePaperUrl("")
                            }
                          } else {
                            setNewCustomerId("")
                          }
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape" || e.key === "Enter") {
                            setShowCustomerDropdown(false)
                          }
                        }}
                        className="w-full pl-3 pr-12 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {customerSearchInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerSearchInput("")
                              setNewCustomerId("")
                              setCustPhone("")
                              setShowCustomerDropdown(false)
                            }}
                            className="text-zinc-400 hover:text-zinc-700 p-0.5"
                            title="Clear input"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                          className="text-zinc-400 hover:text-zinc-700 p-0.5 rounded hover:bg-zinc-200/60"
                          title="Toggle customer list"
                        >
                          {showCustomerDropdown ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Combobox Dropdown */}
                    {showCustomerDropdown && customers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-2xl border border-zinc-200 shadow-xl max-h-48 overflow-y-auto divide-y divide-zinc-100">
                        {customers
                          .filter((c) => (c.name || "").toLowerCase().includes(customerSearchInput.toLowerCase()))
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setNewCustomerId(c.id)
                                setCustomerSearchInput(c.name)
                                setCustPhone(c.phone || "")
                                setCustEmail(c.email || "")
                                setCustAddress(c.address || "")
                                const evaluation = getTradeLicenseStatus(c)
                                if (evaluation.status === "valid" && c.tradePaperFileName && c.tradePaperUrl) {
                                  setStagedTradePaperName(c.tradePaperFileName)
                                  setStagedTradePaperUrl(c.tradePaperUrl)
                                } else {
                                  setStagedTradePaperName("")
                                  setStagedTradePaperUrl("")
                                }
                                setShowCustomerDropdown(false)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-zinc-900 block">{c.name}</span>
                                <span className="text-[10px] text-zinc-500 font-medium">
                                  {c.phone ? `📞 ${c.phone} • ` : ""}{c.category || "General Client"}
                                </span>
                              </div>
                              {c.tradePaperFileName && (
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                  Trade License Saved
                                </span>
                              )}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Phone Number (col-span-3) */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Customer Phone Number *</label>
                    <div className="relative flex items-center">
                      <Phone className="size-3.5 text-zinc-400 absolute left-3" />
                      <input
                        type="text"
                        required
                        placeholder="+251 91 123 4567"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  {/* Warehouse (col-span-4) */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Fulfillment Warehouse <span className="text-[10px] font-normal text-zinc-400 font-mono">(Auto-locked)</span>
                    </label>
                    <select 
                      value={newWarehouse}
                      disabled={true}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold outline-none text-zinc-700 cursor-not-allowed"
                    >
                      <option value="">Select warehouse</option>
                      {warehouseOptions.map((warehouse) => (
                        <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-zinc-400 font-semibold block mt-1">
                      🔒 Locked: Auto-derived from selected stock item location
                    </span>
                  </div>
                </div>

                {/* Save New Customer Checkbox */}
                {!customers.some((c) => c.id === newCustomerId) && customerSearchInput.trim() !== "" && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="saveCustomerCheck"
                      checked={saveCustomerToRegistry}
                      onChange={(e) => setSaveCustomerToRegistry(e.target.checked)}
                      className="size-4 rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                    />
                    <label htmlFor="saveCustomerCheck" className="text-xs font-bold text-emerald-950 cursor-pointer">
                      Save new customer details & Trade License to registry for future orders
                    </label>
                  </div>
                )}

                {/* ROW 2: Contract Description (Full Width) */}
                <div className="w-full">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Contract Description</label>
                  <textarea 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                    placeholder="Enter sales contract terms or description..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold outline-none resize-none" 
                  />
                </div>

                {/* Warning banner if license is missing or expired */}
                {(() => {
                  const selectedCust = customers.find(c => c.id === newCustomerId)
                  if (selectedCust) {
                    const evaluation = getTradeLicenseStatus(selectedCust)
                    if (evaluation.status !== "valid") {
                      return (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 mb-3">
                          <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black uppercase tracking-wider block">Warning: Trade License Missing or Expired</span>
                            <span className="text-[11px] block mt-0.5 leading-normal">
                              This customer's trade license has expired (exceeded 30 days) or is missing.
                              You <strong>must</strong> upload a new trade license to create this sales order.
                            </span>
                          </div>
                        </div>
                      )
                    }
                  }
                  return null
                })()}

                {/* Minimalistic Required Document Attachments Section */}
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-900 block">Required Order Documentation</span>
                      <span className="text-[11px] text-zinc-500 font-medium block">Attach mandatory Trade License and Payment Advice receipt for this sales contract</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Trade License Dropzone */}
                    <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                          <FileText className="size-3.5 text-emerald-600" /> Trade License / Business Permit
                        </span>
                        {stagedTradePaperName ? (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Pre-attached</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Required</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="cursor-pointer px-3 py-1 rounded-lg bg-zinc-900 text-white font-bold text-[11px] hover:bg-zinc-800 flex items-center gap-1 shrink-0">
                          <FileCheck className="size-3" /> Select File
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) {
                                const reader = new FileReader()
                                reader.onload = () => {
                                  setStagedTradePaperName(f.name)
                                  setStagedTradePaperUrl(reader.result as string)
                                }
                                reader.readAsDataURL(f)
                              }
                            }}
                          />
                        </label>
                        <span className="text-[11px] font-mono text-zinc-600 truncate flex-1">
                          {stagedTradePaperName || "No file selected"}
                        </span>
                        {stagedTradePaperUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewUrl(stagedTradePaperUrl)
                              setPreviewName(stagedTradePaperName || "Trade License")
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md inline-flex items-center gap-1 shrink-0"
                          >
                            View Doc <ExternalLink className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Payment Advice Dropzone */}
                    <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-blue-600" /> Payment Advice / Receipt
                        </span>
                        {stagedPaymentAdviceName ? (
                          <span className="text-[9px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Attached</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Required</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="cursor-pointer px-3 py-1 rounded-lg bg-zinc-900 text-white font-bold text-[11px] hover:bg-zinc-800 flex items-center gap-1 shrink-0">
                          <FileCheck className="size-3" /> Select Advice File
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
                          {stagedPaymentAdviceName || "No file selected"}
                        </span>
                        {stagedPaymentAdviceUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewUrl(stagedPaymentAdviceUrl)
                              setPreviewName(stagedPaymentAdviceName || "Payment Advice")
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md inline-flex items-center gap-1 shrink-0"
                          >
                            View Doc <ExternalLink className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black uppercase text-zinc-900 tracking-wide">
                      Contract Line Items (Products, Quantities & Prices)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddOrderItemRow(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 transition-colors"
                    >
                      <Plus className="size-3" /> Add Item Row
                    </button>
                  </div>

                  <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="px-3 py-2 w-[35%]">Product Item</th>
                          <th className="px-3 py-2 w-[18%] text-center">Qty</th>
                          <th className="px-3 py-2 w-[20%] text-center">Unit</th>
                          <th className="px-3 py-2 w-[20%] text-right">Unit Price</th>
                          <th className="px-3 py-2 w-[7%] text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {orderItems.map((item, index) => {
                          const p = products.find((prod) => prod.id === item.productId)
                          const avail = p ? (newWarehouse && newWarehouse !== "ALL" ? (p.stockBreakdown?.find((sb) => sb.warehouse === newWarehouse)?.qty ?? p.quantity) : p.quantity) : 0
                          const isOver = item.qty > avail
                          return (
                            <tr key={index}>
                              <td className="p-2">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleOrderItemChange(index, "productId", e.target.value, false)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold"
                                >
                                  {products.map((prod) => (
                                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                                  ))}
                                </select>
                                <div className="mt-1 flex flex-col gap-0.5 text-[10px]">
                                  <span className="text-zinc-500 font-bold">Store Available: <span className="font-mono font-black text-zinc-900">{avail} {item.unit}</span></span>
                                  {isOver && (
                                    <span className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-0.5">
                                      <AlertTriangle className="size-3 text-amber-600 shrink-0" />
                                      <span>Insufficient Stock ({item.qty} &gt; {avail})</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty === 0 ? "" : item.qty}
                                  onChange={(e) => handleOrderItemChange(index, "qty", e.target.value, false)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono font-bold text-center"
                                />
                              </td>
                              <td className="p-2 align-top">
                                <select
                                  value={item.unit}
                                  onChange={(e) => handleOrderItemChange(index, "unit", e.target.value, false)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-center"
                                >
                                  {CONTAINER_UNITS.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice === 0 ? "" : item.unitPrice}
                                  onChange={(e) => handleOrderItemChange(index, "unitPrice", e.target.value, false)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono font-bold text-right"
                                />
                              </td>
                              <td className="p-2 text-center align-top pt-2.5">
                                {orderItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOrderItemRow(index, false)}
                                    className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 font-mono text-xs flex justify-between items-center">
                    <span className="text-zinc-500 font-sans font-bold">Total Contract Amount:</span>
                    <span className="font-black text-sm text-emerald-800">
                      ETB {orderItems.reduce((sum, i) => sum + i.total, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button 
                    type="button" 
                    onClick={() => setIsNewOrderOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md"
                  >
                    Create Contract
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT SALES ORDER */}
      <AnimatePresence>
        {isEditOrderOpen && editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop: Click outside to close */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOrderOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-white rounded-3xl p-6 max-w-5xl w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              {/* Reusable Header with 3-Dot Options Dropdown */}
              <EditModalHeader
                title={`Edit Sales Order (${editingOrder.id})`}
                subtitle="Update contract terms, customer details, products, and required order documentation."
                onClose={() => setIsEditOrderOpen(false)}
                onRequestDelete={() => setDeletingOrder(editingOrder)}
                deleteLabel="Delete Sales Order"
              />

              <form onSubmit={handleSaveEditOrder} className="space-y-4">
                {/* ROW 1: Customer Name, Phone Number, Warehouse */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-5">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Customer / Union Name *</label>
                    <select 
                      value={editingOrder.customerId}
                      onChange={(e) => {
                        const cust = customers.find((c) => c.id === e.target.value)
                        setEditingOrder({
                          ...editingOrder,
                          customerId: e.target.value,
                          customer: cust ? cust.name : editingOrder.customer,
                        })
                        if (cust) {
                          setEditingCustPhone(cust.phone || editingCustPhone)
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Customer Phone Number *</label>
                    <div className="relative flex items-center">
                      <Phone className="size-3.5 text-zinc-400 absolute left-3" />
                      <input
                        type="text"
                        required
                        placeholder="+251 91 123 4567"
                        value={editingCustPhone}
                        onChange={(e) => setEditingCustPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Fulfillment Warehouse</label>
                    <select 
                      value={editingOrder.warehouse}
                      onChange={(e) => setEditingOrder({ ...editingOrder, warehouse: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      {warehouseOptions.map((warehouse) => (
                        <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ROW 2: Contract Description */}
                <div className="w-full">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Contract Description</label>
                  <textarea 
                    value={editingOrder.desc}
                    onChange={(e) => setEditingOrder({ ...editingOrder, desc: e.target.value })}
                    rows={2}
                    placeholder="Enter contract terms..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold outline-none resize-none" 
                  />
                </div>

                {/* Warning banner in Edit Modal if license is missing or expired */}
                {(() => {
                  const selectedCust = customers.find(c => c.id === editingOrder.customerId || c.name === editingOrder.customer)
                  if (selectedCust) {
                    const evaluation = getTradeLicenseStatus(selectedCust)
                    if (evaluation.status !== "valid") {
                      return (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 mb-3">
                          <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black uppercase tracking-wider block">Warning: Trade License Missing or Expired</span>
                            <span className="text-[11px] block mt-0.5 leading-normal">
                              This customer's trade license has expired (exceeded 30 days) or is missing.
                              You <strong>must</strong> upload a new trade license to update this sales order.
                            </span>
                          </div>
                        </div>
                      )
                    }
                  }
                  return null
                })()}

                {/* ROW 3: Minimalistic Required Document Attachments Section */}
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-900 block">Required Order Documentation</span>
                      <span className="text-[11px] text-zinc-500 font-medium block">View attached files or upload missing Trade License and Payment Advice</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Trade License Dropzone */}
                    <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                          <FileText className="size-3.5 text-emerald-600" /> Trade License / Business Permit
                        </span>
                        {stagedTradePaperName ? (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Attached</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Missing</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="cursor-pointer px-3 py-1 rounded-lg bg-zinc-900 text-white font-bold text-[11px] hover:bg-zinc-800 flex items-center gap-1 shrink-0">
                          <FileCheck className="size-3" /> Select File
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) {
                                const reader = new FileReader()
                                reader.onload = () => {
                                  setStagedTradePaperName(f.name)
                                  setStagedTradePaperUrl(reader.result as string)
                                }
                                reader.readAsDataURL(f)
                              }
                            }}
                          />
                        </label>
                        <span className="text-[11px] font-mono text-zinc-600 truncate flex-1">{stagedTradePaperName || "No file attached"}</span>
                        {stagedTradePaperUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewUrl(stagedTradePaperUrl)
                              setPreviewName(stagedTradePaperName || "Trade License")
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md inline-flex items-center gap-1 shrink-0"
                          >
                            View Doc <ExternalLink className="size-3" />
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
                          <span className="text-[9px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Attached</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Missing</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="cursor-pointer px-3 py-1 rounded-lg bg-zinc-900 text-white font-bold text-[11px] hover:bg-zinc-800 flex items-center gap-1 shrink-0">
                          <FileCheck className="size-3" /> Select File
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
                        <span className="text-[11px] font-mono text-zinc-600 truncate flex-1">{stagedPaymentAdviceName || "No file attached"}</span>
                        {stagedPaymentAdviceUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewUrl(stagedPaymentAdviceUrl)
                              setPreviewName(stagedPaymentAdviceName || "Payment Advice")
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md inline-flex items-center gap-1 shrink-0"
                          >
                            View Doc <ExternalLink className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ROW 4: Line Items Table */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black uppercase text-zinc-900 tracking-wide">
                      Contract Line Items
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddOrderItemRow(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 transition-colors"
                    >
                      <Plus className="size-3" /> Add Item Row
                    </button>
                  </div>

                  <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-100 text-zinc-600 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="px-3 py-2 w-[35%]">Product Item</th>
                          <th className="px-3 py-2 w-[18%] text-center">Qty</th>
                          <th className="px-3 py-2 w-[20%] text-center">Unit</th>
                          <th className="px-3 py-2 w-[20%] text-right">Unit Price</th>
                          <th className="px-3 py-2 w-[7%] text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {editingOrderItems.map((item, index) => {
                          const p = products.find((prod) => prod.id === item.productId)
                          const avail = p ? (editingOrder.warehouse && editingOrder.warehouse !== "ALL" ? (p.stockBreakdown?.find((sb) => sb.warehouse === editingOrder.warehouse)?.qty ?? p.quantity) : p.quantity) : 0
                          const isOver = item.qty > avail
                          return (
                            <tr key={index}>
                              <td className="p-2">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleOrderItemChange(index, "productId", e.target.value, true)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold"
                                >
                                  {products.map((prod) => (
                                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                                  ))}
                                </select>
                                <div className="mt-1 flex flex-col gap-0.5 text-[10px]">
                                  <span className="text-zinc-500 font-bold">Store Available: <span className="font-mono font-black text-zinc-900">{avail} {item.unit}</span></span>
                                  {isOver && (
                                    <span className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-0.5">
                                      <AlertTriangle className="size-3 text-amber-600 shrink-0" />
                                      <span>Insufficient Stock ({item.qty} &gt; {avail})</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty === 0 ? "" : item.qty}
                                  onChange={(e) => handleOrderItemChange(index, "qty", e.target.value, true)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono font-bold text-center"
                                />
                              </td>
                              <td className="p-2 align-top">
                                <select
                                  value={item.unit}
                                  onChange={(e) => handleOrderItemChange(index, "unit", e.target.value, true)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-bold text-center"
                                >
                                  {CONTAINER_UNITS.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice === 0 ? "" : item.unitPrice}
                                  onChange={(e) => handleOrderItemChange(index, "unitPrice", e.target.value, true)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono font-bold text-right"
                                />
                              </td>
                              <td className="p-2 text-center align-top pt-2.5">
                                {editingOrderItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOrderItemRow(index, true)}
                                    className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 font-mono text-xs flex justify-between items-center">
                    <span className="text-zinc-500 font-sans font-bold">Total Contract Amount:</span>
                    <span className="font-black text-sm text-emerald-800">
                      ETB {editingOrderItems.reduce((sum, i) => sum + i.total, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button 
                    type="button" 
                    onClick={() => setIsEditOrderOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-full bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-md"
                  >
                    Save Order Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: NEW QUOTATION */}
      <AnimatePresence>
        {isNewQuotationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-xl font-black text-zinc-950 mb-1">Draft Pro-Forma Quotation</h2>
              <p className="text-xs font-semibold text-zinc-500 mb-5">Generates an ERPNext-aligned pro-forma quotation.</p>

              <form onSubmit={handleCreateQuotation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Target Customer</label>
                  <select 
                    value={quoteCustomerId}
                    onChange={(e) => setQuoteCustomerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                  >
                    <option value="">Select customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Warehouse</label>
                    <select 
                      value={quoteWarehouse}
                      onChange={(e) => setQuoteWarehouse(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      <option value="">Select warehouse</option>
                      {warehouseOptions.map((warehouse) => (
                        <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Validity (Days)</label>
                    <input 
                      type="number"
                      value={quoteValidDays}
                      onChange={(e) => setQuoteValidDays(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Quotation Notes</label>
                  <textarea 
                    value={quoteDesc}
                    onChange={(e) => setQuoteDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold outline-none resize-none" 
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setIsNewQuotationOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md"
                  >
                    Generate Quotation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REUSABLE DELETE CONFIRMATION MODAL */}
      <RecordDeleteModal
        isOpen={!!deletingOrder}
        title="Delete Sales Order Contract?"
        recordId={deletingOrder?.id}
        recordName={deletingOrder ? `${deletingOrder.customer} — ETB ${deletingOrder.amount.toLocaleString()}` : ""}
        description="This will permanently delete this Sales Order contract from system registry."
        onClose={() => setDeletingOrder(null)}
        onConfirmDelete={() => {
          if (!deletingOrder) return
          erp.deleteSalesOrder(deletingOrder.id)
          showToast("Order Deleted", "info", `Sales Order ${deletingOrder.id} removed successfully.`)
          setDeletingOrder(null)
          setIsEditOrderOpen(false)
          setEditingOrder(null)
        }}
      />

      {/* DOCUMENT PREVIEW MODAL */}
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
