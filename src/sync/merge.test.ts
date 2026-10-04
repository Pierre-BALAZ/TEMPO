import { describe, expect, it } from 'vitest'
import type { CaseState } from '../types/model'
import { caseSignature, isCaseLike, mergeCases } from './merge'

function makeCase(partial?: Partial<CaseState>): CaseState {
  return {
    protocolId: 'polytrauma-v1',
    header: { caseStartedAt: 1000, patientCodename: 'Chopin', sessionId: 'abc123' },
    values: {},
    ...partial,
  }
}

describe('mergeCases', () => {
  it('conserve les saisies des deux côtés quand les champs sont disjoints', () => {
    const local = makeCase({ values: { 'a.un': { value: true, completedAt: 2000 } } })
    const remote = makeCase({ values: { 'b.deux': { value: 42, completedAt: 3000 } } })
    const merged = mergeCases(local, remote)
    expect(merged.values['a.un']).toEqual({ value: true, completedAt: 2000 })
    expect(merged.values['b.deux']).toEqual({ value: 42, completedAt: 3000 })
  })

  it('fait gagner la valeur la plus récente (completedAt) sur un même champ', () => {
    const local = makeCase({ values: { 'a.un': { value: 90, completedAt: 2000 } } })
    const remote = makeCase({ values: { 'a.un': { value: 85, completedAt: 5000 } } })
    expect(mergeCases(local, remote).values['a.un'].value).toBe(85)
    // Et symétriquement : le local plus récent n'est pas écrasé.
    const local2 = makeCase({ values: { 'a.un': { value: 90, completedAt: 9000 } } })
    expect(mergeCases(local2, remote).values['a.un'].value).toBe(90)
  })

  it('à ancienneté égale, garde la valeur locale', () => {
    const local = makeCase({ values: { 'a.un': { value: 'local', completedAt: 2000 } } })
    const remote = makeCase({ values: { 'a.un': { value: 'remote', completedAt: 2000 } } })
    expect(mergeCases(local, remote).values['a.un'].value).toBe('local')
  })

  it('complète les champs vides du header sans écraser les champs remplis', () => {
    const local = makeCase()
    local.header.patientCodename = ''
    const remote = makeCase()
    remote.header.patientCodename = 'Ravel'
    remote.header.sessionId = 'zzz999'
    const merged = mergeCases(local, remote)
    expect(merged.header.patientCodename).toBe('Ravel') // vide localement → complété
    expect(merged.header.sessionId).toBe('abc123') // rempli localement → conservé
  })

  it('updatedAt prime sur completedAt : une ré-édition se propage', () => {
    // Ré-édition locale : completedAt d'origine conservé, updatedAt rafraîchi —
    // sans updatedAt, les deux côtés seraient à égalité et divergeraient pour toujours.
    const local = makeCase({ values: { 'a.un': { value: 90, completedAt: 2000, updatedAt: 9000 } } })
    const remote = makeCase({ values: { 'a.un': { value: 110, completedAt: 2000, updatedAt: 2000 } } })
    expect(mergeCases(local, remote).values['a.un'].value).toBe(90)
    expect(mergeCases(remote, local).values['a.un'].value).toBe(90)
  })

  it('une décoche (tombstone value:null) se propage comme une écriture', () => {
    const local = makeCase({ values: { 'a.un': { value: true, completedAt: 2000, updatedAt: 2000 } } })
    const remote = makeCase({ values: { 'a.un': { value: null, updatedAt: 5000 } } })
    expect(mergeCases(local, remote).values['a.un'].value).toBeNull()
    expect(mergeCases(remote, local).values['a.un'].value).toBeNull()
  })

  it('garde le protocolId local', () => {
    const local = makeCase()
    const remote = makeCase({ protocolId: 'autre-protocole' })
    expect(mergeCases(local, remote).protocolId).toBe('polytrauma-v1')
  })
})

describe('caseSignature', () => {
  it('est indépendante de l’ordre des clés', () => {
    const a = makeCase({
      values: {
        'a.un': { value: 1, completedAt: 1 },
        'b.deux': { value: 2, completedAt: 2 },
      },
    })
    const b = makeCase({
      values: {
        'b.deux': { value: 2, completedAt: 2 },
        'a.un': { value: 1, completedAt: 1 },
      },
    })
    expect(caseSignature(a)).toBe(caseSignature(b))
  })

  it('change quand une valeur ou son horodatage change', () => {
    const a = makeCase({ values: { 'a.un': { value: 1, completedAt: 1 } } })
    const b = makeCase({ values: { 'a.un': { value: 1, completedAt: 9 } } })
    const c = makeCase({ values: { 'a.un': { value: 3, completedAt: 1 } } })
    expect(caseSignature(a)).not.toBe(caseSignature(b))
    expect(caseSignature(a)).not.toBe(caseSignature(c))
  })
})


describe('untrusted case entries', () => {
  it('rejects null/array entries, nonfinite values and timestamps but accepts legacy numbers and tombstones', () => {
    for (const entry of [null, [], { value: {} }, { value: NaN }, { value: true, updatedAt: 'bad' }]) {
      expect(isCaseLike(makeCase({ values: { 'prehosp.c.pas': entry as never } }))).toBe(false)
    }
    expect(isCaseLike(makeCase({ values: { 'prehosp.c.pas': { value: 86 }, 'a.deleted': { value: null, updatedAt: 12 } } }))).toBe(true)
  })
  it('prototype-bearing JSON cannot alter merged values or headers', () => {
    const local = makeCase()
    for (const section of ['values', 'header']) {
      const remote = JSON.parse(JSON.stringify(local).replace('"values":{}', section === 'values' ? '"values":{"__proto__":{"value":true,"updatedAt":9999}}' : '"values":{}').replace('"caseStartedAt":1000', section === 'header' ? '"caseStartedAt":1000,"__proto__":{"polluted":true}' : '"caseStartedAt":1000'))
      expect(isCaseLike(remote)).toBe(false)
      expect(mergeCases(local, remote)).toBe(local)
      expect(Object.getPrototypeOf(local.values)).toBe(Object.prototype)
    }
  })
})
