import { useEffect, useState } from 'react'
import { Hourglass, Pause, Play, Timer } from 'lucide-react'
import { useCaseStore } from '../store/caseStore'
import { canEditTrack, useUiStore } from '../store/uiStore'
import { formatClock } from '../lib/timeline'

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Chrono géant : démarre à la création du cas, arrêtable seulement par l'équipe intra-hosp. */
export function Stopwatch() {
  const caseStartedAt = useCaseStore((s) => s.caseState.header.caseStartedAt)
  const stoppedAt = useCaseStore((s) => s.caseState.header.chronoStoppedAt)
  const setHeader = useCaseStore((s) => s.setHeader)
  const canStop = useUiStore((s) => canEditTrack(s.activeRole, s.roleChosen, 'intra'))

  const [now, setNow] = useState(() => Date.now())
  const running = stoppedAt == null

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const elapsed = (stoppedAt ?? now) - caseStartedAt
  const goldenHourPassed = elapsed >= 60 * 60_000

  const stop = () => setHeader({ chronoStoppedAt: Date.now() })
  const resume = () => {
    setNow(Date.now())
    setHeader({ chronoStoppedAt: undefined })
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-4 rounded-2xl border-2 px-5 py-4 shadow-sm ${
        running ? 'border-slate-800 bg-slate-900 text-white' : 'border-rose-300 bg-rose-50 text-rose-900'
      }`}
    >
      <div className="flex items-center gap-2">
        <Timer size={22} className={running ? 'text-emerald-400' : 'text-rose-500'} />
        <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
          Chrono
        </span>
        {running ? (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> en cours
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-rose-600">⏹ stoppé</span>
        )}
      </div>

      <div className="font-mono text-5xl font-extrabold leading-none tabular-nums sm:text-6xl">
        {formatElapsed(elapsed)}
      </div>

      {goldenHourPassed && (
        <span
          title="Plus de 60 minutes écoulées depuis le début de la prise en charge"
          className="flex animate-blink items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-sm font-bold text-white ring-2 ring-rose-300"
        >
          <Hourglass size={15} /> Golden hour
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className={`text-xs ${running ? 'text-slate-300' : 'text-rose-700'}`}>
          départ {formatClock(caseStartedAt)}
          {!running && stoppedAt != null && <> · arrêt {formatClock(stoppedAt)}</>}
        </span>
        {canStop ? (
          running ? (
            <button
              type="button"
              onClick={stop}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700"
            >
              <Pause size={16} /> Arrêter
            </button>
          ) : (
            <button
              type="button"
              onClick={resume}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700"
            >
              <Play size={16} /> Reprendre
            </button>
          )
        ) : (
          running && (
            <span className="text-[11px] italic text-slate-400">
              arrêt réservé à l'équipe hôpital
            </span>
          )
        )}
      </div>
    </div>
  )
}
