import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { BadgeCheck, Ban, CheckCircle2, Eye, Pencil, Printer, X } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { HRPageSkeleton } from "@/components/HRSkeleton"
import { SubPageNav } from "@/components/SubPageNav"
import { HRTableToolbar, ResizableTableHeader, type TableColumn, useColumnWidths, useTableSort } from "@/components/HRTable"
import { useFeedback } from "@/context/FeedbackContext"
import { financeStore } from "@/lib/financeStore"
import { getSectionChildren, navSections } from "@/lib/nav-config"
import { PAYMENT_STATUSES, PAYROLL_PERIOD_STATUSES, calculatePayroll, hrApi, loadHRData, makeId, money, type Employee, type PayrollPeriod, type PayrollRecord } from "@/lib/hrApi"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }
const now = new Date()
const blankPeriod = (): Omit<PayrollPeriod, "id"> => ({
  name: "",
  month: now.getMonth() + 1,
  year: now.getFullYear(),
  start_date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  status: "Draft",
})

function blankRecord(employee: Employee, periodId: string): PayrollRecord {
  return calculatePayroll({
    id: makeId("PAY"),
    payroll_period_id: periodId,
    employee_id: employee.id,
    basic_salary: Number(employee.basic_salary || 0),
    allowances: 0,
    overtime_pay: 0,
    bonus: 0,
    other_earnings: 0,
    tax: 0,
    pension: 0,
    absence_deduction: 0,
    loan_deduction: 0,
    other_deductions: 0,
    payment_status: "Pending",
    notes: "",
  })
}

export default function Payroll() {
  const { showToast } = useFeedback()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [search, setSearch] = useState("")
  const [payrollStatus, setPayrollStatus] = useState("All")
  const [paymentStatus, setPaymentStatus] = useState("All")
  const [warehouse, setWarehouse] = useState("All")
  const [showPeriodForm, setShowPeriodForm] = useState(false)
  const [periodForm, setPeriodForm] = useState<Omit<PayrollPeriod, "id">>(blankPeriod())
  const [editing, setEditing] = useState<PayrollRecord | null>(null)
  const [payslip, setPayslip] = useState<PayrollRecord | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await loadHRData()
      setEmployees(data.employees)
      setPeriods(data.payrollPeriods)
      setRecords(data.payrollRecords)
      setSelectedPeriod((current) => current || data.payrollPeriods[0]?.id || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payroll.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees])
  const periodById = useMemo(() => new Map(periods.map((period) => [period.id, period])), [periods])
  const currentPeriod = periods.find((period) => period.id === selectedPeriod)
  const currentRecords = useMemo(() => records.filter((record) => !selectedPeriod || record.payroll_period_id === selectedPeriod), [records, selectedPeriod])
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return currentRecords.filter((record) => {
      const employee = employeeById.get(record.employee_id)
      const period = periodById.get(record.payroll_period_id)
      const matchesSearch = !query || [employee?.full_name, employee?.employee_number, period?.name, employee?.warehouse_id, employee?.status].some((value) => String(value || "").toLowerCase().includes(query))
      const matchesPayrollStatus = payrollStatus === "All" || period?.status === payrollStatus
      const matchesPaymentStatus = paymentStatus === "All" || record.payment_status === paymentStatus
      const matchesWarehouse = warehouse === "All" || employee?.warehouse_id === warehouse
      return matchesSearch && matchesPayrollStatus && matchesPaymentStatus && matchesWarehouse
    })
  }, [currentRecords, employeeById, periodById, payrollStatus, paymentStatus, search, warehouse])

  const totals = {
    employees: currentRecords.length,
    gross: currentRecords.reduce((sum, record) => sum + Number(record.gross_pay || 0), 0),
    deductions: currentRecords.reduce((sum, record) => sum + Number(record.total_deductions || 0), 0),
    net: currentRecords.reduce((sum, record) => sum + Number(record.net_pay || 0), 0),
    approved: currentRecords.filter((record) => record.payment_status === "Approved").length,
    paid: currentRecords.filter((record) => record.payment_status === "Paid").length,
    pending: currentRecords.filter((record) => record.payment_status === "Pending").length,
  }

  const { sortKey, sortDir, handleSort, handleClearSort, sortItems } = useTableSort()
  const sorted = sortItems(filtered)
  const columns: TableColumn[] = [
    { key: "employee", label: "Employee", initialWidth: 220 },
    { key: "warehouse", label: "Warehouse", initialWidth: 150 },
    { key: "employment_status", label: "Employment Status", align: "center", initialWidth: 160 },
    { key: "basic_salary", label: "Gross Salary", align: "right", initialWidth: 140 },
    { key: "gross_pay", label: "Gross Pay", align: "right", initialWidth: 140 },
    { key: "total_deductions", label: "Total Deductions", align: "right", initialWidth: 160 },
    { key: "net_pay", label: "Net Pay", align: "right", initialWidth: 140 },
    { key: "payment_status", label: "Payment Status", align: "center", initialWidth: 150 },
    { key: "payroll_period_id", label: "Payroll Period", initialWidth: 180 },
    { key: "actions", label: "Actions", align: "right", sortable: false, initialWidth: 170 },
  ]
  const { colWidths, handleResizeStart } = useColumnWidths(Object.fromEntries(columns.map((col) => [col.key, col.initialWidth || 130])))

  const createPeriod = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!periodForm.name.trim()) return showToast("Period Not Saved", "warning", "Period name is required.")
    if (periods.some((period) => period.month === periodForm.month && period.year === periodForm.year && period.status !== "Cancelled")) {
      return showToast("Period Not Saved", "warning", "Only one active payroll period can exist for the same month and year.")
    }
    try {
      const period = await hrApi.createPayrollPeriod({ id: makeId("PER"), ...periodForm })
      setShowPeriodForm(false)
      setSelectedPeriod(period.id)
      showToast("Payroll Period Created", "success", `${period.name} was saved to Supabase.`)
      await refresh()
    } catch (err) {
      showToast("Period Save Failed", "warning", err instanceof Error ? err.message : "Supabase rejected the payroll period.")
    }
  }

  const loadActiveEmployees = async () => {
    if (!currentPeriod) return showToast("Payroll Period Required", "warning", "Create or select a payroll period first.")
    const activeEmployees = employees.filter((employee) => employee.status === "Active")
    const missing = activeEmployees.filter((employee) => !records.some((record) => record.payroll_period_id === currentPeriod.id && record.employee_id === employee.id))
    try {
      await Promise.all(missing.map((employee) => hrApi.createPayrollRecord(blankRecord(employee, currentPeriod.id))))
      showToast("Payroll Records Loaded", "success", `${missing.length} active employee records saved for payroll.`)
      await refresh()
    } catch (err) {
      showToast("Payroll Load Failed", "warning", err instanceof Error ? err.message : "Supabase rejected payroll records.")
    }
  }

  const updatePeriodStatus = async (nextStatus: string) => {
    if (!currentPeriod) return
    try {
      await hrApi.updatePayrollPeriod(currentPeriod.id, { status: nextStatus })
      showToast("Payroll Status Updated", "success", `Payroll period marked ${nextStatus}.`)
      await refresh()
    } catch (err) {
      showToast("Status Update Failed", "warning", err instanceof Error ? err.message : "Could not update payroll status.")
    }
  }

  const updateRecord = async (record: PayrollRecord, changes: Partial<PayrollRecord>) => {
    const period = periodById.get(record.payroll_period_id)
    const editable = record.payment_status === "Pending" && period?.status !== "Cancelled"
    if ("payment_status" in changes) {
      if (changes.payment_status === "Paid" && record.payment_status !== "Approved") return showToast("Approval Required", "warning", "Approve the payroll record before marking it paid.")
      if (changes.payment_status === "Approved" && record.payment_status !== "Pending") return showToast("Payroll Locked", "warning", "Only pending payroll records can be approved.")
      if (changes.payment_status === "Cancelled" && record.payment_status === "Paid") return showToast("Payroll Locked", "warning", "Paid payroll records cannot be cancelled.")
    } else if (!editable) {
      return showToast("Payroll Locked", "warning", "Only pending payroll records can be edited.")
    }
    const calculated = calculatePayroll({ ...record, ...changes })
    try {
      await hrApi.updatePayrollRecord(record.id, calculated)
      showToast("Payroll Record Updated", "success", "Payroll record was recalculated and saved.")
      setEditing(null)
      await refresh()
    } catch (err) {
      showToast("Payroll Update Failed", "warning", err instanceof Error ? err.message : "Could not update payroll record.")
    }
  }

  const transitionPaymentStatus = async (record: PayrollRecord, nextStatus: PayrollRecord["payment_status"]) => {
    const period = periodById.get(record.payroll_period_id)
    if (period?.status === "Cancelled" || record.payment_status === "Cancelled") {
      return showToast("Payroll Cancelled", "warning", "Cancelled payroll records cannot be updated or printed.")
    }
    if (nextStatus === "Approved" && record.payment_status !== "Pending") {
      return showToast("Payroll Not Editable", "warning", "Only pending payroll records can be approved.")
    }
    if (nextStatus === "Paid" && record.payment_status !== "Approved") {
      return showToast("Approval Required", "warning", "Approve the payroll record before marking it paid.")
    }
    if (nextStatus === "Cancelled" && record.payment_status === "Paid") {
      return showToast("Payroll Locked", "warning", "Paid payroll records cannot be cancelled.")
    }
    if (nextStatus === record.payment_status) return
    if (nextStatus === "Paid") {
      try {
        await hrApi.payPayrollRecord(record.id)
        showToast("Payroll Paid", "success", "Salary payment and its balanced Finance journal entry were posted.")
        await financeStore.reloadFromApi()
        await refresh()
      } catch (err) {
        showToast("Payroll Payment Failed", "warning", err instanceof Error ? err.message : "Could not post payroll payment.")
      }
      return
    }
    await updateRecord(record, { payment_status: nextStatus })
  }

  const printPayslip = (record: PayrollRecord) => {
    const period = periodById.get(record.payroll_period_id)
    if (record.payment_status === "Cancelled" || period?.status === "Cancelled") {
      return showToast("Payslip Unavailable", "warning", "Cancelled payroll records do not generate payslips.")
    }
    setPayslip(record)
    window.setTimeout(() => window.print(), 100)
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12 print:hidden">
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div><h1 className="text-3xl font-black text-black tracking-tight mt-1">Payroll</h1><p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">Manual earnings, deductions, totals, workflow, and payslips from Supabase payroll data.</p></div>
          <SubPageNav items={getSectionChildren("/hr")} />
        </motion.div>
        {error && <GlassCard className="p-5 mb-5 text-sm font-bold text-rose-700 border-rose-200 bg-rose-50">{error}</GlassCard>}
        {loading ? (
          <HRPageSkeleton rows={7} cards={7} />
        ) : (
          <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-2 mb-3">
              <span className="text-xs font-black text-zinc-900 uppercase tracking-tight">Payroll Financial Totals</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-black/[0.02] p-2.5 rounded-xl">
                <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-wider">Total Gross Pay</span>
                <span className="text-base font-black text-zinc-950 mt-1 block">ETB {money(totals.gross)}</span>
              </div>
              <div className="bg-black/[0.02] p-2.5 rounded-xl">
                <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-wider">Total Deductions</span>
                <span className="text-base font-black text-rose-700 mt-1 block">ETB {money(totals.deductions)}</span>
              </div>
              <div className="bg-black/[0.02] p-2.5 rounded-xl">
                <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-wider">Total Net Pay</span>
                <span className="text-base font-black text-emerald-700 mt-1 block">ETB {money(totals.net)}</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-2 mb-3">
              <span className="text-xs font-black text-zinc-900 uppercase tracking-tight">Payroll Record Breakdown</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2 text-center">
              <div className="bg-black/[0.02] p-2.5 rounded-xl">
                <span className="block text-[8px] font-black text-zinc-400 uppercase tracking-wider">Employees</span>
                <span className="text-base font-black text-zinc-950 mt-0.5 block">{totals.employees}</span>
              </div>
              <div className="bg-black/[0.02] p-2.5 rounded-xl">
                <span className="block text-[8px] font-black text-zinc-400 uppercase tracking-wider">Pending</span>
                <span className="text-base font-black text-amber-600 mt-0.5 block">{totals.pending}</span>
              </div>
              <div className="bg-black/[0.02] p-2.5 rounded-xl">
                <span className="block text-[8px] font-black text-zinc-400 uppercase tracking-wider">Approved</span>
                <span className="text-base font-black text-blue-600 mt-0.5 block">{totals.approved}</span>
              </div>
              <div className="bg-black/[0.02] p-2.5 rounded-xl">
                <span className="block text-[8px] font-black text-zinc-400 uppercase tracking-wider">Paid</span>
                <span className="text-base font-black text-emerald-600 mt-0.5 block">{totals.paid}</span>
              </div>
            </div>
          </GlassCard>
        </div>
        <GlassCard className="p-0 overflow-hidden border border-black/5 shadow-xs">
          <HRTableToolbar
            title="Payroll Records"
            subtitle={currentPeriod ? `${currentPeriod.name} - ${currentPeriod.status}` : "No payroll period has been created yet."}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search employee or period..."
            filters={[
              { value: selectedPeriod, onChange: setSelectedPeriod, options: periods.length ? periods.map((period) => ({ value: period.id, label: period.name })) : [{ value: "", label: "No Periods" }] },
              { value: payrollStatus, onChange: setPayrollStatus, options: ["All", ...PAYROLL_PERIOD_STATUSES].map((item) => ({ value: item, label: item })) },
              { value: paymentStatus, onChange: setPaymentStatus, options: ["All", ...PAYMENT_STATUSES].map((item) => ({ value: item, label: item })) },
              { value: warehouse, onChange: setWarehouse, options: ["All", ...Array.from(new Set(employees.map((employee) => employee.warehouse_id).filter(Boolean)))].map((item) => ({ value: item, label: item })) },
            ]}
            actions={[{ label: "Create Period", onClick: () => setShowPeriodForm(true), variant: "secondary" }, { label: "Load Active Employees", onClick: loadActiveEmployees }]}
            secondary={currentPeriod && <div className="flex flex-wrap gap-2">{PAYROLL_PERIOD_STATUSES.filter((item) => item !== currentPeriod.status).map((item) => <button key={item} onClick={() => updatePeriodStatus(item)} className="rounded-full bg-black/[0.04] px-3 py-1.5 text-[10px] font-black uppercase text-zinc-700">{item}</button>)}</div>}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <ResizableTableHeader columns={columns} colWidths={colWidths} onResizeStart={handleResizeStart} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} onClearSort={handleClearSort} />
              <tbody className="divide-y divide-black/5 text-xs">
                {!loading && sorted.length === 0 ? <tr><td colSpan={10} className="py-12 text-center text-zinc-400 font-medium">No payroll records have been created yet.</td></tr> : sorted.map((record) => {
                  const employee = employeeById.get(record.employee_id)
                  const period = periodById.get(record.payroll_period_id)
                  const canApprove = record.payment_status === "Pending" && period?.status !== "Cancelled"
                  const canMarkPaid = record.payment_status === "Approved" && period?.status !== "Cancelled"
                  const canEdit = record.payment_status === "Pending" && period?.status !== "Cancelled"
                  const canPrint = record.payment_status !== "Cancelled" && period?.status !== "Cancelled"
                  return <tr key={record.id} className="hover:bg-black/[0.02] transition-colors">
                    <Cell width={colWidths.employee}>{employee ? `${employee.full_name} (${employee.employee_number})` : "Unknown employee"}</Cell>
                    <Cell width={colWidths.warehouse}>{employee?.warehouse_id || "-"}</Cell>
                    <Cell width={colWidths.employment_status} align="center">{employee?.status || "-"}</Cell>
                    <Cell width={colWidths.basic_salary} align="right">ETB {money(record.basic_salary)}</Cell>
                    <Cell width={colWidths.gross_pay} align="right">ETB {money(record.gross_pay)}</Cell>
                    <Cell width={colWidths.total_deductions} align="right">ETB {money(record.total_deductions)}</Cell>
                    <Cell width={colWidths.net_pay} align="right">ETB {money(record.net_pay)}</Cell>
                    <Cell width={colWidths.payment_status} align="center">{record.payment_status}</Cell>
                    <Cell width={colWidths.payroll_period_id}>{period?.name || record.payroll_period_id}</Cell>
                    <Cell width={colWidths.actions} align="right">
                      <button onClick={() => setPayslip(record)} className="p-1.5 hover:bg-black/5 rounded-lg text-zinc-500" title="View"><Eye className="size-4" /></button>
                      <button onClick={() => setEditing(record)} disabled={!canEdit} className="p-1.5 hover:bg-black/5 rounded-lg text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed" title="Edit Draft"><Pencil className="size-4" /></button>
                      <button onClick={() => transitionPaymentStatus(record, "Approved")} disabled={!canApprove} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed" title="Approve"><BadgeCheck className="size-4" /></button>
                      <button onClick={() => transitionPaymentStatus(record, "Paid")} disabled={!canMarkPaid} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed" title="Mark Paid"><CheckCircle2 className="size-4" /></button>
                      <button onClick={() => transitionPaymentStatus(record, "Cancelled")} disabled={record.payment_status === "Paid" || period?.status === "Cancelled"} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-700 disabled:opacity-30 disabled:cursor-not-allowed" title="Cancel"><Ban className="size-4" /></button>
                      <button onClick={() => printPayslip(record)} disabled={!canPrint} className="p-1.5 hover:bg-black/5 rounded-lg text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed" title="Print Payslip"><Printer className="size-4" /></button>
                    </Cell>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
          </>
        )}
      </motion.div>
      {showPeriodForm && <PeriodForm form={periodForm} setForm={setPeriodForm} onClose={() => setShowPeriodForm(false)} onSubmit={createPeriod} />}
      {editing && <PayrollRecordForm record={editing} onClose={() => setEditing(null)} onSubmit={(changes) => updateRecord(editing, changes)} />}
      {payslip && <Payslip record={payslip} employee={employeeById.get(payslip.employee_id)} period={periods.find((period) => period.id === payslip.payroll_period_id)} onClose={() => setPayslip(null)} />}
    </div>
  )
}

function Cell({ width, align = "left", children }: { width: number; align?: "left" | "right" | "center"; children: React.ReactNode }) {
  return <td style={{ width }} className={`py-3.5 px-3.5 truncate font-medium text-zinc-700 ${align === "right" ? "text-right" : align === "center" ? "text-center" : ""}`}>{children}</td>
}

function PeriodForm({ form, setForm, onClose, onSubmit }: { form: Omit<PayrollPeriod, "id">; setForm: (form: Omit<PayrollPeriod, "id">) => void; onClose: () => void; onSubmit: (event: React.FormEvent) => void }) {
  const set = (key: keyof Omit<PayrollPeriod, "id">, value: string | number) => setForm({ ...form, [key]: value })
  return <Modal title="Create Payroll Period" onClose={onClose}><form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input label="Period Name" value={form.name} onChange={(value) => set("name", value)} required /><Input label="Month" type="number" value={form.month} onChange={(value) => set("month", Number(value))} required /><Input label="Year" type="number" value={form.year} onChange={(value) => set("year", Number(value))} required /><Input label="Start Date" type="date" value={form.start_date} onChange={(value) => set("start_date", value)} required /><Input label="End Date" type="date" value={form.end_date} onChange={(value) => set("end_date", value)} required /><Select label="Status" value={form.status} options={PAYROLL_PERIOD_STATUSES} onChange={(value) => set("status", value)} /><Actions onClose={onClose} label="Save Period" /></form></Modal>
}

function PayrollRecordForm({ record, onClose, onSubmit }: { record: PayrollRecord; onClose: () => void; onSubmit: (changes: Partial<PayrollRecord>) => void }) {
  const [form, setForm] = useState(record)
  const set = (key: keyof PayrollRecord, value: string | number) => setForm(calculatePayroll({ ...form, [key]: value }))
  return <Modal title="Edit Payroll Record" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSubmit(form) }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {(["basic_salary", "allowances", "overtime_pay", "bonus", "other_earnings", "tax", "pension", "absence_deduction", "loan_deduction", "other_deductions"] as const).map((key) => <Input key={key} label={key.replaceAll("_", " ")} type="number" value={form[key]} onChange={(value) => set(key, Number(value))} />)}
    <Input label="Gross Pay" type="number" value={form.gross_pay} onChange={() => undefined} />
    <Input label="Total Deductions" type="number" value={form.total_deductions} onChange={() => undefined} />
    <Input label="Net Pay" type="number" value={form.net_pay} onChange={() => undefined} />
    <Select label="Payment Status" value={form.payment_status} options={PAYMENT_STATUSES} onChange={(value) => set("payment_status", value)} />
    <Input label="Notes" value={form.notes} onChange={(value) => set("notes", value)} />
    <Actions onClose={onClose} label="Save Payroll Record" />
  </form></Modal>
}

function Payslip({ record, employee, period, onClose }: { record: PayrollRecord; employee?: Employee; period?: PayrollPeriod; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:static print:bg-white print:p-0"><motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-black/10 print:shadow-none print:border-0 print:rounded-none"><div className="flex items-center justify-between mb-5 print:hidden"><h3 className="text-lg font-black">Payslip</h3><div className="flex gap-2"><button onClick={() => window.print()} className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-bold flex items-center gap-1"><Printer className="size-3.5" />Print</button><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5"><X className="size-5" /></button></div></div>
    <div className="text-center border-b border-black/10 pb-4 mb-4"><h2 className="text-xl font-black">HKC Trading ERP</h2><p className="text-xs font-bold text-zinc-500">{period?.name || "Payroll period"} Payslip</p></div>
    <div className="grid grid-cols-2 gap-3 text-xs">
      <Line label="Employee Number" value={employee?.employee_number || "-"} /><Line label="Employee Name" value={employee?.full_name || "-"} /><Line label="Warehouse" value={employee?.warehouse_id || "-"} /><Line label="Payment Status" value={record.payment_status} />
      <Line label="Basic Salary" value={`ETB ${money(record.basic_salary)}`} /><Line label="Allowances" value={`ETB ${money(record.allowances)}`} /><Line label="Overtime Pay" value={`ETB ${money(record.overtime_pay)}`} /><Line label="Bonus" value={`ETB ${money(record.bonus)}`} /><Line label="Other Earnings" value={`ETB ${money(record.other_earnings)}`} /><Line label="Gross Pay" value={`ETB ${money(record.gross_pay)}`} />
      <Line label="Tax" value={`ETB ${money(record.tax)}`} /><Line label="Pension" value={`ETB ${money(record.pension)}`} /><Line label="Absence Deduction" value={`ETB ${money(record.absence_deduction)}`} /><Line label="Loan Deduction" value={`ETB ${money(record.loan_deduction)}`} /><Line label="Other Deductions" value={`ETB ${money(record.other_deductions)}`} /><Line label="Total Deductions" value={`ETB ${money(record.total_deductions)}`} />
      <div className="col-span-2 rounded-2xl bg-black text-white p-4 flex items-center justify-between"><span className="text-sm font-black">Net Pay</span><span className="text-xl font-black">ETB {money(record.net_pay)}</span></div>
    </div>
  </motion.div></div>
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"><motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar bg-white rounded-3xl p-6 shadow-2xl border border-black/10"><div className="flex items-center justify-between mb-5"><h3 className="text-lg font-black">{title}</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5"><X className="size-5" /></button></div>{children}</motion.div></div>
}

function Actions({ onClose, label }: { onClose: () => void; label: string }) {
  return <div className="md:col-span-3 flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-full bg-black/5 text-xs font-bold">Cancel</button><button type="submit" className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold">{label}</button></div>
}

function Input({ label, value, onChange, type = "text", required = false }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} readOnly={onChange.toString().includes("undefined")} className="mt-1 w-full rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs font-bold outline-none read-only:bg-zinc-100" /></label>
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs font-bold outline-none">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-black/[0.03] px-3 py-2 flex justify-between gap-3"><span className="font-bold text-zinc-500">{label}</span><span className="font-black text-zinc-900 text-right">{value}</span></div>
}
