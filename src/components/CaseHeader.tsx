import { Radio, Truck, Building2, Music2, Shuffle } from 'lucide-react'
import type { CaseHeader as CaseHeaderType } from '../types/model'
import { useCaseStore } from '../store/caseStore'
import { randomComposer } from '../lib/codename'

interface FieldProps {
  icon: React.ReactNode
  label: string
  field: keyof Pick<CaseHeaderType, 'regulateurName' | 'smurName' | 'serviceReceveur'>
  placeholder: string
  accent: string
}

function IntervenantTab({ icon, label, field, placeholder, accent }: FieldProps) {
  const value = useCaseStore((s) => s.caseState.header[field])
  const setHeader = useCaseStore((s) => s.setHeader)
  return (
    <label className={`flex min-w-[170px] flex-1 flex-col gap-1 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-slate-400/50 ${accent}`}>
      <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
        {icon} {label}
      </span>
      <input
        type="text"
        value={(value as string) ?? ''}
        placeholder={placeholder}
        onChange={(e) => setHeader({ [field]: e.target.value || undefined })}
        className="bg-transparent text-base font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none sm:text-sm"
      />
    </label>
  )
}

function PatientTab() {
  const codename = useCaseStore((s) => s.caseState.header.patientCodename)
  const setHeader = useCaseStore((s) => s.setHeader)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-indigo-900 focus-within:ring-2 focus-within:ring-indigo-300">
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
        <Music2 size={13} /> Patient (anonyme)
      </span>
      <input
        type="text"
        value={codename ?? ''}
        placeholder="Nom de code (ex. Chopin, 314…)"
        onChange={(e) => setHeader({ patientCodename: e.target.value || undefined })}
        className="min-w-0 flex-1 bg-transparent text-base font-bold text-indigo-900 placeholder:text-sm placeholder:font-normal placeholder:text-indigo-600 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setHeader({ patientCodename: randomComposer(codename) })}
        title="Tirer un autre nom de compositeur"
        className="relative flex shrink-0 items-center gap-1 rounded-md border border-indigo-200 bg-white/70 px-2 py-1.5 text-xs font-medium text-indigo-700 transition-colors before:absolute before:-inset-x-1 before:-inset-y-2 hover:bg-white"
      >
        <Shuffle size={13} /> Autre
      </button>
    </div>
  )
}

export function CaseHeader() {
  return (
    <div className="flex flex-col gap-2">
      <PatientTab />
      <div className="flex flex-wrap items-stretch gap-2">
        <IntervenantTab
          icon={<Radio size={12} />}
          label="Régulateur"
          field="regulateurName"
          placeholder="Dr / SAMU…"
          accent="border-sky-200 bg-sky-50 text-sky-800"
        />
        <IntervenantTab
          icon={<Truck size={12} />}
          label="SMUR / VSAV"
          field="smurName"
          placeholder="Équipe préhosp…"
          accent="border-amber-200 bg-amber-50 text-amber-900"
        />
        <IntervenantTab
          icon={<Building2 size={12} />}
          label="Service receveur"
          field="serviceReceveur"
          placeholder="Déchocage / SAUV…"
          accent="border-rose-200 bg-rose-50 text-rose-800"
        />
      </div>
    </div>
  )
}
