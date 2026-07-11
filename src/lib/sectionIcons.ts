import {
  Phone,
  Truck,
  Shuffle,
  Scissors,
  BellRing,
  ListChecks,
  Hand,
  Flame,
  Superscript,
  Users,
  Bone,
  Droplet,
  Ambulance,
  type LucideIcon,
} from 'lucide-react'

export interface SectionIcon {
  Icon: LucideIcon
  className?: string
}

/** Pictogramme par section (rail compact). */
export const SECTION_ICONS: Record<string, SectionIcon> = {
  // Régulation
  'regul.appel': { Icon: Phone }, // prise d'appel
  'regul.moyens': { Icon: Truck }, // moyens engagés
  'regul.orientation': { Icon: Shuffle }, // orientation (flèches croisées)
  'regul.bloc': { Icon: Scissors }, // bloc / chirurgie
  'regul.prealerte': { Icon: BellRing }, // pré-alerte
  // Pré-hospitalier
  'prehosp.abcde': { Icon: ListChecks }, // bilan XABCDE
  'prehosp.gestes': { Icon: Hand }, // gestes
  'prehosp.brulures': { Icon: Flame }, // brûlures
  'prehosp.scores': { Icon: Superscript }, // scores & gravité (x²)
  'prehosp.transmission': { Icon: Phone }, // transmission
  'prehosp.transport': { Icon: Ambulance }, // transport
  // Intra-hospitalier
  'intra.activation': { Icon: Users }, // activation équipe
  'intra.imagerie': { Icon: Bone }, // imagerie / bilan (squelette)
  'intra.bloc': { Icon: Scissors }, // bloc
  'intra.transfusion': { Icon: Droplet, className: 'text-rose-600' }, // transfusion massive (goutte)
  'intra.ctb': { Icon: Flame }, // centre des brûlés
}

export function sectionIcon(id: string): SectionIcon {
  return SECTION_ICONS[id] ?? { Icon: ListChecks }
}
