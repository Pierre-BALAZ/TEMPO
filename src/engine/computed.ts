import type { ActionDef, ActionValue, CaseState, ComputedCriterion } from '../types/model'

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
  const valueOf = (inp: (typeof spec.inputs)[number]): number => {
    if (typeof inp === 'string') return numericOf(resolveValue(inp, caseState, index))
    if ('any' in inp) {
      const hit = inp.any.some((c) => criterionValue({ ...c, points: 1 }, caseState, index) > 0)
      return hit ? inp.points ?? 1 : 0
    }
    return criterionValue(inp, caseState, index)
  }
  const nums = spec.inputs.map(valueOf)
  if (spec.method === 'count') {
    return nums.filter((n) => n > 0).length
  }
  if (spec.method === 'ratio') {
    const den = nums[1]
    if (!den) return 0
    return Math.round((nums[0] / den) * 100) / 100
  }
  // 'sum' : input chaîne → valeur × poids ; critère → points déjà calculés.
  return spec.inputs.reduce((acc, inp, i) => {
    if (typeof inp === 'string') return acc + nums[i] * (spec.weights?.[inp] ?? 1)
    return acc + nums[i]
  }, 0)
}

/** Vue lecture seule d'un critère dérivé, pour affichage dans le panneau d'un score. */
export interface DerivedCriterionView {
  label: string
  met: boolean
  points: number
  /** Résumé des valeurs du bilan qui alimentent le critère (ou « non renseigné »). */
  detail: string
}

function refDetail(ref: string, caseState: CaseState, index: ActionIndex): string {
  const action = index.get(ref)
  const name = action?.label?.replace(/^[XABCDE] — /, '') ?? ref
  const raw = resolveValue(ref, caseState, index)
  const empty =
    raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')
  if (empty) return `${name} : non renseigné`
  if (action?.type === 'select') {
    const opt = action.options?.find((o) => o.value === raw)
    return `${name} : ${opt?.label ?? String(raw)}`
  }
  return `${name} : ${String(raw)}${action?.unit ? ' ' + action.unit : ''}`
}

/** Décrit les critères d'un score repris automatiquement du bilan (ignore les sous-champs manuels). */
export function describeDerivedCriteria(
  action: ActionDef,
  caseState: CaseState,
  index: ActionIndex,
): DerivedCriterionView[] {
  const spec = action.computed
  if (!spec) return []
  const views: DerivedCriterionView[] = []
  for (const inp of spec.inputs) {
    if (typeof inp === 'string') continue
    const refs = 'any' in inp ? inp.any.map((c) => c.ref) : [inp.ref]
    const points =
      'any' in inp
        ? inp.any.some((c) => criterionValue({ ...c, points: 1 }, caseState, index) > 0)
          ? inp.points ?? 1
          : 0
        : criterionValue(inp, caseState, index)
    const uniqueRefs = [...new Set(refs)]
    views.push({
      label: inp.label ?? uniqueRefs.join(' / '),
      met: points > 0,
      points,
      detail: uniqueRefs.map((r) => refDetail(r, caseState, index)).join(' · '),
    })
  }
  return views
}

/** Évalue un critère dérivé contre une valeur du bilan (0 si non renseignée). */
function criterionValue(
  c: ComputedCriterion,
  caseState: CaseState,
  index: ActionIndex,
): number {
  const raw = resolveValue(c.ref, caseState, index)
  const filled =
    raw !== null && raw !== undefined && !(typeof raw === 'string' && raw.trim() === '')
  if (!filled) return 0
  const pts = c.points ?? 1
  if (c.op === 'eq') return raw === c.value ? pts : 0
  const n = numericOf(raw)
  let ok = false
  switch (c.op) {
    case 'lt':
      ok = n < (c.value as number)
      break
    case 'lte':
      ok = n <= (c.value as number)
      break
    case 'gt':
      ok = n > (c.value as number)
      break
    case 'gte':
      ok = n >= (c.value as number)
      break
    case 'between':
      ok = n >= (c.min as number) && n <= (c.max as number)
      break
  }
  return ok ? pts : 0
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
