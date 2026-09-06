import type { Protocol } from '../../../types/model'
import { actions } from './actions'
import { rules } from './rules'
import { tracks } from './tracks'

export const polytraumaProtocol: Protocol = {
  id: 'polytrauma',
  label: 'Traumatisé sévère (polytraumatisé)',
  tracks,
  actions,
  rules,
}
