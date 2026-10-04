import type { Role } from '../store/uiStore'
import { useUiStore } from '../store/uiStore'

const ROLES: { id: Role; label: string; active: string }[] = [
  { id: 'regul', label: 'Régulateur', active: 'bg-sky-600 text-white' },
  { id: 'prehosp', label: 'SMUR / VSAV', active: 'bg-amber-600 text-white' },
  { id: 'intra', label: 'Intra-hosp', active: 'bg-rose-600 text-white' },
  { id: 'observer', label: 'Observateur', active: 'bg-slate-800 text-white' },
]

/** Point de vue actif : met en avant une partition (les autres restent visibles et réactives). */
export function RoleSwitcher() {
  const activeRole = useUiStore((s) => s.activeRole)
  const setActiveRole = useUiStore((s) => s.setActiveRole)

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm">
      <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Je suis
      </span>
      {ROLES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => setActiveRole(r.id)}
          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
            activeRole === r.id ? r.active : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
