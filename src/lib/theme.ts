import type { TrackDef } from '../types/model'

/**
 * Classes Tailwind par couleur de piste, écrites EN TOUTES LETTRES (pas de
 * construction dynamique `bg-${color}-500`) pour ne pas être supprimées au build.
 */
export interface TrackTheme {
  /** Bandeau d'en-tête de la piste. */
  headerBg: string
  headerText: string
  /** Bordure d'accent de la lane. */
  laneBorder: string
  laneBg: string
  /** Pastille / accent. */
  dot: string
  ring: string
  chipBg: string
  chipText: string
}

const THEMES: Record<TrackDef['color'], TrackTheme> = {
  sky: {
    headerBg: 'bg-sky-600',
    headerText: 'text-sky-50',
    laneBorder: 'border-sky-300',
    laneBg: 'bg-sky-50/40',
    dot: 'bg-sky-500',
    ring: 'ring-sky-400',
    chipBg: 'bg-sky-100',
    chipText: 'text-sky-800',
  },
  amber: {
    headerBg: 'bg-amber-600',
    headerText: 'text-amber-50',
    laneBorder: 'border-amber-300',
    laneBg: 'bg-amber-50/40',
    dot: 'bg-amber-500',
    ring: 'ring-amber-400',
    chipBg: 'bg-amber-100',
    chipText: 'text-amber-900',
  },
  rose: {
    headerBg: 'bg-rose-600',
    headerText: 'text-rose-50',
    laneBorder: 'border-rose-300',
    laneBg: 'bg-rose-50/40',
    dot: 'bg-rose-500',
    ring: 'ring-rose-400',
    chipBg: 'bg-rose-100',
    chipText: 'text-rose-800',
  },
}

export function trackTheme(color: TrackDef['color']): TrackTheme {
  return THEMES[color]
}

/** Couleurs des niveaux d'alerte (effet highlight / blink). */
export const LEVEL_STYLES: Record<string, { ring: string; bg: string; text: string }> = {
  info: { ring: 'ring-slate-400', bg: 'bg-slate-100', text: 'text-slate-700' },
  recommended: { ring: 'ring-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  warn: { ring: 'ring-amber-500', bg: 'bg-amber-100', text: 'text-amber-900' },
  critical: { ring: 'ring-red-600', bg: 'bg-red-100', text: 'text-red-800' },
}
