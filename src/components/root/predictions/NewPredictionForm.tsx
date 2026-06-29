'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { getSfiPhenotypeRegistry } from '@/lib/sfi/phenotypes/registry';

type SubmitState =
  | { status: 'idle'; message: null }
  | { status: 'submitting'; message: null }
  | { status: 'error'; message: string }
  | { status: 'created'; message: string };

function textFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function optionalIsoFromForm(formData: FormData, key: string) {
  const value = textFromForm(formData, key);
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

const PHENOTYPES = getSfiPhenotypeRegistry();

export default function NewPredictionForm() {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>({ status: 'idle', message: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const probability = Number(textFromForm(formData, 'probabilidad_estimativa'));

    setState({ status: 'submitting', message: null });

    const response = await fetch('/api/sfi/predictions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: textFromForm(formData, 'case_id'),
        hypothesis_id: textFromForm(formData, 'hypothesis_id'),
        case_label: textFromForm(formData, 'case_label'),
        operator_mode: textFromForm(formData, 'operator_mode'),
        fenotipo_estimado: textFromForm(formData, 'fenotipo_estimado'),
        ep_estado_inicial: textFromForm(formData, 'ep_estado_inicial'),
        ssp_esperada: textFromForm(formData, 'ssp_esperada'),
        perturbacion_tipo: textFromForm(formData, 'perturbacion_tipo'),
        perturbacion_aplicada: textFromForm(formData, 'perturbacion_aplicada'),
        prediccion_explicita: textFromForm(formData, 'prediccion_explicita'),
        probabilidad_estimativa: probability,
        perturbation_applied_at: optionalIsoFromForm(formData, 'perturbation_applied_at'),
      }),
    });
    const body = await response.json().catch(() => null) as { entry?: { hypothesis_id?: string }; error?: string; details?: unknown } | null;

    if (!response.ok || !body?.entry?.hypothesis_id) {
      setState({
        status: 'error',
        message: body?.error ?? `prediction_create_failed_${response.status}`,
      });
      return;
    }

    setState({ status: 'created', message: 'Prediction registered.' });
    router.push(`/root/predictions/${encodeURIComponent(body.entry.hypothesis_id)}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="border border-[#5f4a18] bg-[#151108] p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Core rule</div>
        <p className="mt-3 text-sm leading-6 text-[#f5eedc]">
          Prediction must be registered before perturbation to count as predictive evidence.
        </p>
        <p className="mt-2 text-xs leading-5 text-[#9f9788]">
          If the prediction is registered after perturbation, the registry stores it as retrospective observation.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">case_id</span>
          <input required name="case_id" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
        </label>
        <label className="grid gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">hypothesis_id</span>
          <input required name="hypothesis_id" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
        </label>
        <label className="grid gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">case_label</span>
          <input name="case_label" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
        </label>
        <label className="grid gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">operator_mode</span>
          <input name="operator_mode" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">fenotipo_estimado</span>
          <select required name="fenotipo_estimado" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]">
            <option value="">Select phenotype</option>
            {PHENOTYPES.map((phenotype) => (
              <option key={phenotype.id} value={phenotype.id}>{phenotype.id} - {phenotype.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">probabilidad_estimativa</span>
          <input required name="probabilidad_estimativa" type="number" min="0" max="1" step="0.01" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
        </label>
        <label className="grid gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">ep_estado_inicial</span>
          <input required name="ep_estado_inicial" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
        </label>
        <label className="grid gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">ssp_esperada</span>
          <input required name="ssp_esperada" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">perturbacion_tipo</span>
          <input required name="perturbacion_tipo" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
        </label>
        <label className="grid gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">perturbacion_aplicada</span>
          <input required name="perturbacion_aplicada" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
        </label>
        <label className="grid gap-2 md:col-span-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">perturbation_applied_at optional</span>
          <input name="perturbation_applied_at" type="datetime-local" className="border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
        </label>
      </section>

      <label className="grid gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">prediccion_explicita</span>
        <textarea required name="prediccion_explicita" className="min-h-32 border border-[#2f2a1e] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
      </label>

      <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Phenotype boundary</div>
        <p className="mt-3 text-sm leading-6 text-[#9f9788]">
          Phenotypes are hypothesis support only. They are not identity, blame, pathology or diagnosis.
          Required before use: EP_estado, SSP, evidence source, timestamp and operator note.
        </p>
        <Link href="/library/phenotypes" className="mt-4 inline-block border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
          Open phenotype registry
        </Link>
      </section>

      {state.status === 'error' ? <p className="border border-[#5f2f28] bg-[#170d0b] p-3 text-sm text-[#d69a8b]">{state.message}</p> : null}
      {state.status === 'created' ? <p className="border border-[#314d2a] bg-[#0d170b] p-3 text-sm text-[#a8d69a]">{state.message}</p> : null}

      <button
        type="submit"
        disabled={state.status === 'submitting'}
        className="border border-[#c8a951] bg-[#c8a951] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#060605] disabled:opacity-60"
      >
        {state.status === 'submitting' ? 'Registering' : 'Register prediction'}
      </button>
    </form>
  );
}
