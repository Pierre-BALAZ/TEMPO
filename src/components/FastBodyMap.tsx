import { Check, X, HelpCircle } from 'lucide-react'

export interface FastZones {
  pericarde?: string | null
  hemo_droit?: string | null
  hemo_gauche?: string | null
  bassin?: string | null
  pnx_droit?: string | null
  pnx_gauche?: string | null
}

interface Props {
  zones: FastZones
  onZoneChange: (zoneId: string, value: string | null) => void
}

/**
 * Schéma interactif eFAST : 6 zones d'exploration échographique
 * Intégré dans le panneau de détail de l'item FAST écho.
 * 
 * Zones :
 * 1. Péricarde (épigastrique, centre haut)
 * 2. Hémothorax droit et espace de Morisson (flanc droit)
 * 3. Hémothorax gauche et espace de Kuhler (flanc gauche)
 * 4. Cul de sac de Douglas (sus-pubien)
 * 5. Pneumothorax droit (apex pulmonaire droit)
 * 6. Pneumothorax gauche (apex pulmonaire gauche)
 */
export function FastBodyMap({ zones, onZoneChange }: Props) {
  const getZoneStatus = (value: string | null | undefined) => {
    if (!value) return { icon: HelpCircle, color: 'text-slate-400', bg: 'bg-slate-100' }
    if (value === 'present') return { icon: Check, color: 'text-red-600', bg: 'bg-red-50' }
    return { icon: Check, color: 'text-green-600', bg: 'bg-green-50' }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <h3 className="text-xs font-semibold text-blue-900">Zones eFAST — Points d'exploration</h3>

      {/* Grille des 6 zones */}
      <div className="grid grid-cols-1 gap-2">
        {[
          { id: 'pericarde', label: 'Péricarde', detail: '(épigastrique, centre)' },
          { id: 'hemo_droit', label: 'Hémothorax D + Espace de Morisson', detail: '(flanc droit)' },
          { id: 'hemo_gauche', label: 'Hémothorax G + Espace de Kuhler', detail: '(flanc gauche)' },
          { id: 'bassin', label: 'Cul de sac de Douglas', detail: '(sus-pubien)' },
          { id: 'pnx_droit', label: 'Pneumothorax droit', detail: '(apex pulmonaire D)' },
          { id: 'pnx_gauche', label: 'Pneumothorax gauche', detail: '(apex pulmonaire G)' },
        ].map(({ id, label, detail }) => {
          const value = zones[id as keyof FastZones]
          const status = getZoneStatus(value)
          const StatusIcon = status.icon

          return (
            <div
              key={id}
              className={`flex cursor-pointer items-start gap-2 rounded border px-2 py-2 transition ${
                value === 'present'
                  ? 'border-red-300 bg-red-50'
                  : value === 'absent'
                    ? 'border-green-300 bg-green-50'
                    : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
              onClick={() => {
                const next = value === 'present' ? 'absent' : value === 'absent' ? null : 'present'
                onZoneChange(id, next)
              }}
              title={`Cliquez pour modifier : ${label}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800">{label}</div>
                <div className="text-[10px] text-slate-500">{detail}</div>
              </div>
              <StatusIcon size={16} className={`shrink-0 ${status.color}`} />
            </div>
          )
        })}
      </div>

      {/* Légende compacte */}
      <div className="flex flex-wrap gap-2 border-t border-blue-200 pt-2 text-[10px] text-blue-700">
        <span className="flex items-center gap-1">
          <Check size={12} className="text-red-600" /> Épanchement présent
        </span>
        <span className="flex items-center gap-1">
          <Check size={12} className="text-green-600" /> Épanchement absent
        </span>
        <span className="flex items-center gap-1">
          <HelpCircle size={12} className="text-slate-400" /> Non renseigné
        </span>
      </div>

      {/* Résumé */}
      {Object.values(zones).some((z) => z === 'present') && (
        <div className="rounded bg-red-100 px-2 py-1.5 text-[11px] font-semibold text-red-800">
          ⚠ eFAST POSITIVE — Épanchements détectés
        </div>
      )}
      {Object.values(zones).every((z) => z === 'absent') && (
        <div className="rounded bg-green-100 px-2 py-1.5 text-[11px] font-semibold text-green-800">
          ✓ eFAST NÉGATIVE
        </div>
      )}
    </div>
  )
}
