import type { ActionValue } from '../types/model'
import { deburr, normalizeTranscript } from './frenchNumbers'
import {
  VOICE_COMMANDS,
  VOICE_NEGATIONS,
  VOICE_NUMERIC,
  VOICE_SELECT,
  VOICE_TOGGLE,
  type VoiceNumeric,
} from '../config/protocols/polytrauma/voice'

export type VoiceCommand = 'start' | 'stop' | 'synth' | 'validate' | 'correct' | 'advice'

export interface VoiceFill {
  actionId: string
  label: string
  value: ActionValue
  valueText: string
}

/** Détecte un mot de commande dans le transcript (priorité aux commandes de contrôle). */
export function detectCommand(raw: string): VoiceCommand | null {
  const t = deburr(raw)
  const has = (arr: string[]) => arr.some((w) => t.includes(w))
  if (has(VOICE_COMMANDS.stop)) return 'stop'
  if (has(VOICE_COMMANDS.validate)) return 'validate'
  if (has(VOICE_COMMANDS.correct)) return 'correct'
  if (has(VOICE_COMMANDS.synth)) return 'synth'
  if (has(VOICE_COMMANDS.advice)) return 'advice'
  if (has(VOICE_COMMANDS.start)) return 'start'
  return null
}

function extractNumber(text: string, f: VoiceNumeric): number | null {
  const kws = [...f.keywords].sort((a, b) => b.length - a.length)
  for (const kw of kws) {
    let idx = text.indexOf(kw)
    while (idx >= 0) {
      const after = text.slice(idx + kw.length, idx + kw.length + 22)
      if (f.avoidAfter && after.includes(f.avoidAfter)) {
        idx = text.indexOf(kw, idx + kw.length)
        continue
      }
      const m = after.match(/\d{1,3}/)
      if (m) {
        const n = parseInt(m[0], 10)
        const okMin = f.min == null || n >= f.min
        const okMax = f.max == null || n <= f.max
        if (okMin && okMax) return n
      }
      idx = text.indexOf(kw, idx + kw.length)
    }
  }
  return null
}

function firstKeywordIndex(text: string, keywords: string[]): number {
  let best = -1
  for (const k of keywords) {
    const i = text.indexOf(k)
    if (i >= 0 && (best === -1 || i < best)) best = i
  }
  return best
}

function isNegatedNear(text: string, idx: number): boolean {
  const window = text.slice(Math.max(0, idx - 14), idx + 24)
  return VOICE_NEGATIONS.some((n) => window.includes(n))
}

/** Extrait toutes les paires champ/valeur reconnues dans un transcript. */
export function parseFills(raw: string): VoiceFill[] {
  const norm = normalizeTranscript(raw)
  const fills: VoiceFill[] = []

  for (const f of VOICE_NUMERIC) {
    const n = extractNumber(norm, f)
    if (n !== null) {
      fills.push({
        actionId: f.actionId,
        label: f.label,
        value: n,
        valueText: `${n}${f.unit ? ' ' + f.unit : ''}`,
      })
    }
  }

  for (const s of VOICE_SELECT) {
    for (const opt of s.options) {
      if (opt.keywords.some((k) => norm.includes(k))) {
        fills.push({ actionId: s.actionId, label: s.label, value: opt.value, valueText: opt.label })
        break
      }
    }
  }

  for (const tg of VOICE_TOGGLE) {
    const idx = firstKeywordIndex(norm, tg.keywords)
    if (idx >= 0) {
      const negated = isNegatedNear(norm, idx)
      fills.push({
        actionId: tg.actionId,
        label: tg.label,
        value: !negated,
        valueText: negated ? 'non' : 'oui',
      })
    }
  }

  return fills
}
