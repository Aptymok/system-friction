'use client';

import { useEffect, useState } from 'react';
import { translateRootState } from '@/lib/root/rootStateTranslator';
import { translateRootTwinProposal } from '@/lib/root/rootTwinProposalTranslator';

type Proposal = {
  id: string;
  title: string;
  status: string;
  risk_level: string;
  proposalType: string;
  seedHash: string | null;
  specHash: string | null;
  seedEvidenceSummary?: {
    nodes?: number;
    patterns?: number;
    documents?: number;
    nodeNames?: string[];
    patternNames?: string[];
    documentNames?: string[];
    mihmSourceState?: string | null;
    accessMode?: string | null;
  };
  expected_field_delta?: {
    objective?: string | null;
    payload?: Record<string, unknown>;
  };
  created_at?: string | null;
  updated_at?: string | null;
  payload?: Record<string, unknown>;
  linked_event_payload?: Record<string, unknown>;
  visor_summary?: Record<string, unknown>;
};

type ApiState = {
  ok: boolean;
  data?: {
    counts?: { total: number; proposed: number; approved: number; rejected: number };
    proposals?: Proposal[];
  };
  error?: string;
};

function shortHash(value?: string | null) {
  return value ? `${value.slice(0, 8)}...${value.slice(-6)}` : 'sin hash';
}

function routeFor(status: string) {
  if (status === 'proposed') return 'approve';
  if (status === 'design_approved') return 'prepare';
  if (status === 'queued') return 'outcome';
  return null;
}

function labelFor(status: string) {
  if (status === 'proposed') return 'Aprobar diseno';
  if (status === 'design_approved') return 'Preparar';
  if (status === 'queued') return 'Cerrar registro';
  return 'Cerrada';
}

function payloadFor(route: string) {
  if (route === 'outcome') {
    return {
      outcome_status: 'observed_effect',
      next_state: 'closed',
      field_effect: { ihg_delta: 0, nti_delta: 0, risk_delta: 0, notes: 'Cierre desde consola ACP.' },
      notes: 'ACP outcome recorded from root console.',
    };
  }
  return { note: 'ACP state advanced from root console. No external execution.' };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function translatedSeedState(value?: string | null) {
  return translateRootState(value ?? 'missing').label;
}

function attractorSummary(proposal: Proposal) {
  const payload = asRecord(proposal.expected_field_delta?.payload);
  const proposalPayload = asRecord(payload.proposal);
  const seedEvidence = proposal.seedEvidenceSummary ?? {};

  return {
    objective: stringValue(proposal.expected_field_delta?.objective)
      ?? stringValue(proposalPayload.objective)
      ?? proposal.title,
    direction: stringValue(proposalPayload.direction)
      ?? stringValue(proposalPayload.vector_direction)
      ?? 'pendiente: definir direccion vectorial',
    nextAction: stringValue(proposalPayload.next_action)
      ?? stringValue(proposalPayload.nextAction)
      ?? 'Responder las preguntas del atractor y preparar cierre verificable.',
    frictionNodesCount: numberValue(proposalPayload.frictionNodesCount)
      ?? numberValue(proposalPayload.friction_nodes_count)
      ?? seedEvidence.nodes
      ?? 0,
    alignedNodesCount: numberValue(proposalPayload.alignedNodesCount)
      ?? numberValue(proposalPayload.aligned_nodes_count)
      ?? seedEvidence.documents
      ?? 0,
  };
}

function plainDescription(proposal: Proposal) {
  const type = proposal.proposalType || 'propuesta';
  const preparedOnly = proposal.status === 'design_approved' || proposal.status === 'queued';
  const artifact = type === 'artifact_routing' || type.includes('artifact') || type.includes('routing');
  const attractor = type === 'attractor_draft';

  if (attractor) {
    return {
      what: 'Un borrador de atractor para decidir hacia donde debe converger el campo.',
      changes: 'Ordena direccion, nodos alineados, nodos en friccion y evidencia necesaria antes de declarar avance.',
      accept: 'Esto NO ejecuta comandos ni acciones externas. Solo aprueba el diseno del atractor para prepararlo.',
      reject: 'Si rechazas, queda trazado que esta direccion no sostiene el sistema y la friccion sigue abierta.',
      stored: 'Queda guardado en el ledger ACP. La evidencia que lo pruebe debe cerrarse en Cuadernillo o Atlas.',
      next: 'Siguiente paso: fijar una accion verificable y cerrar el registro solo cuando exista evidencia.',
    };
  }

  return {
    what: type === 'twin_proposal' ? 'Una lectura del Twin convertida en propuesta ACP.' : `Una propuesta de tipo ${type}.`,
    changes: artifact ? 'Prepara una entrada para Atlas, Cuadernillo o Sobre Negro.' : 'Cambia el estado del registro gobernado, no el mundo externo.',
    accept: preparedOnly ? 'Esto NO ejecuta nada externo. Solo deja la accion preparada.' : 'Si aceptas, apruebas el diseno y queda lista para preparar.',
    reject: 'Si rechazas, queda trazado que ACP no autorizo este movimiento.',
    stored: artifact ? 'Esto se guardara en Atlas/Cuadernillo/Sobre Negro cuando se cierre.' : 'Queda guardado en el ledger de propuestas ACP.',
    next: proposal.status === 'queued' ? 'Siguiente paso: cerrar registro con outcome.' : proposal.status === 'design_approved' ? 'Siguiente paso: preparar sin ejecucion externa.' : 'Siguiente paso: aprobar diseno o rechazar.',
  };
}

function seedEvidenceReason(proposal: Proposal) {
  const evidence = proposal.seedEvidenceSummary;
  if (!evidence) return null;

  const nodeNames = evidence.nodeNames?.length ? ` (${evidence.nodeNames.slice(0, 3).join(', ')})` : '';
  const patternNames = evidence.patternNames?.length ? ` (${evidence.patternNames.slice(0, 3).join(', ')})` : '';
  const documentNames = evidence.documentNames?.length ? ` (${evidence.documentNames.slice(0, 3).join(', ')})` : '';

  return [
    `nodos ${evidence.nodes ?? 0}${nodeNames}`,
    `patrones ${evidence.patterns ?? 0}${patternNames}`,
    `documentos ${evidence.documents ?? 0}${documentNames}`,
    `MIHM ${translatedSeedState(evidence.mihmSourceState)}`,
    `acceso ${evidence.accessMode ?? 'sin modo visible'}`,
  ].join(' / ');
}

function hasNamedSeedContext(proposal: Proposal) {
  const evidence = proposal.seedEvidenceSummary;
  return Boolean(
    evidence?.nodeNames?.length
    || evidence?.patternNames?.length
    || evidence?.documentNames?.length
  );
}

export function AcpProposalConsole({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await fetch(`/api/acp/proposals?ts=${Date.now()}`, { credentials: 'include' }).then((res) => res.json());
      setState(result);
    } finally {
      setLoading(false);
    }
  }

  async function advance(proposal: Proposal) {
    const route = routeFor(proposal.status);
    if (!route) return;

    setBusy(proposal.id);
    setMessage(null);

    try {
      const result = await fetch(`/api/acp/proposals/${proposal.id}/${route}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payloadFor(route)),
      }).then((res) => res.json());

      if (!result.ok) {
        setMessage(result.error ?? 'No fue posible avanzar la propuesta.');
      } else {
        setMessage(`Propuesta ${proposal.id.slice(0, 8)} actualizada.`);
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const counts = state?.data?.counts;
  const proposals = state?.data?.proposals ?? [];

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="flex items-start justify-between gap-3 border-b border-[#1e1c17] px-4 py-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">AMV</p>
          <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Propuestas operativas</h2>
          <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#7a7568]">AMV propone; ROOT decide. Aceptar no significa ejecutar.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="border border-[#8a7035] bg-[#2e2410] px-3 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-40">
          {loading ? 'Cargando' : 'Actualizar'}
        </button>
      </div>

      <div className="m-3 border border-[#2e2410] bg-[#12100d] p-3">
        <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#8a7035]">Lectura ROOT</div>
        <div className="mt-2 grid gap-1 text-xs leading-5 text-[#8a7568]">
          <p>AMV formula propuestas, mutaciones o acciones pendientes; no ejecuta ni bloquea decision raiz.</p>
          <p>Propuesta aceptada no es Accion de Realidad. Accion ejecutada tampoco es evidencia externa sin testigo visible.</p>
          <p>Cuando falta evidencia, nodo afectado, resultado o aprendizaje, ROOT lo declara antes de permitir cierre fuerte.</p>
        </div>
      </div>

      {!compact ? (
        <div className="grid grid-cols-4 border-b border-[#1e1c17] text-center font-mono text-[9px]">
          {[
            ['total', counts?.total ?? 0],
            ['proposed', counts?.proposed ?? 0],
            ['approved', counts?.approved ?? 0],
            ['rejected', counts?.rejected ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="border-r border-[#1e1c17] p-3 last:border-r-0">
              <div className="text-[8px] uppercase tracking-[0.16em] text-[#35312a]">{label}</div>
              <div className="mt-1 text-base text-[#c8a951]">{value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {message ? <div className="m-3 border border-[#8a7035] bg-[#2e2410] p-3 font-mono text-[9px] text-[#c8a951]">{message}</div> : null}
      {!state?.ok && state?.error ? <div className="m-3 border border-[#5a2020] bg-[#5a2020]/20 p-3 font-mono text-[9px] text-[#c87060]">{state.error}</div> : null}

      <div className="flex flex-col gap-1 p-3">
        {proposals.map((proposal, index) => {
          const evidence = proposal.seedEvidenceSummary ?? {};
          const mihmSourceState = translatedSeedState(evidence.mihmSourceState);
          const route = routeFor(proposal.status);
          const translated = translateRootTwinProposal(proposal, index);
          const attractor = proposal.proposalType === 'attractor_draft' ? attractorSummary(proposal) : null;
          const reason = seedEvidenceReason(proposal);
          const missingContext = proposal.seedEvidenceSummary && !hasNamedSeedContext(proposal);

          return (
            <article key={proposal.id} className="border border-[#1e1c17] bg-[#131210] p-3 hover:border-[#2e2c24]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-[#8a7035] px-2 py-px font-mono text-[8px] uppercase tracking-[0.12em] text-[#c8a951]">{translated.state.label}</span>
                    <span className="border border-[#2e2c24] px-2 py-px font-mono text-[8px] uppercase tracking-[0.12em] text-[#7a7568]">{translated.kind}</span>
                    <span className="border border-[#2e2c24] px-2 py-px font-mono text-[8px] uppercase tracking-[0.12em] text-[#7a7568]">{translated.layerLabel}</span>
                  </div>
                  <h3 className="mt-2 text-sm text-[#ccc8bc]">{translated.operationalTitle}</h3>
                  <p className="mt-1 font-mono text-[9px] text-[#35312a]">{proposal.id}</p>
                </div>
                {route ? (
                  <button type="button" onClick={() => void advance(proposal)} disabled={busy === proposal.id} className="border border-[#2a5a3a] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[#6ab88a] disabled:opacity-40">
                    {busy === proposal.id ? 'Procesando' : labelFor(proposal.status)}
                  </button>
                ) : <span className="border border-[#1e1c17] px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[#35312a]">cerrada</span>}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-1 text-xs leading-5 text-[#8a7568]">
                <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">Motivo</span><br />{translated.reason}</p>
                <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">Evidencia que la sostiene</span><br />{translated.evidence}</p>
                <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">Nodo afectado</span><br />{translated.affectedNode}</p>
                <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">Atractor afectado</span><br />{translated.affectedAttractor}</p>
                <p className="text-[#c8a951]"><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a7035]">Si acepto</span><br />{translated.consequenceIfAccepted}</p>
                <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">Si rechazo</span><br />{translated.consequenceIfRejected}</p>
                <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">Fecha / caducidad</span><br />{translated.date} / {translated.expiresAt}</p>
                <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">Resultado</span><br />{translated.result}</p>
                <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">Aprendizaje derivado</span><br />{translated.derivedLearning}</p>
                <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">Que falta</span><br />{translated.missing}</p>
                <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">Accion recomendada</span><br />{translated.recommendedAction}</p>
              </div>

              {reason ? (
                <div className="mt-3 border border-[#2e2410] bg-[#0b0a09] p-3 text-xs leading-5 text-[#8a7568]">
                  <p><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a7035]">Rastro semilla</span><br />La propuesta aparece porque el Twin recibio este rastro: {reason}.</p>
                  {missingContext ? (
                    <p className="mt-2"><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a7035]">Contexto faltante</span><br />Hay conteos de nodos, patrones o documentos, pero no nombres visibles. ROOT puede evaluar la cola, pero no debe tratar esos conteos como explicacion completa.</p>
                  ) : null}
                </div>
              ) : null}

              {attractor ? (
                <div className="mt-3 grid grid-cols-1 gap-1 border border-[#2e2410] bg-[#0b0a09] p-3 font-mono text-[9px] text-[#8a7568] md:grid-cols-2">
                  <div><span className="uppercase tracking-[0.12em] text-[#8a7035]">Objetivo del Atractor</span><br /><span className="text-[#ccc8bc]">{attractor.objective}</span></div>
                  <div><span className="uppercase tracking-[0.12em] text-[#8a7035]">Direccion vectorial</span><br /><span className="text-[#ccc8bc]">{attractor.direction}</span></div>
                  <div><span className="uppercase tracking-[0.12em] text-[#8a7035]">Siguiente Accion</span><br /><span className="text-[#ccc8bc]">{attractor.nextAction}</span></div>
                  <div><span className="uppercase tracking-[0.12em] text-[#8a7035]">Conteos</span><br /><span className="text-[#ccc8bc]">friccion {attractor.frictionNodesCount} / alineados {attractor.alignedNodesCount}</span></div>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-1 font-mono text-[9px] lg:grid-cols-3">
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">nodes</span><br /><span className="text-[#ccc8bc]">{evidence.nodes ?? 0}</span></div>
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">patterns</span><br /><span className="text-[#ccc8bc]">{evidence.patterns ?? 0}</span></div>
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">docs</span><br /><span className="text-[#ccc8bc]">{evidence.documents ?? 0}</span></div>
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">MIHM</span><br /><span className="text-[#ccc8bc]">{mihmSourceState}</span></div>
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">access</span><br /><span className="text-[#ccc8bc]">{evidence.accessMode ?? '-'}</span></div>
                <div className="bg-[#181614] p-2"><span className="text-[#35312a]">hash</span><br /><span className="text-[#ccc8bc]">{shortHash(proposal.seedHash ?? proposal.specHash)}</span></div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
