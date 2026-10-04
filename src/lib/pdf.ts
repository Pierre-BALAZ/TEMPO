import type { ActionDef, ActionValue, CaseState, Protocol } from '../types/model'
import { actionIndex } from '../config'
import { resolveValue } from '../engine/evaluate'
import { isFilledValue } from './case'
import { formatClock } from './timeline'

function formatValue(action: ActionDef, value: ActionValue): string {
  switch (action.type) {
    case 'checkbox':
      return value === true ? 'fait' : ''
    case 'select':
      return action.options?.find((o) => o.value === value)?.label ?? String(value ?? '')
    case 'computed':
      return action.id.includes('vittel') ? `${value} critère(s)` : String(value)
    case 'number':
      return value != null && value !== '' ? `${value}${action.unit ? ' ' + action.unit : ''}` : ''
    default:
      return value != null ? String(value) : ''
  }
}

function isDone(action: ActionDef, value: ActionValue): boolean {
  if (action.type === 'checkbox') return value === true
  if (action.type === 'computed') return typeof value === 'number' && value > 0
  return isFilledValue(value)
}

/** Génère et télécharge un récap PDF chronologique des actions renseignées.
 * jsPDF est chargé à la demande (import dynamique) pour ne pas alourdir le chargement initial. */
export async function exportCasePdf(caseState: CaseState, protocol: Protocol): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  let y = margin

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }
  const line = (
    s: string,
    opts: { size?: number; style?: 'normal' | 'bold' | 'italic'; color?: [number, number, number]; gap?: number } = {},
  ) => {
    const size = opts.size ?? 11
    doc.setFont('helvetica', opts.style ?? 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(opts.color ?? [30, 41, 59]))
    const wrapped = doc.splitTextToSize(s, pageW - 2 * margin)
    for (const w of wrapped) {
      ensure(size + 4)
      doc.text(w, margin, y)
      y += size + 4
    }
    if (opts.gap) y += opts.gap
  }

  // En-tête
  line('Partition d’urgence — récapitulatif', { size: 18, style: 'bold' })
  line(protocol.label, { size: 11, color: [100, 116, 139], gap: 6 })

  const h = caseState.header
  const now = Date.now()
  const elapsedMs = (h.chronoStoppedAt ?? now) - h.caseStartedAt
  const elapsedMin = Math.max(0, Math.round(elapsedMs / 60000))
  line(`Régulateur : ${h.regulateurName || '—'}    SMUR/VSAV : ${h.smurName || '—'}`, { size: 10 })
  line(`Service receveur : ${h.serviceReceveur || '—'}`, { size: 10 })
  line(
    `Chrono : ${elapsedMin} min écoulées (départ ${formatClock(h.caseStartedAt)}${h.chronoStoppedAt ? `, arrêt ${formatClock(h.chronoStoppedAt)}` : ''})`,
    { size: 10, gap: 10 },
  )

  // Par piste : actions renseignées, triées par horodatage
  for (const track of protocol.tracks) {
    const rows = protocol.actions
      .filter((a) => a.trackId === track.id)
      .map((a) => ({ a, value: resolveValue(a.id, caseState, actionIndex), at: caseState.values[a.id]?.completedAt }))
      .filter(({ a, value }) => isDone(a, value))
      .sort((x, z) => (x.at ?? Infinity) - (z.at ?? Infinity))

    ensure(28)
    line(track.label, { size: 13, style: 'bold', color: [15, 23, 42], gap: 2 })
    if (rows.length === 0) {
      line('— aucune action renseignée —', { size: 10, style: 'italic', color: [148, 163, 184], gap: 6 })
      continue
    }
    for (const { a, value, at } of rows) {
      const time = at != null ? formatClock(at) : '—'
      const val = formatValue(a, value)
      line(`[${time}]  ${a.label}${val ? ` : ${val}` : ''}`, { size: 10 })
    }
    y += 6
  }

  ensure(20)
  line(
    'Prototype « partition d’urgence » — données fictives, sans valeur médico-légale.',
    { size: 8, style: 'italic', color: [148, 163, 184] },
  )

  doc.save('partition-urgence-recap.pdf')
}
