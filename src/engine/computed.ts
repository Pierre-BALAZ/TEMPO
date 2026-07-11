import type { ActionDef, ActionValue, CaseState } from '../types/model'

export type ActionIndex = Map<string, ActionDef>

export function buildActionIndex(actions: ActionDef[]): ActionIndex {
  return new Map(actions.map((a) => [a.id, a]))
}

/** Convertit une valeur d'action en nombre (checkbox => 1/0). */
export function numericOf(value: ActionValue): number {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return 0
}

/** Calcule la valeur d'une action `computed` à partir de ses inputs. */
export function computeValue(
  action: ActionDef,
  caseState: CaseState,
  index: ActionIndex,
): number {
  const spec = action.computed
  if (!spec) return 0
  const nums = spec.inputs.map((id) => numericOf(resolveValue(id, caseState, index)))
  if (spec.method === 'count') {
    return nums.filter((n) => n > 0).length
  }
  if (spec.method === 'ratio') {
    const den = nums[1]
    if (!den) return 0
    return Math.round((nums[0] / den) * 100) / 100
  }
  // 'sum' : contribution = valeur × poids (poids par défaut = 1).
  return spec.inputs.reduce((acc, id, i) => acc + nums[i] * (spec.weights?.[id] ?? 1), 0)
}

/** Résout la valeur d'une action : calcule les `computed`, lit les autres dans l'état. */
export function resolveValue(
  actionId: string,
  caseState: CaseState,
  index: ActionIndex,
): ActionValue {
  const action = index.get(actionId)
  if (action?.type === 'computed') {
    return computeValue(action, caseState, index)
  }
  return caseState.values[actionId]?.value ?? null
}
