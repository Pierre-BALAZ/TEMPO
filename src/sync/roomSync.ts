import type { CaseState } from '../types/model'

/** Réponse du serveur pour une salle. */
export interface RoomState {
  v: number
  case: CaseState | null
}

function roomUrl(baseUrl: string, code: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  return `${base}/wp-json/tempo/v1/room/${encodeURIComponent(code)}`
}

export async function fetchRoom(baseUrl: string, code: string, signal?: AbortSignal): Promise<RoomState> {
  const res = await fetch(roomUrl(baseUrl, code), { method: 'GET', signal })
  if (!res.ok) throw new Error(`GET ${res.status}`)
  return (await res.json()) as RoomState
}

export async function pushRoom(
  baseUrl: string,
  code: string,
  caseState: CaseState,
  signal?: AbortSignal,
): Promise<RoomState> {
  const res = await fetch(roomUrl(baseUrl, code), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ case: caseState }),
    signal,
  })
  if (!res.ok) throw new Error(`POST ${res.status}`)
  return (await res.json()) as RoomState
}
