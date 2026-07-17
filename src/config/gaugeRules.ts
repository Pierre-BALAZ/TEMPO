import type { ActionDef, Condition, EffectLevel, RuleDef } from '../types/model'

/**
 * Génère, pour chaque sous-champ à jauge d'une action, une règle
 * « valeur renseignée ET hors zone → alerte sur l'action ».
 *
 * Les seuils sont STRICTEMENT ceux déjà déclarés dans les `GaugeSpec`
 * (aucune valeur clinique nouvelle), avec la même sémantique que l'affichage
 * de la jauge (`Gauge.tsx`) : zone verte [normalMin ?? redBelow, normalMax ??
 * redAbove], alerte en dehors (comparaison stricte). Les sous-champs `bindTo`
 * sont évalués sur l'action liée (là où la valeur est réellement stockée).
 */
export function buildGaugeRules(action: ActionDef, level: EffectLevel = 'warn'): RuleDef[] {
  const rules: RuleDef[] = []
  for (const sf of action.detail?.subFields ?? []) {
    const g = sf.gauge
    if (!g) continue
    const ref = sf.bindTo ?? `${action.id}::${sf.id}`
    const low = g.normalMin ?? g.redBelow
    const high = g.normalMax ?? g.redAbove
    const outOfRange: Condition[] = []
    if (low !== undefined) outOfRange.push({ kind: 'lt', actionId: ref, value: low })
    if (high !== undefined) outOfRange.push({ kind: 'gt', actionId: ref, value: high })
    if (outOfRange.length === 0) continue

    rules.push({
      id: `r.gauge.${action.id}.${sf.id}`,
      description: `${sf.label} hors zone (jauge) → alerte « ${action.label} ».`,
      when: {
        kind: 'and',
        conditions: [
          // Garde indispensable : une valeur absente vaut 0 pour lt/gt.
          { kind: 'filled', actionId: ref },
          outOfRange.length === 1 ? outOfRange[0] : { kind: 'or', conditions: outOfRange },
        ],
      },
      then: [
        {
          kind: 'blink',
          targetId: action.id,
          level,
          note: `${sf.label} hors zone.`,
        },
      ],
    })
  }
  return rules
}
