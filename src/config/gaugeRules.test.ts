import { describe, expect, it } from 'vitest'
import { evaluate } from '../engine/evaluate'
import type { CaseState } from '../types/model'
import { buildGaugeRules } from './gaugeRules'
import { polytraumaProtocol } from './protocols/polytrauma'

const ACSOS = polytraumaProtocol.actions.find((a) => a.id === 'prehosp.acsos')!

function caseWith(values: Record<string, number | boolean>): CaseState {
  return {
    protocolId: polytraumaProtocol.id,
    header: { caseStartedAt: 0 },
    values: Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, { value: v, completedAt: 1000 }]),
    ),
  }
}

describe('buildGaugeRules', () => {
  it('génère une règle par sous-champ à jauge (et ignore les autres)', () => {
    const rules = buildGaugeRules(ACSOS)
    const ids = rules.map((r) => r.id)
    // 6 jauges ACSOS : pam-tc, pam-hemo, capnie, spo2, temperature, glycemie.
    // hcue (sans jauge) et hyponatremie (checkbox) n'en produisent pas.
    expect(ids).toEqual([
      'r.gauge.prehosp.acsos.pam-tc',
      'r.gauge.prehosp.acsos.pam-hemo',
      'r.gauge.prehosp.acsos.capnie',
      'r.gauge.prehosp.acsos.spo2',
      'r.gauge.prehosp.acsos.temperature',
      'r.gauge.prehosp.acsos.glycemie',
    ])
  })

  it('évalue les sous-champs bindTo sur l’action liée', () => {
    const spo2Rule = buildGaugeRules(ACSOS).find((r) => r.id === 'r.gauge.prehosp.acsos.spo2')!
    expect(JSON.stringify(spo2Rule.when)).toContain('prehosp.b.spo2')
  })

  it('n’invente aucun seuil : les bornes viennent des GaugeSpec', () => {
    const capnie = ACSOS.detail!.subFields!.find((sf) => sf.id === 'capnie')!
    const rule = buildGaugeRules(ACSOS).find((r) => r.id === 'r.gauge.prehosp.acsos.capnie')!
    const s = JSON.stringify(rule.when)
    expect(s).toContain(`"value":${capnie.gauge!.normalMin}`)
    expect(s).toContain(`"value":${capnie.gauge!.normalMax}`)
  })
})

describe('règles ACSOS intégrées au protocole', () => {
  it('SpO₂ du bilan < 90 → la pastille ACSOS clignote', () => {
    const derived = evaluate(polytraumaProtocol, caseWith({ 'prehosp.b.spo2': 85 }))
    expect(derived['prehosp.acsos']?.blink).toBe(true)
  })

  it('SpO₂ normale → pas d’alerte ACSOS', () => {
    const derived = evaluate(polytraumaProtocol, caseWith({ 'prehosp.b.spo2': 97 }))
    expect(derived['prehosp.acsos']?.blink).toBeUndefined()
  })

  it('valeur absente → pas d’alerte (garde « filled » : null vaudrait 0 en lt)', () => {
    const derived = evaluate(polytraumaProtocol, caseWith({}))
    expect(derived['prehosp.acsos']?.blink).toBeUndefined()
  })

  it('capnie saisie dans le panneau ACSOS hors zone → alerte', () => {
    const derived = evaluate(polytraumaProtocol, caseWith({ 'prehosp.acsos::capnie': 55 }))
    expect(derived['prehosp.acsos']?.blink).toBe(true)
  })

  it('capnie en zone normale → pas d’alerte', () => {
    const derived = evaluate(polytraumaProtocol, caseWith({ 'prehosp.acsos::capnie': 40 }))
    expect(derived['prehosp.acsos']?.blink).toBeUndefined()
  })

  it('température liée (bindTo) hors zone → alerte hypothermie', () => {
    const derived = evaluate(polytraumaProtocol, caseWith({ 'prehosp.e.temperature': 34.5 }))
    expect(derived['prehosp.acsos']?.blink).toBe(true)
  })
})
