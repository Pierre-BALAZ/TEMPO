import { create } from 'zustand'
import type { ActionValue, CaseHeader, CaseState, TrackId } from '../types/model'
import { createEmptyCase, isFilledValue } from '../lib/case'
import { canEditCase, canEditHeader, canEditTrack, useUiStore } from './uiStore'
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
      const ui = useUiStore.getState()
      if (!canEditTrack(ui.activeRole, ui.roleChosen, actionId.split('.')[0] as TrackId)) return state
      const values = { ...state.caseState.values }
      const now = Date.now()
      if (isFilledValue(value)) {
        const existing = values[actionId]
        // completedAt = premier remplissage (position timeline) ; updatedAt = LWW synchro.
        values[actionId] = { value, completedAt: existing?.completedAt ?? now, updatedAt: now }
      } else {
        // Tombstone : la suppression doit gagner le LWW pour se propager en synchro.
        values[actionId] = { value: null, updatedAt: now }
      }
      return { caseState: { ...state.caseState, values } }
    }),

  setValueAt: (actionId, value, at) =>
    set((state) => {
      if (!canEditCase()) return state
      const values = { ...state.caseState.values }
      if (isFilledValue(value)) values[actionId] = { value, completedAt: at, updatedAt: at }
      else values[actionId] = { value: null, updatedAt: at }
      return { caseState: { ...state.caseState, values } }
    }),

  setHeader: (patch) =>
    set((state) => {
      const permitted = Object.fromEntries(Object.entries(patch).filter(([key]) => canEditHeader(key)))
      if (!Object.keys(permitted).length) return state
      return { caseState: { ...state.caseState, header: { ...state.caseState.header, ...permitted } } }
    }),

  loadCase: (caseState) => set({ caseState }),

  reset: () => { if (canEditCase()) set({ caseState: createEmptyCase(activeProtocol.id, Date.now()) }) },
}))
