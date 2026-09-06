import type { CaseState } from '../types/model'

const STORAGE_KEY = 'balaz.case.v1'

export function saveCase(caseState: CaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(caseState))
  } catch {
    /* quota / mode privé : on ignore silencieusement (prototype) */
  }
}

export function loadCase(): CaseState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CaseState
    return parsed?.values && parsed?.header ? parsed : null
  } catch {
    return null
  }
}

export function clearCase(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
