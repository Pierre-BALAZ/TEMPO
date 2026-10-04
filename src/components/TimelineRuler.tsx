import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { LEFT_COL_W, LEFT_COL_W_COMPACT, contentWidth, xOfMinute } from '../lib/timeline'
import { useUiStore } from '../store/uiStore'

interface Props {
  totalMinutes: number
}

export function TimelineRuler({ totalMinutes }: Props) {
  const compact = useUiStore((s) => s.compactRail)
  const toggleCompact = useUiStore((s) => s.toggleCompactRail)
  const colW = compact ? LEFT_COL_W_COMPACT : LEFT_COL_W
  const ticks: number[] = []
  for (let m = 0; m <= totalMinutes; m += 5) ticks.push(m)

  return (
    <div className="flex">
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r border-slate-200 bg-slate-50 px-1"
        style={{ width: colW }}
      >
        <button
          type="button"
          onClick={toggleCompact}
          title={compact ? 'Élargir la colonne (étiquettes)' : 'Réduire la colonne (icônes)'}
          className="rounded p-1 text-slate-500 hover:bg-slate-200"
        >
          {compact ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        {!compact && (
          <span className="ml-auto pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Temps (min)
          </span>
        )}
      </div>
      <div className="relative h-8 grow" style={{ minWidth: contentWidth(totalMinutes) }}>
        {ticks.map((m) => (
          <div key={m} className="absolute bottom-0 flex flex-col items-center" style={{ left: xOfMinute(m) }}>
            <span className="text-[10px] tabular-nums text-slate-400">{m}</span>
            <span className="h-2 w-px bg-slate-300" />
          </div>
        ))}
      </div>
    </div>
  )
}
