'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes'
import type { CulturalVectorResponse } from '@/lib/scorefriction/cultural-vector-contract'
import type { WorldSpectVectorSnapshot } from '@/lib/worldspect/vector-contract'

type Row = Record<string, unknown>

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
}
function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && value.trim() && Number.isFinite(Number(value)) ? Number(value) : null
}
function display(value: unknown, digits = 3) {
  const parsed = numberValue(value)
  return parsed === null ? '—' : parsed.toFixed(digits)
}
async function jsonFetch(path: string) {
  const response = await fetch(path, { cache: 'no-store' })
  const data = await response.json().catch(() => ({})) as Row
  return { ok: response.ok, status: response.status, data }
}

export function ScoreFrictionOperationalObservatory({ initialState }: { initialState: AmvScopeState }) {
  const initialSelected = record(initialState.selectedContext)
  const [caseId, setCaseId] = useState(text(initialSelected.case_id) ?? '')
  const [cultural, setCultural] = useState<CulturalVectorResponse | null>(null)
  const [evidence, setEvidence] = useState<Row[]>([])
  const [proposals, setProposals] = useState<Row[]>([])
  const [verifications, setVerifications] = useState<Row[]>([])
  const [world, setWorld] = useState<WorldSpectVectorSnapshot | null>(null)
  const [operational, setOperational] = useState<Row | null>(null)
  const [warnings, setWarnings] = useState<string[]>(initialState.warnings ?? [])
  const [status, setStatus] = useState('READY')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (id: string) => {
    if (!id.trim()) {
      setCultural(null); setEvidence([]); setProposals([]); setVerifications([]); setOperational(null)
      setStatus('CASE_ID_REQUIRED')
      return
    }
    setBusy(true)
    try {
      const encoded = encodeURIComponent(id.trim())
      const [culturalResult, evidenceResult, proposalResult, verificationResult, worldResult, operationalResult] = await Promise.all([
        jsonFetch(`/api/scorefriction/evaluate?case_id=${encoded}`),
        jsonFetch(`/api/scorefriction/evidence?case_id=${encoded}`),
        jsonFetch(`/api/scorefriction/proposals?case_id=${encoded}`),
        jsonFetch(`/api/scorefriction/verifications?case_id=${encoded}`),
        jsonFetch('/api/worldspect/vector'),
        jsonFetch(`/api/scorefriction/operational-cycle?case_id=${encoded}`),
      ])
      setCultural(culturalResult.ok && culturalResult.data.case_id && culturalResult.data.cultural_vector ? culturalResult.data as unknown as CulturalVectorResponse : null)
      setEvidence(rows(evidenceResult.data.entries))
      setProposals(rows(proposalResult.data.data))
      setVerifications(rows(verificationResult.data.data))
      setWorld((record(worldResult.data).snapshot as WorldSpectVectorSnapshot | undefined) ?? null)
      setOperational(operationalResult.ok ? record(operationalResult.data.state) : null)
      const nextWarnings = [
        ...((initialState.warnings ?? []).map(String)),
        ...[culturalResult, evidenceResult, proposalResult, verificationResult, worldResult, operationalResult]
          .filter((item) => !item.ok)
          .map((item) => `${item.status}:${text(item.data.error) ?? 'source_unavailable'}`),
      ]
      setWarnings([...new Set(nextWarnings)])
      setStatus(culturalResult.ok || evidenceResult.ok ? 'OBSERVED_STATE_LOADED' : 'DEGRADED')
    } finally {
      setBusy(false)
    }
  }, [initialState.warnings])

  useEffect(() => { if (caseId) void refresh(caseId) }, [caseId, refresh])

  const vector = cultural?.cultural_vector
  const persistedMihm = useMemo(() => {
    const selected = record(initialState.selectedContext)
    return record(record(selected.latest_vectors).mihm_cultural_vector)
  }, [initialState.selectedContext])

  return (
    <main className="min-h-screen bg-[#050504] px-5 pb-16 pt-12 font-mono text-[#d8d0bd]">
      <header className="border-b border-[#d8b64a24] pb-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#e0c46c]">SFI · SCOREFRICTION</div>
        <h1 className="mt-3 text-3xl font-normal tracking-tight">Operational Observatory</h1>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-[#8a8172]">Sólo se muestran observaciones, vectores, propuestas, verificaciones y contexto mundial persistidos. La ausencia permanece ausente; esta superficie no genera métricas sustitutas.</p>
      </header>

      <section className="mt-5 grid gap-3 border border-[#d8b64a24] bg-[#080706] p-4 md:grid-cols-[1fr_auto]">
        <input value={caseId} onChange={(event) => setCaseId(event.target.value)} placeholder="case_id persistido" className="border border-[#d8b64a24] bg-[#050504] px-3 py-2 text-xs outline-none" />
        <button type="button" disabled={busy || !caseId.trim()} onClick={() => void refresh(caseId)} className="border border-[#d8b64a55] px-4 py-2 text-[10px] uppercase tracking-[.14em] text-[#e0c46c] disabled:opacity-40">{busy ? 'Leyendo…' : 'Actualizar'}</button>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-4">
        <Readout label="STATE" value={status} />
        <Readout label="EVIDENCE" value={String(evidence.length)} />
        <Readout label="PROPOSALS" value={String(proposals.length)} />
        <Readout label="VERIFICATIONS" value={String(verifications.length)} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="CULTURAL VECTOR">
          {vector ? <KeyValues data={vector as unknown as Row} /> : <Empty text="No existe un vector cultural completo para este case_id." />}
        </Panel>
        <Panel title="MIHM CULTURAL · PERSISTED SELECTED CONTEXT">
          {Object.keys(persistedMihm).length ? <KeyValues data={persistedMihm} /> : <Empty text="No existe lectura MIHM cultural persistida en el contexto seleccionado." />}
        </Panel>
        <Panel title="WORLD SPECTRUM">
          {world ? <KeyValues data={world as unknown as Row} /> : <Empty text="WorldSpect no devolvió un snapshot observable en este corte." />}
        </Panel>
        <Panel title="OPERATIONAL CYCLE">
          {operational && Object.keys(operational).length ? <KeyValues data={operational} /> : <Empty text="No existe ciclo operacional persistido para este case_id." />}
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="EVIDENCE LEDGER"><Records records={evidence} empty="Sin evidencia persistida." /></Panel>
        <Panel title="PROPOSALS"><Records records={proposals} empty="Sin propuestas persistidas." /></Panel>
        <Panel title="RETURNS / VERIFICATIONS"><Records records={verifications} empty="Sin verificaciones persistidas." /></Panel>
      </section>

      {warnings.length ? <section className="mt-4 border-l-2 border-[#a94c3b] bg-[#140b09] p-4 text-[10px] leading-5 text-[#c98b7d]">{warnings.map((warning) => <div key={warning}>{warning}</div>)}</section> : null}
    </main>
  )
}

function Readout({ label, value }: { label: string; value: string }) {
  return <div className="border border-[#d8b64a24] bg-[#080706] p-3"><div className="text-[8px] tracking-[.16em] text-[#8a8172]">{label}</div><div className="mt-2 text-sm text-[#e0c46c]">{value}</div></div>
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="min-h-48 border border-[#d8b64a24] bg-[#080706]"><header className="border-b border-[#d8b64a18] px-4 py-3 text-[9px] tracking-[.16em] text-[#e0c46c]">{title}</header><div className="max-h-[420px] overflow-auto p-4">{children}</div></article>
}
function Empty({ text: message }: { text: string }) { return <p className="text-xs leading-6 text-[#756e62]">{message}</p> }
function KeyValues({ data }: { data: Row }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2">{Object.entries(data).map(([key, entry]) => <div key={key} className="border-b border-[#d8b64a10] pb-2"><div className="text-[8px] text-[#756e62]">{key}</div><div className="mt-1 break-all text-[10px] text-[#c8bfae]">{typeof entry === 'number' ? display(entry) : typeof entry === 'string' ? entry : entry === null || entry === undefined ? '—' : JSON.stringify(entry)}</div></div>)}</div>
}
function Records({ records, empty }: { records: Row[]; empty: string }) {
  if (!records.length) return <Empty text={empty} />
  return <div className="space-y-3">{records.map((item, index) => <div key={text(item.id) ?? `${index}`} className="border-b border-[#d8b64a12] pb-3 text-[9px] leading-5 text-[#9c9282]"><div className="text-[#d8b64a]">{text(item.title) ?? text(item.label) ?? text(item.id) ?? `record-${index + 1}`}</div><pre className="whitespace-pre-wrap break-words">{JSON.stringify(item, null, 2)}</pre></div>)}</div>
}
