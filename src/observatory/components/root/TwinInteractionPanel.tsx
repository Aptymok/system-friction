'use client';

import { useState } from 'react';

type EvidenceNode = { label?: string; nodeKey?: string; nodeType?: string };
type EvidencePattern = { label?: string; patternId?: string; riskLevel?: string };
type EvidenceDocument = { title?: string; documentId?: string };

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
          nodes?: EvidenceNode[];
          patterns?: EvidencePattern[];
          documents?: EvidenceDocument[];
          mihmRuntimeMatrix?: { sourceState?: string; regime?: string };
        };
        proposal_hash?: string;
        seed_hash?: string;
      };
    };
  };
};

const PROMPTS = [
  '¿Qué hago ahora?',
  'Explícame qué está pasando sin tecnicismos.',
  'Propón una acción pequeña que sí pueda cerrar.',
  '¿Esto va al Atlas, Cuadernillo o Sobre Negro?',
];

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
  if (normalized.includes('perturb') || normalized.includes('acción') || normalized.includes('accion') || normalized.includes('hacer')) return 'perturbation_route';
  if (normalized.includes('atlas') || normalized.includes('cuadernillo') || normalized.includes('sobre')) return 'artifact_routing';
  if (normalized.includes('ruta') || normalized.includes('escoger') || normalized.includes('elige')) return 'field_direction';
  return 'field_reading';
}

function acpAnswer(input: string, result: TwinProposalResult) {
  const evidence = result.data?.expected_field_delta?.payload?.seed_evidence;
  const output = requestedOutput(input);
  const nodes = evidence?.nodes?.length ?? 0;
  const proposalId = result.data?.id?.slice(0, 8) ?? 'sin id';

  if (output === 'perturbation_route') {
    return {
      title: 'Twin',
      body: 'Haz una sola cosa pequeña y cerrable. No abras otra explicación. Elige una acción que puedas terminar y demostrar hoy.',
      next: 'Cierra una acción menor a 25 minutos. Cuando termines, registra evidencia o mándala al Cuadernillo.',
      meta: `Propuesta técnica guardada: ${proposalId}. Evidencia usada: ${nodes} nodos.`,
    };
  }

  if (output === 'artifact_routing') {
    return {
      title: 'Twin',
      body: 'Si ya entendiste el patrón, va al Atlas. Si todavía lo estás pensando, va al Cuadernillo. Si te revuelve y no tiene forma, va al Sobre Negro.',
      next: 'No lo dejes flotando. Escoge un destino y guárdalo.',
      meta: `Propuesta técnica guardada: ${proposalId}.`,
    };
  }

  if (output === 'field_direction') {
    return {
      title: 'Twin',
      body: 'La ruta no es hacer más cosas. La ruta es cerrar lo que ya está abierto. Si el campo está cargado, reducir superficie gana más que expandir.',
      next: 'Elige una propuesta abierta, ciérrala o mándala al Cuadernillo. No abras otra capa todavía.',
      meta: `Propuesta técnica guardada: ${proposalId}.`,
    };
  }

  return {
    title: 'Twin',
    body: 'Lo que está pasando: tienes información suficiente para actuar, pero el sistema todavía no está convirtiendo eso en cierre. No necesitas más descripción; necesitas una acción verificable.',
    next: 'El siguiente movimiento es escoger: cerrar algo, guardar algo o congelar algo. No las tres.',
    meta: `Propuesta técnica guardada: ${proposalId}. Evidencia usada: ${nodes} nodos.`,
  };
}

export function TwinInteractionPanel() {
  const [input, setInput] = useState('');
  const [lastInput, setLastInput] = useState('');
  const [result, setResult] = useState<TwinProposalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTech, setShowTech] = useState(false);

  async function submit(value = input) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setLastInput(trimmed);
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
            acp_instruction: 'Responder en lenguaje simple. Crear propuesta gobernada sin ejecución automática.',
          },
        }),
      }).then(async (res) => {
        const json = await res.json().catch(() => ({ ok: false, error: `HTTP_${res.status}` }));
        if (!res.ok && !json.error) return { ...json, ok: false, error: `HTTP_${res.status}` };
        return json;
      });
      setResult(response);
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : 'TWIN_INTERACTION_FAILED' });
    } finally {
      setLoading(false);
    }
  }

  const evidence = result?.data?.expected_field_delta?.payload?.seed_evidence;
  const answer = result?.ok ? acpAnswer(lastInput, result) : null;

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Twin · Chat del campo</div>
      </div>
      <div className="p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-h-24 w-full resize-none border border-[#1e1c17] bg-[#060605] p-3 font-mono text-xs text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]"
          placeholder="Háblale normal: ¿qué hago?, ¿qué significa esto?, ¿dónde guardo esto?, ¿qué cierro primero?"
        />
        <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
          {PROMPTS.map((prompt) => (
            <button key={prompt} type="button" onClick={() => { setInput(prompt); void submit(prompt); }} className="border border-[#1e1c17] bg-[#131210] px-3 py-2 text-left font-mono text-[9px] text-[#7a7568] hover:border-[#8a7035] hover:text-[#c8a951]">
              {prompt}
            </button>
          ))}
        </div>
        <button type="button" disabled={loading || !input.trim()} onClick={() => void submit()} className="mt-3 border border-[#8a7035] bg-[#2e2410] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-40">
          {loading ? 'Pensando' : 'Enviar'}
        </button>

        {answer ? (
          <div className="mt-3 border border-[#8a7035] bg-[#2e2410]/30 p-4">
            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8a7035]">{answer.title}</div>
            <p className="mt-2 text-sm leading-6 text-[#ccc8bc]">{answer.body}</p>
            <div className="mt-3 border-l border-[#8a7035] pl-3 text-xs leading-5 text-[#c8a951]">{answer.next}</div>
            <button type="button" onClick={() => setShowTech((value) => !value)} className="mt-3 font-mono text-[8px] uppercase tracking-[0.14em] text-[#7a7568] hover:text-[#c8a951]">
              {showTech ? 'Ocultar detalle técnico' : 'Ver detalle técnico'}
            </button>
            {showTech ? <div className="mt-2 font-mono text-[8px] text-[#7a7568]">{answer.meta} MIHM: {evidence?.mihmRuntimeMatrix?.sourceState ?? '—'} · régimen: {evidence?.mihmRuntimeMatrix?.regime ?? '—'}</div> : null}
          </div>
        ) : null}

        {result && !result.ok ? <div className="mt-3 border border-[#5a2020] bg-[#5a2020]/10 p-3 font-mono text-[9px] text-[#c87060]">{result.error ?? 'No fue posible responder.'}</div> : null}
      </div>
    </section>
  );
}
