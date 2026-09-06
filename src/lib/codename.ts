/**
 * Identité patient ANONYME. Par défaut, un nom de compositeur classique (clin d'œil
 * au thème « partition ») ; modifiable librement (numéro, pseudo…). Sert à distinguer
 * plusieurs patients pris en charge simultanément — jamais à identifier une personne.
 */

export const COMPOSERS = [
  'Chopin', 'Mozart', 'Bach', 'Beethoven', 'Vivaldi', 'Debussy', 'Ravel', 'Satie',
  'Haydn', 'Schubert', 'Brahms', 'Liszt', 'Dvořák', 'Fauré', 'Berlioz', 'Bizet',
  'Verdi', 'Puccini', 'Tchaïkovski', 'Rachmaninov', 'Sibelius', 'Grieg', 'Mahler',
  'Haendel', 'Purcell', 'Albinoni', 'Pachelbel', 'Saint-Saëns', 'Poulenc', 'Gershwin',
  'Schumann', 'Mendelssohn', 'Rossini', 'Wagner', 'Prokofiev', 'Chostakovitch',
]

/** Un compositeur au hasard, différent de `exclude` si fourni. */
export function randomComposer(exclude?: string): string {
  const pool = exclude ? COMPOSERS.filter((c) => c !== exclude) : COMPOSERS
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Code numérique à 3 chiffres (alternative anonyme). */
export function randomNumericCode(): string {
  return String(Math.floor(100 + Math.random() * 900))
}

/** Identifiant technique court (a-z0-9) pour l'unicité d'une session/salle. */
export function randomId(len = 6): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}
