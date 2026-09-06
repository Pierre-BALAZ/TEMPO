import { create } from 'zustand'
import { guidedSteps } from '../config/guidedScenario'
import { useCaseStore } from './caseStore'

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
      if (s.status === 'idle' || s.status === 'finished') {
        useCaseStore.getState().reset()
        return { status: 'playing', index: 0, activeActionId: null }
      }
      return { status: 'playing' } // reprise après pause
    }),

  pause: () => set({ status: 'paused' }),

  restart: () => {
    useCaseStore.getState().reset()
    set({ status: 'playing', index: 0, activeActionId: null })
  },

  exit: () => set({ status: 'idle', index: 0, activeActionId: null }),

  setSpeed: (speed) => set({ speed }),
  setIndex: (index) => set({ index }),
  finish: () => set({ status: 'finished', activeActionId: null }),
  setActive: (activeActionId) => set({ activeActionId }),
}))
