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

/* ------------------------------------------------------------------ */
/* Recherche par MOTS ENTIERS : le transcript est déjà déburré (ASCII), */
/* un simple includes() faisait matcher « amine » dans « ketamine » ou  */
/* « termine » dans « indetermine ».                                    */

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function wordIndexOf(text: string, kw: string, from = 0): number {
  const re = new RegExp(`(?<![a-z0-9])${escapeRe(kw)}(?![a-z0-9])`, 'g')
  re.lastIndex = from
  const m = re.exec(text)
  return m ? m.index : -1
}

function wordIncludes(text: string, kw: string): boolean {
  return wordIndexOf(text, kw) >= 0
}

/** Détecte un mot de commande dans le transcript (priorité aux commandes de contrôle). */
export function detectCommand(raw: string): VoiceCommand | null {
  const t = deburr(raw)
  const has = (arr: string[]) => arr.some((w) => wordIncludes(t, w))
  if (has(VOICE_COMMANDS.stop)) return 'stop'
  if (has(VOICE_COMMANDS.validate)) return 'validate'
  if (has(VOICE_COMMANDS.correct)) return 'correct'
  if (has(VOICE_COMMANDS.synth)) return 'synth'
  if (has(VOICE_COMMANDS.advice)) return 'advice'
  if (has(VOICE_COMMANDS.start)) return 'start'
  return null
}

/** Tous les mots-clés numériques (pour borner la fenêtre d'un champ au champ suivant). */
const ALL_NUMERIC_KEYWORDS: string[] = VOICE_NUMERIC.flatMap((f) => f.keywords)

function extractNumber(text: string, f: VoiceNumeric): number | null {
  const own = new Set(f.keywords)
  const kws = [...f.keywords].sort((a, b) => b.length - a.length)
  for (const kw of kws) {
    let idx = wordIndexOf(text, kw)
    while (idx >= 0) {
      // Prefer a more specific field phrase at the same position (PAM vs PAS).
      if (ALL_NUMERIC_KEYWORDS.some(other => !own.has(other) && other.length > kw.length && wordIndexOf(text, other, idx) === idx)) {
        idx = wordIndexOf(text, kw, idx + kw.length)
        continue
      }
      let after = text.slice(idx + kw.length, idx + kw.length + 22)
      // Fenêtre bornée au prochain mot-clé d'un AUTRE champ : sinon
      // « pouls non pris saturation 95 » attribuerait le 9 de 95 à la FC.
      let cut = after.length
      for (const other of ALL_NUMERIC_KEYWORDS) {
        if (own.has(other)) continue
        const j = wordIndexOf(after, other)
        if (j >= 0 && j < cut) cut = j
      }
      after = after.slice(0, cut)
      if (f.avoidAfter && after.includes(f.avoidAfter)) {
        idx = wordIndexOf(text, kw, idx + kw.length)
        continue
      }
      // Décimales (« 38 virgule 5 » normalisé en « 38,5 ») et refus des
      // nombres trop longs (plus de troncature silencieuse « 1000 » → 100).
      const m = after.match(/\d+(?:[.,]\d+)?/)
      if (m) {
        const n = parseFloat(m[0].replace(',', '.'))
        const okMin = f.min == null || n >= f.min
        const okMax = f.max == null || n <= f.max
        if (okMin && okMax) return n
      }
      idx = wordIndexOf(text, kw, idx + kw.length)
    }
  }
  return null
}

function firstKeywordIndex(text: string, keywords: string[]): number {
  let best = -1
  for (const k of keywords) {
    const i = wordIndexOf(text, k)
    if (i >= 0 && (best === -1 || i < best)) best = i
  }
  return best
}

function isNegatedNear(text: string, idx: number): boolean {
  const window = text.slice(Math.max(0, idx - 14), idx + 24)
  return VOICE_NEGATIONS.some((n) => wordIncludes(window, n))
}

/** Extrait toutes les paires champ/valeur reconnues dans un transcript. */
export function parseFills(raw: string): VoiceFill[] {
  // « 38 virgule 5 » → « 38,5 » pour que la capture décimale fonctionne.
  const norm = normalizeTranscript(raw).replace(/(\d)\s+virgule\s+(\d)/g, '$1,$2')
  const fills: VoiceFill[] = []

  for (const f of VOICE_NUMERIC) {
    const n = extractNumber(norm, f)
    if (n !== null) {
      fills.push({
        actionId: f.actionId,
        label: f.label,
        value: n,
        valueText: `${n}${f.unit ? '\u00A0' + f.unit : ''}`,
      })
    }
  }

  for (const s of VOICE_SELECT) {
    for (const opt of s.options) {
      if (opt.keywords.some((k) => wordIncludes(norm, k))) {
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
