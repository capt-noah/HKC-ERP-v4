import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, CreditCard, Eye, FileCheck } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useHRStore } from "@/lib/hrStore"
import { useFinanceStore } from "@/lib/financeStore"
import { useFeedback } from "@/context/FeedbackContext"
import { 
  HRTableToolbar, 
  ResizableTableHeader, 
  useTableSort, 
  useColumnWidths, 
  type TableColumn 
} from "@/components/HRTable"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

export default function Payroll() {
  const { showToast } = useFeedback()
  const hr = useHRStore()
  const finStore = useFinanceStore()

  const payrollRuns = finStore.getPayrollRuns()
  const employees = hr.getEmployees()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDept, setSelectedDept] = useState("All")

  const departments = ["All", ...Array.from(new Set(employees.map(e => e.department)))]

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = selectedDept === "All" || emp.department === selectedDept
    return matchesSearch && matchesDept
  })

  const { sortKey, sortDir, handleSort, handleClearSort, sortItems } = useTableSort()
  const sortedEmployees = sortItems(filteredEmployees)

  const columns: TableColumn[] = [
    { key: "name", label: "Employee", initialWidth: 200 },
    { key: "department", label: "Department", initialWidth: 150 },
    { key: "id", label: "Account ID", initialWidth: 140 },
    { key: "salary", label: "Monthly Base", align: "right", initialWidth: 150 },
    { key: "paymentStatus", label: "Disbursement Status", align: "center", initialWidth: 170 },
    { key: "actions", label: "Actions", align: "right", sortable: false, initialWidth: 130 },
  ]

  const { colWidths, handleResizeStart } = useColumnWidths({
    name: 200,
    department: 150,
    id: 140,
    salary: 150,
    paymentStatus: 170,
    actions: 130,
  })

  // Action: Post Payroll Accrual to Ledger
  const handlePostAccrual = (runId: string) => {
    const res = finStore.postPayrollAccrual(runId)
    if (res.success) {
      showToast(
        "Payroll Accrued in General Ledger",
        "success",
        `Created Journal Entry ${res.entryId}. Salary Expense debited and individual employee payable credits posted.`
      )
    } else {
      showToast("Accrual Blocked", "warning", res.error || "Failed to post payroll accrual.")
    }
  }

  // Action: Disburse Payroll Payment to Ledger
  const handleDisbursePayment = (runId: string) => {
    const res = finStore.postPayrollPayment(runId)
    if (res.success) {
      showToast(
        "Payroll Disbursed in General Ledger",
        "success",
        `Created Journal Entry ${res.entryId}. Accrued Payroll debited and Cash account credited.`
      )
    } else {
      showToast("Disbursement Blocked", "warning", res.error || "Failed to post payroll disbursement.")
    }
  }

  const handlePayEmployee = (_id: string) => {
    showToast("Disbursement Recorded", "success", "Employee payout updated.")
  }

  // Action: Pay specific employee

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header Block */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight mt-1">Payroll Hub</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Monthly base salary register, disbursement status, and ledger posting controls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/hr")} />
          </div>
        </motion.div>

        {/* Section: Finance Ledger Payroll Run Postings */}
        <motion.div variants={fade} className="mb-8">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black uppercase text-zinc-900 tracking-tight">Active Payroll Cycles & Ledger Postings</h3>
                <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                  Process two-phase accounting: Accrue payroll expenses, then disburse payments to employee accounts.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                2-Phase Accounting Engine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payrollRuns.map((run) => (
                <div key={run.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-900">{run.period_label}</span>
                      <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        run.status === "Paid"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : run.status === "Accrued"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}>
                        {run.status === "Draft" ? "Draft (Unposted)" : run.status === "Accrued" ? "Accrued (Payable Created)" : "Paid & Disbursed"}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-mono mt-1">
                      Period: {run.period_start} to {run.period_end} • {run.employees.length} Employees
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-xl bg-white border border-zinc-100 font-mono text-[11px]">
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-sans uppercase">Gross Pay</span>
                        <span className="font-bold text-zinc-900">ETB {run.total_gross.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-sans uppercase">Deductions</span>
                        <span className="font-bold text-amber-800">ETB {run.total_deductions.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-sans uppercase">Net Payout</span>
                        <span className="font-bold text-emerald-800">ETB {run.total_net.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200/60 pt-3 text-xs">
                    <div className="text-[10px] font-mono text-zinc-400">
                      {run.accrual_journal_entry_id && (
                        <span className="block">Accrual JE: {run.accrual_journal_entry_id}</span>
                      )}
                      {run.payment_journal_entry_id && (
                        <span className="block">Payment JE: {run.payment_journal_entry_id}</span>
                      )}
                    </div>

                    <div>
                      {run.status === "Draft" && (
                        <button
                          onClick={() => handlePostAccrual(run.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-sm"
                        >
                          <FileCheck className="size-3.5" /> Post Accrual
                        </button>
                      )}
                      {run.status === "Accrued" && (
                        <button
                          onClick={() => handleDisbursePayment(run.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm"
                        >
                          <CreditCard className="size-3.5" /> Disburse Payment
                        </button>
                      )}
                      {run.status === "Paid" && (
                        <span className="text-xs text-emerald-700 font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="size-4" /> Fully Settled in GL
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Payroll Records List */}
        <motion.div variants={fade}>
          <GlassCard className="p-0 overflow-hidden border border-black/5 shadow-xs">
            <HRTableToolbar
              title="Payroll Disbursement Register"
              subtitle={`${sortedEmployees.length} monthly base salary records`}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search employee, role..."
              filters={[
                {
                  value: selectedDept,
                  onChange: setSelectedDept,
                  ariaLabel: "Department Filter",
                  options: departments.map((d) => ({ value: d, label: d === "All" ? "All Departments" : d })),
                },
              ]}
              actions={[
                {
                  label: "Run Payroll Cycle",
                  onClick: () => showToast("Payroll Cycle Initiated", "info", "Preparing monthly disbursement calculations..."),
                },
              ]}
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <ResizableTableHeader
                  columns={columns}
                  colWidths={colWidths}
                  onResizeStart={handleResizeStart}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  onClearSort={handleClearSort}
                />
                <tbody className="divide-y divide-black/5 text-xs">
                  {sortedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400 font-medium">
                        No payroll sheets match your search.
                      </td>
                    </tr>
                  ) : (
                    sortedEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-black/[0.02] transition-colors">
                        <td style={{ width: `${colWidths.name}px` }} className="py-3.5 px-3.5 truncate">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`size-8 rounded-full ${emp.avatarBg} flex items-center justify-center text-xs font-black text-zinc-800 shadow-2xs shrink-0`}>
                              {emp.initials}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-black truncate">{emp.name}</p>
                              <p className="text-[10px] text-zinc-500 truncate">{emp.role}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ width: `${colWidths.department}px` }} className="py-3.5 px-3.5 truncate">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/5 text-zinc-800 inline-block truncate">
                            {emp.department}
                          </span>
                        </td>
                        <td style={{ width: `${colWidths.id}px` }} className="py-3.5 px-3.5 font-mono text-xs font-bold text-zinc-500 truncate">
                          {emp.id.replace("EMP", "ACC")}
                        </td>
                        <td style={{ width: `${colWidths.salary}px` }} className="py-3.5 px-3.5 text-xs font-black text-black font-mono text-right truncate">
                          ETB {emp.salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ width: `${colWidths.paymentStatus}px` }} className="py-3.5 px-3.5 text-center">
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${emp.paymentStatusColor}`}>
                              <span className={`size-1.5 rounded-full ${emp.paymentStatus === "Paid" ? "bg-emerald-500" : "bg-amber-500"}`} />
                              {emp.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td style={{ width: `${colWidths.actions}px` }} className="py-3.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button className="p-1.5 hover:bg-black/5 rounded-lg text-zinc-400 hover:text-black transition-all active:scale-90" title="View details">
                              <Eye className="size-3.5" />
                            </button>
                            {emp.paymentStatus !== "Paid" ? (
                              <button
                                onClick={() => handlePayEmployee(emp.id)}
                                className="flex items-center gap-1 bg-black hover:bg-zinc-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full transition-all shadow-xs active:scale-95"
                              >
                                <CreditCard className="size-3" />
                                Disburse
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-extrabold px-2 py-1 flex items-center gap-1">
                                <CheckCircle2 className="size-3 text-emerald-600" /> Fully Paid
                              </span>
                            )}
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
    </div>
  )
}
