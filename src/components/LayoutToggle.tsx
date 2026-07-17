import { Music, Columns3 } from 'lucide-react'
import { useUiStore } from '../store/uiStore'

/** Bascule entre la frise horizontale (Portée) et les colonnes de cartes (Pupitre). */
export function LayoutToggle() {
  const layout = useUiStore((s) => s.layout)
  const setLayout = useUiStore((s) => s.setLayout)

  const base =
    'relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors before:absolute before:-inset-y-1.5'
  const on = 'bg-slate-900 text-white'
  const off = 'text-slate-600 hover:bg-slate-100'

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
      <button
        type="button"
        onClick={() => setLayout('portee')}
        className={`${base} ${layout === 'portee' ? on : off}`}
        title="Frise chronologique horizontale (idéal grand écran)"
      >
        <Music size={14} /> Portée
      </button>
      <button
        type="button"
        onClick={() => setLayout('pupitre')}
        className={`${base} ${layout === 'pupitre' ? on : off}`}
        title="Colonnes de cartes (idéal téléphone)"
      >
        <Columns3 size={14} /> Pupitre
      </button>
    </div>
  )
}
