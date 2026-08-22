import { useState, useEffect } from "react"
import { requestMonitor, type RequestMetric } from "@/lib/requestMonitor"
import { Activity, ChevronDown, ChevronUp, Trash2, ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react"
import { useAuthStore } from "@/lib/authStore"

export function RequestMonitorHUD() {
  const [metrics, setMetrics] = useState<RequestMetric[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    setMetrics(requestMonitor.getMetrics())
    return requestMonitor.subscribe((updated) => {
      setMetrics(updated)
    })
  }, [])

  // Only display in development or for superadmin
  if (!import.meta.env.DEV && !user?.roles?.includes("superadmin")) {
    return null
  }

  const errorCount = metrics.filter((m) => m.status >= 400).length
  const unauthorizedCount = metrics.filter((m) => m.roleStatus === "UNAUTHORIZED_FOR_ROLE").length
  const avgDuration = metrics.length
    ? (metrics.reduce((acc, curr) => acc + curr.durationMs, 0) / metrics.length).toFixed(0)
    : 0

  return (
    <div className="fixed bottom-3 right-4 z-[9999] font-sans text-xs select-none">
      <div className="bg-zinc-950/90 backdrop-blur-md text-white rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden transition-all duration-200">
        {/* Header bar */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-3.5 py-2 cursor-pointer hover:bg-zinc-900 gap-3 min-w-[260px]"
        >
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <Activity className="size-3.5 text-emerald-400" />
            <span className="font-bold text-[11px] tracking-tight">Request Monitor</span>
            <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px] font-mono font-bold text-zinc-300">
              {metrics.length} calls
            </span>
          </div>

          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-800 text-[10px] font-bold text-rose-400 flex items-center gap-1">
                <ShieldAlert className="size-3" /> {errorCount}
              </span>
            )}
            {unauthorizedCount === 0 && errorCount === 0 && metrics.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="size-3" /> Scoped
              </span>
            )}
            {isExpanded ? <ChevronDown className="size-3.5 text-zinc-400" /> : <ChevronUp className="size-3.5 text-zinc-400" />}
          </div>
        </div>

        {/* Expanded Details Panel */}
        {isExpanded && (
          <div className="w-[480px] max-h-[340px] flex flex-col border-t border-zinc-800">
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800/80 text-[10px] text-zinc-400">
              <span>Avg Latency: <strong className="text-zinc-200">{avgDuration}ms</strong></span>
              <span>Active Roles: <strong className="text-emerald-400">{user?.roles?.join(", ") || "None"}</strong></span>
              <button
                onClick={() => requestMonitor.clear()}
                className="flex items-center gap-1 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear request history"
              >
                <Trash2 className="size-3" /> Clear
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-zinc-900 p-1 text-[11px] font-mono">
              {metrics.length === 0 ? (
                <div className="p-4 text-center text-zinc-500">No requests recorded yet.</div>
              ) : (
                [...metrics].reverse().map((m) => (
                  <div key={m.id} className="p-2 hover:bg-zinc-900/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1 rounded text-[9px] font-black ${
                        m.method === "GET" ? "bg-blue-950 text-blue-300 border border-blue-800" : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}>
                        {m.method}
                      </span>
                      <span className="text-zinc-200 truncate max-w-[200px]" title={m.url}>
                        {m.resourceName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold ${
                        m.status >= 200 && m.status < 300 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {m.status}
                      </span>
                      {m.roleStatus === "AUTHORIZED" ? (
                        <span title="Authorized for role">
                          <CheckCircle2 className="size-3 text-emerald-500" />
                        </span>
                      ) : (
                        <span title="Out of role scope">
                          <ShieldAlert className="size-3 text-rose-400" />
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
