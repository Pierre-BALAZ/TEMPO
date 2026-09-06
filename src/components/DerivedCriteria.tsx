import { Check, Minus } from 'lucide-react'
import type { ActionDef } from '../types/model'
import { actionIndex } from '../config'
import { describeDerivedCriteria } from '../engine/computed'
import { useCaseStore } from '../store/caseStore'

/**
 * Critères d'un score repris automatiquement du bilan (PAS, FC, GCS, FAST…).
 * Affichage en lecture seule : la saisie se fait dans le bilan XABCDE.
 */
export function DerivedCriteria({ action }: { action: ActionDef }) {
  const caseState = useCaseStore((s) => s.caseState)
  const views = describeDerivedCriteria(action, caseState, actionIndex)
  if (views.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Repris du bilan XABCDE
      </h3>
      <ul className="flex flex-col gap-1.5">
        {views.map((v) => (
          <li
            key={v.label}
            className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 ${
              v.met ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                v.met ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'
              }`}
              aria-hidden
            >
              {v.met ? <Check size={11} strokeWidth={3} /> : <Minus size={11} strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm font-medium ${
                  v.met ? 'text-emerald-800' : 'text-slate-500'
                }`}
              >
                {v.label}
              </span>
              <span className="block text-[11px] text-slate-500">{v.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-400">
        Ces critères se cochent d’eux-mêmes : ils suivent les valeurs du bilan.
      </p>
    </div>
  )
}
