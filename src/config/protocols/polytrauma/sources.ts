/** Références bibliographiques du protocole (portées depuis la refonte du Dr Amiot). */
export interface SourceRef {
  label: string
  note: string
}

export const SOURCES: SourceRef[] = [
  { label: 'Critères de Vittel', note: 'Riou et al., 2002 — triage du traumatisé sévère.' },
  { label: 'Grades A / B / C', note: 'Fiche RESUVAL 2019 / réseau RENAU.' },
  { label: 'Score ABC', note: 'Nunez et al., 2009 — seuil ≥ 2 pour la transfusion massive.' },
  { label: 'Score BATT', note: 'Ageron et al., 2021 — seuil ≥ 2 pour la TXA préhospitalière.' },
  { label: 'Acide tranexamique (TXA)', note: 'CRASH-2 (Lancet 2010) ; BATT pour l’indication préhospitalière.' },
  {
    label: 'Surface brûlée — règle de Wallace',
    note: 'Règle des 9 (adulte) ; orientation CTB selon surface, profondeur, localisation, inhalation.',
  },
]
