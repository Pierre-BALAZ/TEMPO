import type { Condition, Protocol } from '../types/model'
import { buildProtocolIndex } from '../lib/protocol'

/**
 * Validateur de configuration (exécuté en dev) : repère les cibles orphelines
 * dans les règles avant qu'un bug silencieux ne passe en démo. Couvre :
 * cibles d'effets, conditions et inputs calculés (y compris les références de
 * sous-champ « parent::sub »), liens `bindTo`, doublons d'ids, jalons.
 */
export function validateProtocol(protocol: Protocol): string[] {
  const { actionMap, sectionMap } = buildProtocolIndex(protocol)
  const errors: string[] = []

  /* --- doublons d'identifiants ----------------------------------------- */
  const seenActions = new Set<string>()
  for (const action of protocol.actions) {
    if (seenActions.has(action.id)) errors.push(`Action en double : « ${action.id} ».`)
    seenActions.add(action.id)
  }
  const seenRules = new Set<string>()
  for (const rule of protocol.rules) {
    if (seenRules.has(rule.id)) errors.push(`Règle en double : « ${rule.id} ».`)
    seenRules.add(rule.id)
  }

  /* --- résolution d'une référence de valeur ---------------------------- */
  // Une référence est soit un id d'action, soit « parent::sub » (sous-champ).
  // Un sous-champ `bindTo` stocke sa valeur SOUS L'ACTION LIÉE : le référencer
  // via « parent::sub » ne verrait jamais de valeur — signalé comme erreur.
  const checkRef = (owner: string, ref: string) => {
    if (!ref.includes('::')) {
      if (!actionMap.has(ref)) errors.push(`${owner} : référence inconnue « ${ref} ».`)
      return
    }
    const [parentId, subId] = ref.split('::')
    const parent = actionMap.get(parentId)
    const sub = parent?.detail?.subFields?.find((sf) => sf.id === subId)
    if (!parent || !sub) {
      errors.push(`${owner} : sous-champ inconnu « ${ref} ».`)
      return
    }
    if (sub.bindTo) {
      errors.push(
        `${owner} : « ${ref} » est lié (bindTo) à « ${sub.bindTo} » — référencer cette action à la place.`,
      )
    }
  }

  const checkCondition = (ruleId: string, cond: Condition) => {
    if (cond.kind === 'and' || cond.kind === 'or') {
      cond.conditions.forEach((c) => checkCondition(ruleId, c))
      return
    }
    checkRef(`Règle « ${ruleId} »`, cond.actionId)
  }

  const targetExists = (targetId: string): boolean => {
    if (targetId.startsWith('section:')) return sectionMap.has(targetId.slice('section:'.length))
    return actionMap.has(targetId)
  }

  /* --- règles : conditions + cibles d'effets --------------------------- */
  for (const rule of protocol.rules) {
    checkCondition(rule.id, rule.when)
    for (const effect of rule.then) {
      if (!targetExists(effect.targetId)) {
        errors.push(`Règle « ${rule.id} » : cible inconnue « ${effect.targetId} ».`)
      }
    }
  }

  /* --- actions calculées + sous-champs --------------------------------- */
  for (const action of protocol.actions) {
    if (action.type === 'computed') {
      for (const input of action.computed?.inputs ?? []) {
        const refs =
          typeof input === 'string'
            ? [input]
            : 'any' in input
              ? input.any.map((c) => c.ref)
              : [input.ref]
        for (const ref of refs) checkRef(`Action calculée « ${action.id} »`, ref)
      }
    }
    for (const sf of action.detail?.subFields ?? []) {
      if (sf.bindTo && !actionMap.has(sf.bindTo)) {
        errors.push(
          `Sous-champ « ${action.id}::${sf.id} » : bindTo inconnu « ${sf.bindTo} ».`,
        )
      }
    }
  }

  /* --- jalons ----------------------------------------------------------- */
  const seenMilestones = new Set<string>()
  for (const m of protocol.milestones ?? []) {
    if (seenMilestones.has(m.id)) errors.push(`Jalon en double : « ${m.id} ».`)
    seenMilestones.add(m.id)
    if (m.atMin < 0) errors.push(`Jalon « ${m.id} » : minute négative (${m.atMin}).`)
  }

  return errors
}
