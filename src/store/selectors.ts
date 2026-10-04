import { useMemo } from 'react'
import type { ActionValue, DerivedUiState } from '../types/model'
import { evaluate, resolveValue } from '../engine/evaluate'
import { actionIndex, activeProtocol } from '../config'
import { useCaseStore } from './caseStore'

/** État visuel dérivé (clignotement / déblocage / highlight) recalculé à chaque saisie. */
export function useDerivedUiState(): DerivedUiState {
  const caseState = useCaseStore((s) => s.caseState)
  return useMemo(() => evaluate(activeProtocol, caseState, actionIndex), [caseState])
}

/** Valeur résolue d'une action (calcule les `computed`). */
export function useResolvedValue(actionId: string): ActionValue {
  const caseState = useCaseStore((s) => s.caseState)
  return useMemo(() => resolveValue(actionId, caseState, actionIndex), [caseState, actionId])
}
