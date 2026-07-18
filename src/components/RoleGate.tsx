import { Building2, Eye, Radio, Truck } from 'lucide-react'
import type { Role } from '../store/uiStore'
import { useUiStore } from '../store/uiStore'
import logoUrl from '../assets/tempo-logo.png'

const CHOICES: { id: Role; label: string; desc: string; cls: string; icon: typeof Radio }[] = [
  { id: 'regul', label: 'Régulateur', desc: 'SAMU / Centre 15', cls: 'border-sky-300 hover:bg-sky-50 text-sky-700', icon: Radio },
  { id: 'prehosp', label: 'SMUR / VSAV', desc: 'Équipe pré-hospitalière', cls: 'border-amber-300 hover:bg-amber-50 text-amber-700', icon: Truck },
  { id: 'intra', label: 'Hôpital', desc: 'SAUV / déchocage / réa', cls: 'border-rose-300 hover:bg-rose-50 text-rose-700', icon: Building2 },
  { id: 'observer', label: 'Observateur', desc: 'Démo / lecture seule', cls: 'border-slate-300 hover:bg-slate-50 text-slate-600', icon: Eye },
]

/** Écran de choix de rôle au lancement : détermine la ligne éditable. */
export function RoleGate() {
  const roleChosen = useUiStore((s) => s.roleChosen)
  const chooseRole = useUiStore((s) => s.chooseRole)
  if (roleChosen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="gate-card w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        {/* Marque : décoratif (le nom est déjà porté par l'en-tête de l'app) → alt vide. */}
        <img src={logoUrl} alt="" draggable={false} className="mx-auto mb-4 h-24 w-auto rounded-lg sm:h-28" />
        <h2 className="text-balance text-xl font-extrabold text-slate-900">Qui êtes-vous sur ce cas&nbsp;?</h2>
        <p className="mt-1 max-w-prose text-pretty text-sm text-slate-500">
          Vous pourrez <strong>renseigner votre ligne</strong> et <strong>lire</strong> les deux autres
          (modifiable à tout moment). Cela évite d’agir par erreur sur la ligne d’un autre maillon.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CHOICES.map((c, i) => {
            const Icon = c.icon
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => chooseRole(c.id)}
                style={{ animationDelay: `${40 + i * 20}ms` }}
                className={`gate-item flex items-center gap-3 rounded-xl border-2 bg-white px-4 py-4 text-start transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] ${c.cls}`}
              >
                <Icon size={26} className="shrink-0" />
                <span className="flex flex-col">
                  <span className="text-base font-bold text-slate-900">{c.label}</span>
                  <span className="text-xs text-slate-500">{c.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-4 text-pretty text-center text-[11px] text-slate-500">
          Prototype · données fictives · ne saisir aucune donnée identifiant un patient.
        </p>
      </div>
    </div>
  )
}
