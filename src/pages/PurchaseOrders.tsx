import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  Printer, 
  Package, 
  Truck, 
  Clock, 
  Search, 
  CheckCircle2, 
  FileText, 
  Building2, 
  X,
  CreditCard,
  ArrowRight,
  Boxes,
  FileCheck,
  ExternalLink
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore, type PurchaseOrder } from "@/lib/erpStore"
import { useFeedback } from "@/context/FeedbackContext"
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

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function PurchaseOrders() {
  const { showToast } = useFeedback()
  const erp = useErpStore()

  const purchaseOrders = erp.getPurchaseOrders()
  const suppliers = erp.getSuppliers()
  const warehouses = erp.getWarehouses()
  const products = erp.getProducts()

  const [selectedPoId, setSelectedPoId] = useState<string>(purchaseOrders[0]?.id || "PO-2026-089")
  const [filterTab, setFilterTab] = useState<"All POs" | "Draft" | "In Transit" | "Received">("All POs")
  const [searchQuery, setSearchQuery] = useState("")

  const [poAttachmentsMap, setPoAttachmentsMap] = useState<Record<string, ShipmentDocAttachment[]>>({})
  const [poInspectorTab, setPoInspectorTab] = useState<"Items" | "Import Docs">("Items")
  const [previewUrl, setPreviewUrl] = useState("")
  const [previewName, setPreviewName] = useState("")

  useEffect(() => {
    if (selectedPoId) {
      fetchShipmentDocs(selectedPoId, "purchase_order").then((docs) => {
        setPoAttachmentsMap((prev) => ({ ...prev, [selectedPoId]: docs }))
      })
    }
  }, [selectedPoId])

  // Modals
  const [isNewPoOpen, setIsNewPoOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)

  // New PO Form state
  const [newSupplierId, setNewSupplierId] = useState(suppliers[0]?.id || "SUPP-001")
  const [customSupplierName, setCustomSupplierName] = useState("")
  const [newWarehouse, setNewWarehouse] = useState("WH1")
  const [newItemName, setNewItemName] = useState("")
  const [newQty, setNewQty] = useState<number | "">("")
  const [newPrice, setNewPrice] = useState<number | "">("")
  const [newEta, setNewEta] = useState("14 Days")

  // Billing form state
  const [taxPercent, setTaxPercent] = useState(15)
  const [paymentTerms, setPaymentTerms] = useState("Net 30")

  const selectedPo = purchaseOrders.find(po => po.id === selectedPoId) || purchaseOrders[0]

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          po.supplier.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    if (filterTab === "Draft") return po.status === "DRAFT"
    if (filterTab === "In Transit") return po.status === "IN TRANSIT"
    if (filterTab === "Received") return po.status === "RECEIVED"
    return true
  })

  const draftCount = purchaseOrders.filter(po => po.status === "DRAFT").length
  const inTransitCount = purchaseOrders.filter(po => po.status === "IN TRANSIT").length
  const receivedCount = purchaseOrders.filter(po => po.status === "RECEIVED").length
  const totalCommitment = purchaseOrders.reduce((sum, p) => sum + p.amount, 0)

  // Action 1: Receive Stock & Post GL Journal Voucher
  const handleReceiveStock = (poId: string) => {
    const res = erp.createPurchaseReceiptForPO(poId)
    if (res.success) {
      showToast(
        "Goods Received & Stock Deposited",
        "success",
        `Stock goods receipt submitted! Warehouse inventory updated & Stock GL Voucher ${res.journalEntryId || ""} posted to Finance.`
      )
    } else {
      showToast("Receipt Error", "warning", res.error || "Failed to receive goods.")
    }
  }

  // Action 2: Generate AP Supplier Invoice
  const handleConfirmInvoice = () => {
    if (!selectedPo) return
    const res = erp.createPurchaseInvoiceForPO(selectedPo.id, taxPercent, paymentTerms)
    if (res.success) {
      showToast(
        "Accounts Payable Invoice Posted",
        "success",
        `Vendor Invoice ${res.invoiceId} generated! AP General Ledger Voucher ${res.journalEntryId || ""} recorded in Finance.`
      )
      setIsInvoiceModalOpen(false)
    } else {
      showToast("Invoice Error", "warning", res.error || "Could not generate Purchase Invoice.")
    }
  }

  // Action 3: Create New Purchase Order
  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedSupp = suppliers.find(s => s.id === newSupplierId)
    const supplierName = customSupplierName.trim() || selectedSupp?.name || "Oromia Coffee Farmers Cooperative Union"

    if (!newItemName || newQty === "" || newPrice === "") {
      showToast("Validation Error", "warning", "Please fill in item name, quantity, and unit price.")
      return
    }

    const qtyNum = Number(newQty)
    const priceNum = Number(newPrice)
    const totalAmount = qtyNum * priceNum
    const whObj = warehouses.find(w => w.code === newWarehouse || w.id === newWarehouse)

    const newPo: PurchaseOrder = {
      id: `PO-${Date.now().toString().slice(-4)}`,
      poNumber: `PO-2026-${Math.floor(100 + Math.random() * 900)}`,
      supplier: supplierName,
      supplierId: selectedSupp?.id || "SUPP-NEW",
      warehouse: newWarehouse,
      warehouseName: whObj ? `${whObj.code} - ${whObj.name}` : newWarehouse,
      status: "DRAFT",
      statusColor: "bg-zinc-600 text-white",
      date: new Date().toISOString().split("T")[0],
      eta: newEta || "14 Days",
      amount: totalAmount,
      currency: "ETB",
      category: newWarehouse === "WH1" ? "Local Agricultural Sourcing" : "Veterinary Import",
      receiptStatus: "Not Received",
      billingStatus: "Not Billed",
      items: [
        { 
          productId: products[0]?.id || "P-NEW", 
          name: newItemName, 
          sku: `SKU-${Date.now().toString().slice(-4)}`, 
          qty: qtyNum, 
          unit: "units", 
          unitPrice: priceNum, 
          total: totalAmount 
        }
      ]
    }

    erp.addPurchaseOrder(newPo)
    setSelectedPoId(newPo.id)
    showToast("Purchase Order Created", "success", `Draft Procurement Order ${newPo.poNumber} created.`)
    setIsNewPoOpen(false)
    setNewItemName("")
    setNewQty("")
    setNewPrice("")
    setCustomSupplierName("")
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={fade} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-black tracking-tight">Purchase & Procurement Orders</h1>
            </div>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Manage purchase orders, goods receipt, and vendor billing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/sales")} />
            <button 
              onClick={() => setIsNewPoOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-900 shadow-md active:scale-95 transition-all"
            >
              <Plus className="size-4" /> Create PO
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Draft POs", value: `${draftCount}`, sub: "Pending proforma confirmation", Icon: Clock, iconBg: "bg-black/5", iconColor: "text-zinc-600" },
            { label: "In Transit POs", value: `${inTransitCount}`, sub: "Port & customs clearance", Icon: Truck, iconBg: "bg-blue-50", iconColor: "text-blue-700" },
            { label: "Received POs", value: `${receivedCount}`, sub: "Inventory stock deposited", Icon: CheckCircle2, iconBg: "bg-emerald-50", iconColor: "text-emerald-700" },
            { label: "Total PO Value", value: `ETB ${totalCommitment.toLocaleString()}`, sub: "Procurement commitments", Icon: CreditCard, iconBg: "bg-purple-50", iconColor: "text-purple-700" },
          ].map((s, idx) => {
            const Icon = s.Icon
            return (
              <GlassCard key={s.label} className="flex items-center justify-between" transition={{ delay: 0.05 * idx, duration: 0.4 }}>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-2xl font-black text-black mt-1 mb-1 font-mono">{s.value}</p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                    {s.sub}
                  </div>
                </div>
                <div className={`size-11 rounded-2xl flex items-center justify-center ${s.iconBg}`}>
                  <Icon className={`size-5 ${s.iconColor}`} />
                </div>
              </GlassCard>
            )
          })}
        </div>

        {/* Main Split Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
          {/* Left Panel: PO Register */}
          <GlassCard variant="dark" className="p-4" transition={{ delay: 0.16, duration: 0.4 }}>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 mb-3">
              <Search className="size-4 text-zinc-400" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none font-semibold" 
                placeholder="Search POs or suppliers..." 
              />
            </div>

            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
              {(["All POs", "Draft", "In Transit", "Received"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={
                    tab === filterTab
                      ? "px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-black shadow-sm shrink-0"
                      : "px-2.5 py-1 rounded-full text-[11px] font-semibold text-zinc-400 hover:text-white shrink-0"
                  }
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredPOs.map((po) => {
                const isSelected = po.id === selectedPo?.id
                return (
                  <div 
                    key={po.id} 
                    onClick={() => setSelectedPoId(po.id)}
                    className={`rounded-2xl p-3 cursor-pointer transition-all border ${
                      isSelected ? "bg-white/20 border-white/40 shadow-lg" : "hover:bg-white/10 border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center">
                          <Truck className="size-4 text-zinc-300" />
                        </div>
                        <div>
                          <p className="text-white text-xs font-mono font-black">{po.poNumber}</p>
                          <p className="text-zinc-300 text-[11px] font-semibold line-clamp-1">{po.supplier}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${po.statusColor}`}>
                        {po.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-[10px] text-zinc-400 border-t border-white/10">
                      <span className="font-mono text-emerald-400 font-bold">{po.warehouse}</span>
                      <p className="text-white text-xs font-black font-mono">ETB {po.amount.toLocaleString()}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>

          {/* Right Panel: PO Details & Procurement Actions */}
          {selectedPo ? (
            <GlassCard transition={{ delay: 0.22, duration: 0.4 }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">PURCHASE ORDER DETAILS</span>
                    <span className="bg-zinc-100 text-zinc-800 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {selectedPo.id}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-black font-mono">{selectedPo.poNumber}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      selectedPo.status === "RECEIVED" ? "bg-emerald-100 text-emerald-800" :
                      selectedPo.status === "IN TRANSIT" ? "bg-blue-100 text-blue-800" : "bg-zinc-200 text-zinc-800"
                    }`}>
                      <span className="size-2 rounded-full bg-current" />
                      {selectedPo.status}
                    </span>
                    <span className="flex items-center gap-1 bg-black/5 text-zinc-700 text-xs px-3 py-1 rounded-full font-bold">
                      <Package className="size-3.5 text-zinc-500" />
                      {selectedPo.warehouseName || selectedPo.warehouse}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="size-9 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5">
                    <Printer className="size-4 text-zinc-600" />
                  </button>
                </div>
              </div>

              {/* KPI Summary Block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-black/[0.03] rounded-2xl p-4 mb-5 border border-black/5">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Vendor / Supplier</p>
                  <p className="font-extrabold text-xs text-zinc-900 mt-0.5 flex items-center gap-1">
                    <Building2 className="size-3 text-zinc-500 inline" /> {selectedPo.supplier}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Order Date</p>
                  <p className="font-extrabold text-xs text-zinc-900 mt-0.5 font-mono">{selectedPo.date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Required ETA</p>
                  <p className="font-extrabold text-xs text-zinc-900 mt-0.5">{selectedPo.eta}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Commitment</p>
                  <p className="font-black text-sm text-zinc-950 mt-0.5 font-mono">ETB {selectedPo.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* ERPNext Integration Badges */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl mb-6">
                <h3 className="text-xs font-black uppercase text-zinc-900 tracking-wider mb-2 flex items-center gap-1.5">
                  <Boxes className="size-4 text-zinc-600" /> Procurement & Financial Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-zinc-200/60">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Stock Receipt Status</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`font-bold text-xs ${selectedPo.receiptStatus === "Fully Received" || selectedPo.status === "RECEIVED" ? "text-emerald-700" : "text-amber-700"}`}>
                        {selectedPo.receiptStatus || (selectedPo.status === "RECEIVED" ? "Fully Received" : "Not Received")}
                      </span>
                      {selectedPo.receiptIds && selectedPo.receiptIds.length > 0 && (
                        <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Receipt: {selectedPo.receiptIds.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-zinc-200/60">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Accounts Payable Billing</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`font-bold text-xs ${selectedPo.billingStatus === "Fully Billed" ? "text-blue-700" : "text-zinc-600"}`}>
                        {selectedPo.billingStatus || "Not Billed"}
                      </span>
                      {selectedPo.invoiceIds && selectedPo.invoiceIds.length > 0 && (
                        <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          Invoice: {selectedPo.invoiceIds.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Selector: Items vs Import Docs */}
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-200 pb-3">
                <button
                  onClick={() => setPoInspectorTab("Items")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    poInspectorTab === "Items"
                      ? "bg-zinc-950 text-white shadow-sm"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  <Package className="w-3.5 h-3.5" /> Ordered Items ({selectedPo.items.length})
                </button>
                <button
                  onClick={() => setPoInspectorTab("Import Docs")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    poInspectorTab === "Import Docs"
                      ? "bg-zinc-950 text-white shadow-sm"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" /> Import Docs Checklist
                  {(() => {
                    const docCount = (poAttachmentsMap[selectedPo.id] || []).length
                    return (
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                          docCount > 0 ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-zinc-500/20 text-zinc-500"
                        }`}
                      >
                        {docCount} {docCount === 1 ? "File" : "Files"}
                      </span>
                    )
                  })()}
                </button>
              </div>

              {poInspectorTab === "Import Docs" ? (
                <div className="mb-6">
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-zinc-900 block">Import Documentation</span>
                        <span className="text-[11px] text-zinc-500 font-medium block">Compliance and custom documents attached to this shipment</span>
                      </div>
                    </div>
                    {(!poAttachmentsMap[selectedPo.id] || poAttachmentsMap[selectedPo.id].length === 0) ? (
                      <div className="text-center py-6 border-2 border-dashed border-zinc-200 rounded-xl bg-white">
                        <FileText className="size-6 text-zinc-400 mx-auto mb-1.5" />
                        <p className="text-zinc-500 font-semibold text-[11px]">No documents attached to this order.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {(poAttachmentsMap[selectedPo.id] || []).map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-150/40 bg-white shadow-xs text-xs font-semibold"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="size-4 text-zinc-400 shrink-0" />
                              <span className="truncate text-zinc-800 pr-2">
                                {file.file_name}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-mono shrink-0">
                                {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : ""}
                              </span>
                            </div>
                            {file.file_url && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewUrl(file.file_url)
                                  setPreviewName(file.file_name)
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md inline-flex items-center gap-1 shrink-0"
                              >
                                View Doc <ExternalLink className="size-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Items Table */
                <div className="mb-6">
                  <div className="grid grid-cols-[1fr_80px_110px_110px] text-[10px] font-black text-zinc-400 uppercase tracking-wider px-2 mb-2">
                    <span>ITEM / SKU</span>
                    <span className="text-right">QTY</span>
                    <span className="text-right">UNIT PRICE</span>
                    <span className="text-right">TOTAL</span>
                  </div>
                  <div className="divide-y divide-zinc-100 bg-white/80 rounded-2xl border border-zinc-200 overflow-hidden">
                    {selectedPo.items.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_110px_110px] items-center p-3">
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{item.name}</p>
                          <p className="text-[10px] font-mono text-zinc-400">{item.sku}</p>
                        </div>
                        <p className="text-xs font-extrabold text-zinc-900 text-right font-mono">{item.qty} {item.unit}</p>
                        <p className="text-xs font-medium text-zinc-600 text-right font-mono">ETB {item.unitPrice.toLocaleString()}</p>
                        <p className="text-xs font-black text-zinc-950 text-right font-mono">ETB {item.total.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-200">
                <p className="text-[10px] font-bold text-zinc-400">Category: {selectedPo.category}</p>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {selectedPo.status === "DRAFT" && (
                    <button 
                      onClick={() => {
                        erp.updatePurchaseOrderStatus(selectedPo.id, "IN TRANSIT")
                        showToast("PO Dispatched", "info", `Purchase Order ${selectedPo.poNumber} marked as IN TRANSIT from supplier ${selectedPo.supplier}.`)
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Truck className="size-4" /> Dispatch Order (Mark In Transit)
                    </button>
                  )}

                  {selectedPo.status !== "RECEIVED" && (
                    <button 
                      onClick={() => handleReceiveStock(selectedPo.id)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Package className="size-4" /> Receive Goods & Update Inventory Stock
                    </button>
                  )}

                  {selectedPo.billingStatus !== "Fully Billed" && (
                    <button 
                      onClick={() => setIsInvoiceModalOpen(true)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <FileText className="size-4" /> Generate AP Vendor Invoice
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="flex items-center justify-center p-12">
              <p className="text-xs font-bold text-zinc-400">Select a Purchase Order to view procurement details.</p>
            </GlassCard>
          )}
        </div>
      </motion.div>

      {/* MODAL: GENERATE AP SUPPLIER INVOICE */}
      <AnimatePresence>
        {isInvoiceModalOpen && selectedPo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black text-zinc-950">Generate Vendor Invoice (AP)</h2>
                <button onClick={() => setIsInvoiceModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                  <X className="size-5" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 font-semibold mb-4">
                Creates an Accounts Payable entry in the Finance module for vendor <span className="font-bold text-zinc-800">{selectedPo.supplier}</span>.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Purchase Order Subtotal</label>
                  <input 
                    disabled 
                    value={`ETB ${selectedPo.amount.toLocaleString()}`} 
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-mono font-bold text-zinc-700" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">VAT / Tax Rate (%)</label>
                    <input 
                      type="number" 
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
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
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                      <option value="Immediate">Immediate Cash</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Tax Amount ({taxPercent}%):</span>
                    <span className="font-bold text-zinc-900">ETB {(selectedPo.amount * (taxPercent / 100)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-blue-200 font-black text-sm">
                    <span>Total Vendor AP Payable:</span>
                    <span className="text-blue-900">ETB {(selectedPo.amount * (1 + taxPercent / 100)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmInvoice}
                  className="px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md flex items-center gap-1.5"
                >
                  <FileText className="size-4" /> Post AP Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE NEW PURCHASE ORDER */}
      <AnimatePresence>
        {isNewPoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200"
            >
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-xl font-black text-zinc-950">Draft Purchase Order</h2>
                <button onClick={() => setIsNewPoOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                  <X className="size-5" />
                </button>
              </div>
              <p className="text-xs font-semibold text-zinc-500 mb-5">Create a new procurement PO for agricultural sourcing or pharmaceutical import.</p>

              <form onSubmit={handleCreatePo} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Supplier / Union</label>
                  <select 
                    value={newSupplierId}
                    onChange={(e) => setNewSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none mb-2"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                    ))}
                    <option value="CUSTOM">+ Enter Custom Supplier</option>
                  </select>

                  {newSupplierId === "CUSTOM" && (
                    <input 
                      type="text" 
                      value={customSupplierName}
                      onChange={(e) => setCustomSupplierName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none" 
                      placeholder="Custom supplier name..."
                      required
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Destination Warehouse</label>
                    <select 
                      value={newWarehouse}
                      onChange={(e) => setNewWarehouse(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      <option value="WH1">WH1 - Export Hub (Local)</option>
                      <option value="WH2">WH2 - Vet Import (India)</option>
                      <option value="WH3">WH3 - Vet Import (China)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Estimated ETA</label>
                    <input 
                      type="text" 
                      value={newEta}
                      onChange={(e) => setNewEta(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none" 
                      placeholder="e.g. 14 Days / Port Clearance"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Item Description</label>
                  <input 
                    type="text" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none" 
                    placeholder="e.g. Grade A Yirgacheffe Coffee / Oxytetracycline 20%"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Quantity</label>
                    <input 
                      type="number" 
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none" 
                      placeholder="e.g. 500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Unit Price (ETB)</label>
                    <input 
                      type="number" 
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none" 
                      placeholder="e.g. 450"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button 
                    type="button" 
                    onClick={() => setIsNewPoOpen(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 shadow-md flex items-center gap-1.5"
                  >
                    Draft Purchase Order <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
