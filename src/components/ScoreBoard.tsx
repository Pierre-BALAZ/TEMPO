import { useMemo } from 'react'
import { activeProtocol } from '../config'
import { LEFT_COL_W, LEFT_COL_W_COMPACT, computeTotalMinutes, contentWidth, xOfMinute } from '../lib/timeline'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import { useDerivedUiState } from '../store/selectors'
import { TimelineRuler } from './TimelineRuler'
import { TrackLane } from './TrackLane'

export function ScoreBoard() {
  const caseState = useCaseStore((s) => s.caseState)
  const derived = useDerivedUiState()
  const activeRole = useUiStore((s) => s.activeRole)
  const roleChosen = useUiStore((s) => s.roleChosen)
  const compact = useUiStore((s) => s.compactRail)
  const colW = compact ? LEFT_COL_W_COMPACT : LEFT_COL_W

  const totalMinutes = useMemo(
    () => Math.max(computeTotalMinutes(activeProtocol, caseState), 60),
    [caseState],
  )
  const width = colW + contentWidth(totalMinutes)
  const milestones = [30, 60]

  return (
    <div className="timeline-scroll overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative w-full" style={{ minWidth: width }}>
        {milestones.map((m) => (
          <div
            key={m}
            className="pointer-events-none absolute inset-y-0 z-10"
            style={{ left: colW + xOfMinute(m) }}
          >
            <div className="h-full w-px bg-amber-400/70" />
            <span className="absolute top-0 z-20 -translate-x-1/2 whitespace-nowrap rounded-b bg-amber-400 px-1 py-px text-[9px] font-bold text-white shadow-sm">
              {m} min
            </span>
          </div>
        ))}
        <TimelineRuler totalMinutes={totalMinutes} />
        {activeProtocol.tracks.map((track) => (
          <TrackLane
            key={track.id}
            track={track}
            derived={derived}
            totalMinutes={totalMinutes}
            dimmed={roleChosen && activeRole !== 'observer' && activeRole !== track.id}
          />
        ))}
      </div>
    </div>
  )
}
