import { useEffect, useState } from 'react'
import { Users, Wifi, WifiOff, Settings2, AlertTriangle } from 'lucide-react'
import { useCaseStore } from '../store/caseStore'
import { useRoomSync, type SyncStatus } from '../sync/useRoomSync'

const STORE_KEY = 'tempo:serverUrl'

/**
 * Serveur de salons du projet (Cloudflare Worker). Valeur intégrée par défaut,
 * surchargeable au build via VITE_SYNC_URL (ex. si le Worker déménage) —
 * voir docs/DEPLOYMENT.md.
 */
const BUILTIN_SERVER = 'https://tempo-rooms.felix-amiot.workers.dev'
// `??` ne suffit pas : le déploiement Pages injecte VITE_SYNC_URL='' (chaîne
// vide) quand la variable de repo n'existe pas — d'où le `||` sur une valeur
// vraie pour retomber sur le serveur intégré.
const SYNC_OVERRIDE = (import.meta.env.VITE_SYNC_URL ?? '').trim()
const DEFAULT_SERVER = SYNC_OVERRIDE || BUILTIN_SERVER

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
  const [serverOverride, setServerOverride] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY)
      if (saved) setServerOverride(saved)
    } catch {
      /* ignore */
    }
  }, [])

  const persistUrl = (v: string) => {
    setServerOverride(v)
    try {
      localStorage.setItem(STORE_KEY, v)
    } catch {
      /* ignore */
    }
  }

  // Le serveur du projet est utilisé sauf surcharge explicite (réglage avancé).
  const serverUrl = serverOverride.trim() || DEFAULT_SERVER
  const roomCode = codename ? `${slug(codename)}-${sessionId ?? 'x'}` : ''
  const canSync = Boolean(serverUrl && roomCode)
  const { status, error } = useRoomSync(enabled && canSync, serverUrl, roomCode)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <Users size={15} className="text-slate-500" />
        <span className="text-sm font-semibold text-slate-800">Synchro équipe</span>
        <span className={`ml-1 h-2.5 w-2.5 rounded-full ${DOT[enabled ? status : 'off']}`} />
        <span className="whitespace-nowrap text-xs text-slate-500">{LABEL[enabled ? status : 'off']}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="relative rounded-md p-2 text-slate-400 transition-colors before:absolute before:-inset-y-1.5 hover:bg-slate-100"
            title="Réglage du serveur"
            aria-label="Réglage du serveur"
          >
            <Settings2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            disabled={!canSync}
            className={`relative flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-semibold text-white transition-colors before:absolute before:-inset-y-1.5 disabled:cursor-not-allowed disabled:opacity-40 ${
              enabled
                ? 'bg-rose-600 enabled:hover:bg-rose-700'
                : 'bg-emerald-600 enabled:hover:bg-emerald-700'
            }`}
          >
            {enabled ? <WifiOff size={14} /> : <Wifi size={14} />}
            {enabled ? 'Arrêter' : 'Rejoindre'}
          </button>
        </div>
      </div>

      {enabled && roomCode && (
        <p className="text-pretty text-xs text-slate-500">
          Salle&nbsp;: <span className="font-semibold text-indigo-700">{codename}</span>{' '}
          <span className="text-slate-500">({roomCode})</span> — partagez le lien du patient aux
          autres équipes pour qu’elles rejoignent la même salle.
        </p>
      )}

      {(showSettings || !serverUrl) && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-slate-500">
            {DEFAULT_SERVER
              ? 'Serveur de synchro (avancé — laisser vide pour le serveur du projet)'
              : 'Adresse du serveur de synchro'}
          </label>
          <input
            type="url"
            value={serverOverride}
            placeholder={DEFAULT_SERVER || 'https://tempo-rooms.exemple.workers.dev'}
            onChange={(e) => persistUrl(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-2 py-1 text-base focus:border-indigo-300 focus:outline-none sm:text-sm"
          />
          <p className="flex items-start gap-1 text-pretty text-[11px] text-slate-500">
            <AlertTriangle size={12} className="mt-px shrink-0" />
            Les données du cas transitent par ce serveur — salles éphémères (12&nbsp;h), données
            fictives uniquement, aucune identité réelle.
          </p>
        </div>
      )}

      {enabled && status === 'error' && (
        <p className="text-pretty text-[11px] text-rose-600">
          Connexion impossible ({error}). Vérifiez l’adresse du serveur de synchro.
        </p>
      )}
    </div>
  )
}
