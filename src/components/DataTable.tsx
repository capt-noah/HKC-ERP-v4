import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { GlassCard } from "@/components/GlassCard"
import { FinanceTableToolbar, type FilterOption, type HeaderAction } from "@/components/FinanceTableToolbar"
import { useResizableTable, ResizableTh, type TableColumn } from "@/components/ResizableTable"

export interface DataTableProps<T> {
  title: string
  subtitle?: string
  columns: TableColumn[]
  data: T[]
  isLoading?: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  searchPlaceholder?: string
  filters?: FilterOption[]
  actions?: HeaderAction[]
  defaultWidths?: Record<string, number>
  emptyMessage?: string
  renderRow: (item: T, colWidths: Record<string, number>) => ReactNode
  keyExtractor: (item: T) => string | number
  onRowClick?: (item: T) => void
}

function DataTableSkeletonRows({ columnCount }: { columnCount: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-b border-zinc-150/40">
          {Array.from({ length: columnCount }).map((_, colIdx) => (
            <td key={colIdx} className="py-4 px-4">
              <Skeleton className="h-4 w-full bg-zinc-200/80" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function DataTable<T>({
  title,
  subtitle,
  columns,
  data,
  isLoading = false,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search records...",
  filters = [],
  actions = [],
  defaultWidths,
  emptyMessage = "No records match your active search filters.",
  renderRow,
  keyExtractor,
  onRowClick,
}: DataTableProps<T>) {
  const {
    colWidths,
    sortKey,
    sortDir,
    openMenuCol,
    handleResizeStart,
    toggleMenu,
    setSortAsc,
    setSortDesc,
    clearSort,
    sorted,
  } = useResizableTable(columns, data, defaultWidths)

  const sortedData = sorted()

  return (
    <GlassCard className="flex flex-col overflow-hidden p-0">
      {/* Header Toolbar */}
      <div className="px-6 pt-6 mb-4">
        <FinanceTableToolbar
          title={title}
          subtitle={subtitle ?? `Total: ${sortedData.length} records`}
          searchValue={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          actions={actions}
        />
      </div>

      {/* Resizable & Sortable Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-black/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase">
              {columns.map((col) => (
                <ResizableTh
                  key={col.key}
                  col={col}
                  width={colWidths[col.key] || 120}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  openMenuCol={openMenuCol}
                  onResizeStart={handleResizeStart}
                  onToggleMenu={toggleMenu}
                  onSortAsc={setSortAsc}
                  onSortDesc={setSortDesc}
                  onClearSort={clearSort}
                />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-150/40 font-semibold text-zinc-800 text-xs">
            {isLoading ? (
              <DataTableSkeletonRows columnCount={columns.length} />
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-zinc-400 text-xs font-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((item) => (
                <motion.tr
                  key={keyExtractor(item)}
                  whileHover={{ scale: 1.001 }}
                  className={`hover:bg-white/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {renderRow(item, colWidths)}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
