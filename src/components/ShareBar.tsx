import { useEffect, useRef, useState } from 'react'

/** Durée du maintien « Réinitialiser » — source unique, injectée aussi dans la
 *  transition CSS de la jauge (.hold-fill-active) via style.transitionDuration. */
const HOLD_MS = 2000
import { AppWindow, Check, FileDown, Link2, MessageCircle, RotateCcw } from 'lucide-react'
import { canEditCase, useUiStore } from '../store/uiStore'
import { useCaseStore } from '../store/caseStore'
import { buildShareUrl } from '../share/urlState'
import { clearCase } from '../share/persistence'
import { activeProtocol } from '../config'
import { exportCasePdf } from '../lib/pdf'

export function ShareBar() {
  const editable = useUiStore(() => canEditCase())
  const caseState = useCaseStore((s) => s.caseState)
  const reset = useCaseStore((s) => s.reset)
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    // Le lien est construit à la volée ; on n'écrit PAS le hash dans notre
    // propre URL (il deviendrait périmé à la saisie suivante et écraserait
    // les données au prochain rechargement).
    const url = buildShareUrl(caseState)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copiez le lien de partage\u00A0:', url)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const onWhatsApp = () => {
    const url = buildShareUrl(caseState)
    const text = encodeURIComponent(`TEMPO — partition d’urgence — suivez le cas\u00A0: ${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
  }

  const onPdf = () => {
    void exportCasePdf(caseState, activeProtocol).catch(() => {
      window.alert('Export PDF indisponible.')
    })
  }

  const onReset = () => {
    if (!canEditCase()) return
    clearCase()
    reset()
    history.replaceState(null, '', window.location.pathname)
  }

  // Hold-to-confirm : « Réinitialiser » efface tout le cas.
  // - maintien pointeur 2 s (HOLD_MS, source unique, injectée aussi dans le CSS) ;
  // - clic simple / clavier / lecteur d'écran → window.confirm (toujours accessible) ;
  // - bouton principal uniquement, timer nettoyé à l'unmount, sortie du bouton = annulation.
  const [holding, setHolding] = useState(false)
  const holdTimer = useRef<number | undefined>(undefined)
  const holdDone = useRef(false)
  const startHold = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canEditCase()) return
    if (e.button !== 0 || !e.isPrimary) return
    holdDone.current = false
    setHolding(true)
    holdTimer.current = window.setTimeout(() => {
      holdDone.current = true
      setHolding(false)
      onReset()
    }, HOLD_MS)
  }
  const cancelHold = () => {
    setHolding(false)
    window.clearTimeout(holdTimer.current)
  }
  const cancelIfOutside = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Le tactile capture implicitement le pointeur : pointerleave ne tire
    // jamais au doigt, on vérifie donc la position à chaque mouvement.
    const r = e.currentTarget.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
      cancelHold()
    }
  }
  const onResetClick = () => {
    if (!canEditCase()) return
    // Un hold complété émet aussi un click : ne pas re-confirmer derrière.
    if (holdDone.current) {
      holdDone.current = false
      return
    }
    // Clic bref, clavier ou techno d'assistance : confirmation classique.
    if (window.confirm('Effacer le cas en cours et repartir de zéro ?')) onReset()
  }
  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onCopy}
        className="flex w-36 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-slate-700 active:scale-[0.96]"
      >
        <span className="relative grid size-[15px] place-items-center">
          <Check
            size={15}
            className={`col-start-1 row-start-1 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
              copied ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]'
            }`}
          />
          <Link2
            size={15}
            className={`col-start-1 row-start-1 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
              copied ? 'scale-[0.25] opacity-0 blur-[4px]' : 'scale-100 opacity-100 blur-0'
            }`}
          />
        </span>
        {copied ? 'Lien copié\u00A0!' : 'Copier le lien'}
      </button>
      <button
        type="button"
        onClick={onWhatsApp}
        title="Partager le lien par WhatsApp"
        aria-label="Partager le lien par WhatsApp"
        className="relative flex items-center justify-center rounded-lg bg-[oklch(0.761_0.201_149.74)] p-2.5 text-slate-900 transition-[filter,transform] duration-150 ease-out before:absolute before:-inset-1 hover:brightness-95 active:scale-[0.96]"
      >
        <MessageCircle size={18} />
      </button>
      <button
        type="button"
        onClick={onPdf}
        title="Exporter le récapitulatif des actions en PDF"
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <FileDown size={15} /> Exporter PDF
      </button>
      <button
        type="button"
        onClick={() => window.open(window.location.href, '_blank', 'noopener')}
        title="Ouvrir une 2ᵉ fenêtre synchronisée (même machine)"
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <AppWindow size={15} /> 2ᵉ fenêtre
      </button>
      <button
        type="button"
        disabled={!editable}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onPointerMove={holding ? cancelIfOutside : undefined}
        onContextMenu={(e) => e.preventDefault()}
        onClick={onResetClick}
        title="Maintenir 2 s pour effacer le cas en cours (ou clic bref : confirmation)"
        className="relative flex min-w-[8.5rem] touch-none select-none items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <span
          aria-hidden
          style={holding ? { transitionDuration: `${HOLD_MS}ms` } : undefined}
          className={`pointer-events-none absolute inset-0 bg-rose-200 ${holding ? 'hold-fill-active' : 'hold-fill'}`}
        />
        <span className="relative flex items-center gap-1.5">
          <RotateCcw size={15} /> {holding ? 'Maintenir…' : 'Réinitialiser'}
        </span>
      </button>
    </div>
  )
}
