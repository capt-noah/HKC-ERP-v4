import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Save } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { HRPageSkeleton } from "@/components/HRSkeleton"
import { SubPageNav } from "@/components/SubPageNav"
import { HRTableToolbar } from "@/components/HRTable"
import { useFeedback } from "@/context/FeedbackContext"
import { LoadingDots } from "@/components/ui/LoadingDots"
import { getSectionChildren, navSections } from "@/lib/nav-config"
import { ATTENDANCE_STATUSES, WAREHOUSE_OPTIONS, calculateHours, hrApi, initials, loadHRData, makeId, type AttendanceRecord, type Employee } from "@/lib/hrApi"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }
const today = new Date().toISOString().slice(0, 10)
const quickStatuses = [
  { key: "Present", label: "P" },
  { key: "Absent", label: "A" },
  { key: "On Leave", label: "L" },
] as const

type AttendanceDraft = Pick<AttendanceRecord, "status" | "check_in_time" | "check_out_time" | "notes">

function blankDraft(): AttendanceDraft {
  return { status: "Present", check_in_time: "", check_out_time: "", notes: "" }
}

function statusRequiresNoTime(status: string) {
  return status === "Absent"
}

export default function Attendance() {
  const { showToast } = useFeedback()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [date, setDate] = useState(today)
  const [search, setSearch] = useState("")
  const [warehouse, setWarehouse] = useState("All")
  const [status, setStatus] = useState("All")
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({})
  const [savingId, setSavingId] = useState("")

  const refresh = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await loadHRData()
      setEmployees(data.employees)
      setRecords(data.attendance)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const recordsByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceRecord>()
    for (const record of records) {
      if (record.attendance_date === date) map.set(record.employee_id, record)
    }
    return map
  }, [date, records])

  const employeeRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return employees.filter((employee) => {
      const saved = recordsByEmployee.get(employee.id)
      const draft = drafts[employee.id]
      const rowStatus = draft?.status || saved?.status || ""
      const matchesSearch = !query || [employee.full_name, employee.employee_number, employee.phone, employee.email].some((value) => String(value || "").toLowerCase().includes(query))
      return matchesSearch && (warehouse === "All" || employee.warehouse_id === warehouse) && (status === "All" || rowStatus === status)
    })
  }, [drafts, employees, recordsByEmployee, search, status, warehouse])

  const getDraft = (employee: Employee) => {
    const saved = recordsByEmployee.get(employee.id)
    return drafts[employee.id] || {
      status: saved?.status || "Present",
      check_in_time: saved?.check_in_time || "",
      check_out_time: saved?.check_out_time || "",
      notes: saved?.notes || "",
    }
  }

  const setDraft = (employeeId: string, patch: Partial<AttendanceDraft>) => {
    setDrafts((prev) => ({ ...prev, [employeeId]: { ...(prev[employeeId] || blankDraft()), ...patch } }))
  }

  const saveAttendance = async (employee: Employee) => {
    const draft = getDraft(employee)
    const noTimeRequired = statusRequiresNoTime(draft.status)
    const checkIn = noTimeRequired ? "" : draft.check_in_time
    const checkOut = noTimeRequired ? "" : draft.check_out_time

    if (!noTimeRequired && checkIn && checkOut && calculateHours(checkIn, checkOut) === 0) {
      showToast("Attendance Not Saved", "warning", "Check-out time cannot be earlier than check-in time.")
      return
    }
    const hours = noTimeRequired || ["On Leave", "Holiday", "Weekend"].includes(draft.status) ? 0 : calculateHours(checkIn, checkOut)
    const existing = recordsByEmployee.get(employee.id)
    const payload = {
      employee_id: employee.id,
      attendance_date: date,
      check_in_time: checkIn,
      check_out_time: checkOut,
      status: draft.status,
      hours_worked: hours,
      overtime_hours: Math.max(0, hours - 8),
      warehouse_id: employee.warehouse_id,
      notes: draft.notes,
      locked_by_payroll: existing?.locked_by_payroll || false,
    }

    setSavingId(employee.id)
    try {
      if (existing) {
        const saved = await hrApi.updateAttendance(existing.id, payload)
        setRecords((prev) => prev.map((record) => record.id === existing.id ? { ...record, ...saved, ...payload, id: existing.id } : record))
      } else {
        const saved = await hrApi.createAttendance({ id: makeId("ATT"), ...payload })
        setRecords((prev) => [{ ...payload, ...saved, id: saved.id || makeId("ATT") }, ...prev])
      }
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[employee.id]
        return next
      })
      showToast("Attendance Saved", "success", `${employee.full_name}'s attendance was saved.`)
      void refresh()
    } catch (err) {
      showToast("Attendance Save Failed", "warning", err instanceof Error ? err.message : "Supabase rejected the attendance record.")
    } finally {
      setSavingId("")
    }
  }

  const markAllPresent = async () => {
    for (const employee of employeeRows) {
      setDraft(employee.id, { status: "Present" })
    }
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight mt-1">Attendance</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">Daily attendance matrix with quick P/A/L entry, check-in, and check-out times.</p>
          </div>
          <SubPageNav items={getSectionChildren("/hr")} />
        </motion.div>
        {error && <GlassCard className="p-5 mb-5 text-sm font-bold text-rose-700 border-rose-200 bg-rose-50">{error}</GlassCard>}
        {loading ? (
          <HRPageSkeleton rows={7} cards={4} />
        ) : (
          <GlassCard className="p-0 overflow-hidden border border-black/5 shadow-xs">
            <HRTableToolbar
              title="Daily Attendance Matrix"
              subtitle={`${employeeRows.length} employees for ${date}`}
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search employee..."
              filters={[
                { value: warehouse, onChange: setWarehouse, options: ["All", ...WAREHOUSE_OPTIONS].map((item) => ({ value: item, label: item })) },
                { value: status, onChange: setStatus, options: ["All", ...ATTENDANCE_STATUSES].map((item) => ({ value: item, label: item })) },
              ]}
              actions={[{ label: "Mark All Present", onClick: markAllPresent, variant: "secondary" }]}
              secondary={<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-full bg-black/[0.04] px-3.5 py-2 text-xs font-bold outline-none" />}
            />
            <div className="overflow-x-auto">
              <div className="min-w-[920px] divide-y divide-black/5">
                <div className="grid grid-cols-[260px_160px_130px_130px_100px_minmax(180px,_1fr)_100px] gap-3 bg-black/[0.03] px-5 py-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  <span>Employee</span><span>Status</span><span>Check In</span><span>Check Out</span><span>Hours</span><span>Notes</span><span className="text-right">Save</span>
                </div>
                {employeeRows.length === 0 ? (
                  <div className="px-5 py-12 text-center text-xs font-semibold text-zinc-400">No employees match this attendance view.</div>
                ) : employeeRows.map((employee) => {
                  const draft = getDraft(employee)
                  const hours = ["Absent", "On Leave", "Holiday", "Weekend"].includes(draft.status) ? 0 : calculateHours(draft.check_in_time, draft.check_out_time)
                  const isSaving = savingId === employee.id
                  return (
                    <div key={employee.id} className="grid grid-cols-[260px_160px_130px_130px_100px_minmax(180px,_1fr)_100px] items-center gap-3 px-5 py-3 text-xs hover:bg-black/[0.02]">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="size-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-black">{initials(employee.full_name)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-black text-zinc-950">{employee.full_name}</p>
                          <p className="truncate text-[10px] font-bold text-zinc-400">{employee.employee_number} - {employee.warehouse_id}</p>
                        </div>
                      </div>
                      <div className="inline-flex rounded-full bg-black/[0.04] p-1">
	                        {quickStatuses.map((item) => {
	                          const selected = draft.status === item.key
	                          return (
	                            <button
	                              key={item.key}
	                              type="button"
	                              onClick={() => setDraft(employee.id, item.key === "Absent" ? { status: item.key, check_in_time: "", check_out_time: "" } : { status: item.key })}
	                              className={`size-8 rounded-full text-xs font-black transition-all ${selected ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-500 hover:bg-white"}`}
	                              title={item.key}
	                            >
                              {item.label}
                            </button>
                          )
                        })}
                      </div>
	                      {statusRequiresNoTime(draft.status) ? <NoTimeLabel /> : <input type="time" value={draft.check_in_time} onChange={(event) => setDraft(employee.id, { check_in_time: event.target.value })} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-emerald-700" />}
	                      {statusRequiresNoTime(draft.status) ? <NoTimeLabel /> : <input type="time" value={draft.check_out_time} onChange={(event) => setDraft(employee.id, { check_out_time: event.target.value })} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-emerald-700" />}
                      <span className="font-black text-zinc-900">{hours.toFixed(2)}</span>
                      <input value={draft.notes} onChange={(event) => setDraft(employee.id, { notes: event.target.value })} placeholder="Notes" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-emerald-700" />
                      <button onClick={() => saveAttendance(employee)} disabled={isSaving} className="min-w-[64px] inline-flex items-center justify-center gap-1.5 rounded-full bg-black px-3 py-2 text-[10px] font-black text-white disabled:cursor-wait disabled:bg-zinc-700">
                        {isSaving ? <LoadingDots color="bg-white" size="xs" /> : <><Save className="size-3" /> Save</>}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  )
}

function NoTimeLabel() {
  return <span className="rounded-xl border border-black/5 bg-black/[0.03] px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-zinc-400">Not required</span>
}
