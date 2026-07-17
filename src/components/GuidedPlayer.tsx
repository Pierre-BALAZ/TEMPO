import { useEffect } from 'react'
import { Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react'
import { GUIDED_BASE_MS, guidedSteps, speechRate, spokenText } from '../config/guidedScenario'
import { cancelSpeech, isSynthesisSupported, speak } from '../voice/speech'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import { usePlayerStore } from '../store/playerStore'
import type { ActionValue } from '../types/model'

const SPEEDS = [0.5, 1, 2]
const ttsSupported = isSynthesisSupported()

export function GuidedPlayer() {
  const status = usePlayerStore((s) => s.status)
  const index = usePlayerStore((s) => s.index)
  const speed = usePlayerStore((s) => s.speed)
  const stepCount = usePlayerStore((s) => s.stepCount)
  const voiceOn = usePlayerStore((s) => s.voiceOn)
  const play = usePlayerStore((s) => s.play)
  const pause = usePlayerStore((s) => s.pause)
  const restart = usePlayerStore((s) => s.restart)
  const exit = usePlayerStore((s) => s.exit)
  const setSpeed = usePlayerStore((s) => s.setSpeed)
  const setIndex = usePlayerStore((s) => s.setIndex)
  const finish = usePlayerStore((s) => s.finish)
  const setActive = usePlayerStore((s) => s.setActive)
  const toggleVoice = usePlayerStore((s) => s.toggleVoice)
  const setValueAt = useCaseStore((s) => s.setValueAt)
  const setLayout = useUiStore((s) => s.setLayout)
  const setRecapOpen = useUiStore((s) => s.setRecapOpen)
  const setVoicePanelOpen = useUiStore((s) => s.setVoicePanelOpen)

  // Moteur de lecture : applique l'étape (action, bascule d'interface, synthèse),
  // met en évidence l'action, la fait défiler, LIT la narration à voix haute, puis
  // passe à la suivante quand la voix se termine (ou après un délai si voix coupée).
  useEffect(() => {
    if (status !== 'playing') {
      cancelSpeech()
      return
    }
    if (index >= guidedSteps.length) {
      finish()
      return
    }
    const step = guidedSteps[index]

    if (step.actionId) {
      const startedAt = useCaseStore.getState().caseState.header.caseStartedAt
      setValueAt(step.actionId, step.value as ActionValue, startedAt + (step.offsetMin ?? 0) * 60_000)
      setActive(step.actionId)
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-action-id="${step.actionId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      })
    } else {
      setActive(null)
    }
    if (step.layout) setLayout(step.layout)
    if (step.recap !== undefined) setRecapOpen(step.recap)
    if (step.voicePanel !== undefined) setVoicePanelOpen(step.voicePanel)

    let cancelled = false
    let doneTimer: ReturnType<typeof setTimeout> | undefined
    let safetyTimer: ReturnType<typeof setTimeout> | undefined
    let advanced = false
    const advance = () => {
      if (cancelled || advanced) return
      advanced = true
      setIndex(index + 1)
    }
    const text = spokenText(step)

    if (voiceOn && ttsSupported && text) {
      speak(
        text,
        undefined,
        () => {
          if (cancelled) return
          doneTimer = setTimeout(advance, 300 / speed)
        },
        speechRate(speed),
      )
      // Filet de sécurité (anti-blocage) : volontairement large, pour ne jamais
      // couper une narration réelle — il ne sert qu'en cas d'absence de fin de parole.
      const estMs = 4000 + text.length * 95
      safetyTimer = setTimeout(advance, estMs / speed + 6000)
    } else {
      doneTimer = setTimeout(advance, (step.holdMs ?? GUIDED_BASE_MS) / speed)
    }

    return () => {
      cancelled = true
      cancelSpeech()
      if (doneTimer) clearTimeout(doneTimer)
      if (safetyTimer) clearTimeout(safetyTimer)
    }
  }, [status, index, speed, voiceOn, setValueAt, setActive, setIndex, finish, setLayout, setRecapOpen, setVoicePanelOpen])

  // Referme les panneaux quand on quitte la démo.
  useEffect(() => {
    if (status === 'idle') {
      setRecapOpen(false)
      setVoicePanelOpen(false)
    }
  }, [status, setRecapOpen, setVoicePanelOpen])

  if (status === 'idle') {
    return (
      <button
        type="button"
        onClick={play}
        title={
          ttsSupported
            ? 'Visite commentée à voix haute\u00A0: principe, déroulé, interfaces, synthèse'
            : 'Visite guidée pas à pas\u00A0: principe, déroulé, interfaces, synthèse'
        }
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2 pl-2.5 pr-3 text-sm font-semibold text-white shadow-sm transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:scale-[0.96]"
      >
        <Play size={15} className="fill-white" /> Démo guidée
      </button>
    )
  }

  const playing = status === 'playing'
  const finished = status === 'finished'
  const current = guidedSteps[Math.min(index, guidedSteps.length - 1)]
  const shown = Math.min(index + (finished ? 0 : 1), stepCount)
  const pct = Math.round((Math.min(index, stepCount) / stepCount) * 100)

  return (
    <div className="w-full rounded-xl border border-indigo-200 bg-indigo-50 p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {finished ? (
          <button
            type="button"
            onClick={restart}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <RotateCcw size={15} /> Rejouer
          </button>
        ) : (
          <button
            type="button"
            onClick={playing ? pause : play}
            className="flex w-28 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
            {playing ? 'Pause' : 'Reprendre'}
          </button>
        )}

        <button
          type="button"
          onClick={restart}
          title="Recommencer depuis le début"
          className="relative flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white p-2.5 text-sm font-medium text-indigo-700 transition-colors before:absolute before:-inset-1 hover:bg-indigo-100"
        >
          <RotateCcw size={15} />
        </button>

        <button
          type="button"
          onClick={toggleVoice}
          disabled={!ttsSupported}
          title={
            !ttsSupported
              ? 'Synthèse vocale non disponible sur ce navigateur'
              : voiceOn
                ? 'Couper la narration'
                : 'Activer la narration'
          }
          className={`relative flex items-center gap-1.5 rounded-lg border p-2.5 text-sm font-medium transition-colors before:absolute before:-inset-1 disabled:cursor-not-allowed ${
            voiceOn && ttsSupported
              ? 'border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-100'
              : 'border-slate-200 bg-white text-slate-400'
          }`}
        >
          {voiceOn && ttsSupported ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>

        <div className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-white p-0.5 text-xs">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`relative min-w-[2.25rem] rounded-md px-2 py-1.5 font-semibold transition-colors before:absolute before:-inset-y-1 ${
                speed === s ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-indigo-700">
          {finished ? `Terminé · ${stepCount}/${stepCount}` : `Étape ${shown}/${stepCount}`}
        </span>

        <button
          type="button"
          onClick={exit}
          title="Quitter la démo guidée"
          className="relative ml-auto -my-1.5 -mr-1.5 rounded-md p-2.5 text-indigo-400 transition-colors before:absolute before:-inset-1 hover:bg-indigo-100 hover:text-indigo-700"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-2 max-w-prose text-pretty text-sm leading-normal text-indigo-900">
        {finished ? 'Démonstration terminée — de l’appel jusqu’au bloc, tous les acteurs sur une même partition.' : current.narration}
      </p>
    </div>
  )
}
