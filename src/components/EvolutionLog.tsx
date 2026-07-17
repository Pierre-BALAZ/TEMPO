import { useState } from 'react'
import { Clock, Plus, X } from 'lucide-react'
import { useCaseStore } from '../store/caseStore'
import { parseLog, serializeLog, type LogEntry } from '../lib/evolutionLog'
import { formatClock } from '../lib/timeline'

/** Journal d'évolution : notes libres horodatées, empilées (plus récente en haut). */
export function EvolutionLog({ actionId, editable }: { actionId: string; editable: boolean }) {
  const value = useCaseStore((s) => s.caseState.values[actionId]?.value ?? null)
  const setValue = useCaseStore((s) => s.setValue)
  const [draft, setDraft] = useState('')

  const entries = parseLog(value)

  const add = () => {
    const text = draft.trim()
    if (!text) return
    const next: LogEntry[] = [...entries, { at: Date.now(), text }]
    setValue(actionId, serializeLog(next))
    setDraft('')
  }

  const remove = (at: number) => {
    const next = entries.filter((e) => e.at !== at)
    setValue(actionId, serializeLog(next))
  }

  const ordered = [...entries].sort((a, b) => b.at - a.at)

  return (
    <div className="flex flex-col gap-3">
      {editable && (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add()
            }}
            rows={2}
            placeholder="Nouvelle note d’évolution (constantes, geste, événement…)"
            className="w-full resize-y rounded-lg border border-slate-300 px-2.5 py-2 text-base focus:border-slate-500 focus:outline-none sm:text-sm"
          />
          <button
            type="button"
            onClick={add}
            disabled={draft.trim() === ''}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={15} /> Ajouter la note (horodatée maintenant)
          </button>
        </div>
      )}

      {ordered.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune note pour le moment.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordered.map((e) => (
            <li
              key={e.at}
              className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
            >
              <span className="flex shrink-0 items-center gap-1 pt-0.5 text-xs font-semibold tabular-nums text-slate-500">
                <Clock size={12} /> {formatClock(e.at)}
              </span>
              <span className="grow whitespace-pre-line text-sm text-slate-800">{e.text}</span>
              {editable && (
                <button
                  type="button"
                  onClick={() => remove(e.at)}
                  aria-label="Supprimer la note"
                  className="relative -m-1 shrink-0 rounded-md p-1.5 text-slate-300 transition-colors before:absolute before:-inset-x-2 before:-inset-y-1.5 hover:bg-slate-200 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
