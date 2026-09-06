import { useEffect, useRef } from 'react'
import { useCaseStore } from '../store/caseStore'

/** Bip d'une seconde. */
function playBeep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const beep = () => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.value = 0.18
      osc.connect(gain)
      gain.connect(ctx.destination)
      const t = ctx.currentTime
      osc.start(t)
      osc.stop(t + 1) // bip d'1 seconde
      osc.onended = () => ctx.close()
    }
    if (ctx.state === 'suspended') ctx.resume().then(beep).catch(() => {})
    else beep()
  } catch {
    /* audio indisponible — sans conséquence */
  }
}

/**
 * Bip d'1 s au franchissement de 60 min (Golden hour).
 * Le témoin visuel est affiché dans le cadre du chrono (voir Stopwatch).
 */
export function MilestoneChime() {
  const startedAt = useCaseStore((s) => s.caseState.header.caseStartedAt)
  const armedRef = useRef(false)
  const beepedRef = useRef<number | null>(null)

  useEffect(() => {
    armedRef.current = false
    beepedRef.current = null

    const tick = () => {
      const elapsedMin = (Date.now() - startedAt) / 60000
      if (elapsedMin < 60) {
        armedRef.current = true
      } else if (armedRef.current && beepedRef.current !== startedAt) {
        beepedRef.current = startedAt
        playBeep()
      }
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAt])

  return null
}
