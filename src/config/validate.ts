import type { Protocol } from '../types/model'
import { buildProtocolIndex } from '../lib/protocol'

/**
 * Validateur de configuration (exécuté en dev) : repère les cibles orphelines
 * dans les règles avant qu'un bug silencieux ne passe en démo.
 */
export function validateProtocol(protocol: Protocol): string[] {
  const { actionMap, sectionMap } = buildProtocolIndex(protocol)
  const errors: string[] = []

  const targetExists = (targetId: string): boolean => {
    if (targetId.startsWith('section:')) return sectionMap.has(targetId.slice('section:'.length))
    return actionMap.has(targetId)
  }

  const checkCondition = (ruleId: string, cond: import('../types/model').Condition) => {
    if (cond.kind === 'and' || cond.kind === 'or') {
      cond.conditions.forEach((c) => checkCondition(ruleId, c))
      return
    }
    if (!cond.actionId.includes('::') && !actionMap.has(cond.actionId)) {
      errors.push(`Règle « ${ruleId} » : condition sur action inconnue « ${cond.actionId} ».`)
    }
  }

  for (const rule of protocol.rules) {
    checkCondition(rule.id, rule.when)
    for (const effect of rule.then) {
      if (!targetExists(effect.targetId)) {
        errors.push(`Règle « ${rule.id} » : cible inconnue « ${effect.targetId} ».`)
      }
    }
  }

  // Vérifie les inputs des actions calculées (on ignore les clés de sous-champ `id::sub`).
  for (const action of protocol.actions) {
    if (action.type === 'computed') {
      for (const input of action.computed?.inputs ?? []) {
        const refs =
          typeof input === 'string'
            ? [input]
            : 'any' in input
              ? input.any.map((c) => c.ref)
              : [input.ref]
        for (const ref of refs) {
          if (!ref.includes('::') && !actionMap.has(ref)) {
            errors.push(`Action calculée « ${action.id} » : input inconnu « ${ref} ».`)
          }
        }
      }
    }
  }

  return errors
}
