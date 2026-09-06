import { BookText } from 'lucide-react'
import { SOURCES } from '../config/protocols/polytrauma/sources'

/** Bloc « Sources & références » (repliable), affiché en bas de l'application. */
export function Sources() {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
        <BookText size={15} className="text-slate-500" /> Sources &amp; références
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5 text-xs text-slate-600">
        {SOURCES.map((s) => (
          <li key={s.label}>
            <span className="font-semibold text-slate-800">{s.label}</span> — {s.note}
          </li>
        ))}
      </ul>
    </details>
  )
}
