import { useEffect, useState } from 'react'
import { Users, Wifi, WifiOff, Settings2, AlertTriangle } from 'lucide-react'
import { useCaseStore } from '../store/caseStore'
import { useRoomSync, type SyncStatus } from '../sync/useRoomSync'

const STORE_KEY = 'tempo:serverUrl'

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const DOT: Record<SyncStatus, string> = {
  off: 'bg-slate-300',
  connecting: 'bg-amber-500 animate-pulse',
  live: 'bg-emerald-500',
  error: 'bg-rose-500',
}
const LABEL: Record<SyncStatus, string> = {
  off: 'Hors ligne',
  connecting: 'Connexion…',
  live: 'En direct',
  error: 'Erreur de connexion',
}

export function SyncControl() {
  const codename = useCaseStore((s) => s.caseState.header.patientCodename)
  const sessionId = useCaseStore((s) => s.caseState.header.sessionId)
  const [serverUrl, setServerUrl] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY)
      if (saved) setServerUrl(saved)
    } catch {
      /* ignore */
    }
  }, [])

  const persistUrl = (v: string) => {
    setServerUrl(v)
    try {
      localStorage.setItem(STORE_KEY, v)
    } catch {
      /* ignore */
    }
  }

  const roomCode = codename ? `${slug(codename)}-${sessionId ?? 'x'}` : ''
  const canSync = Boolean(serverUrl.trim() && roomCode)
  const { status, error } = useRoomSync(enabled && canSync, serverUrl, roomCode)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <Users size={15} className="text-slate-500" />
        <span className="text-sm font-semibold text-slate-800">Synchro équipe</span>
        <span className={`ml-1 h-2.5 w-2.5 rounded-full ${DOT[enabled ? status : 'off']}`} />
        <span className="text-xs text-slate-500">{LABEL[enabled ? status : 'off']}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            title="Réglage du serveur"
            aria-label="Réglage du serveur"
          >
            <Settings2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            disabled={!canSync}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-semibold text-white disabled:opacity-40 ${
              enabled ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {enabled ? <WifiOff size={14} /> : <Wifi size={14} />}
            {enabled ? 'Arrêter' : 'Rejoindre'}
          </button>
        </div>
      </div>

      {enabled && roomCode && (
        <p className="text-xs text-slate-500">
          Salle : <span className="font-semibold text-indigo-700">{codename}</span>{' '}
          <span className="text-slate-400">({roomCode})</span> — partagez le lien du patient aux
          autres équipes pour qu'elles rejoignent la même salle.
        </p>
      )}

      {(showSettings || !serverUrl.trim()) && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-slate-500">
            Adresse de votre site WordPress (serveur de synchro)
          </label>
          <input
            type="url"
            value={serverUrl}
            placeholder="https://mon-site.fr"
            onChange={(e) => persistUrl(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-indigo-300 focus:outline-none"
          />
          <p className="flex items-start gap-1 text-[11px] text-slate-400">
            <AlertTriangle size={12} className="mt-px shrink-0" />
            Nécessite le plugin « TEMPO Sync » installé sur ce site. Les données du cas transitent
            alors par votre serveur (salles éphémères, aucune identité réelle).
          </p>
        </div>
      )}

      {enabled && status === 'error' && (
        <p className="text-[11px] text-rose-600">
          Connexion impossible ({error}). Vérifiez l'adresse et que le plugin est actif.
        </p>
      )}
    </div>
  )
}
