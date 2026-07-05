import type { ActionValue, CaseState } from '../types/model'
import { randomComposer, randomId } from './codename'

/** true si la valeur correspond à une action « faite / remplie ». */
export function isFilledValue(value: ActionValue): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'boolean') return value === true
  return true // number (y compris 0, considéré comme une saisie volontaire)
}

export function createEmptyCase(protocolId: string, now: number): CaseState {
  return {
    protocolId,
    header: { caseStartedAt: now, patientCodename: randomComposer(), sessionId: randomId() },
    values: {},
  }
}
