/**
 * Vocabulaire vocal — partie PRÉ-HOSPITALIÈRE (prototype).
 * Associe des tournures parlées (déjà « deburrées » : minuscules, sans accent)
 * aux actions de la ligne SMUR. Éditable par le médecin référent.
 *
 * NB : on évite les mots ambigus (« pas » pour PAS entre en conflit avec la
 * négation « pas de… ») ; on privilégie « tension » / « pression ».
 */

export interface VoiceNumeric {
  actionId: string
  label: string
  keywords: string[]
  min?: number
  max?: number
  unit?: string
  /** Si ce fragment suit le mot-clé, on ignore (ex. « frequence respiratoire » ≠ FC). */
  avoidAfter?: string
}

export interface VoiceToggle {
  actionId: string
  label: string
  keywords: string[]
}

export interface VoiceSelectOption {
  value: string
  label: string
  keywords: string[]
}
export interface VoiceSelect {
  actionId: string
  label: string
  options: VoiceSelectOption[]
}

export const VOICE_NUMERIC: VoiceNumeric[] = [
  { actionId: 'prehosp.c.pas', label: 'PAS', keywords: ['tension', 'pression arterielle', 'pression', 'systolique'], max: 300, unit: 'mmHg' },
  { actionId: 'prehosp.c.fc', label: 'Fréquence cardiaque', keywords: ['frequence cardiaque', 'frequence', 'pouls', 'coeur', 'fc'], max: 300, unit: '/min', avoidAfter: 'respir' },
  { actionId: 'prehosp.b.spo2', label: 'SpO₂', keywords: ['saturation', 'spo2', 'sp o2'], min: 0, max: 100, unit: '%' },
  { actionId: 'prehosp.d.gcs', label: 'Glasgow', keywords: ['glasgow', 'gcs'], min: 3, max: 15 },
  { actionId: 'prehosp.acsos::capnie', label: 'Capnie (EtCO₂)', keywords: ['capnie', 'capnimetrie', 'etco2', 'et co2', 'co2 expire'], min: 0, max: 100, unit: 'mmHg' },
  { actionId: 'prehosp.acsos::pam-hemo', label: 'PAM', keywords: ['pam', 'pression arterielle moyenne', 'pression moyenne'], max: 200, unit: 'mmHg' },
  { actionId: 'prehosp.e.temperature', label: 'Température', keywords: ['temperature'], min: 30, max: 45, unit: '°C' },
  { actionId: 'prehosp.d.glycemie', label: 'Glycémie (HGT)', keywords: ['glycemie', 'hgt', 'h g t', 'dextro'], min: 0, max: 40, unit: 'mmol/L' },
]

export const VOICE_TOGGLE: VoiceToggle[] = [
  { actionId: 'prehosp.a.lvas', label: 'LVAS / minerve', keywords: ['voies aeriennes', 'lvas', 'minerve', 'collier cervical', 'immobilisation cervicale'] },
  { actionId: 'prehosp.x.hemostase', label: 'Hémorragie exsanguinante', keywords: ['exsanguinante', 'hemostase', 'packing'] },
  { actionId: 'prehosp.g.garrot', label: 'Garrot', keywords: ['garrot'] },
  { actionId: 'prehosp.g.vvp', label: 'Voie veineuse', keywords: ['voie veineuse', 'voies veineuses', 'vvp', 'intra osseux', 'intraosseux', 'perfusion'] },
  { actionId: 'prehosp.g.isr', label: 'Intubation (ISR)', keywords: ['intubation', 'intuber', 'isr', 'sequence rapide'] },
  { actionId: 'prehosp.g.exsufflation', label: 'Exsufflation / drainage', keywords: ['exsufflation', 'drainage thoracique', 'drain thoracique'] },
  { actionId: 'prehosp.g.pelvien', label: 'Ceinture pelvienne', keywords: ['ceinture pelvienne', 'pelvienne', 'bassin'] },
  { actionId: 'prehosp.g.txa', label: 'Acide tranexamique', keywords: ['acide tranexamique', 'tranexamique', 'exacyl', 'txa'] },
  { actionId: 'prehosp.g.nad', label: 'Noradrénaline', keywords: ['noradrenaline', 'noradre', 'amine'] },
  { actionId: 'prehosp.e.hypothermie', label: 'Prévention hypothermie', keywords: ['hypothermie', 'rechauffement', 'couverture de survie'] },
  { actionId: 'prehosp.transmission.bilan', label: 'Bilan transmis', keywords: ['bilan transmis', 'bilan a la regulation', 'transmission du bilan'] },
  { actionId: 'prehosp.d.anisocorie', label: 'Anisocorie', keywords: ['anisocorie'] },
  { actionId: 'prehosp.acsos::hyponatremie', label: 'Hyponatrémie', keywords: ['hyponatremie'] },
]

export const VOICE_SELECT: VoiceSelect[] = [
  {
    actionId: 'prehosp.c.fast',
    label: 'FAST écho',
    options: [
      { value: 'positive', label: 'Positive', keywords: ['fast positif', 'fast positive', 'e fast positif', 'efast positif', 'echo positive'] },
      { value: 'negative', label: 'Négative', keywords: ['fast negatif', 'fast negative', 'e fast negatif', 'efast negatif', 'echo negative'] },
    ],
  },
  {
    actionId: 'prehosp.scores.hemodynamique',
    label: 'État hémodynamique',
    options: [
      { value: 'instable', label: 'Instable', keywords: ['instable'] },
      { value: 'stable', label: 'Stable', keywords: ['stable'] },
    ],
  },
  {
    actionId: 'prehosp.scores.grade',
    label: 'Grade',
    options: [
      { value: 'A', label: 'Grade A', keywords: ['grade a', 'grade alpha'] },
      { value: 'B', label: 'Grade B', keywords: ['grade b', 'grade bravo'] },
      { value: 'C', label: 'Grade C', keywords: ['grade c', 'grade charlie'] },
    ],
  },
]

/** Mots de négation (décochent un item) — « pas de garrot », « FAST négatif ». */
export const VOICE_NEGATIONS = ['negatif', 'negative', 'non', 'pas de', 'sans', 'annule', 'annuler', 'enleve', 'enlever', 'retire', 'retirer', 'supprime', 'faux', 'aucun', 'aucune']

/** Mots-clés de commande (automate d'états). */
export const VOICE_COMMANDS = {
  start: ['dictee', 'dicter', 'dictez'],
  stop: ['termine', 'terminer', 'termines', 'fin de dictee'],
  synth: ['synthese'],
  validate: ['valide', 'valider', 'validee', 'validez'],
  correct: ['correction', 'corriger', 'corrige', 'corrigez'],
  advice: ['conseil', 'conseils'],
}
