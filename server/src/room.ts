/**
 * Un salon = un Durable Object. Sémantique identique au plugin WordPress :
 * état { v, case, updated } avec v incrémenté à chaque POST, purge automatique
 * 12 h après la dernière écriture (alarme), payload plafonné à 300 Ko.
 */

const TTL_MS = 12 * 60 * 60 * 1000
const MAX_BODY_BYTES = 300_000

// Anti-abus proportionné à une démo : seau de jetons par salon (en mémoire,
// remis à neuf si l'objet hiberne — suffisant pour lisser un emballement).
// Un poste en édition active fait ~1,33 req/s (GET + POST par tick de 1,5 s) :
// dimensionné pour ~8 postes simultanés dans une même salle.
const BUCKET_CAPACITY = 30
const REFILL_PER_SECOND = 12

interface RoomData {
  v: number
  case: unknown
  updated: number
}

export class TempoRoom {
  private tokens = BUCKET_CAPACITY
  private lastRefill = Date.now()

  constructor(private state: DurableObjectState) {}

  private takeToken(): boolean {
    const now = Date.now()
    this.tokens = Math.min(
      BUCKET_CAPACITY,
      this.tokens + ((now - this.lastRefill) / 1000) * REFILL_PER_SECOND,
    )
    this.lastRefill = now
    if (this.tokens < 1) return false
    this.tokens -= 1
    return true
  }

  async fetch(request: Request): Promise<Response> {
    if (!this.takeToken()) {
      return Response.json({ error: 'trop de requêtes' }, { status: 429 })
    }

    if (request.method === 'GET') {
      const data = await this.state.storage.get<RoomData>('room')
      return Response.json(data ? { v: data.v, case: data.case } : { v: 0, case: null })
    }

    // POST
    // Bound retained bytes, then fully consume the request before responding.
    // workerd Durable Objects must not leave an unread/cancelling request stream
    // behind a response: that can invalidate the next request on the connection.
    const reader = request.body?.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    let oversized = false
    if (reader) {
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (oversized) continue // drain without retaining or decoding excess bytes
          if (value.byteLength > MAX_BODY_BYTES - total) {
            oversized = true
            chunks.length = 0
            continue
          }
          total += value.byteLength
          chunks.push(value)
        }
      } finally {
        reader.releaseLock()
      }
    }
    if (oversized) {
      return Response.json({ error: 'payload trop volumineux' }, { status: 413 })
    }
    const bytes = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const body = new TextDecoder().decode(bytes)
    let payload: unknown = null
    try {
      payload = JSON.parse(body)
    } catch {
      // JSON invalide → rejeté ci-dessous.
    }
    if (payload === null || typeof payload !== 'object' || !('case' in payload)) {
      return Response.json({ error: 'JSON invalide' }, { status: 400 })
    }
    // Garde structurelle : un `case` malformé stocké tel quel empoisonnerait la
    // salle (chaque client planterait sa fusion à tous les ticks pendant 12 h).
    const c = (payload as { case: unknown }).case
    if (
      c === null ||
      typeof c !== 'object' ||
      typeof (c as Record<string, unknown>).header !== 'object' ||
      (c as Record<string, unknown>).header === null ||
      typeof (c as Record<string, unknown>).values !== 'object' ||
      (c as Record<string, unknown>).values === null
    ) {
      return Response.json({ error: 'case malformé' }, { status: 400 })
    }

    const prev = await this.state.storage.get<RoomData>('room')
    const data: RoomData = {
      v: (prev?.v ?? 0) + 1,
      case: (payload as { case: unknown }).case,
      updated: Date.now(),
    }
    await this.state.storage.put('room', data)
    await this.state.storage.setAlarm(Date.now() + TTL_MS)
    return Response.json({ v: data.v, case: data.case })
  }

  async alarm(): Promise<void> {
    await this.state.storage.deleteAll()
  }
}
