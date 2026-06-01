'use client';

import { useState } from 'react';

type TwinProposalResult = {
  ok?: boolean;
  error?: string;
  data?: {
    id?: string;
    status?: string;
    risk_level?: string;
    expected_field_delta?: {
      payload?: {
        seed_evidence?: {
          nodes?: unknown[];
          patterns?: unknown[];
          documents?: unknown[];
          catalogCounts?: {
            nodeCatalog?: number;
            patternCatalog?: number;
            documentCatalog?: number;
          };
          mihmRuntimeMatrix?: {
            sourceState?: string;
            regime?: string;
          };
        };
        proposal_hash?: string;
        seed_hash?: string;
      };
    };
  };
};

const PROMPTS = [
  '¿Qué parte del campo no estoy viendo?',
  'Propón una perturbación mínima verificable.',
  '¿Qué ruta escogerías tú y por qué?',
  'Clasifica esta anomalía: Atlas, Cuadernillo o Sobre Negro.',
];

function shortHash(value?: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '—';
}

function deriveFocus(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9_\-]+/)
    .filter((term) => term.length >= 4)
    .slice(0, 8);
}

function requestedOutput(input: string) {
  const normalized = input.toLowerCase();
  if (normalized.includes('perturb')) return 'perturbation_route';
  if (normalized.includes('atlas') || normalized.includes('cuadernillo') || normalized.includes('sobre')) return 'artifact_routing';
  if (normalized.includes('ruta') || normalized.includes('escoger') || normalized.includes('elige')) return 'field_direction';
  return 'field_reading';
}

export function TwinInteractionPanel() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<TwinProposalResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(value = input) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/twin/propose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          proposal: {
            objective: trimmed,
            focus: deriveFocus(trimmed),
            requested_output: requestedOutput(trimmed),
            acp_instruction: 'Responder como superficie ACP. Crear propuesta gobernada sin ejecución automática.',
          },
        }),
      }).then((res) => res.json());
      setResult(response);
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : 'TWIN_INTERACTION_FAILED' });
    } finally {
      setLoading(false);
    }
  }

  const evidence = result?.data?.expected_field_delta?.payload?.seed_evidence;
  const payload = result?.data?.expected_field_delta?.payload;

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Twin Conversacional ACP</p>
        <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Interacción con el campo</h2>
        <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#7a7568]">
          Responde creando una propuesta gobernada. No ejecuta. No muta campo externo. Deja evidencia para ACP.
        </p>
      </div>
      <div className="p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-h-28 w-full resize-none border border-[#1e1c17] bg-[#060605] p-3 font-mono text-xs text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]"
          placeholder="Pregunta al Twin como ACP: describe el campo, solicita dirección, pide perturbación o exige clasificación…"
        />
        <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setInput(prompt);
                void submit(prompt);
              }}
              className="border border-[#1e1c17] bg-[#131210] px-3 py-2 text-left font-mono text-[9px] text-[#7a7568] hover:border-[#8a7035] hover:text-[#c8a951]"
            >
              {prompt}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={loading || !input.trim()}
          onClick={() => void submit()}
          className="mt-3 border border-[#8a7035] bg-[#2e2410] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-40"
        >
          {loading ? 'Generando propuesta' : 'Enviar al Twin'}
        </button>

        {result ? (
          <div className={`mt-3 border p-3 font-mono text-[9px] ${result.ok ? 'border-[#2a5a3a] bg-[#2a5a3a]/10 text-[#6ab88a]' : 'border-[#5a2020] bg-[#5a2020]/10 text-[#c87060]'}`}>
            {result.ok ? (
              <div className="space-y-2">
                <div className="uppercase tracking-[0.14em]">Propuesta creada · {result.data?.status ?? 'proposed'}</div>
                <div className="grid grid-cols-2 gap-1 text-[#7a7568] md:grid-cols-4">
                  <div className="bg-[#131210] p-2"><span className="text-[#35312a]">id</span><br />{result.data?.id?.slice(0, 8) ?? '—'}</div>
                  <div className="bg-[#131210] p-2"><span className="text-[#35312a]">nodes</span><br />{evidence?.nodes?.length ?? 0}</div>
                  <div className="bg-[#131210] p-2"><span className="text-[#35312a]">patterns</span><br />{evidence?.patterns?.length ?? 0}</div>
                  <div className="bg-[#131210] p-2"><span className="text-[#35312a]">docs</span><br />{evidence?.documents?.length ?? 0}</div>
                  <div className="bg-[#131210] p-2"><span className="text-[#35312a]">MIHM</span><br />{evidence?.mihmRuntimeMatrix?.sourceState ?? '—'}</div>
                  <div className="bg-[#131210] p-2"><span className="text-[#35312a]">regime</span><br />{evidence?.mihmRuntimeMatrix?.regime ?? '—'}</div>
                  <div className="bg-[#131210] p-2"><span className="text-[#35312a]">proposal</span><br />{shortHash(payload?.proposal_hash)}</div>
                  <div className="bg-[#131210] p-2"><span className="text-[#35312a]">seed</span><br />{shortHash(payload?.seed_hash)}</div>
                </div>
                <div className="text-[#8a7035]">La propuesta queda en cola ACP. Se revisa en “Propuestas”.</div>
              </div>
            ) : (
              <div>{result.error ?? 'No fue posible crear propuesta.'}</div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
