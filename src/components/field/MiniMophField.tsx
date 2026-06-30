'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Loader2, ShieldCheck } from 'lucide-react';

type MophResult = {
  ok: boolean;
  friction_reading: string;
  conversion_break: string;
  minimal_perturbation: string;
  next_action: string;
  risk: string;
  sfi_dr01_fit: string;
  confidence: number;
  user_friendly_explanation: string;
  persistence_status: string;
  twin: { available: boolean; status: string; summary: string };
  provider: string;
  warnings: string[];
  trace: {
    trace_id: string;
    evidence_used: string[];
    human_approval_status: string;
    persistence_status: string;
  };
};

type FormState = {
  stuckSystem: string;
  objective: string;
  attempts: string;
  evidence: string;
  consequence: string;
};

const initialForm: FormState = {
  stuckSystem: '',
  objective: '',
  attempts: '',
  evidence: '',
  consequence: '',
};

function FieldInput({ id, label, value, onChange, rows = 3 }: {
  id: keyof FormState;
  label: string;
  value: string;
  onChange: (id: keyof FormState, value: string) => void;
  rows?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f8878]">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(id, event.target.value)}
        className="min-h-[84px] resize-y border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm leading-6 text-[#f5eedc] outline-none focus:border-[#c8a951]"
      />
    </label>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#2f2a1e] bg-[#060605] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">{label}</div>
      <div className="mt-2 break-words text-sm text-[#f5eedc]">{value}</div>
    </div>
  );
}

export default function MiniMophField() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<MophResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  function update(id: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [id]: value }));
  }

  async function submit() {
    setStatus('running');
    setError(null);
    try {
      const response = await fetch('/api/agentic/moph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok || json.ok === false) throw new Error(json.error ?? 'moph_agent_failed');
      setResult(json as MophResult);
      setStatus('idle');
    } catch (nextError) {
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'moph_agent_failed');
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#c8a951]">Mini MOP-H</div>
            <h2 className="mt-2 text-2xl font-semibold text-[#f5eedc]">Lectura agentica del sistema atorado</h2>
          </div>
          <ClipboardList className="h-5 w-5 text-[#c8a951]" aria-hidden="true" />
        </div>

        <div className="mt-5 grid gap-4">
          <FieldInput id="stuckSystem" label="Sistema atorado" value={form.stuckSystem} onChange={update} rows={4} />
          <FieldInput id="objective" label="Objetivo" value={form.objective} onChange={update} rows={2} />
          <FieldInput id="attempts" label="Intentos previos" value={form.attempts} onChange={update} rows={2} />
          <FieldInput id="evidence" label="Evidencia disponible" value={form.evidence} onChange={update} rows={2} />
          <FieldInput id="consequence" label="Consecuencia de no moverlo" value={form.consequence} onChange={update} rows={2} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={status === 'running' || form.stuckSystem.trim().length < 12}
            className="inline-flex items-center gap-2 border border-[#c8a951] bg-[#c8a951] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#060605] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Leer friccion
          </button>
          <Link href="/contact?offer=SFI-DR01" className="inline-flex items-center gap-2 border border-[#c8a95166] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#c8a951]">
            SFI-DR01
          </Link>
          <Link href="/login?next=%2Ffield" className="inline-flex items-center gap-2 border border-[#2f2a1e] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#d8d2c2]">
            User Twin
          </Link>
        </div>

        {status === 'error' ? <div className="mt-4 border border-[#7d3b31] bg-[#170d0b] p-3 text-sm text-[#d69a8b]">{error}</div> : null}
      </div>

      <aside className="space-y-4">
        <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">
            <ShieldCheck className="h-4 w-4" /> Output
          </div>
          {result ? (
            <div className="mt-4 grid gap-3">
              <ResultMetric label="Lectura" value={result.friction_reading} />
              <ResultMetric label="Ruptura" value={result.conversion_break} />
              <ResultMetric label="Perturbacion minima" value={result.minimal_perturbation} />
              <ResultMetric label="Siguiente accion" value={result.next_action} />
              <div className="grid gap-3 sm:grid-cols-3">
                <ResultMetric label="Riesgo" value={result.risk} />
                <ResultMetric label="DR01 fit" value={result.sfi_dr01_fit} />
                <ResultMetric label="Confianza" value={`${Math.round(result.confidence * 100)}%`} />
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm leading-6 text-[#8f8878]">Sin lectura activa.</div>
          )}
        </section>

        <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Twin / trace</div>
          {result ? (
            <div className="mt-4 space-y-3 text-sm leading-6 text-[#cfc3aa]">
              <p>{result.twin.summary}</p>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8f8878]">provider={result.provider}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8f8878]">trace={result.trace.trace_id}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8f8878]">approval={result.trace.human_approval_status}</div>
            </div>
          ) : (
            <div className="mt-4 text-sm leading-6 text-[#8f8878]">Preview local hasta iniciar sesion.</div>
          )}
        </section>
      </aside>
    </section>
  );
}
