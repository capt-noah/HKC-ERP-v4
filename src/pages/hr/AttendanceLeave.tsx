import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users, 
  FileSpreadsheet, 
  Info,
  X
} from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useFeedback } from "@/context/FeedbackContext"
import { 
  HRTableToolbar, 
  ResizableTableHeader, 
  useTableSort, 
  useColumnWidths, 
  type TableColumn 
} from "@/components/HRTable"

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

interface Employee {
  id: string
  name: string
  role: string
  avatar: string
  // Array of attendance states for days 1 to 14 of July 2026
  attendance: ("present" | "absent" | "leave")[]
}

const initialEmployees: Employee[] = []

interface LeaveRequest {
  id: string
  employeeName: string
  role: string
  avatar: string
  type: "Annual Leave" | "Medical Leave" | "Maternity Leave" | "Compassionate"
  range: string
  reason: string
  status: "Pending" | "Approved" | "Rejected"
}

const initialLeaveRequests: LeaveRequest[] = []

export default function AttendanceLeave() {
  const { showToast } = useFeedback()
  const [activeTab, setActiveTab] = useState<"Attendance" | "Leave">("Attendance")
  const [team, setTeam] = useState<Employee[]>(initialEmployees)
  const [requests, setRequests] = useState<LeaveRequest[]>(initialLeaveRequests)

  // Leave Table Search & Filters
  const [leaveSearch, setLeaveSearch] = useState("")
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("All")
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("All")

  // New Leave Modal State
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false)
  const [newLeave, setNewLeave] = useState({
    employeeName: "",
    type: "Annual Leave" as LeaveRequest["type"],
    range: "",
    reason: "",
  })

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.employeeName.toLowerCase().includes(leaveSearch.toLowerCase()) ||
      r.id.toLowerCase().includes(leaveSearch.toLowerCase()) ||
      r.reason.toLowerCase().includes(leaveSearch.toLowerCase())
    const matchesType = leaveTypeFilter === "All" || r.type === leaveTypeFilter
    const matchesStatus = leaveStatusFilter === "All" || r.status === leaveStatusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const { sortKey, sortDir, handleSort, handleClearSort, sortItems } = useTableSort()
  const sortedRequests = sortItems(filteredRequests)

  const leaveColumns: TableColumn[] = [
    { key: "employeeName", label: "Ref ID & Staff", initialWidth: 200 },
    { key: "type", label: "Leave Type", initialWidth: 140 },
    { key: "range", label: "Date Range", initialWidth: 160 },
    { key: "reason", label: "Reason / Notes", initialWidth: 220 },
    { key: "status", label: "Status", align: "center", initialWidth: 120 },
    { key: "actions", label: "Actions", align: "right", sortable: false, initialWidth: 130 },
  ]

  const { colWidths: leaveColWidths, handleResizeStart: handleLeaveResizeStart } = useColumnWidths({
    employeeName: 200,
    type: 140,
    range: 160,
    reason: 220,
    status: 120,
    actions: 130,
  })

  const handleApplyLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLeave.employeeName || !newLeave.reason) return

    const newReq: LeaveRequest = {
      id: `LR-${105 + requests.length}`,
      employeeName: newLeave.employeeName,
      role: "Staff Member",
      avatar: newLeave.employeeName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
      type: newLeave.type,
      range: newLeave.range,
      reason: newLeave.reason,
      status: "Pending",
    }

    setRequests([newReq, ...requests])
    setShowApplyLeaveModal(false)
    setNewLeave({
      employeeName: "",
      type: "Annual Leave",
      range: "",
      reason: "",
    })
    showToast("Leave Request Submitted", "success", `Application ${newReq.id} recorded for review.`)
  }

  // Calendar stats
  const totalDays = 14
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1)

  // Cycle day attendance state: present -> absent -> leave -> present
  const handleToggleDay = (empId: string, dayIndex: number) => {
    setTeam((prev) =>
      prev.map((emp) => {
        if (emp.id === empId) {
          const nextAttendance = [...emp.attendance]
          const current = nextAttendance[dayIndex]
          let nextState: "present" | "absent" | "leave" = "present"
          
          if (current === "present") nextState = "absent"
          else if (current === "absent") nextState = "leave"
          else nextState = "present"

          nextAttendance[dayIndex] = nextState

          showToast(
            "Attendance Cycle Update",
            "info",
            `Changed ${emp.name}'s Jul ${dayIndex + 1} status to ${nextState.toUpperCase()}.`
          )
          return { ...emp, attendance: nextAttendance }
        }
        return emp
      })
    )
  }

  // Handle requests
  const handleRequestStatus = (id: string, nextStatus: "Approved" | "Rejected") => {
    const target = requests.find((r) => r.id === id)
    if (!target) return

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
    )

    showToast(
      `Request ${nextStatus}`,
      nextStatus === "Approved" ? "success" : "warning",
      `${target.employeeName}'s ${target.type} request has been ${nextStatus.toLowerCase()}.`
    )
  }

  // Statistics calculation
  const totalSubmissions = team.length * totalDays
  const presentCount = team.reduce(
    (acc, emp) => acc + emp.attendance.filter((status) => status === "present").length,
    0
  )
  const leaveCount = team.reduce(
    (acc, emp) => acc + emp.attendance.filter((status) => status === "leave").length,
    0
  )
  const absentCount = team.reduce(
    (acc, emp) => acc + emp.attendance.filter((status) => status === "absent").length,
    0
  )

  const presentPercentage = totalSubmissions ? (presentCount / totalSubmissions) * 100 : 0

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div 
        variants={stagger} 
        initial="hidden" 
        animate="visible" 
        className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12"
      >
        {/* Title Header Block */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Attendance & Leave</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Track team attendance and manage leave approvals.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/hr")} />
          </div>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div variants={fade} className="flex border-b border-zinc-200/60 mb-6 pb-px items-center justify-between">
          <div className="flex gap-2">
            {[
              { id: "Attendance", label: "Team Attendance" },
              { id: "Leave", label: `Leave Requests (${requests.filter((r) => r.status === "Pending").length})` },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="px-4 py-2.5 text-xs font-black relative tracking-tight transition-colors uppercase"
                >
                  <span className={isActive ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-700"}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="attendance-tabs"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700"
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="text-[10px] font-mono font-black text-zinc-400 uppercase hidden sm:block">
            Cycle: July 1 - July 14, 2026
          </div>
        </motion.div>

        {/* Tab 1: Attendance Grid */}
        <AnimatePresence mode="wait">
          {activeTab === "Attendance" && (
            <motion.div
              key="attendance-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              {/* Analytics summary rows */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard className="p-5" whileHover={{ y: -2 }}>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Average Presence Ratio</span>
                  <span className="text-xl font-black text-zinc-900 block mt-1">
                    {presentPercentage.toFixed(1)}%
                  </span>
                  <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-emerald-500" style={{ width: `${presentPercentage}%` }} />
                  </div>
                </GlassCard>

                <GlassCard className="p-5" whileHover={{ y: -2 }}>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Total Active Members</span>
                  <span className="text-xl font-black text-zinc-900 block mt-1">
                    {team.length} Employees
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 mt-2.5">
                    <Users className="size-3.5" /> Core Staffing Registered
                  </div>
                </GlassCard>

                <GlassCard className="p-5" whileHover={{ y: -2 }}>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Present Mandays</span>
                  <span className="text-xl font-black text-zinc-950 block mt-1">
                    {presentCount} Present
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-black text-green-700 uppercase tracking-wider mt-2.5">
                    <span className="size-1.5 rounded-full bg-green-600 shrink-0" /> Green Filled Indicators
                  </div>
                </GlassCard>

                <GlassCard className="p-5" whileHover={{ y: -2 }}>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Leave & Absence Counts</span>
                  <span className="text-xl font-black text-zinc-900 block mt-1">
                    {leaveCount} Leave / {absentCount} Absent
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 uppercase tracking-wider mt-2.5">
                    <span className="size-1.5 rounded-full bg-zinc-200 border border-zinc-400 shrink-0" /> Outlined Day Cells
                  </div>
                </GlassCard>
              </div>

              {/* Dynamic Calendar Grid Team View */}
              <GlassCard className="p-6 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-100 mb-6 gap-3">
                  <div>
                    <h3 className="text-xs font-black tracking-tight text-zinc-900 uppercase">Interactive Team Attendance Grid</h3>
                    <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">
                      Cycle click cells to toggle status: Present (Green), Absent (Border), Leave (Dot Outline).
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap shrink-0">
                    <button 
                      onClick={() => showToast("Exporting Timecards", "info", "Compiling Excel spreadsheet...")}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition-all shadow-2xs active:scale-95"
                    >
                      <FileSpreadsheet className="size-3.5" /> Export Sheet
                    </button>

                    <div className="flex items-center gap-3 text-[10px] font-semibold text-zinc-500">
                      <div className="flex items-center gap-1">
                        <div className="size-3.5 rounded bg-green-700" />
                        <span>Present</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="size-3.5 rounded border border-red-300" />
                        <span>Absent</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="size-3.5 rounded border border-blue-300 bg-blue-50/50" />
                        <span>Leave</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[800px] space-y-4">
                    {/* Header Month Row */}
                    <div className="grid grid-cols-12 items-center text-center">
                      <div className="col-span-3 text-left">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Employee Row</span>
                      </div>
                      <div className="col-span-9 grid grid-cols-14 gap-1.5 font-mono text-[10px] font-bold text-zinc-400 uppercase">
                        {daysArray.map((day) => (
                          <div key={day} className="py-1">
                            Jul {day}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Employee Attendance Data Rows */}
                    <div className="divide-y divide-zinc-100">
                      {team.map((emp) => (
                        <div key={emp.id} className="grid grid-cols-12 items-center py-3.5 hover:bg-zinc-50/50 transition-colors rounded-xl px-1">
                          {/* Employee Name & Profile Column */}
                          <div className="col-span-3 flex items-center gap-3 text-left">
                            <div className="size-8.5 rounded-full bg-zinc-950 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                              {emp.avatar}
                            </div>
                            <div className="min-w-0 pr-2">
                              <h4 className="text-xs font-black text-zinc-900 truncate leading-tight">{emp.name}</h4>
                              <p className="text-[10px] font-semibold text-zinc-400 truncate mt-0.5">{emp.role}</p>
                            </div>
                          </div>

                          {/* Attendance Grid Cell Row */}
                          <div className="col-span-9 grid grid-cols-14 gap-1.5">
                            {emp.attendance.map((status, idx) => {
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleToggleDay(emp.id, idx)}
                                  className={`size-7.5 rounded-xl flex items-center justify-center transition-all duration-200 relative group active:scale-95 ${
                                    status === "present"
                                      ? "bg-green-700 border border-green-700 text-white shadow-sm shadow-green-700/10"
                                      : status === "absent"
                                        ? "border border-red-200 hover:border-red-400 text-red-500 bg-transparent"
                                        : "border border-blue-200 hover:border-blue-400 bg-blue-50/20 text-blue-500"
                                  }`}
                                  title={`${emp.name}: July ${idx + 1} (${status})`}
                                >
                                  {/* Minimal indicator dots or symbols */}
                                  {status === "present" && <span className="text-[9px] font-black leading-none">P</span>}
                                  {status === "absent" && <span className="text-[9px] font-bold leading-none">A</span>}
                                  {status === "leave" && <span className="text-[9px] font-bold leading-none">L</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 mt-6 flex items-start gap-2.5">
                  <Info className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-semibold text-zinc-500 leading-normal">
                    This staff attendance matrix interfaces directly with monthly Payroll disbursements. Make sure to audit and submit pending leave requests regularly.
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Tab 2: Leave Requests */}
          {activeTab === "Leave" && (
            <motion.div
              key="leave-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Context list sidebar */}
              <div className="lg:col-span-1">
                <GlassCard className="p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-xs font-black tracking-tight text-zinc-900 uppercase">Leave Requests Overview</h3>
                    <p className="text-[10px] font-semibold text-zinc-400 leading-relaxed mt-1">
                      Assess outstanding applications, audit eligibility parameters, and dispatch double-entry adjustment logs to team rosters.
                    </p>
                  </div>

                  <hr className="border-zinc-100" />

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Leave Policies Rules</h4>
                    
                    <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-800">Annual Paid Allowance</span>
                        <span className="text-[10px] font-mono font-black text-zinc-900">24 Days</span>
                      </div>
                      <div className="h-1 bg-zinc-200 rounded-full mt-2" />
                    </div>

                    <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-800">Paid Medical Extension</span>
                        <span className="text-[10px] font-mono font-black text-zinc-900">12 Days</span>
                      </div>
                      <div className="h-1 bg-zinc-200 rounded-full mt-2" />
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Request Table View */}
              <div className="lg:col-span-2">
                <GlassCard className="p-0 overflow-hidden border border-black/5 shadow-xs">
                  <HRTableToolbar
                    title="Leave Applications Log"
                    subtitle={`${sortedRequests.length} leave applications registered`}
                    searchValue={leaveSearch}
                    onSearchChange={setLeaveSearch}
                    searchPlaceholder="Search staff, ref, reason..."
                    filters={[
                      {
                        value: leaveTypeFilter,
                        onChange: setLeaveTypeFilter,
                        ariaLabel: "Leave Type Filter",
                        options: [
                          { value: "All", label: "All Leave Types" },
                          { value: "Annual Leave", label: "Annual Leave" },
                          { value: "Medical Leave", label: "Medical Leave" },
                          { value: "Maternity Leave", label: "Maternity Leave" },
                          { value: "Compassionate", label: "Compassionate" },
                        ],
                      },
                      {
                        value: leaveStatusFilter,
                        onChange: setLeaveStatusFilter,
                        ariaLabel: "Status Filter",
                        options: [
                          { value: "All", label: "All Statuses" },
                          { value: "Pending", label: "Pending" },
                          { value: "Approved", label: "Approved" },
                          { value: "Rejected", label: "Rejected" },
                        ],
                      },
                    ]}
                    actions={[
                      {
                        label: "Export Sheet",
                        onClick: () => showToast("Exporting Leave Records", "info", "Compiling Excel spreadsheet..."),
                        variant: "secondary",
                      },
                      {
                        label: "Apply Leave",
                        onClick: () => setShowApplyLeaveModal(true),
                      },
                    ]}
                  />

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed">
                      <ResizableTableHeader
                        columns={leaveColumns}
                        colWidths={leaveColWidths}
                        onResizeStart={handleLeaveResizeStart}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        onClearSort={handleClearSort}
                      />
                      <tbody className="divide-y divide-black/5 text-xs">
                        {sortedRequests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-zinc-400 font-medium">
                              No leave requests match search criteria.
                            </td>
                          </tr>
                        ) : (
                          sortedRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-black/[0.02] transition-colors">
                              <td style={{ width: `${leaveColWidths.employeeName}px` }} className="py-3.5 px-3.5 truncate">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="size-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                                    {req.avatar}
                                  </div>
                                  <div className="truncate">
                                    <p className="text-xs font-bold text-black truncate">{req.employeeName}</p>
                                    <p className="text-[10px] text-zinc-400 font-mono font-bold truncate">{req.id} • {req.role}</p>
                                  </div>
                                </div>
                              </td>
                              <td style={{ width: `${leaveColWidths.type}px` }} className="py-3.5 px-3.5 truncate">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border truncate ${
                                  req.type === "Annual Leave" ? "bg-zinc-100 text-zinc-700 border-zinc-200" :
                                  req.type === "Medical Leave" ? "bg-amber-50 text-amber-800 border-amber-200" :
                                  req.type === "Compassionate" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                  "bg-blue-50 text-blue-800 border-blue-200"
                                }`}>
                                  {req.type}
                                </span>
                              </td>
                              <td style={{ width: `${leaveColWidths.range}px` }} className="py-3.5 px-3.5 font-mono text-xs font-semibold text-zinc-800 truncate">
                                {req.range}
                              </td>
                              <td style={{ width: `${leaveColWidths.reason}px` }} className="py-3.5 px-3.5 text-zinc-600 truncate">
                                "{req.reason}"
                              </td>
                              <td style={{ width: `${leaveColWidths.status}px` }} className="py-3.5 px-3.5 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                                  req.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  req.status === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                  "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  <span className={`size-1.5 rounded-full ${
                                    req.status === "Approved" ? "bg-emerald-500" :
                                    req.status === "Rejected" ? "bg-rose-500" : "bg-amber-500"
                                  }`} />
                                  {req.status}
                                </span>
                              </td>
                              <td style={{ width: `${leaveColWidths.actions}px` }} className="py-3.5 px-3.5 text-right">
                                {req.status === "Pending" ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => handleRequestStatus(req.id, "Rejected")}
                                      className="px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold transition-all"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      onClick={() => handleRequestStatus(req.id, "Approved")}
                                      className="px-2 py-0.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold shadow-2xs transition-all"
                                    >
                                      Approve
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Audited</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Apply Leave Modal */}
        <AnimatePresence>
          {showApplyLeaveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-black/10"
              >
                <div className="flex items-center justify-between pb-4 border-b border-black/5 mb-4">
                  <h3 className="text-sm font-black text-black uppercase tracking-tight">Submit Leave Application</h3>
                  <button
                    onClick={() => setShowApplyLeaveModal(false)}
                    className="p-1 rounded-full hover:bg-black/5 text-zinc-400 hover:text-black"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <form onSubmit={handleApplyLeaveSubmit} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Employee Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newLeave.employeeName}
                      onChange={(e) => setNewLeave({ ...newLeave, employeeName: e.target.value })}
                      className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-3 py-2 text-xs font-bold text-black outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Leave Type
                    </label>
                    <select
                      value={newLeave.type}
                      onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value as any })}
                      className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-3 py-2 text-xs font-bold text-black outline-none"
                    >
                      <option value="Annual Leave">Annual Leave</option>
                      <option value="Medical Leave">Medical Leave</option>
                      <option value="Maternity Leave">Maternity Leave</option>
                      <option value="Compassionate">Compassionate</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Date Range
                    </label>
                    <input
                      type="text"
                      required
                      value={newLeave.range}
                      onChange={(e) => setNewLeave({ ...newLeave, range: e.target.value })}
                      className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-3 py-2 text-xs font-bold text-black outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Reason / Justification
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newLeave.reason}
                      onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                      placeholder="Specify purpose of leave..."
                      className="w-full bg-black/[0.03] border border-black/5 rounded-xl px-3 py-2 text-xs font-semibold text-black outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowApplyLeaveModal(false)}
                      className="px-4 py-2 rounded-full text-xs font-bold text-zinc-500 hover:bg-black/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-full bg-black hover:bg-zinc-800 text-white text-xs font-bold shadow-xs"
                    >
                      Submit Application
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
