import { useEffect } from 'react'
import { Check, Clock, X } from 'lucide-react'
import type { ActionValue, SubField } from '../types/model'
import { protocolIndex } from '../config'
import { useCaseStore } from '../store/caseStore'
import { canEditTrack, useUiStore } from '../store/uiStore'
import { formatClock } from '../lib/timeline'
import { BurnBodyMap } from './BurnBodyMap'
import { DerivedCriteria } from './DerivedCriteria'
import { EvolutionLog } from './EvolutionLog'
import { Gauge } from './Gauge'

export function ActionDetailPanel() {
  const openActionId = useUiStore((s) => s.openActionId)
  const closeAction = useUiStore((s) => s.closeAction)
  const values = useCaseStore((s) => s.caseState.values)
  const setValue = useCaseStore((s) => s.setValue)

  const action = openActionId ? protocolIndex.actionMap.get(openActionId) : undefined
  const editable = useUiStore((s) =>
    action ? canEditTrack(s.activeRole, s.roleChosen, action.trackId) : false,
  )

  // Fermeture au clavier (Échap), comme le clic sur l'overlay.
  useEffect(() => {
    if (!openActionId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAction()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openActionId, closeAction])

  if (!action) return null

  const track = protocolIndex.trackMap.get(action.trackId)
  const section = protocolIndex.sectionMap.get(action.sectionId)
  const subFields = action.detail?.subFields ?? []

  // Regroupe les sous-champs par `group` (en préservant l'ordre).
  const groups: { group: string | undefined; items: SubField[] }[] = []
  for (const sf of subFields) {
    const last = groups[groups.length - 1]
    if (last && last.group === sf.group) last.items.push(sf)
    else groups.push({ group: sf.group, items: [sf] })
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-slate-900/30" onClick={closeAction} />
      <aside className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {track?.shortLabel} · {section?.label}
            </p>
            <h2 className="text-balance text-lg font-bold leading-snug text-slate-900">{action.label}</h2>
          </div>
          <button
            type="button"
            onClick={closeAction}
            className="-m-2 rounded-md p-3 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {action.detail?.reminder && (
          <div className="whitespace-pre-line text-pretty rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
            {action.detail.reminder}
          </div>
        )}

        {action.detail?.widget === 'burnBodyMap' && (
          <BurnBodyMap actionId={action.id} editable={editable} />
        )}

        {action.detail?.widget === 'evolutionLog' && (
          <EvolutionLog actionId={action.id} editable={editable} />
        )}

        {action.type === 'computed' && <DerivedCriteria action={action} />}

        {groups.length > 0 && (
          <div className="flex flex-col gap-4">
            {groups.map((g, gi) => (
              <div key={g.group ?? gi} className="flex flex-col gap-2">
                {g.group && (
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {g.group}
                  </h3>
                )}
                {g.items.map((sf) => {
                  const key = sf.bindTo ?? `${action.id}::${sf.id}`
                  return (
                    <SubFieldInput
                      key={sf.id}
                      subField={sf}
                      value={values[key]?.value ?? null}
                      onChange={(v) => setValue(key, v)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {action.detail?.references && action.detail.references.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Références</h3>
            <ul className="space-y-1 text-xs text-slate-500">
              {action.detail.references.map((r) => (
                <li key={r.label}>
                  <span className="font-medium text-slate-700">{r.label}</span> — {r.note}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-auto text-pretty text-[11px] text-slate-500">
          Astuce&nbsp;: l’action se renseigne aussi directement sur sa carte dans la timeline.
        </p>
      </aside>
    </>
  )
}

function SubFieldInput({
  subField,
  value,
  onChange,
}: {
  subField: SubField
  value: ActionValue
  onChange: (v: ActionValue) => void
}) {
  if (subField.type === 'checkbox') {
    const checked = value === true
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="flex items-start gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-start text-sm transition-colors hover:bg-slate-50"
      >
        <span
          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
            checked ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300 bg-white'
          }`}
        >
          {checked && <Check size={12} strokeWidth={3} />}
        </span>
        <span className="text-slate-700">{subField.label}</span>
      </button>
    )
  }

  if (subField.type === 'timestamp') {
    const recorded = typeof value === 'string' && value !== '' ? value : null
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(recorded ? null : formatClock(Date.now()))}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium tabular-nums transition-colors ${
            recorded
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Clock size={14} />
          {recorded ? `${subField.label} : ${recorded}` : `${subField.label} — noter l’heure`}
        </button>
        {recorded && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Effacer"
            className="relative -m-1.5 rounded-md p-2.5 text-slate-400 transition-colors before:absolute before:-inset-y-1 hover:bg-slate-100"
          >
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  if (subField.type === 'number' && subField.gauge) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">{subField.label}</span>
        <Gauge
          spec={subField.gauge}
          value={typeof value === 'number' ? value : null}
          unit={subField.unit}
          onChange={onChange}
        />
      </div>
    )
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{subField.label}</span>
      {subField.type === 'select' ? (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="rounded border border-slate-300 px-2 py-1 text-base focus:border-slate-500 focus:outline-none sm:text-sm"
        >
          <option value="">—</option>
          {subField.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={subField.type === 'number' ? 'number' : 'text'}
          value={value === null || value === undefined ? '' : String(value)}
          placeholder={subField.placeholder}
          onChange={(e) =>
            onChange(
              e.target.value === ''
                ? null
                : subField.type === 'number'
                  ? Number(e.target.value)
                  : e.target.value,
            )
          }
          className="rounded border border-slate-300 px-2 py-1 text-base focus:border-slate-500 focus:outline-none sm:text-sm"
        />
      )}
    </label>
  )
}
