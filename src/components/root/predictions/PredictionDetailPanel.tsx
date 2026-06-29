'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import type {
  SfiPredictionEntry,
  SfiPredictionEvidenceAgentResult,
  SfiPredictionReturnWindowAgentResult,
} from '@/lib/sfi/predictions/types';
import { SFI_PREDICTION_EVIDENCE_STATES, SFI_PREDICTION_OBSERVATION_STATES } from '@/lib/sfi/predictions/types';

type DetailBody = {
  entry?: SfiPredictionEntry;
  agents?: {
    evidenceStateAgent?: SfiPredictionEvidenceAgentResult;
    returnWindowAgent?: SfiPredictionReturnWindowAgentResult;
  };
  error?: string;
};

type DetailState =
  | { status: 'loading'; error: null; body: null }
  | { status: 'ready'; error: null; body: DetailBody }
  | { status: 'blocked'; error: string; body: DetailBody | null };

function textFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export default function PredictionDetailPanel({ hypothesisId }: { hypothesisId: string }) {
  const [state, setState] = useState<DetailState>({ status: 'loading', error: null, body: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function run() {
      try {
        const response = await fetch(`/api/sfi/predictions/${encodeURIComponent(hypothesisId)}`, {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null) as DetailBody | null;

        if (!active) return;
        if (!response.ok || !body?.entry) {
          setState({
            status: 'blocked',
            error: body?.error ?? `prediction_detail_blocked_${response.status}`,
            body,
          });
          return;
        }

        setState({ status: 'ready', error: null, body });
      } catch {
        if (!active) return;
        setState({ status: 'blocked', error: 'prediction_detail_fetch_failed', body: null });
      }
    }

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [hypothesisId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);

    const cpDiasValue = textFromForm(formData, 'cp_dias');
    const response = await fetch(`/api/sfi/predictions/${encodeURIComponent(hypothesisId)}/returns`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resultado_72h: textFromForm(formData, 'resultado_72h'),
        resultado_7d: textFromForm(formData, 'resultado_7d'),
        resultado_30d: textFromForm(formData, 'resultado_30d'),
        resultado_90d: textFromForm(formData, 'resultado_90d'),
        ssp_observada: textFromForm(formData, 'ssp_observada'),
        friccion_respuesta_campo: textFromForm(formData, 'friccion_respuesta_campo'),
        ep_t_registrada: textFromForm(formData, 'ep_t_registrada'),
        cp_dias: cpDiasValue ? Number(cpDiasValue) : null,
        fallo_hipotesis: textFromForm(formData, 'fallo_hipotesis'),
        refinamiento: textFromForm(formData, 'refinamiento'),
        evidence_state: textFromForm(formData, 'evidence_state'),
        estado_observacion: textFromForm(formData, 'estado_observacion'),
      }),
    });
    const body = await response.json().catch(() => null) as DetailBody | null;
    setSaving(false);

    if (!response.ok || !body?.entry) {
      setState({
        status: 'blocked',
        error: body?.error ?? `prediction_return_update_failed_${response.status}`,
        body,
      });
      return;
    }

    setState({ status: 'ready', error: null, body });
  }

  if (state.status === 'loading') {
    return <div className="border border-[#2f2a1e] bg-[#0b0b09] p-5 text-sm text-[#8f8878]">Loading prediction entry.</div>;
  }

  if (state.status === 'blocked' || !state.body?.entry) {
    return (
      <section className="border border-[#5f2f28] bg-[#170d0b] p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d69a8b]">Blocked</div>
        <p className="mt-3 text-sm text-[#d69a8b]">{state.error}</p>
        <Link href="/root/predictions" className="mt-4 inline-block border border-[#5f2f28] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d69a8b]">
          Back to registry
        </Link>
      </section>
    );
  }

  const entry = state.body.entry;
  const evidenceAgent = state.body.agents?.evidenceStateAgent;
  const returnAgent = state.body.agents?.returnWindowAgent;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Classification</div>
          <div className="mt-2 text-lg text-[#f5eedc]">{entry.is_predictive_evidence ? 'predictive' : 'retrospective'}</div>
        </div>
        <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Evidence</div>
          <div className="mt-2 text-lg text-[#f5eedc]">{entry.evidence_state}</div>
        </div>
        <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Observation</div>
          <div className="mt-2 text-lg text-[#f5eedc]">{entry.estado_observacion}</div>
        </div>
        <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">Pending windows</div>
          <div className="mt-2 text-lg text-[#f5eedc]">{returnAgent?.pending_count ?? 'unknown'}</div>
        </div>
      </section>

      <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">{entry.hypothesis_id}</div>
        <h2 className="mt-2 text-2xl font-semibold text-[#f5eedc]">{entry.case_label || entry.case_id}</h2>
        <p className="mt-4 text-sm leading-6 text-[#d8d2c2]">{entry.prediccion_explicita}</p>
        <div className="mt-5 grid gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8f8878] md:grid-cols-2">
          <div>phenotype={entry.fenotipo_estimado}</div>
          <div>probability={entry.probabilidad_estimativa}</div>
          <div>registered_at={entry.prediction_registered_at}</div>
          <div>perturbation_at={entry.perturbation_applied_at ?? 'not_applied'}</div>
        </div>
      </section>

      <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Agents</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="border border-[#2f2a1e] bg-[#060605] p-4 text-sm text-[#d8d2c2]">
            evidence: matched={String(evidenceAgent?.prediction_matched ?? 'unknown')} failed={String(evidenceAgent?.prediction_failed ?? 'unknown')} retrospective={String(evidenceAgent?.retrospective_only ?? 'unknown')}
          </div>
          <div className="border border-[#2f2a1e] bg-[#060605] p-4 text-sm text-[#d8d2c2]">
            returns: due={returnAgent?.due_count ?? 'unknown'} overdue={returnAgent?.overdue_count ?? 'unknown'} complete={returnAgent?.complete_count ?? 'unknown'}
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="space-y-4 border border-[#2f2a1e] bg-[#0b0b09] p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Update returns</div>
        <div className="grid gap-4 md:grid-cols-2">
          {(['resultado_72h', 'resultado_7d', 'resultado_30d', 'resultado_90d'] as const).map((field) => (
            <label key={field} className="grid gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">{field}</span>
              <textarea name={field} defaultValue={entry[field] ?? ''} className="min-h-24 border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
            </label>
          ))}
          <label className="grid gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">ssp_observada</span>
            <input name="ssp_observada" defaultValue={entry.ssp_observada ?? ''} className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">friccion_respuesta_campo</span>
            <input name="friccion_respuesta_campo" defaultValue={entry.friccion_respuesta_campo ?? ''} className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">ep_t_registrada</span>
            <input name="ep_t_registrada" defaultValue={entry.ep_t_registrada ?? ''} className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">cp_dias</span>
            <input name="cp_dias" type="number" defaultValue={entry.cp_dias ?? ''} className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">fallo_hipotesis</span>
            <input name="fallo_hipotesis" defaultValue={entry.fallo_hipotesis ?? ''} className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">evidence_state</span>
            <select name="evidence_state" defaultValue={entry.evidence_state} className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]">
              {SFI_PREDICTION_EVIDENCE_STATES.map((stateValue) => <option key={stateValue} value={stateValue}>{stateValue}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">estado_observacion</span>
            <select name="estado_observacion" defaultValue={entry.estado_observacion} className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]">
              {SFI_PREDICTION_OBSERVATION_STATES.map((stateValue) => <option key={stateValue} value={stateValue}>{stateValue}</option>)}
            </select>
          </label>
          <label className="grid gap-2 md:col-span-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">refinamiento</span>
            <textarea name="refinamiento" defaultValue={entry.refinamiento ?? ''} className="min-h-24 border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
          </label>
        </div>
        <p className="text-xs leading-5 text-[#8f8878]">This update records returns only. It does not publish, promote to Atlas, mutate protocols or mutate phenotypes.</p>
        <button disabled={saving} className="border border-[#c8a951] bg-[#c8a951] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#060605] disabled:opacity-60">
          {saving ? 'Saving' : 'Save returns'}
        </button>
      </form>
    </div>
  );
}
