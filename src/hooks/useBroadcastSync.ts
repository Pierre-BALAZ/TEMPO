import { useEffect, useState } from 'react'
import { useCaseStore } from '../store/caseStore'
import { caseSignature, isCaseLike, mergeCases } from '../sync/merge'

const CHANNEL = 'balaz-sync-v1'

interface SyncMessage {
  from: string
  caseState: import('../types/model').CaseState
}

/**
 * Synchronisation TEMPS RÉEL entre fenêtres/onglets du MÊME navigateur (même machine),
 * via l'API BroadcastChannel — aucun serveur requis.
 *
 * Idéal pour une démo « côte à côte » : ouvrir deux fenêtres (ex. « SMUR » et « Régul »),
 * une action cochée dans l'une se propage instantanément à l'autre.
 *
 * ⚠️ Ne traverse PAS les machines / réseaux différents (limite de BroadcastChannel) :
 * pour cela il faudrait un service temps réel (backend).
 *
 * @returns true si la synchro est disponible dans ce navigateur.
 */
export function useBroadcastSync(): boolean {
  const [supported] = useState(() => typeof BroadcastChannel !== 'undefined')

  useEffect(() => {
    if (!supported) return
    const channel = new BroadcastChannel(CHANNEL)
    const sessionId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
    let applyingRemote = false

    // Diffuse les changements locaux vers les autres fenêtres.
    const unsubscribe = useCaseStore.subscribe((state, prev) => {
      if (applyingRemote || state.caseState === prev.caseState) return
      const msg: SyncMessage = { from: sessionId, caseState: state.caseState }
      channel.postMessage(msg)
    })

    // Applique les changements reçus des autres fenêtres (sans les re-diffuser).
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const msg = event.data
      if (!msg || msg.from === sessionId || !isCaseLike(msg.caseState)) return
      applyingRemote = true
      try {
        const local = useCaseStore.getState().caseState
        if (msg.caseState.header.caseStartedAt !== local.header.caseStartedAt) {
          // Autre cas (reset, démo, chargement) : remplacement intégral.
          useCaseStore.getState().loadCase(msg.caseState)
        } else {
          // Même cas : fusion champ par champ pour ne pas perdre les saisies
          // concurrentes de cette fenêtre (dernier-message-gagnant ≠ fusion).
          const merged = mergeCases(local, msg.caseState)
          if (caseSignature(merged) !== caseSignature(local)) {
            useCaseStore.getState().loadCase(merged)
          }
        }
      } finally { applyingRemote = false }
    }

    return () => {
      unsubscribe()
      channel.close()
    }
  }, [supported])

  return supported
}
