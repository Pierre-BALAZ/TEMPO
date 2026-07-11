import type { ActionValue } from '../types/model'

/** Une note du journal d'évolution (horodatée). */
export interface LogEntry {
  at: number
  text: string
}

/** Lit le journal depuis la valeur (JSON) de l'action ; tolère les valeurs invalides. */
export function parseLog(value: ActionValue): LogEntry[] {
  if (typeof value !== 'string' || value.trim() === '') return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((e) => e && typeof e.text === 'string' && typeof e.at === 'number')
      .map((e) => ({ at: e.at, text: e.text }))
  } catch {
    return []
  }
}

/** Sérialise le journal ; renvoie null si vide (pour retirer la valeur). */
export function serializeLog(entries: LogEntry[]): string | null {
  if (entries.length === 0) return null
  return JSON.stringify(entries)
}
