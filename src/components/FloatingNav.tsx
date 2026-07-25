import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Bell, Settings, User, Check, Sparkles, Inbox, Calendar, ClipboardCheck } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export interface NavChild {
  label: string
  path: string
}

export interface NavSection {
  label: string
  path: string
  children: NavChild[]
}

interface FloatingNavProps {
  brand: string
  brandIcon?: React.ReactNode
  sections: NavSection[]
  variant?: "light" | "dark"
  rightActions?: React.ReactNode
}

export function FloatingNav({
  brand,
  brandIcon,
  sections,
  variant = "light",
  rightActions,
}: FloatingNavProps) {
  const location = useLocation()
  const isDark = variant === "dark"
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([
    {
      id: "nt-1",
      title: "Sales Order Approved",
      desc: "Order #SO-1038 was successfully confirmed.",
      time: "10m ago",
      type: "success",
      icon: ClipboardCheck,
      unread: true,
    },
    {
      id: "nt-2",
      title: "New Employee Onboarded",
      desc: "Sophia Chen was added to the HR database.",
      time: "1h ago",
      type: "info",
      icon: Sparkles,
      unread: true,
    },
    {
      id: "nt-3",
      title: "System Update Scheduled",
      desc: "Weekly database backup starts at 02:00 UTC.",
      time: "4h ago",
      type: "calendar",
      icon: Calendar,
      unread: false,
    },
  ])

  const unreadCount = notifications.filter((n) => n.unread).length

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const handleClearAll = () => {
    setNotifications([])
  }

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    )
  }

  const activeSection = sections.find((s) =>
    location.pathname.startsWith(s.path) ||
    s.children.some((c) => location.pathname === c.path)
  ) ?? sections[0]

  return (
    <div className="fixed top-4 left-0 right-0 z-50 w-full px-4 md:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-[100%] mx-auto">
        {/* 1. Left Pill: Brand Logo */}
        <div
          className={cn(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-full border shadow-sm shrink-0",
            isDark 
              ? "glass-nav-dark border-white/10 text-white" 
              : "glass-nav border-white/80 text-black"
          )}
        >
          {brandIcon ?? (
            <div className={cn(
              "size-6 rounded-full flex items-center justify-center font-black text-xs bg-green-700 text-white"
            )}>
              H
            </div>
          )}
          <span className="font-bold text-sm tracking-tight whitespace-nowrap text-green-700 dark:text-green-400">
            {brand}
          </span>
        </div>

        {/* Right Section containing Menu Pill & Controls Pill */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
          {/* 2. Middle Pill: Main Navigation Menu */}
          <div
            className={cn(
              "flex items-center gap-1 p-1 rounded-full border shadow-sm overflow-x-auto no-scrollbar",
              isDark 
                ? "glass-nav-dark border-white/10" 
                : "glass-nav border-white/80"
            )}
          >
            {sections.map((section) => {
              const isActive = activeSection?.label === section.label
              return (
                <Link
                  key={section.label}
                  to={section.path}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap",
                    isActive
                      ? isDark
                        ? "bg-white text-black shadow-md font-bold scale-[1.03]"
                        : "bg-[#242427] text-white shadow-md font-bold scale-[1.03]"
                      : isDark
                        ? "text-zinc-400 hover:text-white hover:bg-white/5"
                        : "text-[#505054] hover:text-black hover:bg-black/5"
                  )}
                >
                  {section.label}
                </Link>
              )
            })}
          </div>

          {/* 3. Right Pill: Actions (Settings, Notification, User Profile) */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm shrink-0",
              isDark 
                ? "glass-nav-dark border-white/10" 
                : "glass-nav border-white/80"
            )}
          >
            {rightActions ?? (
              <div className="flex items-center gap-2 relative">
                {/* Minimalist Setting button */}
                <button
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center transition-all duration-300 border hover:scale-105 active:scale-95",
                    isDark
                      ? "hover:bg-white/10 text-zinc-300 border-white/10"
                      : "hover:bg-black/5 text-[#505054] border-black/5 bg-white/40"
                  )}
                  title="Settings"
                >
                  <Settings className="size-[18px]" />
                </button>

                {/* Minimalist Notification Bell */}
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center transition-all duration-300 relative border hover:scale-105 active:scale-95",
                    showNotifications 
                      ? "bg-black text-white border-black" 
                      : isDark
                        ? "hover:bg-white/10 text-zinc-300 border-white/10"
                        : "hover:bg-black/5 text-[#505054] border-black/5 bg-white/40"
                  )}
                  title="Notifications"
                >
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 size-1.5 rounded-full bg-green-600 animate-pulse z-0" />
                  )}
                  <Bell className="size-[18px] relative z-10" />
                </button>

                {/* Dropdown Floating Card Popover */}
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      {/* Invisible backdrop to close popover */}
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setShowNotifications(false)} 
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 top-11 z-50 w-80 rounded-3xl border border-zinc-200/80 bg-white text-zinc-900 p-5 shadow-2xl text-left overflow-hidden"
                      >
                        {/* Popover Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3.5">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-[10px] font-black tracking-wider text-zinc-800 uppercase">Alert Center</h3>
                            {unreadCount > 0 && (
                              <span className="text-[10px] bg-green-700 text-white px-1.5 py-0.5 rounded-full font-black leading-none">
                                {unreadCount} NEW
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {notifications.length > 0 && (
                              <>
                                <button
                                  onClick={handleMarkAllRead}
                                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                                  title="Mark all as read"
                                >
                                  Mark all read
                                </button>
                                <span className="text-zinc-200">|</span>
                                <button
                                  onClick={handleClearAll}
                                  className="text-[10px] font-bold text-zinc-400 hover:text-red-500 transition-colors"
                                  title="Clear all alerts"
                                >
                                  Clear
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Popover List */}
                        <div className="flex flex-col gap-2 max-h-[290px] overflow-y-auto pr-0.5">
                          {notifications.length > 0 ? (
                            notifications.map((n) => {
                              const IconComp = n.icon
                              return (
                                <div
                                  key={n.id}
                                  className={cn(
                                    "flex items-start gap-3 p-3 rounded-2xl border transition-all text-left relative group",
                                    n.unread
                                      ? "bg-zinc-50/70 border-zinc-100/70"
                                      : "bg-transparent border-transparent opacity-85 hover:opacity-100"
                                  )}
                                >
                                  {/* Icon Indicator */}
                                  <div className={cn(
                                    "size-8 rounded-full flex items-center justify-center shrink-0 border",
                                    n.type === "success" && "bg-emerald-50 text-emerald-600 border-emerald-100",
                                    n.type === "info" && "bg-blue-50 text-blue-600 border-blue-100",
                                    n.type === "calendar" && "bg-purple-50 text-purple-600 border-purple-100"
                                  )}>
                                    <IconComp className="size-4" />
                                  </div>

                                  {/* Text Body */}
                                  <div className="flex-1 min-w-0 pr-4">
                                    <h4 className="text-xs font-extrabold leading-tight tracking-tight text-zinc-900 flex items-center gap-1.5">
                                      {n.title}
                                      {n.unread && (
                                        <span className="size-1.5 rounded-full bg-green-600 shrink-0 animate-pulse" />
                                      )}
                                    </h4>
                                    <p className="text-[10px] font-semibold text-zinc-500 leading-relaxed mt-0.5">
                                      {n.desc}
                                    </p>
                                    <span className="text-[9px] font-mono font-bold text-zinc-400 block mt-1">
                                      {n.time}
                                    </span>
                                  </div>

                                  {/* Action Buttons overlaying the list item */}
                                  <div className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <button
                                      onClick={() => handleToggleRead(n.id)}
                                      className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors"
                                      title={n.unread ? "Mark as read" : "Mark as unread"}
                                    >
                                      <Check className={cn("size-3.5", !n.unread && "text-emerald-500")} />
                                    </button>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <div className="size-11 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100 mb-2.5">
                                <Inbox className="size-5 text-zinc-400" />
                              </div>
                              <p className="text-xs font-black text-zinc-800 tracking-tight">Inbox Clean</p>
                              <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">No alerts at this moment.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* Minimalist User Avatar Circle */}
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center border cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95",
                    isDark
                      ? "bg-green-700/20 text-green-400 border-green-700/30"
                      : "bg-[#e5e5ea] text-[#1c1c1e] border-black/10"
                  )}
                  title="Profile"
                >
                  <User className="size-[18px]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
