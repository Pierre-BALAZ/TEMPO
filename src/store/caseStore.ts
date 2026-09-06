import { create } from 'zustand'
import type { ActionValue, CaseHeader, CaseState } from '../types/model'
import { createEmptyCase, isFilledValue } from '../lib/case'
import { activeProtocol } from '../config'
import { readCaseFromHash } from '../share/urlState'
import { loadCase as loadSaved } from '../share/persistence'

/**
 * État initial résolu de façon synchrone (lien partagé > stockage local > cas vierge),
 * pour éviter toute course entre l'init et la persistance au montage.
 */
function initialCase(): CaseState {
  return readCaseFromHash() ?? loadSaved() ?? createEmptyCase(activeProtocol.id, Date.now())
}

interface CaseStore {
  caseState: CaseState
  /** Coche / remplit une action ; pose l'horodatage au premier remplissage. */
  setValue: (actionId: string, value: ActionValue) => void
  /** Idem mais avec un horodatage imposé (utilisé par la démo guidée / le rejeu). */
  setValueAt: (actionId: string, value: ActionValue, at: number) => void
  setHeader: (patch: Partial<CaseHeader>) => void
  loadCase: (caseState: CaseState) => void
  reset: () => void
}

export const useCaseStore = create<CaseStore>((set) => ({
  caseState: initialCase(),

  setValue: (actionId, value) =>
    set((state) => {
      const values = { ...state.caseState.values }
      if (isFilledValue(value)) {
        const existing = values[actionId]
        values[actionId] = { value, completedAt: existing?.completedAt ?? Date.now() }
      } else {
        delete values[actionId]
      }
      return { caseState: { ...state.caseState, values } }
    }),

  setValueAt: (actionId, value, at) =>
    set((state) => {
      const values = { ...state.caseState.values }
      if (isFilledValue(value)) values[actionId] = { value, completedAt: at }
      else delete values[actionId]
      return { caseState: { ...state.caseState, values } }
    }),

  setHeader: (patch) =>
    set((state) => ({
      caseState: { ...state.caseState, header: { ...state.caseState.header, ...patch } },
    })),

  loadCase: (caseState) => set({ caseState }),

  reset: () => set({ caseState: createEmptyCase(activeProtocol.id, Date.now()) }),
}))
