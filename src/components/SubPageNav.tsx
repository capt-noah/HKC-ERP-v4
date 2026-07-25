import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { NavChild } from "@/components/FloatingNav"

interface SubPageNavProps {
  items: NavChild[]
  variant?: "light" | "dark"
}

export function SubPageNav({ items, variant = "light" }: SubPageNavProps) {
  const location = useLocation()
  const isDark = variant === "dark"

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
      {items.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0",
              isActive
                ? "bg-green-700 text-white font-bold shadow-xs"
                : isDark
                  ? "glass-card-dark text-zinc-300 hover:text-white"
                  : "glass-card text-zinc-600 hover:text-black"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
