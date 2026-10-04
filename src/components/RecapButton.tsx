import { ListOrdered, Printer, X } from 'lucide-react'
import { activeProtocol, actionIndex } from '../config'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import { buildRecap, recapPrintHtml } from '../lib/recap'
import { formatClock } from '../lib/timeline'

export function RecapButton() {
  const open = useUiStore((s) => s.recapOpen)
  const setOpen = useUiStore((s) => s.setRecapOpen)
  const caseState = useCaseStore((s) => s.caseState)
  const items = buildRecap(caseState, activeProtocol, actionIndex)

  const print = () => {
    const html = recapPrintHtml(items, caseState)
    const w = window.open('', '_blank', 'width=820,height=920')
    if (!w) {
      alert('Autorisez les fenêtres pop-up pour imprimer le récap.')
      return
    }
    w.document.write(html)
    w.document.close()
    w.focus()
    // Laisse le temps au rendu avant d'ouvrir la boîte d'impression.
    setTimeout(() => w.print(), 250)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50"
        title="Récapitulatif chronologique"
      >
        <ListOrdered size={15} /> Récap
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <ListOrdered size={16} className="text-slate-500" />
              <span className="font-bold text-slate-900">Récap chronologique</span>
              <span className="text-xs text-slate-400">
                {caseState.header.patientCodename ? `Patient ${caseState.header.patientCodename}` : ''}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={print}
                  className="flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  <Printer size={14} /> Imprimer / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100"
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="overflow-y-auto p-4">
              {items.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune action horodatée pour le moment.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pr-2 font-semibold">Heure</th>
                      <th className="pb-2 pr-2 font-semibold">Piste</th>
                      <th className="pb-2 pr-2 font-semibold">Action</th>
                      <th className="pb-2 font-semibold">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className="border-t border-slate-100 align-top">
                        <td className="py-1.5 pr-2 font-semibold tabular-nums text-slate-700">
                          {formatClock(it.at)}
                        </td>
                        <td className="py-1.5 pr-2 text-slate-500">
                          <span className="block leading-tight">{it.trackLabel}</span>
                          <span className="block text-[11px] text-slate-400">{it.sectionLabel}</span>
                        </td>
                        <td className="py-1.5 pr-2 text-slate-800">{it.label}</td>
                        <td className="py-1.5 font-semibold text-slate-900">{it.valueText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
