import { create } from 'zustand'
import type { TrackId } from '../types/model'

/** Point de vue / rôle actif. 'observer' = tout en lecture seule. */
export type Role = 'observer' | TrackId

const ALL_TRACKS: TrackId[] = ['regul', 'prehosp', 'intra']

interface UiStore {
  /** Rôle actif (détermine la piste éditable). */
  activeRole: Role
  /** false tant que l'utilisateur n'a pas choisi de rôle (affiche le RoleGate). */
  roleChosen: boolean
  /** Choix initial via le gate. */
  chooseRole: (role: Role) => void
  /** Changement de rôle ultérieur (switcher). */
  setActiveRole: (role: Role) => void

  /** Action ouverte dans le panneau de détail (null = fermé). */
  openActionId: string | null
  openAction: (id: string) => void
  closeAction: () => void

  /** Pistes affichées en mode « réduit » (mini-icônes). */
  collapsedTracks: TrackId[]
  toggleTrackCollapsed: (id: TrackId) => void
  setAllCollapsed: (collapsed: boolean) => void

  /** Colonne latérale gauche réduite à un rail d'icônes (gain de place, surtout mobile). */
  compactRail: boolean
  toggleCompactRail: () => void

  /** Disposition du plateau : 'portee' (frise horizontale) ou 'pupitre' (colonnes de cartes). */
  layout: 'portee' | 'pupitre'
  setLayout: (l: 'portee' | 'pupitre') => void
}

/** Défaut intelligent : Pupitre (vertical) sur petit écran, Portée (frise) sinon. */
function defaultLayout(): 'portee' | 'pupitre' {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 'pupitre'
  return 'portee'
}

export const useUiStore = create<UiStore>((set) => ({
  activeRole: 'observer',
  roleChosen: false,
  chooseRole: (role) => set({ activeRole: role, roleChosen: true }),
  setActiveRole: (role) => set({ activeRole: role, roleChosen: true }),

  openActionId: null,
  openAction: (openActionId) => set({ openActionId }),
  closeAction: () => set({ openActionId: null }),

  collapsedTracks: [],
  toggleTrackCollapsed: (id) =>
    set((s) => ({
      collapsedTracks: s.collapsedTracks.includes(id)
        ? s.collapsedTracks.filter((t) => t !== id)
        : [...s.collapsedTracks, id],
    })),
  setAllCollapsed: (collapsed) => set({ collapsedTracks: collapsed ? [...ALL_TRACKS] : [] }),

  compactRail: false,
  toggleCompactRail: () => set((s) => ({ compactRail: !s.compactRail })),

  layout: defaultLayout(),
  setLayout: (layout) => set({ layout }),
}))

/** L'utilisateur peut-il éditer la piste donnée ? (rôle choisi ET piste = rôle actif). */
export function canEditTrack(role: Role, roleChosen: boolean, trackId: TrackId): boolean {
  return roleChosen && role === trackId
}
