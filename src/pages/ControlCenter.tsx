import { motion } from "framer-motion"
import { Plus, ArrowUpRight, MoreHorizontal, TrendingUp, AlertCircle, Bell, Database, Shield, Key } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export default function ControlCenter() {
  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <motion.div variants={fade} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Control Center</h1>
            <p className="text-sm text-gray-400 mt-1">Welcome back, Admin</p>
          </div>
          <div className="flex items-center gap-3">
            <SubPageNav items={getSectionChildren("/admin")} />
            <button className="flex items-center gap-2 bg-[#242427] text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-[#323236] transition-colors shadow-lg shadow-black/10">
              <Plus className="size-4" />
              New Module
            </button>
          </div>
        </motion.div>

        {/* 3 stat cards */}
        <div className="grid grid-cols-3 gap-5 mb-5">
          {[
            { label: "Total Revenue", value: "$1,243,580", delta: "+12.4%", up: true, sub: "vs last month" },
            { label: "Active Orders", value: "342", delta: "+8 today", up: true, sub: "Across all channels" },
            { label: "Low Stock Alerts", value: "48", delta: "Action needed", up: false, sub: "3 critical items" },
          ].map((s, idx) => (
            <GlassCard key={s.label} transition={{ delay: 0.1 + idx * 0.06, duration: 0.4, ease: "easeOut" }}>
              <p className="text-sm text-gray-500 font-medium mb-3">{s.label}</p>
              <p className="text-4xl font-black text-black mb-2">{s.value}</p>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-sm font-semibold ${s.up ? "text-emerald-500" : "text-green-700"}`}>
                  {s.up ? <TrendingUp className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                  {s.delta}
                </span>
                <span className="text-sm text-gray-400">{s.sub}</span>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-2 gap-5">
          {/* User Management */}
          <GlassCard transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-black">User Management</h3>
              <button className="text-sm text-gray-400 hover:text-black flex items-center gap-1">
                View all <ArrowUpRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-[2fr_1fr_1fr_24px] text-xs text-gray-400 font-medium mb-3">
              <span>NAME</span><span>ROLE</span><span>STATUS</span><span></span>
            </div>
            {[
              { name: "Sarah Chen", role: "Admin", status: "Active", statusColor: "bg-emerald-50 text-emerald-600", initials: "SC", avatarBg: "bg-green-100" },
              { name: "Mike Ross", role: "Manager", status: "Active", statusColor: "bg-emerald-50 text-emerald-600", initials: "MR", avatarBg: "bg-sky-200" },
              { name: "Jane Smith", role: "Staff", status: "On Leave", statusColor: "bg-zinc-100 text-zinc-600", initials: "JS", avatarBg: "bg-rose-200" },
              { name: "Tom Reed", role: "Staff", status: "Active", statusColor: "bg-emerald-50 text-emerald-600", initials: "TR", avatarBg: "bg-violet-200" },
            ].map((u) => (
              <div key={u.name} className="grid grid-cols-[2fr_1fr_1fr_24px] items-center py-3 border-t border-black/5">
                <div className="flex items-center gap-3">
                  <div className={`size-8 rounded-full ${u.avatarBg} flex items-center justify-center text-xs font-bold text-gray-700`}>{u.initials}</div>
                  <span className="text-sm font-medium text-black">{u.name}</span>
                </div>
                <span className="text-sm text-gray-500">{u.role}</span>
                <div><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.statusColor}`}>{u.status}</span></div>
                <MoreHorizontal className="size-4 text-gray-300" />
              </div>
            ))}
          </GlassCard>

          {/* Audit Log */}
          <GlassCard transition={{ delay: 0.28, duration: 0.4, ease: "easeOut" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-black">Audit Log</h3>
              <button className="text-sm text-gray-400 hover:text-black flex items-center gap-1">
                View all <ArrowUpRight className="size-4" />
              </button>
            </div>
            <div className="space-y-1">
              {[
                { label: "PO #2023-089 shipped", sub: "Acme Corp · $45,200", time: "2h ago", dot: "bg-green-700" },
                { label: "Stock alert: Reagent Sol. A", sub: "4 days until expiry · 120 units", time: "3h ago", dot: "bg-red-500" },
                { label: "New sales order SO-1045", sub: "Globex Inc · $1,250", time: "5h ago", dot: "bg-emerald-500" },
                { label: "Leave request approved", sub: "Jane Smith · Marketing Dept", time: "1d ago", dot: "bg-blue-500" },
                { label: "Monthly report generated", sub: "Finance · October 2023", time: "1d ago", dot: "bg-zinc-400" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-t border-black/5">
                  <div className={`size-2 rounded-full ${item.dot} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">{item.label}</p>
                    <p className="text-xs text-gray-400 truncate">{item.sub}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{item.time}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* System Settings */}
        <GlassCard className="mt-5" transition={{ delay: 0.36, duration: 0.4, ease: "easeOut" }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-black">System Settings</h3>
            <button className="text-sm text-gray-400 hover:text-black flex items-center gap-1">
              Configure <ArrowUpRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Notifications", value: "Email + Push", icon: Bell },
              { label: "Data Backup", value: "Daily · 2AM", icon: Database },
              { label: "Security Level", value: "High", icon: Shield },
              { label: "API Access", value: "12 keys active", icon: Key },
            ].map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="rounded-2xl p-4 bg-black/[0.03] border border-black/5">
                  <Icon className="size-5 text-gray-700 mb-3" />
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className="text-sm font-semibold text-black">{s.value}</p>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
