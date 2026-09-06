import { AlertTriangle, ChevronDown, ChevronUp, Mic, MicOff, Volume2 } from 'lucide-react'
import { modeLabel, useVoiceDictation, type VoiceMode } from '../voice/useVoiceDictation'
import { useUiStore } from '../store/uiStore'

const DOT: Record<VoiceMode, string> = {
  idle: 'bg-slate-400',
  dictating: 'bg-emerald-500 animate-pulse',
  awaitingValidation: 'bg-amber-500 animate-pulse',
  correcting: 'bg-sky-500 animate-pulse',
}

export function VoiceControl() {
  const open = useUiStore((s) => s.voicePanelOpen)
  const setOpen = useUiStore((s) => s.setVoicePanelOpen)
  const v = useVoiceDictation()

  return (
    <div className="fixed bottom-3 left-3 z-30 w-[19rem] max-w-[calc(100vw-1.5rem)] text-slate-700">
      {open ? (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic size={16} className="text-rose-600" />
              <span className="text-sm font-bold text-slate-900">Dictée vocale — SMUR</span>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                proto
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Réduire"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {!v.supported ? (
            <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
              La reconnaissance vocale n’est pas disponible dans ce navigateur. Essayez Chrome ou Edge.
            </p>
          ) : (
            <>
              {v.fileProtocol && (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900">
                  <AlertTriangle size={13} className="mt-px shrink-0" />
                  Ouvert en fichier local : le micro est souvent bloqué. Testez via <code>npm run dev</code> ou la version en ligne.
                </p>
              )}

              <button
                type="button"
                onClick={v.listening ? v.stop : v.start}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white ${
                  v.listening ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {v.listening ? <MicOff size={16} /> : <Mic size={16} />}
                {v.listening ? 'Couper le micro' : 'Activer le micro'}
              </button>

              {v.listening && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${DOT[v.mode]}`} />
                  <span className="font-medium text-slate-700">{modeLabel(v.mode)}</span>
                </div>
              )}

              {v.error && (
                <p className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">{v.error}</p>
              )}

              {v.lastTranscript && (
                <p className="rounded-lg bg-slate-50 p-2 text-[11px] italic text-slate-500">
                  « {v.lastTranscript} »
                </p>
              )}

              {v.entries.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Saisi cette session
                  </span>
                  <ul className="flex flex-col gap-0.5">
                    {v.entries.map((e) => (
                      <li key={e.actionId} className="flex justify-between gap-2 text-xs">
                        <span className="text-slate-600">{e.label}</span>
                        <span className="font-semibold text-slate-900">{e.valueText}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={v.clear}
                    className="mt-1 self-start text-[11px] text-slate-400 underline hover:text-slate-600"
                  >
                    Vider la liste
                  </button>
                </div>
              )}

              <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                <span className="mb-1.5 flex items-center gap-1 font-semibold text-slate-700">
                  <Volume2 size={12} /> Commandes vocales
                </span>
                <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-1">
                  <dt className="font-semibold text-rose-700">« dictée »</dt>
                  <dd>démarre la saisie vocale</dd>
                  <dt className="font-semibold text-rose-700">« synthèse »</dt>
                  <dd>relit à voix haute ce qui a été saisi</dd>
                  <dt className="font-semibold text-rose-700">« validé »</dt>
                  <dd>confirme la saisie relue</dd>
                  <dt className="font-semibold text-rose-700">« correction »</dt>
                  <dd>modifie une valeur (« négatif » pour décocher)</dd>
                  <dt className="font-semibold text-rose-700">« conseils »</dt>
                  <dd>énonce les actions à mener et les constantes manquantes</dd>
                  <dt className="font-semibold text-rose-700">« terminé »</dt>
                  <dd>arrête la saisie vocale</dd>
                </dl>
                <p className="mt-2 border-t border-slate-200 pt-1.5 text-slate-500">
                  Exemple : « <em>tension 86, fréquence cardiaque 110, FAST positif, instable, grade A</em> »
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              if (!v.supported) {
                setOpen(true)
                return
              }
              if (v.listening) v.stop()
              else v.start()
            }}
            title={v.listening ? 'Couper la dictée vocale' : 'Activer la dictée vocale'}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
              v.listening
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${v.listening ? DOT[v.mode] : 'bg-slate-300'}`} />
            {v.listening ? <MicOff size={16} /> : <Mic size={16} className="text-rose-600" />}
            {v.listening ? 'Couper' : 'Dictée'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="Ouvrir le panneau"
            aria-label="Ouvrir le panneau de dictée"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <ChevronUp size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
