import { useCallback, useEffect, useRef, useState } from 'react'
import { activeProtocol, actionIndex } from '../config'
import { evaluate } from '../engine/evaluate'
import { isFilledValue } from '../lib/case'
import { useCaseStore } from '../store/caseStore'
import {
  cancelSpeech,
  getSpeechRecognitionCtor,
  isFileProtocol,
  isRecognitionSupported,
  isSynthesisSupported,
  speak,
  type SpeechRecognitionLike,
} from './speech'
import { detectCommand, parseFills, type VoiceFill } from './parser'

export type VoiceMode = 'idle' | 'dictating' | 'awaitingValidation' | 'correcting'

export interface VoiceApi {
  supported: boolean
  synthSupported: boolean
  fileProtocol: boolean
  listening: boolean
  mode: VoiceMode
  lastTranscript: string
  entries: VoiceFill[]
  log: string[]
  error: string | null
  start: () => void
  stop: () => void
  clear: () => void
}

const MODE_LABEL: Record<VoiceMode, string> = {
  idle: 'En écoute — dites « dictée »',
  dictating: 'Dictée en cours',
  awaitingValidation: 'Relecture — dites « validé »',
  correcting: 'Correction — annoncez la valeur',
}

export function modeLabel(m: VoiceMode): string {
  return MODE_LABEL[m]
}

export function useVoiceDictation(): VoiceApi {
  const supported = isRecognitionSupported()
  const synthSupported = isSynthesisSupported()
  const fileProtocol = isFileProtocol()

  const [listening, setListening] = useState(false)
  const [mode, setModeState] = useState<VoiceMode>('idle')
  const [lastTranscript, setLastTranscript] = useState('')
  const [entries, setEntries] = useState<VoiceFill[]>([])
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const listeningRef = useRef(false)
  const speakingRef = useRef(false)
  const modeRef = useRef<VoiceMode>('idle')
  const entriesRef = useRef<VoiceFill[]>([])

  const setMode = useCallback((m: VoiceMode) => {
    modeRef.current = m
    setModeState(m)
  }, [])

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 12))
  }, [])

  const say = useCallback((text: string) => {
    speakingRef.current = true
    speak(
      text,
      () => {
        speakingRef.current = true
      },
      () => {
        speakingRef.current = false
      },
    )
  }, [])

  const applyFills = useCallback(
    (fills: VoiceFill[], asCorrection: boolean) => {
      if (fills.length === 0) return
      const setValue = useCaseStore.getState().setValue
      for (const f of fills) setValue(f.actionId, f.value)
      // fusionne : une seule entrée par action (la dernière l'emporte)
      const map = new Map(entriesRef.current.map((e) => [e.actionId, e]))
      for (const f of fills) map.set(f.actionId, f)
      const next = [...map.values()]
      entriesRef.current = next
      setEntries(next)
      const summary = fills.map((f) => `${f.label} : ${f.valueText}`).join(', ')
      pushLog(`${asCorrection ? '✎ Corrigé' : '＋ Saisi'} — ${summary}`)
      if (asCorrection) say(`Corrigé. ${summary}.`)
    },
    [pushLog, say],
  )

  const speakSynthesis = useCallback(() => {
    if (entriesRef.current.length === 0) {
      say('Aucune saisie à relire pour le moment.')
      return
    }
    const body = entriesRef.current.map((e) => `${e.label} : ${e.valueText}`).join(', ')
    say(`Vous avez saisi : ${body}. Dites validé pour confirmer, ou correction pour modifier.`)
  }, [say])

  const speakAdvice = useCallback(() => {
    const cs = useCaseStore.getState().caseState
    const derived = evaluate(activeProtocol, cs, actionIndex)
    const prehosp = activeProtocol.actions.filter((a) => a.trackId === 'prehosp')

    const done = (id: string, type: string): boolean => {
      const v = cs.values[id]?.value
      if (type === 'checkbox') return v === true
      if (type === 'computed') return false
      return isFilledValue(v ?? null)
    }

    const suggested = prehosp
      .filter((a) => {
        const d = derived[a.id]
        return d && (d.highlighted || d.blink || d.unlocked) && !done(a.id, a.type)
      })
      .slice(0, 5)
      .map((a) => a.label)

    const vitals = ['prehosp.c.pas', 'prehosp.c.fc', 'prehosp.b.spo2', 'prehosp.d.gcs']
    const missingVitals = prehosp
      .filter((a) => vitals.includes(a.id) && !isFilledValue(cs.values[a.id]?.value ?? null))
      .map((a) => a.label.replace(/^[A-Z] — /, ''))

    const parts: string[] = []
    if (suggested.length) parts.push(`Actions à mener : ${suggested.join(', ')}.`)
    if (missingVitals.length) parts.push(`Constantes non renseignées : ${missingVitals.join(', ')}.`)
    if (parts.length === 0) parts.push('Rien de particulier à signaler pour le moment.')
    say(parts.join(' '))
    pushLog(`🔊 Conseils énoncés`)
  }, [say, pushLog])

  const handleTranscript = useCallback(
    (raw: string) => {
      setLastTranscript(raw)
      const cmd = detectCommand(raw)

      if (cmd === 'stop') {
        setMode('idle')
        say('Dictée terminée.')
        pushLog('■ Dictée terminée')
        return
      }
      if (cmd === 'advice') {
        speakAdvice()
        return
      }
      if (cmd === 'synth') {
        speakSynthesis()
        setMode('awaitingValidation')
        return
      }
      if (cmd === 'validate') {
        say('Saisie validée.')
        pushLog('✔ Saisie validée')
        entriesRef.current = []
        setEntries([])
        setMode('dictating')
        return
      }
      if (cmd === 'correct') {
        const fills = parseFills(raw)
        if (fills.length) {
          applyFills(fills, true)
          setMode('dictating')
        } else {
          setMode('correcting')
          say('Correction. Annoncez la valeur à modifier.')
        }
        return
      }
      if (cmd === 'start') {
        setMode('dictating')
        say('Dictée activée. Je vous écoute.')
        pushLog('▶ Dictée activée')
        return
      }

      // Pas de commande : on ne remplit que si la dictée est active.
      if (modeRef.current === 'idle') return
      const fills = parseFills(raw)
      if (fills.length === 0) return
      applyFills(fills, modeRef.current === 'correcting')
      if (modeRef.current === 'correcting') setMode('dictating')
    },
    [applyFills, pushLog, say, setMode, speakAdvice, speakSynthesis],
  )

  const safeStart = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    try {
      rec.start()
    } catch {
      /* déjà démarré : on ignore */
    }
  }, [])

  const start = useCallback(() => {
    if (!supported) {
      setError('La reconnaissance vocale n’est pas disponible dans ce navigateur.')
      return
    }
    if (listeningRef.current) return
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'fr-FR'
    rec.continuous = true
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      if (speakingRef.current) return
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) handleTranscript(res[0].transcript)
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Micro refusé. Autorisez le micro (et utilisez https ou localhost).')
        listeningRef.current = false
        setListening(false)
      }
    }
    rec.onend = () => {
      if (listeningRef.current) safeStart()
      else setListening(false)
    }
    recRef.current = rec
    listeningRef.current = true
    setListening(true)
    setError(null)
    setMode('idle')
    safeStart()
    say('Micro activé. Dites dictée pour commencer.')
  }, [supported, handleTranscript, safeStart, say, setMode])

  const stop = useCallback(() => {
    listeningRef.current = false
    setListening(false)
    setMode('idle')
    cancelSpeech()
    const rec = recRef.current
    if (rec) {
      rec.onend = null
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }
    recRef.current = null
  }, [setMode])

  const clear = useCallback(() => {
    entriesRef.current = []
    setEntries([])
    setLog([])
  }, [])

  useEffect(() => {
    return () => {
      listeningRef.current = false
      cancelSpeech()
      const rec = recRef.current
      if (rec) {
        rec.onend = null
        try {
          rec.stop()
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  return {
    supported,
    synthSupported,
    fileProtocol,
    listening,
    mode,
    lastTranscript,
    entries,
    log,
    error,
    start,
    stop,
    clear,
  }
}
