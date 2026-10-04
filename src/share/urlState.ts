import LZString from 'lz-string'
import { isCaseLike } from '../sync/merge'
import type { CaseState } from '../types/model'

const HASH_KEY = 's'
const FAILED_HASH_KEY = 'balaz.failed-hash.v1'

/** Sérialise l'état du cas (compressé) dans un fragment d'URL — aucun backend requis. */
export function encodeCase(caseState: CaseState): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(caseState))
}

export function decodeCase(encoded: string): CaseState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const parsed = JSON.parse(json) as CaseState
    if (!isCaseLike(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

/** Construit le lien de partage complet (consultable par toute personne ayant le lien). */
export function buildShareUrl(caseState: CaseState): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${HASH_KEY}=${encodeCase(caseState)}`
}

/** Lit l'état éventuellement encodé dans l'URL au chargement. */
export function readCaseFromHash(): CaseState | null {
  // A refused History update leaves an old snapshot in the address bar.
  // Prefer the already persisted fresh case on this tab's immediate reload.
  try { if (sessionStorage.getItem(FAILED_HASH_KEY) === window.location.hash) return null } catch { /* unavailable */ }
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const params = new URLSearchParams(hash)
  const encoded = params.get(HASH_KEY)
  return encoded ? decodeCase(encoded) : null
}

/** Met à jour l'URL sans recharger (pour garder le lien synchronisé). */
export function writeCaseToHash(caseState: CaseState): void {
  const encoded = encodeCase(caseState)
  try {
    history.replaceState(null, '', `#${HASH_KEY}=${encoded}`)
    try { sessionStorage.removeItem(FAILED_HASH_KEY) } catch { /* unavailable */ }
  } catch {
    try { sessionStorage.setItem(FAILED_HASH_KEY, window.location.hash) } catch { /* unavailable */ }
  }
}
