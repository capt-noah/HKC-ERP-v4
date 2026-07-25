import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowUpRight, Search } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useHRStore } from "@/lib/hrStore"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

const attendanceGridFlat = [
  // Row 0 (top)
  null, null, null, null, null, null, null, null, null, null, null, "dark", "yellow", "dark", "yellow",
  // Row 1
  null, null, null, null, null, null, null, null, "yellow", "dark", "yellow", "dark", "yellow", "dark", "dark",
  // Row 2
  null, null, null, null, null, "dark", "yellow", "dark", "yellow", "dark", "yellow", "yellow", "dark", "yellow", "yellow",
  // Row 3
  null, null, "dark", "dark", "yellow", "dark", "yellow", "dark", "yellow", "yellow", "dark", "yellow", "dark", "yellow", "dark",
  // Row 4 (bottom)
  "yellow", "yellow", "yellow", "dark", "yellow", "dark", "yellow", "dark", "yellow", "dark", "yellow", "dark", "yellow", "dark", "yellow"
]

export default function HRDashboard() {
  const store = useHRStore()
  const employees = store.getEmployees()

  const [searchQuery, setSearchQuery] = useState("")

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 4) // Show top 4 in dashboard list

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        
        {/* Header Block */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight mt-1">HR Dashboard</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Workforce analytics, employee attendance, payroll processing, and recruitment status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/hr")} />
          </div>
        </motion.div>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: Schedule */}
          <GlassCard transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-black">Schedule</h3>
              <ArrowUpRight className="size-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-5 gap-1 mb-4">
              {[
                { day: "Mon", date: "23" },
                { day: "Tue", date: "24" },
                { day: "Wed", date: "25", active: true },
                { day: "Thu", date: "26" },
                { day: "Fri", date: "27" },
              ].map((d) => (
                <div key={d.day} className="flex flex-col items-center">
                  <span className="text-xs text-gray-400 mb-1">{d.day}</span>
                  <span className={d.active ? "text-xl font-black text-black border-b-2 border-[#242427] pb-0.5" : "text-base text-gray-400"}>{d.date}</span>
                </div>
              ))}
            </div>
            <div className="h-px bg-black/5 mb-5" />
            <div className="relative pl-6">
              <div className="absolute left-0 top-2 bottom-2 w-px bg-black/10" />
              <div className="relative mb-6">
                <div className="absolute -left-[22px] top-1 size-2.5 rounded-full bg-[#242427] border-2 border-white shadow" />
                <p className="text-xs text-gray-400 mb-2">09:00 AM</p>
                <div className="bg-[#242427] rounded-xl p-4">
                  <p className="text-white font-bold text-sm">Daily HR Sync</p>
                  <p className="text-gray-400 text-xs mt-0.5">09:00am - 10:00am</p>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -left-[22px] top-1 size-2.5 rounded-full bg-gray-300 border-2 border-white shadow" />
                <p className="text-xs text-gray-400 mb-2">11:00 AM</p>
                <div className="rounded-xl p-4 border border-black/10">
                  <p className="text-black font-bold text-sm">Candidate Interview</p>
                  <p className="text-gray-400 text-xs mt-0.5">11:00am - 11:30am</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Column 2: Salary & Hiring Stats */}
          <div className="flex flex-col gap-5">
            <GlassCard transition={{ delay: 0.16, duration: 0.4, ease: "easeOut" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-black">Salary Registry</h3>
                <div className="flex items-center gap-2 bg-black/5 rounded-lg px-3 py-1.5">
                  <Search className="size-3.5 text-gray-500" />
                  <input 
                    className="bg-transparent text-xs outline-none placeholder:text-gray-400 w-20" 
                    placeholder="Search" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 text-xs text-gray-400 font-bold mb-3 px-1 uppercase tracking-wider">
                <span>Name</span><span className="text-center">Net Salary</span><span className="text-right">Status</span>
              </div>
              <div className="divide-y divide-black/5">
                {filteredEmployees.map((u) => (
                  <div key={u.name} className="grid grid-cols-3 items-center py-3">
                    <div className="flex items-center gap-2">
                      <div className={`size-8 rounded-full ${u.avatarBg} flex items-center justify-center text-xs font-black text-gray-700`}>{u.initials}</div>
                      <span className="text-sm font-bold text-black truncate">{u.name.split(" ")[0]} {u.name.split(" ")[1]?.[0]}.</span>
                    </div>
                    <span className="text-sm font-semibold text-black text-center">ETB {u.salary.toLocaleString()}</span>
                    <div className="flex justify-end">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${u.paymentStatusColor}`}>
                        {u.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="flex-1" transition={{ delay: 0.22, duration: 0.4, ease: "easeOut" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-black">Hiring Statistics</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500 border border-black/10 rounded-lg px-3 py-1.5">
                  <span>2024</span>
                  <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-2"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              <div className="rounded-2xl border-2 border-dashed border-black/10 h-28 flex items-center justify-center bg-black/[0.01]">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Graph Visualization</span>
              </div>
            </GlassCard>
          </div>

          {/* Column 3: Attendance Report + Employee Composition */}
          <div className="flex flex-col gap-5">
            {/* Attendance Report Card - Responsive Side-by-side Layout with Screenshot-Perfect Dot Matrix */}
            <GlassCard variant="dark" transition={{ delay: 0.28, duration: 0.4, ease: "easeOut" }} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Attendance Report</h3>
                  <button className="size-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <ArrowUpRight className="size-4 text-gray-300" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mt-4">
                  {/* Attendance side-by-side stats matching uploaded layout */}
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black text-white tracking-tight">63</span>
                        <span className="text-[#ffe270] text-xl font-bold">↗</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-zinc-400 tracking-tight">12</span>
                        <span className="text-zinc-500 text-lg font-bold">↘</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1.5">Present vs Absent</p>
                    <div className="flex items-center gap-2.5 mt-3">
                      <div className="flex items-center gap-1">
                        <span className="inline-block size-1.5 rounded-full bg-[#ffe270]" />
                        <span className="text-[10px] text-zinc-400 font-semibold">Active</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="inline-block size-1.5 rounded-full bg-[#44444a]" />
                        <span className="text-[10px] text-zinc-400 font-semibold">Idle</span>
                      </div>
                    </div>
                  </div>

                  {/* Dot matrix: 15-column stair-step shape matching the screenshot exactly */}
                  <div className="w-full max-w-[210px] shrink-0 self-center sm:self-auto">
                    <div className="grid grid-cols-[repeat(15,_minmax(0,_1fr))] gap-[5px]">
                      {attendanceGridFlat.map((dot, i) => {
                        if (dot === null) {
                          return <div key={i} className="aspect-square opacity-0" />
                        }
                        return (
                           <div 
                            key={i} 
                            className={`aspect-square rounded-full transition-all ${
                              dot === "yellow" 
                                ? "bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.15)]" 
                                : "bg-[#44444a]"
                            }`}
                            title={dot === "yellow" ? "Active day" : "Idle day"}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Employee Composition Card */}
            <GlassCard className="flex-1" transition={{ delay: 0.34, duration: 0.4, ease: "easeOut" }}>
              <h3 className="text-base font-bold text-black mb-4">Employee Composition</h3>
              <div className="flex flex-col items-center justify-center h-full">
                <div className="relative size-28 mb-4">
                  <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                    <circle cx="50" cy="50" r="38" fill="none" strokeWidth="12" stroke="#242427" />
                    <circle cx="50" cy="50" r="38" fill="none" strokeWidth="12" stroke="#15803d" strokeDasharray={`${70 * 2.388} ${100 * 2.388}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-black">1,248</span>
                    <span className="text-xs text-gray-400">Total</span>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-green-700" /><span className="text-xs font-bold text-gray-600">70% Tech</span></div>
                  <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-full bg-[#242427]" /><span className="text-xs font-bold text-gray-600">30% Ops</span></div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
