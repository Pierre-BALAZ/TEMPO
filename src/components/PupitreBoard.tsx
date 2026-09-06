import { Eye, Pencil } from 'lucide-react'
import { activeProtocol } from '../config'
import { actionsOfSection } from '../lib/protocol'
import { sectionIcon } from '../lib/sectionIcons'
import { trackTheme, LEVEL_STYLES } from '../lib/theme'
import { canEditTrack, useUiStore } from '../store/uiStore'
import { useDerivedUiState } from '../store/selectors'
import { ActionCell } from './ActionCell'

/**
 * Vue « Pupitre » : chaque piste est une colonne de cartes empilées verticalement,
 * qui se replie en une seule colonne sur téléphone. Même moteur, même édition et
 * mêmes règles que la vue « Portée » (les cartes sont des ActionCell en mode flux).
 */
export function PupitreBoard() {
  const derived = useDerivedUiState()
  const activeRole = useUiStore((s) => s.activeRole)
  const roleChosen = useUiStore((s) => s.roleChosen)

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}
    >
      {activeProtocol.tracks.map((track) => {
        const theme = trackTheme(track.color)
        const editable = canEditTrack(activeRole, roleChosen, track.id)
        const dimmed = roleChosen && activeRole !== 'observer' && activeRole !== track.id
        return (
          <section
            key={track.id}
            className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${
              dimmed ? 'opacity-70 transition-opacity' : 'transition-opacity'
            }`}
          >
            <header className={`flex items-center gap-2 px-3 py-2 ${theme.headerBg} ${theme.headerText}`}>
              <span className="grow">
                <span className="block text-sm font-bold leading-tight">{track.label}</span>
                <span className="block text-[11px] opacity-90">{track.shortLabel}</span>
              </span>
              {roleChosen && (
                <span
                  title={editable ? 'Vous éditez cette ligne' : 'Lecture seule'}
                  className="flex shrink-0 items-center rounded bg-white/20 p-1"
                >
                  {editable ? <Pencil size={12} /> : <Eye size={12} />}
                </span>
              )}
            </header>

            <div className={`flex flex-col gap-3 p-3 ${theme.laneBg}`}>
              {track.sections.map((section) => {
                const acts = actionsOfSection(activeProtocol, section.id)
                const secEff = derived[`section:${section.id}`]
                const active = Boolean(secEff?.blink || secEff?.highlighted)
                const lvl = secEff?.level ? LEVEL_STYLES[secEff.level] : LEVEL_STYLES.warn
                const { Icon, className } = sectionIcon(section.id)

                const headCls = ['flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold']
                if (section.alert && active) {
                  headCls.push(`${lvl.bg} ${lvl.text} ${lvl.ring} ring-2`)
                  if (secEff?.blink) headCls.push('animate-blink')
                } else {
                  headCls.push('bg-slate-100 text-slate-500')
                }

                return (
                  <div key={section.id} className="flex flex-col gap-2">
                    <div className={headCls.join(' ')}>
                      <Icon size={14} className={className} />
                      <span>{section.label}</span>
                    </div>
                    {acts.map((a) => (
                      <ActionCell key={a.id} action={a} effect={derived[a.id]} flow />
                    ))}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
