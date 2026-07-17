/**
 * Marque « TEMPO » (partition d'urgence) : un triolet de doubles croches (double poutre)
 * dont les têtes de notes évoquent les trois phases (régulation, SMUR, hôpital).
 * Version compacte (sans glyphes, illisibles en petit) pour l'en-tête ; le logo
 * détaillé avec casque / ambulance / H est dans public/logo.svg et les icônes.
 */
export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  const INK = '#111827'
  const lines = [23.8, 28.4, 33, 37.6, 42.2]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="TEMPO — partition d'urgence">
      {lines.map((y, i) => (
        <line key={i} x1="8" y1={y} x2="56" y2={y} stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      ))}
      {/* hampes (côté droit des têtes) */}
      <rect x="24.5" y="16.1" width="1.4" height="15.5" fill={INK} />
      <rect x="36.5" y="17.2" width="1.4" height="18.6" fill={INK} />
      <rect x="48.5" y="18.2" width="1.4" height="21.7" fill={INK} />
      {/* double poutre, bornée aux hampes extrêmes */}
      <polygon points="24.5,16.02 49.9,18.28 49.9,20.58 24.5,18.32" fill={INK} />
      <polygon points="24.5,19.88 49.9,22.14 49.9,24.44 24.5,22.18" fill={INK} />
      {/* têtes de notes */}
      <circle cx="20" cy="31.6" r="5.9" fill={INK} />
      <circle cx="32" cy="35.8" r="5.9" fill={INK} />
      <circle cx="44" cy="39.9" r="5.9" fill={INK} />
    </svg>
  )
}
