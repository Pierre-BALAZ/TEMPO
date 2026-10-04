import { useCaseStore } from '../store/caseStore'
import { WALLACE_ZONES, type BurnZone } from '../config/protocols/polytrauma/burns'

interface Props {
  /** Id de l'action calculée Wallace ; les zones sont stockées sous `${actionId}::<zoneId>`. */
  actionId: string
  editable: boolean
}

/**
 * Schéma corporel (face + dos) de la règle de Wallace : chaque zone est cliquable
 * et bascule « brûlée / non brûlée ». La somme des pourcentages sélectionnés est
 * affichée en direct (et alimente l'action calculée « SCB (Wallace) »).
 */
export function BurnBodyMap({ actionId, editable }: Props) {
  const values = useCaseStore((s) => s.caseState.values)
  const setValue = useCaseStore((s) => s.setValue)

  const isOn = (zone: BurnZone) => values[`${actionId}::${zone.id}`]?.value === true
  const total = WALLACE_ZONES.reduce((acc, z) => acc + (isOn(z) ? z.pct : 0), 0)

  const toggle = (zone: BurnZone) => {
    if (!editable) return
    setValue(`${actionId}::${zone.id}`, !isOn(zone))
  }

  const clearAll = () => {
    if (!editable) return
    for (const z of WALLACE_ZONES) if (isOn(z)) setValue(`${actionId}::${z.id}`, false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Surface cutanée brûlée
        </span>
        <span
          className={`rounded-md px-2 py-0.5 text-sm font-bold tabular-nums ${
            total > 20
              ? 'bg-red-100 text-red-700'
              : total > 10
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-700'
          }`}
        >
          {total} %
        </span>
      </div>

      <svg viewBox="0 0 262 250" className="w-full select-none" role="img" aria-label="Schéma corporel de Wallace">
        {WALLACE_ZONES.map((zone) => {
          const on = isOn(zone)
          const fill = on ? '#ef4444' : '#f1f5f9'
          const stroke = on ? '#b91c1c' : '#94a3b8'
          const textFill = on ? '#ffffff' : '#64748b'
          const cx =
            zone.shape.kind === 'circle' ? zone.shape.cx : zone.shape.x + zone.shape.w / 2
          const cy =
            zone.shape.kind === 'circle' ? zone.shape.cy : zone.shape.y + zone.shape.h / 2
          return (
            <g
              key={zone.id}
              onClick={() => toggle(zone)}
              style={{ cursor: editable ? 'pointer' : 'default' }}
            >
              <title>{`${zone.label} — ${zone.pct} %`}</title>
              {zone.shape.kind === 'circle' ? (
                <circle
                  cx={zone.shape.cx}
                  cy={zone.shape.cy}
                  r={zone.shape.r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.5}
                />
              ) : (
                <rect
                  x={zone.shape.x}
                  y={zone.shape.y}
                  width={zone.shape.w}
                  height={zone.shape.h}
                  rx={zone.shape.rx ?? 0}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.5}
                />
              )}
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8}
                fontWeight={600}
                fill={textFill}
                pointerEvents="none"
              >
                {zone.pct}
              </text>
            </g>
          )
        })}
        <text x={60} y={244} textAnchor="middle" fontSize={11} fontWeight={700} fill="#475569">
          Face
        </text>
        <text x={200} y={244} textAnchor="middle" fontSize={11} fontWeight={700} fill="#475569">
          Dos
        </text>
      </svg>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{editable ? 'Cliquez les zones brûlées (2ᵉ/3ᵉ degré).' : 'Lecture seule (rôle SMUR requis).'}</span>
        {editable && total > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded border border-slate-200 px-2 py-0.5 font-medium text-slate-600 hover:bg-slate-50"
          >
            Tout effacer
          </button>
        )}
      </div>
    </div>
  )
}
