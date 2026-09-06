import { Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatClock } from '../lib/timeline'

interface HistoryEntry {
  timestamp: number
  value: number
}

interface Props {
  label: string
  unit?: string
  currentValue: string | null
  onAddValue: (value: number, timestamp: number) => void
  editable: boolean
}

/**
 * Affiche l'historique horodaté d'une constante avec flèches de tendance.
 * Format de stockage : "timestamp1:value1|timestamp2:value2|..."
 */
export function TimestampedValueHistory({
  label,
  unit,
  currentValue,
  onAddValue,
  editable,
}: Props) {
  // Parser l'historique
  const parseHistory = (raw: string | null): HistoryEntry[] => {
    if (!raw) return []
    return raw
      .split('|')
      .map((entry) => {
        const [ts, val] = entry.split(':')
        return { timestamp: parseInt(ts), value: parseFloat(val) }
      })
      .filter((e) => !isNaN(e.timestamp) && !isNaN(e.value))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  const history = parseHistory(currentValue)
  const getTrend = (idx: number): 'up' | 'down' | 'flat' | null => {
    if (idx === 0 || history.length < 2) return null
    const prev = history[idx - 1].value
    const curr = history[idx].value
    if (curr > prev) return 'up'
    if (curr < prev) return 'down'
    return 'flat'
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        {history.length > 0 && (
          <span className="text-[10px] font-medium text-slate-500">{history.length} valeur(s)</span>
        )}
      </div>

      {/* Historique */}
      {history.length > 0 ? (
        <div className="flex flex-col gap-1">
          {history.map((entry, idx) => {
            const trend = getTrend(idx)
            const TrendIcon =
              trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

            return (
              <div
                key={idx}
                className="flex items-center gap-1.5 rounded bg-white px-1.5 py-1 text-xs text-slate-700"
              >
                <span className="font-mono font-bold">
                  {entry.value}
                  {unit && <span className="text-[10px] font-normal">{unit}</span>}
                </span>
                <span className="text-[10px] text-slate-500">
                  {formatClock(entry.timestamp)}
                </span>
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
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center text-[10px] text-slate-400">Aucune valeur</div>
      )}

      {/* Bouton ajouter */}
      {editable && (
        <button
          type="button"
          className="flex items-center justify-center gap-1 rounded bg-blue-50 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          onClick={() => {
            const val = prompt(`Nouvelle valeur (${unit || ''})`)
            if (val !== null) {
              const n = parseFloat(val)
              if (!isNaN(n)) {
                onAddValue(n, Date.now())
              }
            }
          }}
        >
          <Plus size={12} /> Ajouter valeur
        </button>
      )}
    </div>
  )
}
