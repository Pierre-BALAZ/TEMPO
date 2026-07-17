import type { ActionDef, ActionValue, CaseState, Protocol, SubField } from '../types/model'
import { parseLog } from './evolutionLog'
import { formatClock } from './timeline'

export interface RecapItem {
  at: number
  trackLabel: string
  sectionLabel: string
  label: string
  valueText: string
}

function valueText(def: ActionDef, value: ActionValue): string {
  if (def.type === 'checkbox') return value === true ? 'fait' : ''
  if (value === null || value === undefined || value === '') return ''
  if (def.type === 'select') {
    const opt = def.options?.find((o) => o.value === value)
    return opt ? opt.label : String(value)
  }
  if (def.type === 'number') return def.unit ? `${value} ${def.unit}` : String(value)
  return String(value)
}

function subValueText(sf: SubField, value: ActionValue): string {
  if (sf.type === 'checkbox') return value === true ? 'fait' : ''
  if (value === null || value === undefined || value === '') return ''
  if (sf.type === 'select') {
    const opt = sf.options?.find((o) => o.value === value)
    return opt ? opt.label : String(value)
  }
  if (sf.type === 'number') return sf.unit ? `${value} ${sf.unit}` : String(value)
  return String(value)
}

/** Liste chronologique des actions horodatées (les plus anciennes d'abord). */
export function buildRecap(
  caseState: CaseState,
  protocol: Protocol,
  index: Map<string, ActionDef>,
): RecapItem[] {
  const trackLabel: Record<string, string> = {}
  const sectionLabel: Record<string, string> = {}
  for (const t of protocol.tracks) {
    trackLabel[t.id] = t.label
    for (const s of t.sections) sectionLabel[s.id] = s.label
  }

  // Sous-champs à inclure dans le récap (actions marquées recapSubFields, ex. ACSOS / ACR).
  const subFieldMap = new Map<string, { sf: SubField; parent: ActionDef }>()
  for (const def of index.values()) {
    if (!def.detail?.recapSubFields) continue
    for (const sf of def.detail.subFields ?? []) {
      if (sf.bindTo) continue // valeur portée par l'action liée (déjà au récap)
      subFieldMap.set(`${def.id}::${sf.id}`, { sf, parent: def })
    }
  }

  const items: RecapItem[] = []
  for (const [id, entry] of Object.entries(caseState.values)) {
    if (!entry || entry.completedAt == null) continue

    if (id.includes('::')) {
      const sub = subFieldMap.get(id)
      if (!sub) continue // autres sous-champs (Vittel/ABC/BATT) non détaillés
      const vt = subValueText(sub.sf, entry.value)
      if (vt === '') continue
      items.push({
        at: entry.completedAt,
        trackLabel: trackLabel[sub.parent.trackId] ?? sub.parent.trackId,
        sectionLabel: sectionLabel[sub.parent.sectionId] ?? '',
        label: `${sub.parent.label} — ${sub.sf.label}`,
        valueText: vt,
      })
      continue
    }

    const def = index.get(id)
    if (!def) continue

    if (def.detail?.widget === 'evolutionLog') {
      for (const note of parseLog(entry.value)) {
        if (!note.text.trim()) continue
        items.push({
          at: note.at,
          trackLabel: trackLabel[def.trackId] ?? def.trackId,
          sectionLabel: sectionLabel[def.sectionId] ?? '',
          label: def.label,
          valueText: note.text,
        })
      }
      continue
    }

    const vt = valueText(def, entry.value)
    if (vt === '') continue
    items.push({
      at: entry.completedAt,
      trackLabel: trackLabel[def.trackId] ?? def.trackId,
      sectionLabel: sectionLabel[def.sectionId] ?? '',
      label: def.label,
      valueText: vt,
    })
  }
  items.sort((a, b) => a.at - b.at)
  return items
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      default:
        return '&quot;'
    }
  })
}

/** Document HTML autonome pour l'impression / export PDF (via la boîte d'impression du navigateur). */
export function recapPrintHtml(items: RecapItem[], caseState: CaseState): string {
  const h = caseState.header
  const patient = h.patientCodename ?? '—'
  const date = h.caseStartedAt
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(h.caseStartedAt)
    : ''
  const intervenants = [
    h.regulateurName ? `Régulateur : ${h.regulateurName}` : '',
    h.smurName ? `SMUR : ${h.smurName}` : '',
    h.serviceReceveur ? `Service : ${h.serviceReceveur}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const rows = items
    .map(
      (it) =>
        `<tr><td class="t">${esc(formatClock(it.at))}</td><td>${esc(it.trackLabel)}</td><td>${esc(
          it.sectionLabel,
        )}</td><td>${esc(it.label)}</td><td class="v">${esc(it.valueText)}</td></tr>`,
    )
    .join('')

  const table = items.length
    ? `<table><thead><tr><th>Heure</th><th>Piste</th><th>Section</th><th>Action</th><th>Valeur</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<p>Aucune action horodatée pour le moment.</p>'

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Récap TEMPO — ${esc(
    patient,
  )}</title><style>
    *{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-sizing:border-box}
    body{margin:24px;color:#0f172a}
    h1{font-size:18px;margin:0 0 2px}
    .sub{color:#64748b;font-size:12px;margin-bottom:12px}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border-bottom:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#475569}
    td.t{white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600}
    td.v{font-weight:600}
    .foot{margin-top:14px;font-size:10px;color:#94a3b8}
    @media print{body{margin:12mm}}
  </style></head><body>
  <h1>TEMPO — partition d'urgence · récap chronologique</h1>
  <div class="sub">Patient (anonyme) : <b>${esc(patient)}</b>${date ? ' · ' + esc(date) : ''}${
    intervenants ? ' · ' + esc(intervenants) : ''
  }</div>
  ${table}
  <div class="foot">Données anonymes. Généré par TEMPO.</div>
  </body></html>`
}
