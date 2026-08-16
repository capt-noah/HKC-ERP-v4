import { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import { ResizableTh, useResizableTable, type TableColumn } from "@/components/ResizableTable"
import type { HkcDocRecord } from "@/lib/erpStore"
import { HkcDocSkeletonRows } from "./HkcDocSkeletonRows"

interface HkcDocsTableProps {
  records: HkcDocRecord[]
  isLoading: boolean
  searchQuery: string
  typeFilter: "ALL" | "Import" | "Export"
  onEditRecord: (record: HkcDocRecord) => void
}

const columns: TableColumn[] = [
  { key: "shipmentId", label: "Shipment ID", align: "left" },
  { key: "itemsDescription", label: "Items Description", align: "left" },
  { key: "type", label: "Type", align: "left" },
  { key: "date", label: "Date", align: "left" },
  { key: "_actions", label: "Action", align: "center", noSort: true },
]

export default function HkcDocsTable({
  records,
  isLoading,
  searchQuery,
  typeFilter,
  onEditRecord,
}: HkcDocsTableProps) {
  
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.shipmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.itemsDescription.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "ALL" || r.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [records, searchQuery, typeFilter])

  const table = useResizableTable(columns, filtered, {
    shipmentId: 180,
    itemsDescription: 350,
    type: 120,
    date: 130,
    _actions: 120,
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr className="bg-black/[0.02] border-b border-zinc-200/40 text-[10px] font-black tracking-wider text-zinc-400 uppercase">
            {columns.map((col) => (
              <ResizableTh
                key={col.key}
                col={col}
                width={table.colWidths[col.key]}
                sortKey={table.sortKey}
                sortDir={table.sortDir}
                openMenuCol={table.openMenuCol}
                onResizeStart={table.handleResizeStart}
                onToggleMenu={table.toggleMenu}
                onSortAsc={table.setSortAsc}
                onSortDesc={table.setSortDesc}
                onClearSort={table.clearSort}
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 font-medium">
          {isLoading ? (
            <HkcDocSkeletonRows />
          ) : table.sorted().length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center text-xs font-semibold text-zinc-400">
                No documentation records found.
              </td>
            </tr>
          ) : (
            table.sorted().map((record) => {
              const isImport = record.type === "Import"

              return (
                <tr
                  key={record.id}
                  className="border-b border-zinc-150/40 hover:bg-zinc-50/60 transition-colors text-xs font-semibold"
                >
                  {/* Shipment ID */}
                  <td className="px-3 py-4 whitespace-nowrap font-mono font-black text-zinc-900 truncate">
                    {record.shipmentId}
                  </td>

                  {/* Items Description */}
                  <td className="px-3 py-4 text-zinc-800 truncate" title={record.itemsDescription}>
                    {record.itemsDescription}
                  </td>

                  {/* Type */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-black border ${
                        isImport
                          ? "bg-sky-100/60 text-sky-700 border-sky-200/80"
                          : "bg-emerald-100/60 text-emerald-700 border-emerald-200/80"
                      }`}
                    >
                      {record.type}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-4 font-mono text-zinc-600 whitespace-nowrap">
                    {record.date}
                  </td>

                  {/* Action */}
                  <td className="px-3 py-4 text-center whitespace-nowrap pr-4">
                    <button
                      onClick={() => onEditRecord(record)}
                      className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold text-[11px] transition-all border border-emerald-200/80 active:scale-95 shadow-xs inline-flex items-center gap-1"
                    >
                      Manage Docs <ChevronRight className="size-3.5 text-emerald-600" />
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
