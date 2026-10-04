import { create } from 'zustand'
import type { CaseState } from '../types/model'
import { guidedSteps } from '../config/guidedScenario'
import { canEditCase } from './uiStore'
import { useCaseStore } from './caseStore'

/** Cas réel mis de côté pendant la démo guidée, restauré à la sortie
 *  (l'état Zustand est immuable : la référence capturée reste intacte). */
let savedBeforeDemo: CaseState | null = null

export type PlayerStatus = 'idle' | 'playing' | 'paused' | 'finished'

interface PlayerStore {
  status: PlayerStatus
  index: number
  speed: number
  /** Action en cours de « clic » (pour la mettre en évidence). */
  activeActionId: string | null
  stepCount: number
  /** Narration à voix haute activée. */
  voiceOn: boolean
  toggleVoice: () => void
  play: () => void
  pause: () => void
  restart: () => void
  exit: () => void
  setSpeed: (speed: number) => void
  setIndex: (index: number) => void
  finish: () => void
  setActive: (id: string | null) => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  status: 'idle',
  index: 0,
  speed: 1,
  activeActionId: null,
  stepCount: guidedSteps.length,
  voiceOn: true,
  toggleVoice: () => set((s) => ({ voiceOn: !s.voiceOn })),

  play: () =>
    set((s) => {
      if (!canEditCase()) return s
      if (s.status === 'idle' || s.status === 'finished') {
        // On met le cas réel de côté avant de le remplacer par le cas de démo.
        if (s.status === 'idle') savedBeforeDemo = useCaseStore.getState().caseState
        useCaseStore.getState().reset()
        return { status: 'playing', index: 0, activeActionId: null }
      }
      return { status: 'playing' } // reprise après pause
    }),

  pause: () => set({ status: 'paused' }),

  restart: () => {
    if (!canEditCase()) return
    useCaseStore.getState().reset()
    set({ status: 'playing', index: 0, activeActionId: null })
  },

  exit: () => {
    // Quitter la démo restaure le cas réel : les valeurs fictives injectées
    // par la démo ne doivent pas rester dans le cas (ni en persistance).
    if (savedBeforeDemo) {
      useCaseStore.getState().loadCase(savedBeforeDemo)
      savedBeforeDemo = null
    }
    set({ status: 'idle', index: 0, activeActionId: null })
  },

  setSpeed: (speed) => set({ speed }),
  setIndex: (index) => set({ index }),
  finish: () => set({ status: 'finished', activeActionId: null }),
  setActive: (activeActionId) => set({ activeActionId }),
}))
