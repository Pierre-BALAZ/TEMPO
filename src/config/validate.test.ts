import { describe, expect, it } from 'vitest'
import type { Protocol } from '../types/model'
import { polytraumaProtocol } from './protocols/polytrauma'
import { validateProtocol } from './validate'

/** Protocole minimal valide, à casser au cas par cas. */
function minimalProtocol(): Protocol {
  return {
    id: 'p',
    label: 'Test',
    tracks: [
      {
        id: 'regul',
        label: 'Régul',
        color: 'sky',
        sections: [{ id: 's1', label: 'S1' }],
      },
    ] as Protocol['tracks'],
    actions: [
      {
        id: 'a.un',
        trackId: 'regul',
        sectionId: 's1',
        label: 'Un',
        type: 'checkbox',
        detail: {
          subFields: [
            { id: 'sub', label: 'Sub', type: 'number' },
            { id: 'lie', label: 'Lié', type: 'number', bindTo: 'a.deux' },
          ],
        },
      },
      { id: 'a.deux', trackId: 'regul', sectionId: 's1', label: 'Deux', type: 'number' },
    ] as Protocol['actions'],
    rules: [],
    milestones: [{ id: 'm1', atMin: 30, label: '30 min' }],
  }
}

describe('validateProtocol — cas cassants', () => {
  it('accepte le protocole minimal et le protocole réel', () => {
    expect(validateProtocol(minimalProtocol())).toEqual([])
    expect(validateProtocol(polytraumaProtocol)).toEqual([])
  })

  it('signale une condition sur une action inconnue', () => {
    const p = minimalProtocol()
    p.rules.push({
      id: 'r1',
      when: { kind: 'isChecked', actionId: 'a.fantome' },
      then: [{ kind: 'blink', targetId: 'a.un' }],
    })
    expect(validateProtocol(p).join()).toContain('a.fantome')
  })

  it('signale un sous-champ inconnu référencé en « parent::sub »', () => {
    const p = minimalProtocol()
    p.rules.push({
      id: 'r1',
      when: { kind: 'filled', actionId: 'a.un::inconnu' },
      then: [{ kind: 'blink', targetId: 'a.un' }],
    })
    expect(validateProtocol(p).join()).toContain('a.un::inconnu')
  })

  it('signale la référence à un sous-champ bindTo (valeur stockée ailleurs)', () => {
    const p = minimalProtocol()
    p.rules.push({
      id: 'r1',
      when: { kind: 'filled', actionId: 'a.un::lie' },
      then: [{ kind: 'blink', targetId: 'a.un' }],
    })
    expect(validateProtocol(p).join()).toContain('bindTo')
  })

  it('signale un bindTo vers une action inexistante', () => {
    const p = minimalProtocol()
    p.actions[0].detail!.subFields!.push({
      id: 'casse',
      label: 'Cassé',
      type: 'number',
      bindTo: 'a.nexiste-pas',
    })
    expect(validateProtocol(p).join()).toContain('a.nexiste-pas')
  })

  it('signale une cible d’effet inconnue (action et section)', () => {
    const p = minimalProtocol()
    p.rules.push({
      id: 'r1',
      when: { kind: 'isChecked', actionId: 'a.un' },
      then: [
        { kind: 'blink', targetId: 'a.fantome' },
        { kind: 'blink', targetId: 'section:s.fantome' },
      ],
    })
    expect(validateProtocol(p)).toHaveLength(2)
  })

  it('signale les ids d’action et de règle dupliqués', () => {
    const p = minimalProtocol()
    p.actions.push({ ...p.actions[1], label: 'Doublon' })
    p.rules.push(
      { id: 'r1', when: { kind: 'isChecked', actionId: 'a.un' }, then: [] },
      { id: 'r1', when: { kind: 'isChecked', actionId: 'a.un' }, then: [] },
    )
    const errors = validateProtocol(p).join()
    expect(errors).toContain('Action en double')
    expect(errors).toContain('Règle en double')
  })

  it('signale un input inconnu d’action calculée (y compris sous-champ)', () => {
    const p = minimalProtocol()
    p.actions.push({
      id: 'a.score',
      trackId: 'regul',
      sectionId: 's1',
      label: 'Score',
      type: 'computed',
      computed: { inputs: ['a.fantome', 'a.un::inconnu'], method: 'sum' },
    } as Protocol['actions'][number])
    expect(validateProtocol(p)).toHaveLength(2)
  })

  it('signale les jalons dupliqués ou à minute négative', () => {
    const p = minimalProtocol()
    p.milestones!.push({ id: 'm1', atMin: -5, label: 'Cassé' })
    const errors = validateProtocol(p).join()
    expect(errors).toContain('Jalon en double')
    expect(errors).toContain('minute négative')
  })
})
