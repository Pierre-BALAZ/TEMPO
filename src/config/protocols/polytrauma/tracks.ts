import type { TrackDef } from '../../../types/model'

/**
 * Les 3 « partitions » et leurs sections / onglets.
 * Les sections marquées `alert: true` sont les onglets emblématiques qui clignotent
 * (BLOC, Transfusion massive, Orientation centre).
 */
export const tracks: TrackDef[] = [
  {
    id: 'regul',
    label: 'Régulation — SAMU / Centre 15',
    shortLabel: 'Régul',
    color: 'sky',
    sections: [
      { id: 'regul.appel', trackId: 'regul', label: 'Prise d’appel' },
      { id: 'regul.moyens', trackId: 'regul', label: 'Moyens engagés' },
      { id: 'regul.orientation', trackId: 'regul', label: 'Orientation / Trauma center', alert: true },
      { id: 'regul.bloc', trackId: 'regul', label: 'BLOC', alert: true },
      { id: 'regul.prealerte', trackId: 'regul', label: 'Pré-alerte' },
    ],
  },
  {
    id: 'prehosp',
    label: 'Pré-hospitalier — SMUR / VSAV',
    shortLabel: 'Pré-hosp',
    color: 'amber',
    sections: [
      { id: 'prehosp.abcde', trackId: 'prehosp', label: 'Bilan XABCDE' },
      { id: 'prehosp.gestes', trackId: 'prehosp', label: 'Gestes' },
      { id: 'prehosp.brulures', trackId: 'prehosp', label: 'Brûlures (Wallace)' },
      { id: 'prehosp.scores', trackId: 'prehosp', label: 'Scores & gravité' },
      { id: 'prehosp.transmission', trackId: 'prehosp', label: 'Transmission' },
      { id: 'prehosp.transport', trackId: 'prehosp', label: 'Transport' },
    ],
  },
  {
    id: 'intra',
    label: 'Intra-hospitalier — SAUV / déchocage',
    shortLabel: 'Intra-hosp',
    color: 'rose',
    sections: [
      { id: 'intra.activation', trackId: 'intra', label: 'Activation équipe' },
      { id: 'intra.imagerie', trackId: 'intra', label: 'Imagerie / Bilan' },
      { id: 'intra.bloc', trackId: 'intra', label: 'BLOC / Damage control', alert: true },
      { id: 'intra.transfusion', trackId: 'intra', label: 'Transfusion massive', alert: true },
      { id: 'intra.ctb', trackId: 'intra', label: 'CTB — centre des brûlés', alert: true },
    ],
  },
]
