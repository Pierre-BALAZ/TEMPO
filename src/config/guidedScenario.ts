import type { ActionValue } from '../types/model'

/**
 * Scénario GUIDÉ (pas à pas), rejoué automatiquement et COMMENTÉ À VOIX HAUTE.
 *
 * Deux types d'étapes :
 *  - étapes « action » : cochent une action (`actionId` + `value`) à `offsetMin`
 *    sur la timeline, la mettent en évidence, et déclenchent la cascade d'effets ;
 *  - étapes « chapitre » : sans action, purement explicatives (principe, salles
 *    anonymisées, coordination/temps, interfaces, synthèse). Elles peuvent aussi
 *    piloter l'affichage (`layout`, `recap`).
 *
 * `narration` = texte affiché à l'écran ; `say` = texte réellement lu (fr-FR),
 * rédigé pour l'oreille (abréviations développées). À défaut de `say`, on lit une
 * version nettoyée de `narration`.
 */
export interface GuidedStep {
  narration: string
  say?: string
  actionId?: string
  value?: ActionValue
  offsetMin?: number
  /** Bascule d'interface au passage de l'étape. */
  layout?: 'portee' | 'pupitre'
  /** Ouvre (true) / ferme (false) la synthèse imprimable au passage de l'étape. */
  recap?: boolean
  /** Ouvre (true) / ferme (false) le panneau de dictée vocale au passage de l'étape. */
  voicePanel?: boolean
  /** Durée minimale d'affichage (ms) quand la narration vocale est coupée. */
  holdMs?: number
}

/** Durée d'une étape « action » à vitesse 1× quand la voix est coupée (ms). */
export const GUIDED_BASE_MS = 1700

/** Débit de lecture selon la vitesse choisie. */
export function speechRate(speed: number): number {
  return Math.min(1 + (speed - 1) * 0.25, 1.35)
}

/** Texte réellement lu à voix haute pour une étape. */
export function spokenText(step: GuidedStep): string {
  if (step.say) return step.say
  return step.narration
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u2192]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const guidedSteps: GuidedStep[] = [
  // ─── Chapitres d'introduction ───────────────────────────────────────────
  {
    narration:
      'Le principe de TEMPO : représenter la prise en charge du traumatisé sévère comme une partition musicale, sur trois pistes qui partagent une même ligne de temps.',
    say: "Bienvenue dans TEMPO. Le principe est simple : représenter la prise en charge d'un traumatisé sévère comme une partition musicale. Trois pistes — la régulation au SAMU Centre 15, le pré-hospitalier avec le Smur, et l'intra-hospitalier au déchocage — se déroulent sur une même ligne de temps partagée. Chaque geste coché sur une piste peut éclairer, ou débloquer, une action sur les autres.",
    holdMs: 8000,
  },
  {
    narration:
      'Chaque cas ouvre une salle de connexion partagée, identifiée par un nom de code de compositeur (Mozart, Debussy…) : le patient reste anonyme, et deux dossiers ne peuvent pas être confondus.',
    say: "Chaque prise en charge ouvre une salle de connexion partagée entre les intervenants. Pour préserver l'anonymat du patient, cette salle n'utilise jamais son identité : elle est désignée par un nom de code de compositeur, par exemple Mozart, ou Debussy. Ainsi, tous les acteurs travaillent sur le même dossier, en temps réel, sans jamais exposer de donnée nominative, et sans risquer de confondre deux patients.",
    holdMs: 8000,
  },
  {
    narration:
      "L'objectif : une meilleure coordination entre tous les acteurs, et une prise en compte du temps réellement écoulé depuis le début de la prise en charge.",
    say: "L'enjeu de TEMPO est double. D'abord, améliorer la coordination entre tous les acteurs de la prise en charge du traumatisé sévère : le régulateur, l'équipe Smur et l'équipe hospitalière voient la même partition, et savent à chaque instant ce que font les autres. Ensuite, mieux prendre en compte le temps réellement écoulé : chaque action est horodatée sur la ligne de temps, ce qui rend les délais visibles et aide à respecter les fenêtres critiques, comme celle de l'acide tranexamique.",
    holdMs: 9000,
  },

  // ─── Déroulé clinique ───────────────────────────────────────────────────
  {
    actionId: 'regul.appel.vittel::cin-ejection',
    value: true,
    offsetMin: 0,
    narration:
      'Régulation — critère de Vittel (cinétique : éjection du véhicule) : traumatisé sévère suspecté.',
    say: "La régulation reçoit l'appel. Un critère de Vittel est présent : éjection du véhicule. On suspecte d'emblée un traumatisé sévère.",
  },
  {
    actionId: 'regul.appel.vittel::cin-projete',
    value: true,
    offsetMin: 1,
    narration: 'Régulation — autre critère de cinétique coché (victime projetée/écrasée).',
    say: 'Un second critère cinétique est coché : victime projetée ou écrasée. La suspicion se confirme.',
  },
  {
    actionId: 'regul.moyens.vsav',
    value: true,
    offsetMin: 2,
    narration: 'Régulation — engagement du VSAV (sapeurs-pompiers).',
    say: "La régulation engage le véhicule de secours et d'assistance aux victimes, des sapeurs-pompiers.",
  },
  {
    actionId: 'regul.moyens.smur',
    value: true,
    offsetMin: 3,
    narration: 'Régulation — engagement du SMUR (équipe médicalisée).',
    say: "Elle engage également le Smur, l'équipe médicalisée.",
  },
  {
    actionId: 'prehosp.a.lvas',
    value: true,
    offsetMin: 5,
    narration: 'SMUR sur les lieux — A : libération des voies aériennes + immobilisation cervicale.',
    say: "Le Smur est sur les lieux. Étape A : libération des voies aériennes, et immobilisation du rachis cervical.",
  },
  {
    actionId: 'prehosp.c.pas',
    value: 82,
    offsetMin: 6,
    narration: 'SMUR — C : pression artérielle basse (PAS 82 mmHg).',
    say: "Étape C, la circulation : la pression artérielle systolique est basse, à 82 millimètres de mercure.",
  },
  {
    actionId: 'prehosp.c.fc',
    value: 128,
    offsetMin: 6,
    narration: 'SMUR — C : tachycardie (FC 128/min).',
    say: 'Toujours en C : le patient est tachycarde, avec une fréquence cardiaque à 128 par minute.',
  },
  {
    actionId: 'prehosp.g.garrot',
    value: true,
    offsetMin: 7,
    narration: 'SMUR — contrôle d’une hémorragie externe (garrot).',
    say: "Le Smur contrôle une hémorragie externe par la pose d'un garrot.",
  },
  {
    actionId: 'prehosp.c.fast',
    value: 'positive',
    offsetMin: 8,
    narration: 'SMUR — e-FAST POSITIVE (bilan C)…',
    say: "L'échographie e-FAST est positive.",
  },
  {
    actionId: 'prehosp.scores.hemodynamique',
    value: 'instable',
    offsetMin: 9,
    narration:
      '…et patient INSTABLE → 💥 l’onglet BLOC se met à clignoter sur la régulation ET l’intra-hospitalier.',
    say: "Et le patient est hémodynamiquement instable. Résultat immédiat : l'onglet Bloc se met à clignoter, à la fois sur la régulation et sur l'intra-hospitalier. La partition prévient les autres acteurs qu'un damage control se prépare.",
  },
  {
    actionId: 'prehosp.scores.abc::penetrant',
    value: true,
    offsetMin: 8,
    narration: 'SMUR — item ABC : mécanisme pénétrant.',
    say: 'On complète le score ABC. Premier item : mécanisme pénétrant.',
  },
  {
    offsetMin: 8,
    narration: 'SMUR — le score ABC se remplit tout seul depuis le bilan (PAS 82 ≤ 90, FC 128 ≥ 120).',
    say: 'Nouveauté : les critères du score ABC liés aux constantes se cochent automatiquement à partir du bilan. La tension à 82 et la fréquence cardiaque à 128 valident deux critères, sans rien re-saisir.',
  },
  {
    offsetMin: 8,
    narration:
      'SMUR — avec le FAST positif et le mécanisme pénétrant, score ABC = 4 → 💥 Transfusion massive clignote sur l’intra-hospitalier.',
    say: "Avec le FAST positif et le mécanisme pénétrant, le score ABC atteint 4 : l'onglet Transfusion massive se met à clignoter à l'hôpital.",
  },
  {
    actionId: 'prehosp.g.octaplas',
    value: true,
    offsetMin: 9,
    narration:
      'SMUR — OctaplasLG (plasma SD) : plasma prêt à l’emploi, en cas de haut risque hémorragique (mis en rouge si BATT ≥ 8).',
    say: "Autre traitement possible dès le préhospitalier, en cas de haut risque hémorragique : le plasma OctaplasLG, prêt à l'emploi. Il est mis en avant en rouge lorsque le score BATT atteint 8.",
  },
  {
    actionId: 'prehosp.g.txa',
    value: true,
    offsetMin: 10,
    narration: 'SMUR — acide tranexamique administré (risque hémorragique, < 3 h).',
    say: "Le Smur administre l'acide tranexamique, dans les trois premières heures, en raison du risque hémorragique.",
  },
  {
    actionId: 'prehosp.scores.grade',
    value: 'A',
    offsetMin: 10,
    narration:
      'SMUR — attribution du GRADE A → 💥 le Niveau I (CHU) s’allume sur la régulation et la pré-alerte se débloque.',
    say: "Le Smur attribue le grade A, le plus grave. Le niveau 1, c'est-à-dire le CHU, s'allume sur la régulation, et la pré-alerte se débloque.",
  },
  {
    actionId: 'regul.prealerte.centre',
    value: true,
    offsetMin: 12,
    narration:
      'Régulation — pré-alerte du centre receveur → 💥 l’activation de l’équipe trauma se débloque à l’intra-hospitalier.',
    say: "La régulation pré-alerte le centre receveur. Aussitôt, l'activation de l'équipe trauma se débloque à l'hôpital.",
  },
  {
    actionId: 'regul.tc.niveau1',
    value: true,
    offsetMin: 12,
    narration: 'Régulation — orientation validée vers le Niveau I.',
    say: 'Orientation validée vers un centre de niveau 1.',
  },
  {
    actionId: 'intra.activation.equipe',
    value: true,
    offsetMin: 14,
    narration: 'Intra-hospitalier — équipe trauma activée avant l’arrivée du patient.',
    say: "À l'hôpital, l'équipe trauma est activée avant même l'arrivée du patient : tout le monde est prêt.",
  },
  {
    actionId: 'intra.imagerie.efast',
    value: true,
    offsetMin: 16,
    narration: 'Déchocage — e-FAST de contrôle à l’arrivée.',
    say: "À l'arrivée au déchocage, on réalise une e-FAST de contrôle.",
  },
  {
    actionId: 'intra.transfusion.ptm',
    value: true,
    offsetMin: 16,
    narration: 'Déchocage — protocole de transfusion massive lancé (ratio ≈ 1:1:1).',
    say: "Le protocole de transfusion massive est lancé, avec un ratio d'environ un pour un pour un.",
  },
  {
    actionId: 'intra.bloc.damagecontrol',
    value: true,
    offsetMin: 20,
    narration: 'Bloc — laparotomie d’hémostase / damage control.',
    say: "Direction le bloc opératoire, pour une laparotomie d'hémostase : le damage control. De l'appel au bloc, toute la chaîne s'est déroulée de façon coordonnée sur les trois pistes.",
  },

  // ─── La dictée vocale (présentation de l'interface) ──────────────────────
  {
    voicePanel: true,
    narration:
      'Sur le terrain, les mains sont prises : le SMUR peut tout saisir à la voix. Le panneau « Dictée vocale » (en bas à gauche) écoute des commandes simples.',
    say: "Sur le terrain, les mains du médecin Smur sont souvent prises. TEMPO propose donc une dictée vocale, ici en bas à gauche de l'écran. En disant par exemple : tension 86, fréquence cardiaque 110, FAST positif, instable, grade A, toutes les valeurs se cochent d'elles-mêmes. D'autres commandes existent : « dictée » pour démarrer, « synthèse » pour relire à voix haute ce qui a été saisi, « validé » pour confirmer, « correction » pour modifier, « conseils » pour énoncer les actions à mener et les constantes manquantes, et « terminé » pour arrêter. La dictée fonctionne sur Chrome ou Edge, avec l'accès au microphone.",
    holdMs: 12000,
  },

  // ─── Les deux interfaces (bascule réelle de l'affichage) ─────────────────
  {
    layout: 'pupitre',
    voicePanel: false,
    narration:
      'Deux interfaces pour un même contenu. Voici la vue « Pupitre » : des colonnes de cartes empilées, idéale sur téléphone.',
    say: "TEMPO propose deux interfaces pour le même contenu. Voici la première : la vue Pupitre. Chaque piste devient une colonne de cartes empilées, qui se replient en une seule colonne sur un téléphone. C'est la vue la plus lisible au doigt, sur le terrain.",
    holdMs: 7000,
  },
  {
    layout: 'portee',
    narration:
      '…et voici la vue « Portée » : la frise chronologique horizontale, idéale sur grand écran. Un simple bouton bascule de l’une à l’autre.',
    say: "Et voici la seconde : la vue Portée, la frise chronologique horizontale, idéale sur grand écran pour saisir tout le déroulé d'un coup d'œil. Un simple bouton, en haut du plateau, permet de basculer de l'une à l'autre — et l'application choisit automatiquement la mieux adaptée à votre écran.",
    holdMs: 7000,
  },

  // ─── La synthèse chronologique imprimable ────────────────────────────────
  {
    recap: true,
    narration:
      'Enfin, la synthèse chronologique imprimable : toutes les actions horodatées, dans l’ordre du temps.',
    say: "Dernier point : la synthèse chronologique. En un clic, TEMPO reconstitue toute la prise en charge — chaque action horodatée, dans l'ordre du temps, avec la piste concernée et la valeur saisie. Cette synthèse est imprimable, ou exportable en PDF depuis le navigateur. Elle est précieuse pour la traçabilité, la transmission, et le débriefing de l'équipe.",
    holdMs: 9000,
  },
  {
    recap: false,
    narration:
      'Démonstration terminée — coordination de tous les acteurs et respect du temps, de l’appel jusqu’au bloc.',
    say: "Voilà : de l'appel initial jusqu'au bloc, TEMPO fait travailler ensemble tous les acteurs, sur une même partition, en gardant le temps sous les yeux. La démonstration est terminée.",
    holdMs: 7000,
  },
]
