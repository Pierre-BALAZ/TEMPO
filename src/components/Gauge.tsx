import type { GaugeSpec } from '../types/model'

/**
 * Jauge colorée avec curseur. La zone « normale » est verte, les extrêmes rouges.
 * La valeur est stockée telle quelle (nombre) : elle reste dictable et va au récap.
 */
export function Gauge({
  spec,
  value,
  unit,
  onChange,
}: {
  spec: GaugeSpec
  value: number | null
  unit?: string
  onChange: (v: number | null) => void
}) {
  const { min, max } = spec
  const greenStart = spec.normalMin ?? spec.redBelow ?? min
  const greenEnd = spec.normalMax ?? spec.redAbove ?? max
  const span = max - min || 1
  const pct = (x: number) => Math.max(0, Math.min(100, ((x - min) / span) * 100))

  const segments: { w: number; cls: string }[] = []
  if (greenStart > min) segments.push({ w: pct(greenStart), cls: 'bg-rose-400' })
  segments.push({ w: pct(greenEnd) - pct(greenStart), cls: 'bg-emerald-400' })
  if (greenEnd < max) segments.push({ w: 100 - pct(greenEnd), cls: 'bg-rose-400' })

  const inRange = value !== null && value >= greenStart && value <= greenEnd
  const valueCls = value === null ? 'text-slate-400' : inRange ? 'text-emerald-600' : 'text-rose-600'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold tabular-nums ${valueCls}`}>
          {value === null ? '—' : value}
          {unit ? ` ${unit}` : ''}
          {value !== null && !inRange ? ' ⚠️' : ''}
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((s, i) => (
          <div key={i} className={s.cls} style={{ width: `${s.w}%` }} />
        ))}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={spec.step ?? 1}
        value={value ?? Math.round((greenStart + greenEnd) / 2)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-slate-700"
      />
      <div className="flex justify-between text-[10px] tabular-nums text-slate-400">
        <span>{min}</span>
        <span>
          normal {greenStart}
          {greenEnd < max ? `–${greenEnd}` : '+'} {unit}
        </span>
        <span>{max}</span>
      </div>
    </div>
  )
}
