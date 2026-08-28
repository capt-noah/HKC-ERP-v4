import { useState, useMemo } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Bell, User, Check, Inbox, Clock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/authStore"
import { useErpStore } from "@/lib/erpStore"
import type { Role } from "@/lib/authStore"

const sectionRoleMapping: Record<string, Role[]> = {
  Sales: ["superadmin", "sales_manager"],
  "HKC Docs": ["superadmin", "hkc_docs_manager"],
  Inventory: ["superadmin", "inventory_admin"],
  Finance: ["superadmin", "finance_manager"],
  HR: ["superadmin", "hr_manager"],
  Admin: ["superadmin"],
}

export interface NavChild {
  label: string
  path: string
}

export interface NavSection {
  label: string
  path: string
  children?: NavChild[]
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
  const navigate = useNavigate()
  const isDark = variant === "dark"
  const [showNotifications, setShowNotifications] = useState(false)
  const { user } = useAuthStore()
  const erp = useErpStore()
  const salesOrders = erp.getSalesOrders()

  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([])
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([])

  const userRoles = user?.roles || ((user as any)?.role ? [(user as any).role] : [])
  const isSuperAdmin = userRoles.includes("superadmin")
  const userWarehouseIds = (user?.warehouse_ids || ((user as any)?.warehouse_id ? [(user as any).warehouse_id] : [])).map((id: string) => String(id).toUpperCase())

  // Dynamic notifications for Super Admin (e.g. pending sales orders)
  const notifications = useMemo(() => {
    if (!isSuperAdmin) return []
    const pendingOrders = salesOrders.filter((so) => (so.approvalStatus || "Pending") === "Pending")
    return pendingOrders
      .filter((so) => !dismissedNotificationIds.includes(so.id))
      .map((so) => ({
        id: so.id,
        title: `Sales Order Pending Approval: ${so.id}`,
        desc: `${so.customer} • ETB ${Number(so.amount || 0).toLocaleString()} (${so.paymentType || "Cash"}) awaiting Super Admin approval.`,
        time: so.date || "Today",
        type: "approval",
        icon: Clock,
        unread: !readNotificationIds.includes(so.id),
        orderId: so.id,
      }))
  }, [isSuperAdmin, salesOrders, dismissedNotificationIds, readNotificationIds])

  // WH1 access: true if superadmin, or if no specific warehouse restriction is set, or if WH1 is in assigned warehouses
  const hasWH1Access = isSuperAdmin || userWarehouseIds.length === 0 || userWarehouseIds.some(id => id.includes("WH1") || id.includes("WH-01") || id.includes("WH 1") || id.includes("WAREHOUSE 1"))

  const visibleSections = sections.filter((s) => {
    if (isSuperAdmin) return true
    const allowed = sectionRoleMapping[s.label]
    if (!allowed) return false
    return allowed.some((r) => userRoles.includes(r))
  })

  const unreadCount = notifications.filter((n) => n.unread).length

  const handleMarkAllRead = () => {
    setReadNotificationIds(notifications.map((n) => n.id))
  }

  const handleClearAll = () => {
    setDismissedNotificationIds(notifications.map((n) => n.id))
  }

  const handleToggleRead = (id: string) => {
    setReadNotificationIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleNotificationClick = (_orderId?: string) => {
    setShowNotifications(false)
    navigate("/admin?tab=approvals")
  }

  const activeSection =
    (sections.find(
      (s) =>
        s.path === location.pathname ||
        (s.children && s.children.some((c) => location.pathname === c.path))
    ) ||
    [...sections]
      .sort((a, b) => b.path.length - a.path.length)
      .find((s) => location.pathname.startsWith(s.path))) ?? sections[0]

  const visibleChildren = (activeSection?.children || []).filter((child) => {
    if (child.path === "/inventory/processing-services" && !hasWH1Access) {
      return false
    }
    return true
  })

  return (
    <div className="fixed top-4 left-0 right-0 z-50 w-full px-4 md:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 w-full max-w-[100%] mx-auto">
        {/* 1. Left Pill: Brand Logo */}
        <div
          className={cn(
            "h-[46px] flex items-center gap-2.5 px-4 rounded-full border shadow-sm text-black shrink-0",
            isDark
              ? "glass-nav-dark border-white/10 text-white"
              : "glass-nav border-white/80 text-black"
          )}
        >
          {brandIcon ?? (
            <img
              src="/hkc_logo.png"
              alt="HKC Logo"
              className="h-7 w-auto object-contain shrink-0"
            />
          )}
          <span className="font-bold text-sm tracking-tight whitespace-nowrap text-green-700 dark:text-green-400">
            {brand === "HKC Trading ERP" ? "HKC Trading" : brand}
          </span>
        </div>

        {/* Right Section containing Menu Pill & Controls Pill */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {/* 2. Middle Pill: Navigation Menu */}
          {visibleSections.length > 1 ? (
            /* Multi-module / Super Admin user: Switch between modules */
            <div
              className={cn(
                "h-[46px] flex items-center gap-1 p-1 rounded-full border shadow-sm overflow-x-auto no-scrollbar",
                isDark
                  ? "glass-nav-dark border-white/10"
                  : "glass-nav border-white/80"
              )}
            >
              {visibleSections.map((section) => {
                const isActive = activeSection?.label === section.label
                return (
                  <Link
                    key={section.label}
                    to={section.path}
                    className={cn(
                      "h-[36px] flex items-center px-4 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap",
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
          ) : visibleSections.length === 1 && visibleChildren.length > 1 ? (
            /* Single-role user: Promote sub-pages directly into the primary top FloatingNav */
            <div
              className={cn(
                "h-[46px] flex items-center gap-1 p-1 rounded-full border shadow-sm overflow-x-auto no-scrollbar",
                isDark
                  ? "glass-nav-dark border-white/10"
                  : "glass-nav border-white/80"
              )}
            >
              {visibleChildren.map((child) => {
                const isChildActive = location.pathname === child.path
                return (
                  <Link
                    key={child.path}
                    to={child.path}
                    className={cn(
                      "h-[36px] flex items-center px-4 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap",
                      isChildActive
                        ? isDark
                          ? "bg-white text-black shadow-md font-bold scale-[1.03]"
                          : "bg-emerald-700 text-white shadow-md font-bold scale-[1.03]"
                        : isDark
                          ? "text-zinc-400 hover:text-white hover:bg-white/5"
                          : "text-zinc-600 hover:text-zinc-950 hover:bg-black/5"
                    )}
                  >
                    {child.label}
                  </Link>
                )
              })}
            </div>
          ) : null}

          {/* 3. Right Pill: Actions (Notification, User Profile) */}
          <div
            className={cn(
              "h-[46px] flex items-center gap-2 px-3 rounded-full border shadow-sm shrink-0",
              isDark
                ? "glass-nav-dark border-white/10 text-white"
                : "glass-nav border-white/80 text-black"
            )}
          >
            {rightActions ?? (
              <div className="flex items-center gap-2 relative">
                {/* Notification Bell */}
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn(
                    "size-9 rounded-full flex items-center justify-center transition-all duration-300 relative border hover:scale-105 active:scale-95 cursor-pointer",
                    showNotifications 
                      ? "bg-black text-white border-black" 
                      : isDark
                        ? "hover:bg-white/10 text-zinc-300 border-white/10"
                        : "hover:bg-black/5 text-[#505054] border-black/5 bg-white/40"
                  )}
                  title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
                >
                  <Bell className="size-[18px] relative z-10" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-md animate-pulse z-20">
                      {unreadCount}
                    </span>
                  )}
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
                              const IconComp = n.icon ?? Inbox
                              return (
                                <div
                                  key={n.id}
                                  onClick={() => handleNotificationClick(n.orderId)}
                                  className={cn(
                                    "flex items-start gap-3 p-3 rounded-2xl border transition-all text-left relative group cursor-pointer",
                                    n.unread
                                      ? "bg-amber-50/60 border-amber-200/70 hover:bg-amber-50"
                                      : "bg-transparent border-transparent opacity-85 hover:opacity-100 hover:bg-zinc-50"
                                  )}
                                >
                                  {/* Icon Indicator */}
                                  <div className={cn(
                                    "size-8 rounded-full flex items-center justify-center shrink-0 border",
                                    n.type === "approval" && "bg-amber-100 text-amber-800 border-amber-200",
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
                                        <span className="size-1.5 rounded-full bg-amber-600 shrink-0 animate-pulse" />
                                      )}
                                    </h4>
                                    <p className="text-[10px] font-semibold text-zinc-600 leading-relaxed mt-0.5">
                                      {n.desc}
                                    </p>
                                    <span className="text-[9px] font-mono font-bold text-zinc-400 block mt-1">
                                      {n.time} • <span className="text-emerald-700 font-bold underline">Review in Approvals</span>
                                    </span>
                                  </div>

                                  {/* Action Buttons overlaying the list item */}
                                  <div className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleRead(n.id)
                                      }}
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

                {/* Minimalist User Avatar Button (Navigates directly to /profile) */}
                <button
                  onClick={() => navigate("/profile")}
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center border cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95",
                    location.pathname === "/profile"
                      ? isDark
                        ? "bg-emerald-700 text-white border-emerald-600 shadow-sm"
                        : "bg-emerald-700 text-white border-emerald-700 shadow-sm font-bold"
                      : isDark
                        ? "bg-green-700/20 text-green-400 border-green-700/30 hover:bg-emerald-700/30"
                        : "bg-[#e5e5ea] hover:bg-emerald-50 hover:text-emerald-700 text-[#1c1c1e] border-black/10"
                  )}
                  title="View Profile"
                >
                  <User className="size-[18px]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
