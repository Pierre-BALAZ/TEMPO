import { ChevronDown, Eye, Pencil } from 'lucide-react'
import type { ActionDef, DerivedUiState, SectionDef, TrackDef } from '../types/model'
import { actionIndex, activeProtocol } from '../config'
import { resolveValue } from '../engine/evaluate'
import { actionsOfSection, actionsOfTrack } from '../lib/protocol'
import { iconForCategory } from '../lib/icons'
import { isFilledValue } from '../lib/case'
import { trackTheme, LEVEL_STYLES } from '../lib/theme'
import {
  LEFT_COL_W,
  LEFT_COL_W_COMPACT,
  MINI_GAP,
  MINI_PAD_Y,
  MINI_SIZE,
  contentWidth,
  formatClock,
  minutesOfAction,
  packStrip,
} from '../lib/timeline'
import { sectionIcon } from '../lib/sectionIcons'
import { canEditTrack, useUiStore } from '../store/uiStore'
import { useCaseStore } from '../store/caseStore'
import { ActionCell } from './ActionCell'

interface Props {
  track: TrackDef
  derived: DerivedUiState
  totalMinutes: number
  dimmed: boolean
}

export function TrackLane({ track, derived, totalMinutes, dimmed }: Props) {
  const caseState = useCaseStore((s) => s.caseState)
  const collapsed = useUiStore((s) => s.collapsedTracks.includes(track.id))
  const toggleCollapsed = useUiStore((s) => s.toggleTrackCollapsed)
  const editable = useUiStore((s) => canEditTrack(s.activeRole, s.roleChosen, track.id))
  const roleChosen = useUiStore((s) => s.roleChosen)
  const compact = useUiStore((s) => s.compactRail)
  const colW = compact ? LEFT_COL_W_COMPACT : LEFT_COL_W
  const theme = trackTheme(track.color)
  const width = contentWidth(totalMinutes)

  return (
    <div className={dimmed ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
      {/* Bandeau de la piste */}
      <div className="flex">
        <div
          className={`sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r border-white/30 px-1.5 py-1.5 text-sm font-bold ${theme.headerBg} ${theme.headerText}`}
          style={{ width: colW }}
        >
          <button
            type="button"
            onClick={() => toggleCollapsed(track.id)}
            title={collapsed ? 'Développer' : 'Réduire'}
            className="relative -m-1 rounded p-1.5 transition-colors before:absolute before:-inset-2 hover:bg-white/20"
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
          </button>
          {!compact && <span className="grow leading-tight">{track.label}</span>}
          {roleChosen && (
            <span
              title={editable ? 'Vous éditez cette ligne' : 'Lecture seule'}
              className={`flex shrink-0 items-center rounded bg-white/20 p-1 ${compact ? '' : ''}`}
            >
              {editable ? <Pencil size={12} /> : <Eye size={12} />}
            </span>
          )}
        </div>
        <div className={`${theme.headerBg} ${theme.headerText} flex grow items-center px-3 py-1.5 text-[11px] opacity-90`} style={{ minWidth: width }}>
          {track.shortLabel}
        </div>
      </div>

      {collapsed ? (
        <CollapsedLane track={track} derived={derived} width={width} theme={theme} compact={compact} colW={colW} />
      ) : (
        track.sections.map((section) => {
          const acts = actionsOfSection(activeProtocol, section.id)
          const { placements, height } = packStrip(
            acts.map((a) => ({ item: a, min: minutesOfAction(a, caseState) })),
          )
          return (
            <div key={section.id} className="flex border-t border-slate-100">
              <div
                className={`sticky left-0 z-10 flex shrink-0 items-center border-r border-slate-200 bg-white px-2 ${
                  compact ? 'justify-center px-1' : ''
                } ${theme.laneBg}`}
                style={{ width: colW }}
              >
                <SectionChip section={section} effect={derived[`section:${section.id}`]} compact={compact} />
              </div>
              <div className={`relative grow ${theme.laneBg}`} style={{ minWidth: width, height }}>
                {placements.map((p) => (
                  <ActionCell key={p.item.id} action={p.item} x={p.x} top={p.top} effect={derived[p.item.id]} />
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

/** Rangée compacte : une mini-icône par action, positionnée sur la timeline. */
function CollapsedLane({
  track,
  derived,
  width,
  theme,
  compact,
  colW,
}: {
  track: TrackDef
  derived: DerivedUiState
  width: number
  theme: ReturnType<typeof trackTheme>
  compact: boolean
  colW: number
}) {
  const caseState = useCaseStore((s) => s.caseState)
  const openAction = useUiStore((s) => s.openAction)
  const acts = actionsOfTrack(activeProtocol, track.id)
  const { placements, height } = packStrip(
    acts.map((a) => ({ item: a, min: minutesOfAction(a, caseState) })),
    { itemWidth: MINI_SIZE, itemHeight: MINI_SIZE, rowGap: MINI_GAP, padY: MINI_PAD_Y },
  )

  return (
    <div className="flex border-t border-slate-100">
      <div
        className={`sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-1 border-r border-slate-200 bg-white py-1.5 ${
          compact ? 'items-center px-1' : 'px-2'
        } ${theme.laneBg}`}
        style={{ width: colW }}
      >
        {compact ? (
          <ul className="flex flex-col items-center gap-1.5">
            {track.sections.map((s) => {
              const { Icon, className } = sectionIcon(s.id)
              return (
                <li key={s.id} title={s.label} className={`text-slate-400 ${className ?? ''}`}>
                  <Icon size={16} />
                </li>
              )
            })}
          </ul>
        ) : (
          <>
            <span className="text-[11px] italic text-slate-500">vue réduite — {acts.length}&nbsp;actions</span>
            <ul className="flex flex-col gap-0.5">
              {track.sections.map((s) => (
                <li
                  key={s.id}
                  className="truncate text-[11px] font-medium leading-tight text-slate-500"
                  title={s.label}
                >
                  {s.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className={`relative grow ${theme.laneBg}`} style={{ minWidth: width, height }}>
        {placements.map(({ item, x, top }) => (
          <MiniIcon
            key={item.id}
            action={item}
            x={x}
            top={top}
            effect={derived[item.id]}
            caseState={caseState}
            onOpen={() => item.detail && openAction(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

function MiniIcon({
  action,
  x,
  top,
  effect,
  caseState,
  onOpen,
}: {
  action: ActionDef
  x: number
  top: number
  effect?: DerivedUiState[string]
  caseState: import('../types/model').CaseState
  onOpen: () => void
}) {
  const Icon = iconForCategory(action.category)
  const value = resolveValue(action.id, caseState, actionIndex)
  const completedAt = caseState.values[action.id]?.completedAt
  const locked = Boolean(action.lockedByDefault) && !effect?.unlocked
  const checkboxDone = action.type === 'checkbox' && value === true
  const filled =
    (action.type !== 'checkbox' && action.type !== 'computed' && isFilledValue(value)) ||
    (action.type === 'computed' && typeof value === 'number' && value > 0)
  const blinking = Boolean(effect?.blink) && !locked
  const highlighted = Boolean(effect?.highlighted) && !locked
  const levelStyle = effect?.level ? LEVEL_STYLES[effect.level] : undefined

  const classes = [
    'absolute grid place-items-center rounded-md border transition-[color,background-color,border-color,box-shadow] before:absolute before:-inset-[3px]',
  ]
  if (!action.detail) classes.push('cursor-default')
  if (locked) classes.push('border-dashed border-slate-300 bg-slate-100 text-slate-300')
  else if (checkboxDone) classes.push('border-emerald-300 bg-emerald-100 text-emerald-700')
  else if (filled) classes.push('border-sky-300 bg-sky-100 text-sky-700')
  else classes.push('border-slate-200 bg-white text-slate-400')
  if (highlighted || blinking) classes.push(levelStyle ? `ring-2 ${levelStyle.ring}` : 'ring-2 ring-amber-400')
  if (blinking) classes.push('animate-blink')

  const valueText =
    value !== null && value !== undefined && value !== '' && typeof value !== 'boolean'
      ? `\u00A0: ${value}`
      : ''
  const timeText = completedAt != null && (checkboxDone || filled) ? ` — ${formatClock(completedAt)}` : ''

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${action.label}${valueText}${timeText}`}
      className={classes.join(' ')}
      style={{ left: x, top, width: MINI_SIZE, height: MINI_SIZE }}
    >
      <Icon size={16} />
    </button>
  )
}

function SectionChip({
  section,
  effect,
  compact,
}: {
  section: SectionDef
  effect?: DerivedUiState[string]
  compact: boolean
}) {
  const active = Boolean(effect?.blink || effect?.highlighted)
  const lvl = effect?.level ? LEVEL_STYLES[effect.level] : LEVEL_STYLES.warn

  if (compact) {
    const { Icon, className } = sectionIcon(section.id)
    const box = ['grid h-8 w-8 place-items-center rounded-md transition-colors']
    if (section.alert && active) {
      box.push(`${lvl.bg} ${lvl.text} ${lvl.ring} ring-2`)
      if (effect?.blink) box.push('animate-blink')
    } else {
      box.push(`text-slate-500 ${className ?? ''}`)
    }
    return (
      <span className={box.join(' ')} title={section.label}>
        <Icon size={18} />
      </span>
    )
  }

  if (!section.alert) {
    return <span className="text-xs font-medium text-slate-600">{section.label}</span>
  }

  const classes = ['rounded-md border px-2 py-1 text-xs font-semibold transition-colors']
  if (active) {
    classes.push(`${lvl.bg} ${lvl.text} ${lvl.ring} ring-2 border-transparent`)
    if (effect?.blink) classes.push('animate-blink')
  } else {
    classes.push('border-slate-200 bg-slate-100 text-slate-500')
  }

  return (
    <span className={classes.join(' ')} title={section.label}>
      {section.label}
    </span>
  )
}
