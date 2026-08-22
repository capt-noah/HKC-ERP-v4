import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/GlassCard"
import { useAuthStore } from "@/lib/authStore"
import {
  Compass,
  ArrowLeft,
  LayoutDashboard,
  LogIn,
  Package,
  BadgeDollarSign,
  Users,
  ShoppingCart,
} from "lucide-react"

export default function NotFound() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated } = useAuthStore()

  const isAuth = isAuthenticated()
  const userRoles = user?.roles || ((user as any)?.role ? [(user as any).role] : [])
  const primaryRole = userRoles[0]

  // Calculate default dashboard route based on user's primary role
  let homeRoute = "/sales"
  let roleLabel = "Dashboard"

  if (isAuth) {
    switch (primaryRole) {
      case "superadmin":
        homeRoute = "/admin"
        roleLabel = "Admin Control Center"
        break
      case "sales_manager":
        homeRoute = "/sales"
        roleLabel = "Sales Dashboard"
        break
      case "inventory_admin":
        homeRoute = "/inventory"
        roleLabel = "Inventory Register"
        break
      case "finance_manager":
        homeRoute = "/finance"
        roleLabel = "Finance Overview"
        break
      case "hr_manager":
        homeRoute = "/hr"
        roleLabel = "HR Management"
        break
      case "hkc_docs_manager":
        homeRoute = "/sales/hkc-docs"
        roleLabel = "HKC Export Docs"
        break
    }
  }

  return (
    <div className="min-h-screen page-gradient flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Decorative organic ambient blur blobs */}
      <div className="absolute top-1/4 left-1/4 size-80 rounded-full bg-emerald-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-green-100/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 size-64 rounded-full bg-zinc-200/40 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-xl z-10"
      >
        <GlassCard className="p-8 md:p-10 flex flex-col items-center text-center shadow-2xl border border-white/80 backdrop-blur-xl">
          {/* Header Icon Badge */}
          <div className="size-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20 mb-6 relative">
            <Compass className="size-10 animate-[spin_20s_linear_infinite]" />
            <div className="absolute -bottom-1 -right-1 size-7 rounded-xl bg-zinc-950 text-emerald-400 flex items-center justify-center border-2 border-white text-[10px] font-black font-mono shadow-xs">
              404
            </div>
          </div>

          {/* Title & Description */}
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full mb-3">
            Resource Not Found
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-950 tracking-tight mb-2">
            Page Lost in Transit
          </h1>
          <p className="text-sm text-zinc-500 max-w-md mb-2 leading-relaxed">
            The path <code className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-mono text-xs font-bold">{location.pathname}</code> does not exist or has been relocated.
          </p>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mt-6">
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:flex-1 h-11 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/90 text-xs font-bold text-zinc-800 shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              <span>Go Back</span>
            </button>

            {isAuth ? (
              <button
                onClick={() => navigate(homeRoute)}
                className="w-full sm:flex-1 h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-900/15 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <LayoutDashboard className="size-4" />
                <span>{roleLabel}</span>
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-full sm:flex-1 h-11 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <LogIn className="size-4" />
                <span>Sign In to ERP</span>
              </button>
            )}
          </div>

          {/* Permitted Modules Quick Links (for logged-in users) */}
          {isAuth && (
            <div className="w-full border-t border-zinc-100 pt-6 mt-6">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-3">
                Quick Navigation
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {(primaryRole === "superadmin" || primaryRole === "sales_manager") && (
                  <button
                    onClick={() => navigate("/sales")}
                    className="p-2.5 rounded-xl bg-zinc-50 hover:bg-emerald-50 hover:text-emerald-800 border border-zinc-200/70 flex flex-col items-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <ShoppingCart className="size-4 text-zinc-500 group-hover:text-emerald-700" />
                    <span className="font-bold text-[11px]">Sales</span>
                  </button>
                )}
                {(primaryRole === "superadmin" || primaryRole === "inventory_admin") && (
                  <button
                    onClick={() => navigate("/inventory")}
                    className="p-2.5 rounded-xl bg-zinc-50 hover:bg-emerald-50 hover:text-emerald-800 border border-zinc-200/70 flex flex-col items-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Package className="size-4 text-zinc-500 group-hover:text-emerald-700" />
                    <span className="font-bold text-[11px]">Inventory</span>
                  </button>
                )}
                {(primaryRole === "superadmin" || primaryRole === "finance_manager") && (
                  <button
                    onClick={() => navigate("/finance")}
                    className="p-2.5 rounded-xl bg-zinc-50 hover:bg-emerald-50 hover:text-emerald-800 border border-zinc-200/70 flex flex-col items-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <BadgeDollarSign className="size-4 text-zinc-500 group-hover:text-emerald-700" />
                    <span className="font-bold text-[11px]">Finance</span>
                  </button>
                )}
                {(primaryRole === "superadmin" || primaryRole === "hr_manager") && (
                  <button
                    onClick={() => navigate("/hr")}
                    className="p-2.5 rounded-xl bg-zinc-50 hover:bg-emerald-50 hover:text-emerald-800 border border-zinc-200/70 flex flex-col items-center gap-1.5 transition-all cursor-pointer group"
                  >
                    <Users className="size-4 text-zinc-500 group-hover:text-emerald-700" />
                    <span className="font-bold text-[11px]">HR</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer branding */}
          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium mt-6">
            <span>HKC Trading Enterprise Resource Planning</span>
            <span>•</span>
            <span className="font-mono">v4.0.1</span>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
