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
  'que nodo esta peor',
  'muestrame degradacion',
  'que deberia cerrar primero',
  'proyecta atractor',
  'manda esto al Sobre Negro',
  'reconecta esto',
];

function normalize(input: string) {
  return input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function deriveFocus(input: string) {
  return normalize(input)
    .split(/[^a-z0-9_\-]+/)
    .filter((term) => term.length >= 4)
    .slice(0, 8);
}

function requestedOutput(input: string) {
  const normalized = normalize(input);
  if (normalized.includes('degrad') || normalized.includes('peor') || normalized.includes('atorado')) return 'degradation_reading';
  if (normalized.includes('atractor') || normalized.includes('sostener') || normalized.includes('cerrar primero') || normalized.includes('avance')) return 'attractor_definition';
  if (normalized.includes('reconecta') || normalized.includes('conexion') || normalized.includes('conexi')) return 'reconnection_proposal';
  if (normalized.includes('perturb') || normalized.includes('accion') || normalized.includes('hacer')) return 'perturbation_route';
  if (normalized.includes('atlas') || normalized.includes('cuadernillo') || normalized.includes('sobre')) return 'artifact_routing';
  if (normalized.includes('ruta') || normalized.includes('escoger') || normalized.includes('elige')) return 'field_direction';
  return 'field_reading';
}

function acpAnswer(input: string, result: TwinProposalResult, selectedNodeLabel?: string | null) {
  const evidence = result.data?.expected_field_delta?.payload?.seed_evidence;
  const output = requestedOutput(input);
  const nodes = evidence?.nodes?.length ?? 0;
  const proposalId = result.data?.id?.slice(0, 8) ?? 'sin id';
  const node = selectedNodeLabel ? ` en ${selectedNodeLabel}` : '';

  if (output === 'perturbation_route') {
    return {
      title: 'Twin',
      happening: `Hay demasiada presion abierta${node}.`,
      doThis: 'Haz una perturbacion minima: una accion que puedas probar hoy.',
      place: 'Toca Preparar en Propuestas. Si queda duda, mandalo al Cuadernillo.',
      avoid: 'No ejecutes nada externo. Esto solo deja la accion preparada.',
      meta: `Propuesta tecnica guardada: ${proposalId}. Evidencia usada: ${nodes} nodos.`,
    };
  }

  if (output === 'artifact_routing') {
    return {
      title: 'Twin',
      happening: 'Esto necesita destino, no mas lectura.',
      doThis: 'Si ya esta claro va al Atlas. Si esta vivo va al Cuadernillo. Si pesa y no tiene forma va al Sobre Negro.',
      place: 'Abre Atlas / Cuadernillo / Sobre Negro y guarda una entrada.',
      avoid: 'No lo cierres como evidencia confirmada si todavia no esta probado.',
      meta: `Propuesta tecnica guardada: ${proposalId}.`,
    };
  }

  if (output === 'field_direction') {
    return {
      title: 'Twin',
      happening: 'La ruta no es abrir mas superficie.',
      doThis: 'Cierra una cosa ya abierta o congelala con destino claro.',
      place: 'Usa Propuestas para cerrar registro, o Cuadernillo si todavia requiere trabajo.',
      avoid: 'No abras otra capa todavia.',
      meta: `Propuesta tecnica guardada: ${proposalId}.`,
    };
  }

  if (output === 'degradation_reading') {
    return {
      title: 'Twin',
      happening: `Esto esta atorado${node || ' en los nodos con mas rojo'}.`,
      doThis: 'Primero cierra el nodo con peor degradacion o agrega evidencia faltante.',
      place: 'Toca Observar en el nodo y luego Preparar en Propuestas.',
      avoid: 'No lo metas al Atlas todavia si no hay evidencia.',
      meta: `Propuesta tecnica guardada: ${proposalId}. Evidencia usada: ${nodes} nodos.`,
    };
  }

  if (output === 'attractor_definition') {
    return {
      title: 'Twin',
      happening: 'Falta declarar hacia donde cuenta como avance.',
      doThis: 'Define que sostener, que cerrar y que no repetir.',
      place: 'Deja el atractor como propuesta preparada. La evidencia de cambio va al Cuadernillo hasta que se pruebe.',
      avoid: 'No declares cambio de regimen sin una senal verificable.',
      meta: `Propuesta tecnica guardada: ${proposalId}.`,
    };
  }

  if (output === 'reconnection_proposal') {
    return {
      title: 'Twin',
      happening: `Hay una conexion que puede estar jalando energia${node}.`,
      doThis: 'Prepara reconexion, pero revisa evidencia antes de moverla.',
      place: 'Usa Preparar en Propuestas. Si la conexion no deberia existir, manda nota al Sobre Negro 24h.',
      avoid: 'No borres ni ejecutes la reconexion sin autorizacion explicita.',
      meta: `Propuesta tecnica guardada: ${proposalId}.`,
    };
  }

  return {
    title: 'Twin',
    happening: `Hay lectura suficiente${node}, pero falta cierre.`,
    doThis: 'Escoge una sola salida: cerrar, guardar o congelar.',
    place: 'Si hay evidencia, cierra registro. Si no, Cuadernillo o Sobre Negro.',
    avoid: 'No hagas tres movimientos a la vez.',
    meta: `Propuesta tecnica guardada: ${proposalId}. Evidencia usada: ${nodes} nodos.`,
  };
}

export function TwinInteractionPanel({
  compact = false,
  selectedNodeLabel,
  onArtifactIntent,
}: {
  compact?: boolean;
  selectedNodeLabel?: string | null;
  onArtifactIntent?: () => void;
}) {
  const [input, setInput] = useState('');
  const [lastInput, setLastInput] = useState('');
  const [result, setResult] = useState<TwinProposalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTech, setShowTech] = useState(false);

  async function submit(value = input) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const output = requestedOutput(trimmed);
    if (output === 'artifact_routing') onArtifactIntent?.();
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
            requested_output: output,
            proposalType: output,
            selected_node: selectedNodeLabel ?? null,
            acp_instruction: 'Responder simple. Crear propuesta gobernada sin ejecucion automatica.',
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
  const answer = result?.ok ? acpAnswer(lastInput, result, selectedNodeLabel) : null;

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Twin / control del campo</div>
        {selectedNodeLabel ? <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#c8a951]">nodo activo: {selectedNodeLabel}</div> : null}
      </div>
      <div className="p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className={`${compact ? 'min-h-20' : 'min-h-24'} w-full resize-none border border-[#1e1c17] bg-[#060605] p-3 font-mono text-xs text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]`}
          placeholder="Hablale normal: que nodo esta peor, proyecta atractor, manda esto al Sobre Negro, reconecta esto"
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
            <div className="mt-2 space-y-2 text-sm leading-6 text-[#ccc8bc]">
              <p>{answer.happening}</p>
              <p>{answer.doThis}</p>
              <p className="text-[#c8a951]">{answer.place}</p>
              <p className="text-[#c87060]">{answer.avoid}</p>
            </div>
            <button type="button" onClick={() => setShowTech((value) => !value)} className="mt-3 font-mono text-[8px] uppercase tracking-[0.14em] text-[#7a7568] hover:text-[#c8a951]">
              {showTech ? 'Ocultar detalle tecnico' : 'Ver detalle tecnico'}
            </button>
            {showTech ? <div className="mt-2 font-mono text-[8px] text-[#7a7568]">{answer.meta} MIHM: {evidence?.mihmRuntimeMatrix?.sourceState ?? '-'} / regimen: {evidence?.mihmRuntimeMatrix?.regime ?? '-'}</div> : null}
          </div>
        ) : null}

        {result && !result.ok ? <div className="mt-3 border border-[#5a2020] bg-[#5a2020]/10 p-3 font-mono text-[9px] text-[#c87060]">{result.error ?? 'No fue posible responder.'}</div> : null}
      </div>
    </section>
  );
}
