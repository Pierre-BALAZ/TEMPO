import { PlayCircle } from 'lucide-react'
import { useCaseStore } from '../store/caseStore'
import { buildDemoCase } from '../config/demoScenario'

/** Charge le cas de démonstration pré-rempli (bouton compact, ligne « démo » en haut). */
export function DemoCaseButton() {
  const loadCase = useCaseStore((s) => s.loadCase)
  return (
    <button
      type="button"
      onClick={() => loadCase(buildDemoCase(Date.now()))}
      title="Charger un cas de démonstration déjà rempli"
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.96]"
    >
      <PlayCircle size={15} /> Scénario démo
    </button>
  )
}
