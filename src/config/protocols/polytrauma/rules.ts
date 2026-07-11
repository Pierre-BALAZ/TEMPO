import type { RuleDef } from '../../../types/model'

/**
 * Déclencheurs inter-pistes — données pures « si condition → effet ».
 * C'est ici que se matérialise l'intrication régul / pré-hosp / intra-hosp.
 * Le médecin peut en ajouter / modifier sans toucher au moteur ni à l'UI.
 */
export const rules: RuleDef[] = [
  /* (1) FAST+ ET instable → fait clignoter l'onglet BLOC sur la régul ET l'intra-hosp */
  {
    id: 'r.fast-instable-bloc',
    description: 'SMUR : FAST positif + instabilité → alerte BLOC sur régul et intra-hosp.',
    when: {
      kind: 'and',
      conditions: [
        { kind: 'isChecked', actionId: 'prehosp.scores.abc::fast' },
        { kind: 'equals', actionId: 'prehosp.scores.hemodynamique', value: 'instable' },
      ],
    },
    then: [
      { kind: 'blink', targetId: 'section:regul.bloc', level: 'critical' },
      { kind: 'blink', targetId: 'section:intra.bloc', level: 'critical' },
      {
        kind: 'highlight',
        targetId: 'intra.bloc.damagecontrol',
        level: 'critical',
        note: 'FAST+ instable → laparotomie d’hémostase / damage control sans délai.',
      },
    ],
  },

  /* (2) Score ABC ≥ 2 → fait clignoter l'onglet « Transfusion massive » sur l'intra-hosp */
  {
    id: 'r.abc-transfusion',
    description: 'SMUR : score ABC ≥ 2 → activer le protocole de transfusion massive.',
    when: { kind: 'gte', actionId: 'prehosp.scores.abc', value: 2 },
    then: [
      { kind: 'blink', targetId: 'section:intra.transfusion', level: 'warn' },
      {
        kind: 'highlight',
        targetId: 'intra.transfusion.ptm',
        level: 'warn',
        note: 'ABC ≥ 2 → déclencher le protocole de transfusion massive.',
      },
    ],
  },

  /* (2 bis) Score BATT ≥ 8 (haut risque, ~15 % de décès hémorragique) → PTM + OctaplasLG */
  {
    id: 'r.batt-transfusion',
    description: 'SMUR : score BATT ≥ 8 → haut risque de décès hémorragique → PTM + OctaplasLG.',
    when: { kind: 'gte', actionId: 'prehosp.scores.batt', value: 8 },
    then: [
      { kind: 'blink', targetId: 'section:intra.transfusion', level: 'critical' },
      {
        kind: 'highlight',
        targetId: 'intra.transfusion.ptm',
        level: 'critical',
        note: 'BATT ≥ 8 (haut risque) → protocole de transfusion massive.',
      },
      {
        kind: 'highlight',
        targetId: 'intra.transfusion.octaplas',
        level: 'critical',
        note: 'BATT ≥ 8 → administrer OctaplasLG (plasma SD).',
      },
      {
        kind: 'highlight',
        targetId: 'prehosp.g.octaplas',
        level: 'critical',
        note: 'BATT ≥ 8 → OctaplasLG dès le préhospitalier.',
      },
    ],
  },

  /* (3) Grade renseigné → met en avant le niveau de trauma center adéquat sur la régul */
  {
    id: 'r.grade-A-niveau1',
    description: 'Grade A → orienter Niveau I.',
    when: { kind: 'equals', actionId: 'prehosp.scores.grade', value: 'A' },
    then: [
      { kind: 'blink', targetId: 'section:regul.orientation', level: 'critical' },
      { kind: 'highlight', targetId: 'regul.tc.niveau1', level: 'critical', note: 'Grade A → Niveau I.' },
    ],
  },
  {
    id: 'r.grade-B-niveau2',
    description: 'Grade B → orienter Niveau II.',
    when: { kind: 'equals', actionId: 'prehosp.scores.grade', value: 'B' },
    then: [
      { kind: 'blink', targetId: 'section:regul.orientation', level: 'warn' },
      { kind: 'highlight', targetId: 'regul.tc.niveau2', level: 'warn', note: 'Grade B → Niveau II.' },
    ],
  },
  {
    id: 'r.grade-C-niveau3',
    description: 'Grade C → orienter Niveau I/II/III selon le temps de transport.',
    when: { kind: 'equals', actionId: 'prehosp.scores.grade', value: 'C' },
    then: [
      { kind: 'blink', targetId: 'section:regul.orientation', level: 'recommended' },
      { kind: 'highlight', targetId: 'regul.tc.niveau3', level: 'recommended', note: 'Grade C → selon délai.' },
    ],
  },

  /* (4) Grade attribué → débloque la pré-alerte du centre sur la régul */
  {
    id: 'r.grade-prealerte',
    description: 'Grade attribué → la régul peut pré-alerter le centre receveur.',
    when: { kind: 'filled', actionId: 'prehosp.scores.grade' },
    then: [
      { kind: 'unlock', targetId: 'regul.prealerte.centre' },
      { kind: 'blink', targetId: 'regul.prealerte.centre', level: 'recommended', note: 'Grade connu → pré-alerter.' },
    ],
  },

  /* (5) Pré-alerte régul → débloque l'activation de l'équipe trauma à l'intra-hosp */
  {
    id: 'r.prealerte-activation',
    description: 'Pré-alerte de la régul → l’intra-hosp active l’équipe trauma avant l’arrivée.',
    when: { kind: 'isChecked', actionId: 'regul.prealerte.centre' },
    then: [
      { kind: 'unlock', targetId: 'intra.activation.equipe' },
      { kind: 'blink', targetId: 'intra.activation.equipe', level: 'warn', note: 'Pré-alerte reçue → activer l’équipe.' },
    ],
  },

  /* (6) ≥ 1 critère de Vittel à la régul → invite le SMUR à attribuer un grade */
  {
    id: 'r.vittel-grade',
    description: '≥ 1 critère de Vittel → suspicion de traumatisé sévère, attribuer un grade.',
    when: { kind: 'gte', actionId: 'regul.appel.vittel', value: 1 },
    then: [
      {
        kind: 'highlight',
        targetId: 'prehosp.scores.grade',
        level: 'recommended',
        note: 'Traumatisé sévère suspecté → attribuer le grade.',
      },
    ],
  },

  /* (7) Risque hémorragique → invite à l'acide tranexamique (TXA) */
  {
    id: 'r.txa',
    description: 'Hypotension / tachycardie / instabilité → envisager le TXA (< 3 h).',
    when: {
      kind: 'or',
      conditions: [
        { kind: 'isChecked', actionId: 'prehosp.scores.abc::pas90' },
        { kind: 'isChecked', actionId: 'prehosp.scores.abc::fc120' },
        { kind: 'equals', actionId: 'prehosp.scores.hemodynamique', value: 'instable' },
      ],
    },
    then: [
      {
        kind: 'blink',
        targetId: 'prehosp.g.txa',
        level: 'warn',
        note: 'Risque hémorragique → acide tranexamique dans les 3 h.',
      },
    ],
  },

  /* (8) Stabilisé → privilégier le body-CT à l'intra-hosp */
  {
    id: 'r.stable-bodyct',
    description: 'Patient stabilisé → body-CT (scanner corps entier).',
    when: { kind: 'equals', actionId: 'prehosp.scores.hemodynamique', value: 'stable' },
    then: [
      { kind: 'highlight', targetId: 'intra.imagerie.bodyct', level: 'recommended', note: 'Stabilisé → body-CT.' },
    ],
  },

  /* (9) Instable → mettre en avant l'artériographie / embolisation */
  {
    id: 'r.instable-arterio',
    description: 'Instabilité → envisager packing / artériographie / embolisation.',
    when: { kind: 'equals', actionId: 'prehosp.scores.hemodynamique', value: 'instable' },
    then: [{ kind: 'highlight', targetId: 'intra.bloc.arterio', level: 'warn' }],
  },

  /* (10) Brûlure étendue (Wallace > 10 %) → alerte CTB sur l'intra-hospitalier */
  {
    id: 'r.brulure-ctb',
    description: 'SCB (Wallace) > 10 % → mettre en surbrillance l’onglet CTB (intra-hosp).',
    when: { kind: 'gt', actionId: 'prehosp.brulures.wallace', value: 10 },
    then: [
      { kind: 'blink', targetId: 'section:intra.ctb', level: 'warn' },
      {
        kind: 'highlight',
        targetId: 'intra.ctb.avis',
        level: 'warn',
        note: 'Brûlure étendue → avis / orientation centre des brûlés (CTB).',
      },
      { kind: 'blink', targetId: 'section:regul.orientation', level: 'warn' },
      {
        kind: 'highlight',
        targetId: 'regul.tc.ctb',
        level: 'warn',
        note: 'Brûlure étendue → envisager l’orientation vers un centre des brûlés (CTB).',
      },
    ],
  },

  /* (11) Brûlure grave (Wallace > 20 %) → CTB critique + remplissage 20 ml/kg au SMUR */
  {
    id: 'r.brulure-grave',
    description: 'SCB > 20 % → CTB en alerte critique et remplissage 20 ml/kg (1ʳᵉ h) débloqué au SMUR.',
    when: { kind: 'gt', actionId: 'prehosp.brulures.wallace', value: 20 },
    then: [
      { kind: 'blink', targetId: 'section:intra.ctb', level: 'critical' },
      { kind: 'highlight', targetId: 'intra.ctb.avis', level: 'critical' },
      { kind: 'blink', targetId: 'section:regul.orientation', level: 'critical' },
      { kind: 'highlight', targetId: 'regul.tc.ctb', level: 'critical' },
      { kind: 'unlock', targetId: 'prehosp.brulures.remplissage' },
      {
        kind: 'blink',
        targetId: 'prehosp.brulures.remplissage',
        level: 'critical',
        note: 'SCB > 20 % → remplissage 20 ml/kg de cristalloïdes sur la 1ʳᵉ heure.',
      },
    ],
  },

  /* (12) Shock Index ≥ 1,1 (SMUR) → choc hémorragique probable → Niveau I + alertes régul/intra */
  {
    id: 'r.shockindex-choc',
    description:
      'Shock Index ≥ 1,1 → choc hémorragique probable → orienter Niveau I, alerter transfusion massive / bloc.',
    when: { kind: 'gte', actionId: 'prehosp.scores.shockindex', value: 1.1 },
    then: [
      {
        kind: 'blink',
        targetId: 'prehosp.scores.shockindex',
        level: 'critical',
        note: 'Shock Index ≥ 1,1 → choc hémorragique probable.',
      },
      { kind: 'blink', targetId: 'section:regul.orientation', level: 'critical' },
      {
        kind: 'highlight',
        targetId: 'regul.tc.niveau1',
        level: 'critical',
        note: 'Shock Index ≥ 1,1 → orienter vers un centre de Niveau I.',
      },
      { kind: 'blink', targetId: 'section:intra.transfusion', level: 'critical' },
      {
        kind: 'highlight',
        targetId: 'intra.transfusion.ptm',
        level: 'critical',
        note: 'Shock Index ≥ 1,1 → protocole de transfusion massive.',
      },
      { kind: 'blink', targetId: 'section:intra.bloc', level: 'critical' },
    ],
  },
]
