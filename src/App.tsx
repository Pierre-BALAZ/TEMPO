import { useEffect } from 'react'
import { Maximize2, Minimize2, RadioTower } from 'lucide-react'
import { Logo } from './components/Logo'
import { CaseHeader } from './components/CaseHeader'
import { RoleSwitcher } from './components/RoleSwitcher'
import { ShareBar } from './components/ShareBar'
import { SyncControl } from './components/SyncControl'
import { ScoreBoard } from './components/ScoreBoard'
import { PupitreBoard } from './components/PupitreBoard'
import { LayoutToggle } from './components/LayoutToggle'
import { RecapButton } from './components/RecapButton'
import { Sources } from './components/Sources'
import { MilestoneChime } from './components/MilestoneChime'
import { GuidedPlayer } from './components/GuidedPlayer'
import { DemoCaseButton } from './components/DemoCaseButton'
import { ActionDetailPanel } from './components/ActionDetailPanel'
import { VoiceControl } from './components/VoiceControl'
import { RoleGate } from './components/RoleGate'
import { Stopwatch } from './components/Stopwatch'
import { useCaseStore } from './store/caseStore'
import { useUiStore } from './store/uiStore'
import { saveCase } from './share/persistence'
import { useBroadcastSync } from './hooks/useBroadcastSync'

export default function App() {
  const caseState = useCaseStore((s) => s.caseState)
  const syncSupported = useBroadcastSync()
  const collapsedCount = useUiStore((s) => s.collapsedTracks.length)
  const setAllCollapsed = useUiStore((s) => s.setAllCollapsed)
  const layout = useUiStore((s) => s.layout)
  const allCollapsed = collapsedCount >= 3

  // L'état initial est restauré dès la création du store (lien > localStorage > vierge).
  // Ici on se contente de persister localement à chaque modification.
  useEffect(() => {
    saveCase(caseState)
  }, [caseState])

  return (
    <div className="mx-auto flex min-h-full max-w-[1500px] flex-col gap-4 p-3 sm:p-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Logo size={34} className="shrink-0" />
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            TEMPO <span className="font-semibold text-slate-500">— partition d’urgence</span>
          </h1>
        </div>
        <p className="text-sm text-slate-500">
          Régulation · Pré-hospitalier · Intra-hospitalier sur une timeline commune. Une action
          renseignée par une équipe en débloque / alerte d’autres.
        </p>
        <p className="text-xs text-slate-500">
          Réalisé par le <strong className="font-semibold text-slate-700">Dr Félix AMIOT</strong> (SMUR / Urgences / SAMU 50 —
          CH Saint-Lô) et le <strong className="font-semibold text-slate-700">Dr Pierre BALAZ</strong> (BMPM).
          Projet open source — licence MIT.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <GuidedPlayer />
        <DemoCaseButton />
      </div>

      <Stopwatch />

      <CaseHeader />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <RoleSwitcher />
          <button
            type="button"
            onClick={() => setAllCollapsed(!allCollapsed)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {allCollapsed ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
            {allCollapsed ? 'Tout développer' : 'Tout réduire'}
          </button>
          {syncSupported && (
            <span
              className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700"
              title="Les fenêtres ouvertes sur cette machine se synchronisent en temps réel."
            >
              <RadioTower size={12} /> Synchro multi-fenêtres
            </span>
          )}
        </div>
        <ShareBar />
      </div>

      <SyncControl />

      <MilestoneChime />

      <div className="flex items-center justify-between gap-2">
        <RecapButton />
        <LayoutToggle />
      </div>

      {layout === 'pupitre' ? <PupitreBoard /> : <ScoreBoard />}

      <Sources />

      <Legend />

      <footer className="pb-6 text-center text-[11px] text-slate-400">
        TEMPO — partition d’urgence · sources : Vittel, RESUVAL, score ABC, BATT, CRASH-2,
        Wallace.
        <br />
        © 2026 Dr Félix AMIOT (SMUR / Urgences / SAMU 50 — CH Saint-Lô) &amp; Dr Pierre BALAZ (BMPM) — open source (licence MIT).
      </footer>

      <ActionDetailPanel />
      <VoiceControl />
      <RoleGate />
    </div>
  )
}

function Legend() {
  const items: { cls: string; label: string }[] = [
    { cls: 'border-dashed border-slate-300 bg-slate-100', label: 'Verrouillé' },
    { cls: 'border-slate-200 bg-white', label: 'Disponible' },
    { cls: 'border-amber-400 ring-2 ring-amber-400 animate-blink', label: 'Alerte (clignote)' },
    { cls: 'border-emerald-300 bg-emerald-50', label: 'Fait' },
    { cls: 'border-sky-300 bg-sky-50', label: 'Rempli' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
      <span className="font-semibold uppercase tracking-wide text-slate-400">Légende</span>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3.5 w-5 rounded border ${it.cls}`} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
