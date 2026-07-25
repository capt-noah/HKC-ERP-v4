import type { ReactNode } from "react"
import { Search, Plus } from "lucide-react"

export interface FinanceTableFilterOption {
  value: string
  label: string
}

export interface FinanceTableFilter {
  value: string
  onChange: (value: string) => void
  options: FinanceTableFilterOption[]
  ariaLabel?: string
}

export interface FinanceTableAction {
  label: string
  onClick: () => void
  icon?: ReactNode
  variant?: "primary" | "secondary" | "emerald"
}

export const financeTableSelectClass =
  "bg-black/[0.03] text-xs font-bold px-3 py-2 rounded-xl text-gray-700 outline-none border border-transparent hover:border-black/5 cursor-pointer h-[38px]"

export const financeTableActionClass = {
  primary:
    "flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-lg shadow-black/10 transition-all h-[38px] uppercase tracking-wider shrink-0",
  secondary:
    "flex items-center gap-2 px-4 py-2 rounded-full bg-black/[0.03] text-xs font-bold text-gray-700 hover:bg-black/[0.06] border border-transparent hover:border-black/5 transition-all h-[38px] shrink-0",
  emerald:
    "flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-lg shadow-emerald-900/10 transition-all h-[38px] uppercase tracking-wider shrink-0",
} as const

interface FinanceTableToolbarProps {
  title: string
  subtitle?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: FinanceTableFilter[]
  actions?: FinanceTableAction[]
  /** Extra controls rendered inline with search/filters (e.g. date inputs) */
  children?: ReactNode
  /** Full-width row below the main toolbar (e.g. category pill filters) */
  secondary?: ReactNode
  className?: string
}

export function FinanceTableToolbar({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  actions = [],
  children,
  secondary,
  className = "",
}: FinanceTableToolbarProps) {
  const showControls =
    onSearchChange !== undefined || filters.length > 0 || actions.length > 0 || children

  return (
    <div className={className}>
    <div className={`flex items-center justify-between ${secondary ? "mb-4" : "mb-5"} flex-wrap gap-4`}>
      <div>
        <h3 className="font-semibold text-base text-black">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>

      {showControls && (
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {onSearchChange !== undefined && (
            <div className="flex items-center gap-2 bg-black/[0.04] rounded-2xl px-3 h-[38px]">
              <Search className="size-4 text-gray-400 shrink-0" />
              <input
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-transparent text-xs text-black placeholder:text-gray-400 outline-none w-44 md:w-52"
                placeholder={searchPlaceholder}
              />
            </div>
          )}

          {filters.map((filter, index) => (
            <select
              key={`${filter.ariaLabel ?? "filter"}-${index}`}
              aria-label={filter.ariaLabel}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className={financeTableSelectClass}
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}

          {children}

          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={financeTableActionClass[action.variant ?? "primary"]}
            >
              {action.icon ?? <Plus className="size-4" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
    {secondary && <div className="mb-5">{secondary}</div>}
    </div>
  )
}
