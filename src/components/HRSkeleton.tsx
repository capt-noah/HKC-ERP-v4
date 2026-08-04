import { GlassCard } from "@/components/GlassCard"

export function HRPageSkeleton({ rows = 6, cards = 4 }: { rows?: number; cards?: number }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, index) => (
          <GlassCard key={index} className="p-5">
            <div className="h-3 w-28 rounded-full bg-zinc-200 animate-pulse" />
            <div className="h-7 w-20 rounded-full bg-zinc-100 animate-pulse mt-4" />
          </GlassCard>
        ))}
      </div>
      <GlassCard className="p-0 overflow-hidden border border-black/5 shadow-xs">
        <div className="px-5 pt-5 pb-3 border-b border-black/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="h-4 w-36 rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-3 w-48 rounded-full bg-zinc-100 animate-pulse mt-2" />
            </div>
            <div className="h-9 w-36 rounded-full bg-zinc-100 animate-pulse" />
          </div>
        </div>
        <div className="divide-y divide-black/5">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 px-5 py-4">
              <div className="h-3 rounded-full bg-zinc-200 animate-pulse" />
              <div className="h-3 rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-3 rounded-full bg-zinc-100 animate-pulse" />
              <div className="h-3 rounded-full bg-zinc-200 animate-pulse" />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
