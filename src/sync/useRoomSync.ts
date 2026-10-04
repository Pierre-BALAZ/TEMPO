import { useEffect, useRef, useState } from 'react'
import { canEditCase } from '../store/uiStore'
import { useCaseStore } from '../store/caseStore'
import { caseSignature, isCaseLike, mergeCases } from './merge'
import { fetchRoom, pushRoom } from './roomSync'

export type SyncStatus = 'off' | 'connecting' | 'live' | 'error'

const POLL_MS = 1500

export function useRoomSync(enabled: boolean, serverUrl: string, roomCode: string) {
  const [status, setStatus] = useState<SyncStatus>('off')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stopRef = useRef(false)

  useEffect(() => {
    if (!enabled || !serverUrl.trim() || !roomCode.trim()) {
      setStatus('off')
      return
    }
    stopRef.current = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const ac = new AbortController()

    const tick = async () => {
      try {
        const remote = await fetchRoom(serverUrl, roomCode, ac.signal)
        // L'état local est relu APRÈS l'await : les saisies faites pendant la
        // latence réseau ne sont jamais écrasées par un merge sur instantané périmé.
        const local = useCaseStore.getState().caseState
        let merged = local
        const remoteOk = isCaseLike(remote.case)
        if (remoteOk) {
          merged = canEditCase()
            ? mergeCases(local, remote.case as NonNullable<typeof remote.case>)
            : remote.case as NonNullable<typeof remote.case>
          if (caseSignature(merged) !== caseSignature(local)) {
            useCaseStore.getState().loadCase(merged)
          }
        }
        // Pousser si le serveur est vide, malformé, ou en retard sur nous.
        if (!ac.signal.aborted && canEditCase() && (!remoteOk || caseSignature(remote.case as NonNullable<typeof remote.case>) !== caseSignature(merged))) {
          await pushRoom(serverUrl, roomCode, merged, ac.signal)
        }
        if (!stopRef.current) {
          setStatus('live')
          setError(null)
          setLastSync(Date.now())
        }
      } catch (e) {
        if (!stopRef.current) {
          setStatus('error')
          setError(e instanceof Error ? e.message : 'échec réseau')
        }
      } finally {
        if (!stopRef.current) timer = setTimeout(tick, POLL_MS)
      }
    }

    setStatus('connecting')
    tick()

    return () => {
      stopRef.current = true
      if (timer) clearTimeout(timer)
      ac.abort()
    }
  }, [enabled, serverUrl, roomCode])

  return { status, lastSync, error }
}
