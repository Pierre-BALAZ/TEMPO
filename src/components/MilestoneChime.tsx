import { useEffect, useRef, useState } from 'react'
import { Hourglass } from 'lucide-react'
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
 * Suit le temps écoulé depuis le début du cas :
 *  - émet un bip d'1 s au franchissement de 60 min,
 *  - affiche un témoin visuel « Golden hour » clignotant au-delà de 60 min.
 */
export function MilestoneChime() {
  const startedAt = useCaseStore((s) => s.caseState.header.caseStartedAt)
  const armedRef = useRef(false)
  const beepedRef = useRef<number | null>(null)
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    armedRef.current = false
    beepedRef.current = null
    setPassed(false)

    const tick = () => {
      const elapsedMin = (Date.now() - startedAt) / 60000
      if (elapsedMin < 60) {
        armedRef.current = true
      } else if (armedRef.current && beepedRef.current !== startedAt) {
        beepedRef.current = startedAt
        playBeep()
      }
      setPassed(elapsedMin >= 60)
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAt])

  if (!passed) return null

  return (
    <div className="flex animate-blink items-center justify-center gap-2 rounded-xl border-2 border-rose-400 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 shadow-sm">
      <Hourglass size={16} />
      Golden hour dépassée — plus de 60 minutes depuis le début de la prise en charge
    </div>
  )
}
