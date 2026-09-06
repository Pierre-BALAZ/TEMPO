import { describe, expect, it } from 'vitest'
import type { ActionValue, CaseState } from '../types/model'
import { polytraumaProtocol } from '../config/protocols/polytrauma'
import { buildDemoCase } from '../config/demoScenario'
import { validateProtocol } from '../config/validate'
import { buildActionIndex, evaluate, resolveValue } from './evaluate'

const index = buildActionIndex(polytraumaProtocol.actions)

function caseWith(values: Record<string, ActionValue>): CaseState {
  const v: CaseState['values'] = {}
  for (const [k, value] of Object.entries(values)) v[k] = { value }
  return { protocolId: 'polytrauma', header: { caseStartedAt: 0 }, values: v }
}

describe('config', () => {
  it('ne contient pas de cible de règle orpheline', () => {
    expect(validateProtocol(polytraumaProtocol)).toEqual([])
  })
})

describe('moteur — déclencheurs inter-pistes', () => {
  it('(1) FAST+ ET instable → BLOC clignote sur régul et intra-hosp', () => {
    const derived = evaluate(
      polytraumaProtocol,
      caseWith({ 'prehosp.c.fast': 'positive', 'prehosp.scores.hemodynamique': 'instable' }),
      index,
    )
    expect(derived['section:regul.bloc']?.blink).toBe(true)
    expect(derived['section:intra.bloc']?.blink).toBe(true)
    expect(derived['intra.bloc.damagecontrol']?.highlighted).toBe(true)
  })

  it('ne déclenche pas le BLOC si FAST+ mais stable', () => {
    const derived = evaluate(
      polytraumaProtocol,
      caseWith({ 'prehosp.c.fast': 'positive', 'prehosp.scores.hemodynamique': 'stable' }),
      index,
    )
    expect(derived['section:regul.bloc']?.blink).toBeUndefined()
  })

  it('(2) score ABC ≥ 2 → transfusion massive clignote', () => {
    const derived = evaluate(
      polytraumaProtocol,
      caseWith({ 'prehosp.scores.abc::penetrant': true, 'prehosp.c.fast': 'positive' }),
      index,
    )
    expect(resolveValue('prehosp.scores.abc', caseWith({ 'prehosp.scores.abc::penetrant': true, 'prehosp.c.fast': 'positive' }), index)).toBe(2)
    expect(derived['section:intra.transfusion']?.blink).toBe(true)
    expect(derived['intra.transfusion.ptm']?.highlighted).toBe(true)
  })

  it('ABC = 1 ne déclenche pas la transfusion massive', () => {
    const derived = evaluate(polytraumaProtocol, caseWith({ 'prehosp.c.fast': 'positive' }), index)
    expect(derived['section:intra.transfusion']?.blink).toBeUndefined()
  })

  it('(3) grade A → Niveau I mis en avant sur la régul', () => {
    const derived = evaluate(polytraumaProtocol, caseWith({ 'prehosp.scores.grade': 'A' }), index)
    expect(derived['regul.tc.niveau1']?.highlighted).toBe(true)
    expect(derived['regul.tc.niveau1']?.level).toBe('critical')
    expect(derived['regul.tc.niveau2']?.highlighted).toBeUndefined()
  })

  it('(6) Vittel : ≥ 1 critère (cinétique) → grade mis en avant', () => {
    const c = caseWith({ 'regul.appel.vittel::cin-ejection': true })
    expect(resolveValue('regul.appel.vittel', c, index)).toBe(1)
    const derived = evaluate(polytraumaProtocol, c, index)
    expect(derived['prehosp.scores.grade']?.highlighted).toBe(true)
  })

  it('Vittel : aucun critère → grade non mis en avant', () => {
    const derived = evaluate(polytraumaProtocol, caseWith({}), index)
    expect(derived['prehosp.scores.grade']?.highlighted).toBeUndefined()
  })

  it('(4)+(5) chaîne de déblocage : grade → pré-alerte → activation équipe', () => {
    const grade = evaluate(polytraumaProtocol, caseWith({ 'prehosp.scores.grade': 'B' }), index)
    expect(grade['regul.prealerte.centre']?.unlocked).toBe(true)

    const prealerte = evaluate(
      polytraumaProtocol,
      caseWith({ 'prehosp.scores.grade': 'B', 'regul.prealerte.centre': true }),
      index,
    )
    expect(prealerte['intra.activation.equipe']?.unlocked).toBe(true)
  })
})

describe('scénario de démonstration', () => {
  it('active les principaux déclencheurs', () => {
    const derived = evaluate(polytraumaProtocol, buildDemoCase(0), index)
    expect(derived['section:regul.bloc']?.blink).toBe(true)
    expect(derived['section:intra.transfusion']?.blink).toBe(true)
    expect(derived['regul.tc.niveau1']?.highlighted).toBe(true)
    expect(derived['intra.activation.equipe']?.unlocked).toBe(true)
  })
})
