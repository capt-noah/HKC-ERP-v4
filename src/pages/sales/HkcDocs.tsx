import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertCircle,
  Truck,
  UserCheck,
  ShieldCheck,
  X,
  ChevronRight,
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { navSections } from "@/lib/nav-config"
import { FinanceTableToolbar } from "@/components/FinanceTableToolbar"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"
import { useErpStore, type PurchaseOrder, type SalesOrder } from "@/lib/erpStore"
import { useFeedback } from "@/context/FeedbackContext"
import { Skeleton } from "@/components/ui/skeleton"

function HkcDocsSkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-b border-zinc-150/40">
          <td className="px-3 py-4"><Skeleton className="h-4 w-28 bg-zinc-200/80" /></td>
          <td className="px-3 py-4"><Skeleton className="h-5 w-20 rounded-md bg-zinc-200/80" /></td>
          <td className="px-3 py-4"><Skeleton className="h-4 w-36 bg-zinc-200/80" /></td>
          <td className="px-3 py-4"><Skeleton className="h-4 w-32 bg-zinc-200/80" /></td>
          <td className="px-3 py-4"><Skeleton className="h-7 w-44 rounded-xl bg-zinc-200/80" /></td>
          <td className="px-3 py-4"><Skeleton className="h-5 w-24 rounded-full mx-auto bg-zinc-200/80" /></td>
          <td className="px-3 py-4 pr-4"><Skeleton className="h-7 w-28 rounded-xl mx-auto bg-zinc-200/80" /></td>
        </tr>
      ))}
    </>
  )
}
import { ShipmentDocChecklist } from "@/components/ShipmentDocChecklist"
import {
  evaluateShipmentDocs,
  fetchShipmentDocs,
  fetchShipmentDocRules,
  fetchAssignedOfficers,
  assignShipmentOfficer,
  type ShipmentDocAttachment,
  type ShipmentDocRule,
  type AssignedOfficerRecord,
  DEFAULT_FRONTEND_RULES,
} from "@/lib/shipmentDocumentEngine"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const COMPLIANCE_SPECIALISTS = [
  { id: "EMP-004", name: "Tadesse Worku", position: "Customs Compliance Officer" },
  { id: "EMP-001", name: "Abebe Bikila", position: "Logistics Manager" },
  { id: "EMP-002", name: "Mesfin Tekle", position: "Documentation Specialist" },
  { id: "EMP-003", name: "Selamawit Alemu", position: "Import/Export Auditor" },
]

const hkcDocColumns: TableColumn[] = [
  { key: "recordNumber", label: "Shipment / Ref", align: "left" },
  { key: "recordType", label: "Type", align: "left" },
  { key: "partnerName", label: "Partner / Supplier", align: "left" },
  { key: "tradeRoute", label: "Trade Route", align: "left" },
  { key: "assignedOfficer", label: "Assigned Compliance Specialist", align: "left" },
  { key: "complianceStatus", label: "Legal Compliance", align: "center" },
  { key: "_actions", label: "Action", align: "center", noSort: true },
]

interface UnifiedShipment {
  id: string
  recordNumber: string
  recordType: "purchase_order" | "sales_order"
  partnerName: string
  categoryOrWarehouse: string
  originCountry: string
  destinationRegion: string
  rawRecord: PurchaseOrder | SalesOrder
}

export default function HkcDocs() {
  const [searchParams] = useSearchParams()
  const initialRecordId = searchParams.get("recordId")

  const { showToast } = useFeedback()
  const erp = useErpStore()
  const employees = COMPLIANCE_SPECIALISTS

  const purchaseOrders = erp.getPurchaseOrders()
  const salesOrders = erp.getSalesOrders()

  const [shipmentRules, setShipmentRules] = useState<ShipmentDocRule[]>(DEFAULT_FRONTEND_RULES)
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, ShipmentDocAttachment[]>>({})
  const [assignedOfficersMap, setAssignedOfficersMap] = useState<Record<string, AssignedOfficerRecord>>({})

  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"ALL" | "purchase_order" | "sales_order">("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Complete" | "Incomplete">("ALL")
  const [isLoading, setIsLoading] = useState(true)

  const [selectedShipment, setSelectedShipment] = useState<UnifiedShipment | null>(null)

  // Hydrate assigned officers and rules
  const loadData = async () => {
    setIsLoading(true)
    try {
      const rules = await fetchShipmentDocRules()
      setShipmentRules(rules)

      const officers = await fetchAssignedOfficers()
      const officerMap: Record<string, AssignedOfficerRecord> = {}
      officers.forEach((o) => {
        officerMap[o.record_id] = o
      })
      setAssignedOfficersMap(officerMap)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Build unified shipments list
  const unifiedShipments: UnifiedShipment[] = [
    ...purchaseOrders.map((po) => ({
      id: po.id,
      recordNumber: po.poNumber,
      recordType: "purchase_order" as const,
      partnerName: po.supplier,
      categoryOrWarehouse: po.category || po.warehouse,
      originCountry: po.warehouse === "WH2" ? "China" : "Ethiopia",
      destinationRegion: "Ethiopia",
      rawRecord: po,
    })),
    ...salesOrders.map((so) => ({
      id: so.id,
      recordNumber: so.id,
      recordType: "sales_order" as const,
      partnerName: so.customer,
      categoryOrWarehouse: so.warehouse || "WH1",
      originCountry: "Ethiopia",
      destinationRegion: "East Africa",
      rawRecord: so,
    })),
  ]

  // Deep link auto-select
  useEffect(() => {
    if (initialRecordId && unifiedShipments.length > 0) {
      const matched = unifiedShipments.find((s) => s.id === initialRecordId)
      if (matched) setSelectedShipment(matched)
    }
  }, [initialRecordId])

  // Fetch attachments for selected shipment
  useEffect(() => {
    if (selectedShipment?.id) {
      fetchShipmentDocs(selectedShipment.id, selectedShipment.recordType).then((docs) => {
        setAttachmentsMap((prev) => ({ ...prev, [selectedShipment.id]: docs }))
      })
    }
  }, [selectedShipment?.id])

  // Helper: Evaluate compliance status per shipment
  const getEvaluation = (shipment: UnifiedShipment) => {
    const docs = attachmentsMap[shipment.id] || []
    return evaluateShipmentDocs({
      record: shipment.rawRecord,
      items: "items" in shipment.rawRecord ? shipment.rawRecord.items : [],
      attachments: docs,
      rules: shipmentRules,
      appliesTo: shipment.recordType,
    })
  }

  // Handle Assigning Compliance Specialist
  const handleAssignOfficer = async (recordId: string, employeeId: string) => {
    const matchedEmp = employees.find((e) => e.id === employeeId)
    const empName = matchedEmp ? `${matchedEmp.name} (${matchedEmp.position})` : "Unassigned"

    try {
      const res = await assignShipmentOfficer(recordId, employeeId, empName)
      setAssignedOfficersMap((prev) => ({ ...prev, [recordId]: res }))
      showToast("Officer Assigned", "success", `Assigned ${empName} to manage trade paperwork for ${recordId}.`)
    } catch (err) {
      showToast("Assignment Error", "warning", "Failed to assign compliance officer.")
    }
  }

  // Computed Telemetry
  const totalShipments = unifiedShipments.length
  const completeCount = unifiedShipments.filter((s) => getEvaluation(s).isComplete).length
  const missingCount = totalShipments - completeCount
  const assignedOfficerCount = Object.keys(assignedOfficersMap).length

  // Filtered List
  const filteredShipments = unifiedShipments.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.recordNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "ALL" || s.recordType === typeFilter
    const evalRes = getEvaluation(s)
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "Complete" && evalRes.isComplete) ||
      (statusFilter === "Incomplete" && !evalRes.isComplete)
    return matchesSearch && matchesType && matchesStatus
  })

  const shipmentsTable = useResizableTable<UnifiedShipment>(hkcDocColumns, filteredShipments, {
    recordNumber: 150,
    recordType: 110,
    partnerName: 220,
    tradeRoute: 180,
    assignedOfficer: 240,
    complianceStatus: 140,
    _actions: 140,
  })

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={fade} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-black tracking-tight">HKC Docs Control Center</h1>
            </div>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Centralized trade documentation workspace for import/export legal compliance, custom filings, and assigned officer management.
            </p>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active Trade Shipments", value: `${totalShipments}`, sub: "Import POs & Export Sales Orders", Icon: Truck, iconBg: "bg-blue-50", iconColor: "text-blue-700" },
            { label: "100% Legal Docs Verified", value: `${completeCount}`, sub: "Full clearance compliance", Icon: ShieldCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-700" },
            { label: "Missing Paperwork Queue", value: `${missingCount}`, sub: "Blocked clearance items", Icon: AlertCircle, iconBg: "bg-amber-50", iconColor: "text-amber-700" },
            { label: "Assigned Officers", value: `${assignedOfficerCount}`, sub: "Customs specialists managing docs", Icon: UserCheck, iconBg: "bg-purple-50", iconColor: "text-purple-700" },
          ].map((s, idx) => {
            const Icon = s.Icon
            return (
              <GlassCard key={s.label} className="flex items-center justify-between" transition={{ delay: 0.05 * idx, duration: 0.4 }}>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-2xl font-black text-black mt-1 mb-1 font-mono">{s.value}</p>
                  <p className="text-[10px] font-bold text-zinc-500">{s.sub}</p>
                </div>
                <div className={`p-3 rounded-2xl ${s.iconBg} ${s.iconColor}`}>
                  <Icon className="size-6" />
                </div>
              </GlassCard>
            )
          })}
        </div>

        {/* Stock Register Designed Table Container */}
        <GlassCard className="flex flex-col overflow-hidden p-0 border border-white/65 shadow-md">
          <div className="px-6 pt-6">
            <FinanceTableToolbar
              title="HKC Docs Register"
              subtitle={`Total: ${shipmentsTable.sorted().length} active trade shipments`}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search shipment ref, partner name..."
              filters={[
                {
                  value: typeFilter,
                  onChange: (val) => setTypeFilter(val as any),
                  ariaLabel: "Filter by Type",
                  options: [
                    { value: "ALL", label: "All Shipments" },
                    { value: "purchase_order", label: "Import POs" },
                    { value: "sales_order", label: "Export Sales Orders" },
                  ],
                },
                {
                  value: statusFilter,
                  onChange: (val) => setStatusFilter(val as any),
                  ariaLabel: "Filter by Compliance",
                  options: [
                    { value: "ALL", label: "All Compliance" },
                    { value: "Complete", label: "Status: Complete (Verified)" },
                    { value: "Incomplete", label: "Status: Incomplete (Missing)" },
                  ],
                },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-black/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                  {hkcDocColumns.map((col) => (
                    <ResizableTh
                      key={col.key}
                      col={col}
                      width={shipmentsTable.colWidths[col.key] || 120}
                      sortKey={shipmentsTable.sortKey}
                      sortDir={shipmentsTable.sortDir}
                      openMenuCol={shipmentsTable.openMenuCol}
                      onResizeStart={shipmentsTable.handleResizeStart}
                      onToggleMenu={shipmentsTable.toggleMenu}
                      onSortAsc={shipmentsTable.setSortAsc}
                      onSortDesc={shipmentsTable.setSortDesc}
                      onClearSort={shipmentsTable.clearSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {isLoading ? (
                  <HkcDocsSkeletonRows />
                ) : shipmentsTable.sorted().length === 0 ? (
                  <tr>
                    <td colSpan={hkcDocColumns.length} className="px-4 py-8 text-center text-xs font-semibold text-zinc-400">
                      No trade shipments found matching search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  shipmentsTable.sorted().map((shipment) => {
                    const evalRes = getEvaluation(shipment)
                    const officer = assignedOfficersMap[shipment.id]

                    return (
                      <tr
                        key={shipment.id}
                        onClick={() => setSelectedShipment(shipment)}
                        className="border-b border-zinc-150/40 hover:bg-zinc-50/60 transition-colors text-xs cursor-pointer"
                      >
                        <td style={{ width: `${shipmentsTable.colWidths.recordNumber}px` }} className="px-3 py-3 whitespace-nowrap font-mono font-bold text-zinc-900 truncate">
                          {shipment.recordNumber}
                        </td>
                        <td style={{ width: `${shipmentsTable.colWidths.recordType}px` }} className="px-3 py-3 whitespace-nowrap truncate">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-black ${
                              shipment.recordType === "purchase_order"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {shipment.recordType === "purchase_order" ? "Import PO" : "Export SO"}
                          </span>
                        </td>
                        <td style={{ width: `${shipmentsTable.colWidths.partnerName}px` }} className="px-3 py-3 font-bold text-zinc-900 truncate">
                          {shipment.partnerName}
                        </td>
                        <td style={{ width: `${shipmentsTable.colWidths.tradeRoute}px` }} className="px-3 py-3 text-zinc-600 truncate">
                          {shipment.originCountry} &rarr; {shipment.destinationRegion}
                        </td>
                        <td style={{ width: `${shipmentsTable.colWidths.assignedOfficer}px` }} className="px-3 py-3 truncate">
                          <select
                            value={officer?.assigned_employee_id || ""}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleAssignOfficer(shipment.id, e.target.value)}
                            className="px-2 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold outline-none w-full max-w-[220px]"
                          >
                            <option value="">-- Unassigned Specialist --</option>
                            {employees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.name} ({e.position})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ width: `${shipmentsTable.colWidths.complianceStatus}px` }} className="px-3 py-3 text-center whitespace-nowrap truncate">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              evalRes.isComplete
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700"
                                : "bg-amber-500/15 border-amber-500/30 text-amber-700"
                            }`}
                          >
                            {evalRes.isComplete ? "100% Complete" : `${evalRes.missingCount} Missing`}
                          </span>
                        </td>
                        <td style={{ width: `${shipmentsTable.colWidths._actions}px` }} className="px-3 py-3 text-center whitespace-nowrap truncate pr-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedShipment(shipment)
                            }}
                            className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            Manage Docs <ChevronRight className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Interactive Modal Dialog for Shipment Docs Management */}
        <AnimatePresence>
          {selectedShipment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 dark:border-zinc-800"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 mb-6 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-black ${
                          selectedShipment.recordType === "purchase_order"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                        }`}
                      >
                        {selectedShipment.recordType === "purchase_order" ? "Import Purchase Order" : "Export Sales Order"}
                      </span>
                      <span className="text-xs font-bold text-zinc-400">
                        {selectedShipment.originCountry} &rarr; {selectedShipment.destinationRegion}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black font-mono text-zinc-950 dark:text-zinc-50 mt-1">
                      {selectedShipment.recordNumber} &bull; {selectedShipment.partnerName}
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedShipment(null)}
                    className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-500 transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="space-y-6">
                  {/* Assigned Officer Card */}
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <UserCheck className="size-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Assigned Customs Officer</span>
                        <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                          {assignedOfficersMap[selectedShipment.id]?.assigned_employee_name || "Unassigned Specialist"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={assignedOfficersMap[selectedShipment.id]?.assigned_employee_id || ""}
                        onChange={(e) => handleAssignOfficer(selectedShipment.id, e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-bold outline-none w-full sm:w-auto"
                      >
                        <option value="">-- Assign Specialist --</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.position})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Checklist & Document Uploader */}
                  <ShipmentDocChecklist
                    recordId={selectedShipment.id}
                    recordType={selectedShipment.recordType}
                    evaluation={getEvaluation(selectedShipment)}
                    attachments={attachmentsMap[selectedShipment.id] || []}
                    onAttachmentsChange={(updated) => {
                      setAttachmentsMap((prev) => ({ ...prev, [selectedShipment.id]: updated }))
                    }}
                    readOnly={false}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
