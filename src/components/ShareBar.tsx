import { useState } from 'react'
import { AppWindow, Check, FileDown, Link2, MessageCircle, RotateCcw } from 'lucide-react'
import { useCaseStore } from '../store/caseStore'
import { buildShareUrl, writeCaseToHash } from '../share/urlState'
import { clearCase } from '../share/persistence'
import { activeProtocol } from '../config'
import { exportCasePdf } from '../lib/pdf'

export function ShareBar() {
  const caseState = useCaseStore((s) => s.caseState)
  const reset = useCaseStore((s) => s.reset)
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    const url = buildShareUrl(caseState)
    writeCaseToHash(caseState)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copiez le lien de partage :', url)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const onWhatsApp = () => {
    const url = buildShareUrl(caseState)
    writeCaseToHash(caseState)
    const text = encodeURIComponent(`TEMPO — partition d’urgence — suivez le cas : ${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
  }

  const onPdf = () => {
    void exportCasePdf(caseState, activeProtocol).catch(() => {
      window.alert('Export PDF indisponible.')
    })
  }

  const onReset = () => {
    clearCase()
    reset()
    history.replaceState(null, '', window.location.pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onCopy}
        className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
      >
        {copied ? <Check size={15} /> : <Link2 size={15} />}
        {copied ? 'Lien copié !' : 'Copier le lien'}
      </button>
      <button
        type="button"
        onClick={onWhatsApp}
        title="Partager le lien par WhatsApp"
        aria-label="Partager le lien par WhatsApp"
        className="flex items-center justify-center rounded-lg bg-[#25D366] p-1.5 text-white hover:brightness-95"
      >
        <MessageCircle size={18} />
      </button>
      <button
        type="button"
        onClick={onPdf}
        title="Exporter le récapitulatif des actions en PDF"
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <FileDown size={15} /> Exporter PDF
      </button>
      <button
        type="button"
        onClick={() => window.open(window.location.href, '_blank', 'noopener')}
        title="Ouvrir une 2ᵉ fenêtre synchronisée (même machine)"
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <AppWindow size={15} /> 2ᵉ fenêtre
      </button>
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <RotateCcw size={15} /> Réinitialiser
      </button>
    </div>
  )
}
