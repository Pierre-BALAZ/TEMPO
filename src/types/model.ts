/**
 * Modèle de données du prototype « partition d'urgence ».
 *
 * Principe directeur : la matière clinique (pistes, actions, règles) est PUREMENT
 * DÉCLARATIVE et vit dans src/config/. Le moteur (src/engine) et l'UI (src/components)
 * n'ont aucune connaissance « en dur » du contenu : on peut faire évoluer le protocole
 * (ou en ajouter d'autres filières) sans toucher au code.
 */

import type { ActionCategory } from '../lib/icons'

export type { ActionCategory }

export type TrackId = 'regul' | 'prehosp' | 'intra'

export type ActionType = 'checkbox' | 'text' | 'number' | 'select' | 'computed'

export interface SelectOption {
  value: string
  label: string
}

/** Sous-champ affiché dans le panneau de détail d'une action (pas une action à part entière). */
export interface SubField {
  id: string
  label: string
  type: 'text' | 'number' | 'select' | 'checkbox' | 'timestamp'
  options?: SelectOption[]
  unit?: string
  placeholder?: string
  /** Titre de regroupement (ex. catégorie Vittel) affiché au-dessus du sous-champ. */
  group?: string
  /** Jauge colorée (pour un sous-champ numérique) : vert = normal, rouge = extrêmes. */
  gauge?: GaugeSpec
  /**
   * Lie ce sous-champ à une action existante (partage de valeur) plutôt qu'à la clé
   * `parent::id`. Ex. la SpO₂ ou la température des ACSOS = celles du bilan XABCDE.
   */
  bindTo?: string
}

export interface GaugeSpec {
  min: number
  max: number
  /** Pas du curseur (défaut 1 ; ex. 0,1 pour la température). */
  step?: number
  /** Rouge en dessous de ce seuil (borne inférieure de normalité). */
  redBelow?: number
  /** Rouge au-dessus de ce seuil (borne supérieure de normalité). */
  redAbove?: number
  /** Zone verte [normalMin, normalMax] ; rouge de part et d'autre. */
  normalMin?: number
  normalMax?: number
}

export interface ClinicalReference {
  label: string
  note: string
}

export interface ActionDetail {
  /** Rappel clinique principal affiché en haut du panneau de détail. */
  reminder?: string
  references?: ClinicalReference[]
  subFields?: SubField[]
  /** Inclure les sous-champs renseignés dans la synthèse chronologique. */
  recapSubFields?: boolean
  /** Widget interactif spécifique rendu dans le panneau de détail (ex. schéma corporel Wallace). */
  widget?: 'burnBodyMap' | 'evolutionLog'
}

/** Score calculé à partir d'autres actions (ex. score ABC = somme de 4 items). */
export interface ComputedSpec {
  inputs: string[] // ids d'actions checkbox/number
  method: 'sum' | 'count' | 'ratio'
  /**
   * Poids par input (méthode 'sum' uniquement) : la contribution d'un input vaut
   * `valeur × poids`. Absent ⇒ poids 1 (comportement historique, ex. score ABC).
   * Sert aux scores pondérés comme le BATT (paliers à +1/+2/+5/+14…).
   */
  weights?: Record<string, number>
}

export interface ActionDef {
  id: string
  trackId: TrackId
  sectionId: string
  label: string
  type: ActionType
  /** Pour les select. */
  options?: SelectOption[]
  /** Pour les number. */
  unit?: string
  placeholder?: string
  /** Position indicative sur la timeline tant que l'action n'est pas réalisée (en minutes depuis t0). */
  defaultTimeOffsetMin?: number
  detail?: ActionDetail
  /** Pour les computed. */
  computed?: ComputedSpec
  /** Verrouillée (grisée, non éditable) tant qu'une règle ne l'a pas `unlock`. */
  lockedByDefault?: boolean
  /** Catégorie (icône de la timeline réduite + glyphe de la pastille). */
  category?: ActionCategory
}

/** Un « onglet » / section d'une piste (ex. BLOC, Transfusion massive) — peut clignoter. */
export interface SectionDef {
  id: string
  trackId: TrackId
  label: string
  /** true = section emblématique mise en avant comme onglet d'alerte. */
  alert?: boolean
}

export interface TrackDef {
  id: TrackId
  label: string
  shortLabel: string
  /** Clé de couleur (voir src/lib/theme.ts) : 'sky' | 'amber' | 'rose'. */
  color: 'sky' | 'amber' | 'rose'
  sections: SectionDef[]
}

/* ------------------------------------------------------------------ */
/* Moteur de règles déclaratif                                         */
/* ------------------------------------------------------------------ */

export type Condition =
  | { kind: 'isChecked'; actionId: string }
  | { kind: 'filled'; actionId: string }
  | { kind: 'equals'; actionId: string; value: string | number | boolean }
  | { kind: 'gt'; actionId: string; value: number }
  | { kind: 'gte'; actionId: string; value: number }
  | { kind: 'lt'; actionId: string; value: number }
  | { kind: 'lte'; actionId: string; value: number }
  | { kind: 'and'; conditions: Condition[] }
  | { kind: 'or'; conditions: Condition[] }

export type EffectKind = 'unlock' | 'blink' | 'highlight' | 'showSection' | 'setStatus'

export type EffectLevel = 'info' | 'recommended' | 'warn' | 'critical'

export interface Effect {
  kind: EffectKind
  /**
   * Cible : un id d'action, OU une section sous la forme `section:<sectionId>`.
   * Une règle peut viser n'importe quelle piste — c'est tout l'intérêt.
   */
  targetId: string
  level?: EffectLevel
  note?: string
}

export interface RuleDef {
  id: string
  description?: string
  when: Condition
  then: Effect[]
}

export interface Protocol {
  id: string
  label: string
  tracks: TrackDef[]
  actions: ActionDef[]
  rules: RuleDef[]
}

/* ------------------------------------------------------------------ */
/* État runtime (seul objet sérialisé dans l'URL / localStorage)       */
/* ------------------------------------------------------------------ */

export type ActionValue = boolean | string | number | null

export interface ValueEntry {
  value: ActionValue
  /** Horodatage du passage à « fait / rempli » (epoch ms). */
  completedAt?: number
}

export interface CaseHeader {
  /** Identité patient ANONYME (compositeur / numéro / pseudo) — jamais de vraie identité. */
  patientCodename?: string
  /** Identifiant technique de session (unicité de la « salle » de synchro). */
  sessionId?: string
  smurName?: string
  regulateurName?: string
  serviceReceveur?: string
  /** Délai estimé d'acheminement (min) — allonge visuellement la timeline. */
  delaiEstimeMin?: number
  /** t0 du cas (epoch ms) : origine de la timeline et du chrono. */
  caseStartedAt: number
  /** Horodatage d'arrêt du chrono (epoch ms) — posé par l'équipe intra-hosp. */
  chronoStoppedAt?: number
}

export interface CaseState {
  protocolId: string
  header: CaseHeader
  values: Record<string, ValueEntry>
  // Anonyme par construction : aucun champ identifiant patient.
}

/* ------------------------------------------------------------------ */
/* État visuel dérivé (calculé, jamais stocké)                         */
/* ------------------------------------------------------------------ */

export interface VisualEffect {
  blink?: boolean
  unlocked?: boolean
  highlighted?: boolean
  level?: EffectLevel
  note?: string
}

/** Map targetId -> effet visuel agrégé. Clés : id d'action ou `section:<id>`. */
export type DerivedUiState = Record<string, VisualEffect>
