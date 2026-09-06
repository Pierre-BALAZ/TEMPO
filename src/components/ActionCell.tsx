import { useState } from 'react'
import {
  Check,
  Info,
  Lock,
  MousePointerClick,
  NotebookPen,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import type { ActionDef, ActionValue, VisualEffect } from '../types/model'
import { useCaseStore } from '../store/caseStore'
import { canEditTrack, useUiStore } from '../store/uiStore'
import { usePlayerStore } from '../store/playerStore'
import { useResolvedValue } from '../store/selectors'
import { isFilledValue } from '../lib/case'
import { parseLog } from '../lib/evolutionLog'
import { iconForCategory } from '../lib/icons'
import { PILL_H, PILL_W, formatClock } from '../lib/timeline'
import { LEVEL_STYLES } from '../lib/theme'

interface Props {
  action: ActionDef
  x?: number
  top?: number
  effect?: VisualEffect
  /** true = rendu en flux (carte pleine largeur, vue Pupitre) ; false = positionné sur la frise. */
  flow?: boolean
}

export function ActionCell({ action, x, top, effect, flow = false }: Props) {
  const setValue = useCaseStore((s) => s.setValue)
  const entry = useCaseStore((s) => s.caseState.values[action.id])
  const openAction = useUiStore((s) => s.openAction)
  const editable = useUiStore((s) => canEditTrack(s.activeRole, s.roleChosen, action.trackId))
  const activeClick = usePlayerStore((s) => s.activeActionId === action.id)
  const value = useResolvedValue(action.id)

  const locked = Boolean(action.lockedByDefault) && !effect?.unlocked
  const inputsDisabled = locked || !editable
  const isLog = action.detail?.widget === 'evolutionLog'
  const logCount = isLog ? parseLog(value).length : 0
  const checkboxDone = action.type === 'checkbox' && value === true
  const filled = action.type !== 'checkbox' && action.type !== 'computed' && isFilledValue(value)
  const computedActive = action.type === 'computed' && typeof value === 'number' && value > 0
  const blinking = Boolean(effect?.blink) && !locked
  const highlighted = Boolean(effect?.highlighted) && !locked
  const levelStyle = effect?.level ? LEVEL_STYLES[effect.level] : undefined
  const CategoryIcon = iconForCategory(action.category)

  const classes = [
    'rounded-lg border px-2.5 py-1.5 text-left shadow-sm transition-all',
    'flex flex-col justify-between overflow-hidden',
    flow ? 'relative w-full' : 'absolute',
  ]
  if (locked) {
    classes.push('border-dashed border-slate-300 bg-slate-100 opacity-60')
  } else if (checkboxDone) {
    classes.push('border-emerald-300 bg-emerald-50')
  } else if (filled || computedActive) {
    classes.push('border-sky-300 bg-sky-50')
  } else {
    classes.push('border-slate-200 bg-white')
  }
  if (activeClick) {
    classes.push('z-10 scale-[1.04] ring-2 ring-indigo-600 shadow-md')
    if (blinking) classes.push('animate-blink')
  } else if (highlighted || blinking) {
    classes.push(levelStyle ? `ring-2 ${levelStyle.ring}` : 'ring-2 ring-amber-400')
    if (blinking) classes.push('animate-blink')
  }

  return (
    <div
      data-action-id={action.id}
      className={classes.join(' ')}
      style={flow ? { minHeight: PILL_H } : { left: x, top, width: PILL_W, minHeight: PILL_H }}
      title={action.label}
    >
      {activeClick && (
        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-indigo-600 p-0.5 text-white shadow">
          <MousePointerClick size={12} />
        </span>
      )}

      <div className="flex items-start gap-1.5">
        {action.type === 'checkbox' ? (
          <button
            type="button"
            disabled={inputsDisabled}
            onClick={() => setValue(action.id, !checkboxDone)}
            aria-label={checkboxDone ? 'Décocher' : 'Cocher'}
            className={[
              'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border',
              checkboxDone ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white',
              inputsDisabled ? 'cursor-not-allowed' : '',
            ].join(' ')}
          >
            {checkboxDone && <Check size={12} strokeWidth={3} />}
          </button>
        ) : locked ? (
          <Lock size={13} className="mt-0.5 shrink-0 text-slate-400" />
        ) : (
          <CategoryIcon size={13} className="mt-0.5 shrink-0 text-slate-400" />
        )}

        <span className="grow text-[11px] font-medium leading-tight text-slate-800">
          {action.label}
        </span>

        {(action.detail || action.timestamped) && (
          <button
            type="button"
            onClick={() => openAction(action.id)}
            aria-label="Détail"
            className="shrink-0 text-slate-400 hover:text-slate-700"
          >
            <Info size={13} />
          </button>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        {isLog ? (
          <button
            type="button"
            onClick={() => openAction(action.id)}
            className="flex items-center gap-1 rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
          >
            <NotebookPen size={12} />
            {logCount > 0 ? `${logCount} note${logCount > 1 ? 's' : ''}` : 'Ajouter une note'}
          </button>
        ) : (
          <>
            {renderEditor(action, value, locked, !editable, setValue)}
            {entry?.completedAt != null && (checkboxDone || filled) && (
              <span className="ml-auto text-[10px] tabular-nums text-slate-400">
                {formatClock(entry.completedAt)}
              </span>
            )}
          </>
        )}
      </div>

      {effect?.note && (highlighted || blinking) && (
        <p className="mt-1 truncate text-[10px] text-slate-500" title={effect.note}>
          {effect.note}
        </p>
      )}
    </div>
  )
}

/** Extrait la dernière valeur d'un historique horodaté "ts:val|ts:val|…". */
/** Dernière et avant-dernière valeur d'un historique horodaté "ts:val|ts:val|…". */
function lastTwoValues(value: ActionValue): { last: number | null; prev: number | null } {
  if (typeof value !== 'string' || value === '') return { last: null, prev: null }
  const nums = value
    .split('|')
    .map((p) => parseFloat(p.split(':')[1]))
    .filter((n) => !isNaN(n))
  return {
    last: nums.length > 0 ? nums[nums.length - 1] : null,
    prev: nums.length > 1 ? nums[nums.length - 2] : null,
  }
}

/**
 * Saisie inline d'une constante horodatée : champ libre + bouton « + » pour
 * ajouter une nouvelle valeur à l'historique. Affiche la dernière valeur et
 * une flèche de tendance (↑ rouge / ↓ vert / – gris). L'historique complet
 * reste accessible via le panneau de détail (ⓘ).
 */
function TimestampedInlineInput({
  value,
  unit,
  placeholder,
  disabled,
  onAdd,
}: {
  value: ActionValue
  unit?: string
  placeholder?: string
  disabled: boolean
  onAdd: (n: number) => void
}) {
  const [draft, setDraft] = useState('')
  const { last, prev } = lastTwoValues(value)

  const commit = () => {
    const n = parseFloat(draft.replace(',', '.'))
    if (isNaN(n)) return
    onAdd(n)
    setDraft('')
  }

  const trend =
    last !== null && prev !== null
      ? last > prev
        ? 'up'
        : last < prev
          ? 'down'
          : 'flat'
      : null
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        disabled={disabled}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        className={`h-6 w-16 rounded border border-slate-300 px-1 text-[11px] tabular-nums focus:border-slate-500 focus:outline-none ${
          disabled ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''
        }`}
      />
      <button
        type="button"
        disabled={disabled || draft.trim() === ''}
        onClick={commit}
        aria-label="Ajouter la valeur"
        title="Ajouter la valeur"
        className="grid h-6 w-6 shrink-0 place-items-center rounded border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
      >
        <Plus size={13} />
      </button>
      {last !== null && (
        <span className="ml-0.5 flex items-center gap-0.5 text-[11px] tabular-nums text-slate-600">
          {last}
          {unit && <span className="text-[10px] text-slate-400">{unit}</span>}
          {trend && (
            <TrendIcon
              size={12}
              className={
                trend === 'up'
                  ? 'text-red-500'
                  : trend === 'down'
                    ? 'text-green-500'
                    : 'text-slate-400'
              }
            />
          )}
        </span>
      )}
    </div>
  )
}

function renderEditor(
  action: ActionDef,
  value: ActionValue,
  locked: boolean,
  disabled: boolean,
  setValue: (id: string, v: ActionValue) => void,
) {
  if (locked) return <span className="text-[10px] italic text-slate-400">verrouillé</span>

  const disabledCls = disabled ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''

  switch (action.type) {
    case 'number':
      if (action.timestamped) {
        return (
          <TimestampedInlineInput
            value={value}
            unit={action.unit}
            placeholder={action.placeholder}
            disabled={disabled}
            onAdd={(n) => {
              const existing = typeof value === 'string' && value !== '' ? `${value}|` : ''
              setValue(action.id, `${existing}${Date.now()}:${n}`)
            }}
          />
        )
      }
      return (
        <input
          type="number"
          disabled={disabled}
          value={value === null || value === undefined ? '' : String(value)}
          placeholder={action.placeholder}
          onChange={(e) => setValue(action.id, e.target.value === '' ? null : Number(e.target.value))}
          className={`h-6 w-16 rounded border border-slate-300 px-1 text-[11px] tabular-nums focus:border-slate-500 focus:outline-none ${disabledCls}`}
        />
      )
    case 'select':
      return (
        <select
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setValue(action.id, e.target.value || null)}
          className={`h-6 max-w-[150px] rounded border border-slate-300 bg-white px-1 text-[11px] focus:border-slate-500 focus:outline-none ${disabledCls}`}
        >
          <option value="">—</option>
          {action.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    case 'text':
      return (
        <input
          type="text"
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          placeholder={action.placeholder}
          onChange={(e) => setValue(action.id, e.target.value || null)}
          className={`h-6 w-[150px] rounded border border-slate-300 px-1 text-[11px] focus:border-slate-500 focus:outline-none ${disabledCls}`}
        />
      )
    case 'computed':
      return (
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
          {action.unit ? `${value} ${action.unit}` : value}
        </span>
      )
    case 'checkbox':
    default:
      return null
  }
}
