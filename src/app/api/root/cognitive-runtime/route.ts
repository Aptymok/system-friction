import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runPublicResearch } from '@/lib/agents/publicResearch';
import { requireRootActor } from '@/lib/root/server';
import { readOperationalCase } from '@/lib/sfi/case-platform/repository';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';
import { createKernelContext } from '@/lib/sfi/cognitive-runtime/createKernelContext';
import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
import { planCognitiveQuestion } from '@/lib/sfi/cognitive-runtime/planning';
import { runCognitiveAgent } from '@/lib/sfi/cognitive-runtime/runtimeAgentExecutor';
import { readUniversalCycleHistory } from '@/lib/sfi/universalSignalCycle';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type Row = Record<string, unknown>;
type TargetKind = 'CASE' | 'PROJECT' | 'EVIDENCE' | 'CYCLE' | 'NODE';

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 4000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function targetKind(value: unknown): TargetKind | null {
  const candidate = text(value, 30)?.toUpperCase();
  return candidate && ['CASE','PROJECT','EVIDENCE','CYCLE','NODE'].includes(candidate) ? candidate as TargetKind : null;
}

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

async function loadTarget(kind: TargetKind, id: string, userId: string) {
  const db = createServiceSupabaseClient();
  if (kind === 'CASE') {
    const value = await readOperationalCase(id, userId);
    return { kind, id, title: value.caseRecord.subject, data: value };
  }
  if (kind === 'PROJECT') {
    const project = await db.from('sfi_projects').select('*').eq('id', id).maybeSingle();
    if (project.error) throw new Error(`SFI_PROJECT_READ_FAILED:${project.error.message}`);
    if (!project.data) throw new Error('SFI_PROJECT_NOT_FOUND');
    const membership = await db.from('sfi_tenant_members').select('status').eq('tenant_id', project.data.tenant_id).eq('user_id', userId).maybeSingle();
    if (!membership.data || membership.data.status !== 'ACTIVE') throw new Error('SFI_PROJECT_FORBIDDEN');
    return { kind, id, title: String(project.data.name), data: project.data };
  }
  if (kind === 'EVIDENCE') {
    const evidence = await db.from('root_evidence_entries').select('*').eq('id', id).maybeSingle();
    if (evidence.error) throw new Error(`SFI_EVIDENCE_READ_FAILED:${evidence.error.message}`);
    if (!evidence.data) throw new Error('SFI_EVIDENCE_NOT_FOUND');
    return { kind, id, title: String(evidence.data.title ?? 'Evidencia'), data: evidence.data };
  }
  if (kind === 'CYCLE') {
    const history = await readUniversalCycleHistory(id);
    if (!history.ok) throw new Error(history.error ?? 'SFI_CYCLE_NOT_FOUND');
    const opened = row(history.opened);
    const openedPayload = row(opened.payload);
    return { kind, id, title: text(openedPayload.question) ?? text(openedPayload.objectKey) ?? `Ciclo ${id}`, data: history };
  }
  const node = await db.from('graph_nodes').select('*').or(`node_id.eq.${id},node_key.eq.${id}`).maybeSingle();
  if (node.error) throw new Error(`SFI_NODE_READ_FAILED:${node.error.message}`);
  if (!node.data) throw new Error('SFI_NODE_NOT_FOUND');
  return { kind, id, title: String(node.data.label ?? node.data.node_key ?? id), data: node.data };
}

function compactAgent(agent: (typeof SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY)[number]) {
  return {
    id: agent.id,
    name: agent.name,
    purpose: agent.purpose,
    domain: agent.domain,
    layer: agent.layer,
    authority: agent.authorityLevel,
    simulationAllowed: agent.simulationAllowed,
    humanApprovalRequired: agent.humanApprovalRequired,
    reads: agent.readsMemory,
    emits: agent.emits,
  };
}

export async function GET() {
  const gate = await requireRootActor('root.cognitive-runtime.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({
    ok: true,
    runtime: await readObservedSfiCognitiveRuntime(),
    agents: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map(compactAgent),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.cognitive-runtime.operate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Row;
  const operation = text(body.operation, 30) ?? 'plan';
  if (operation === 'plan') {
    const question = text(body.question);
    if (!question) return NextResponse.json({ ok: false, error: 'question_required' }, { status: 400 });
    const result = await planCognitiveQuestion(question, gate.ctx.user.id);
    if (!result.ok) return NextResponse.json(result, { status: 503 });
    return NextResponse.json(result);
  }

  if (operation !== 'execute') return NextResponse.json({ ok: false, error: 'unsupported_cognitive_operation' }, { status: 400 });

  const agentId = text(body.agentId, 120);
  const kind = targetKind(body.targetKind);
  const targetId = text(body.targetId, 500);
  const instruction = text(body.instruction, 5000) ?? 'Observa el objeto seleccionado y devuelve únicamente lo que esta capacidad pueda sostener.';
  const sourceUrl = text(body.url, 2000);
  const hypothesis = text(body.hypothesis, 3000);
  if (!agentId || !kind || !targetId) {
    return NextResponse.json({ ok: false, error: 'agent_and_target_required' }, { status: 400 });
  }
  const agent = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!agent) return NextResponse.json({ ok: false, error: 'agent_not_found' }, { status: 404 });

  try {
    const target = await loadTarget(kind, targetId, gate.ctx.user.id);
    const executionId = randomUUID();
    const context = createKernelContext(executionId, `root-agent:${executionId}`, 'SFI_ROOT_MANUAL_AGENT_REQUESTED');
    context.metadata = {
      actorId: gate.ctx.user.id,
      objectKey: `${kind.toLowerCase()}:${targetId}`,
      objective: instruction,
      question: instruction,
      manualRootExecution: true,
      selectedAgentId: agentId,
      target: { kind, id: targetId, title: target.title },
      sourceUrl: sourceUrl ?? null,
      aiGovernancePolicyId: 'SFI-AIMS-2026-08',
      llmAugmentation: true,
      llmAugmentationAgents: [agentId],
      epistemicBoundary: 'The selected object is context, not automatically evidence. Public research results are source candidates until explicitly admitted through evidence governance. Manual execution cannot grant itself intervention, closure, canon or truth authority.',
    };
    context.evidence.push({
      id: `target:${targetId}`,
      source: 'ROOT_MANUAL_TARGET_CONTEXT',
      confidence: 1,
      payload: {
        epistemicClass: 'record',
        targetKind: kind,
        targetId,
        title: target.title,
        data: target.data,
        boundary: 'TARGET_CONTEXT_NOT_AUTOMATICALLY_ACCEPTED_EVIDENCE',
      },
    });
    if (hypothesis) context.hypotheses.push({ id: `root-hypothesis:${executionId}`, statement: hypothesis, confidence: 0.5 });

    let research: Awaited<ReturnType<typeof runPublicResearch>> | null = null;
    const researchEligible = ['evidence_hunter','historical_scout','field_observer','context_builder'].includes(agentId);
    if (researchEligible) {
      const domain = sourceUrl ? host(sourceUrl) : null;
      const queryBase = `${target.title} ${instruction}`.slice(0, 500);
      const queries = domain
        ? [`site:${domain} ${queryBase}`]
        : [queryBase];
      research = await runPublicResearch({
        prompt: `Busca evidencia pública relevante para el objeto seleccionado. Objeto: ${target.title}. Instrucción: ${instruction}. No conviertas afirmaciones de las fuentes en hechos verificados.`,
        queries,
        country: 'MX',
        searchLang: 'es',
        timezone: 'America/Mexico_City',
      }).catch((error) => ({ ok: false, provider: 'unavailable' as const, answer: '', sources: [], queries, warnings: [error instanceof Error ? error.message : String(error)] }));
      for (const source of research.sources.slice(0, 30)) {
        context.evidence.push({
          id: source.id,
          source: 'PublicResearchCandidate',
          confidence: source.reliability,
          payload: {
            epistemicClass: 'source_claim',
            url: source.url,
            title: source.title,
            publisher: source.publisher,
            snippet: source.snippet,
            retrievedAt: source.retrievedAt,
            sourceType: source.sourceType,
            boundary: 'SOURCE_CANDIDATE_NOT_ACCEPTED_EVIDENCE',
          },
        });
      }
    }

    const result = await runCognitiveAgent(agentId, context);
    const produced = result.context.evidence.slice(1).map((item) => ({ id: item.id, source: item.source, confidence: item.confidence, payload: item.payload }));
    const researchSources = research?.sources.map((source) => ({
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      sourceType: source.sourceType,
      reliability: source.reliability,
      retrievedAt: source.retrievedAt,
    })) ?? [];
    return NextResponse.json({
      ok: true,
      execution: {
        id: executionId,
        agent: compactAgent(agent),
        target: { kind, id: targetId, title: target.title },
        executed: result.executed,
        instruction,
        sourceUrl: sourceUrl ?? null,
        findings: {
          hypotheses: result.context.hypotheses,
          contradictions: result.context.contradictions,
          predictions: result.context.predictions,
          risks: result.context.risks,
          opportunities: result.context.opportunities,
          simulations: result.context.simulations,
          produced,
          publicSources: researchSources,
        },
        humanSummary: researchEligible
          ? researchSources.length
            ? `El agente terminó. Encontró ${researchSources.length} fuentes públicas candidatas. Todavía deben admitirse como evidencia antes de sostener una conclusión.`
            : 'El agente terminó sin encontrar una fuente pública utilizable. Si la evidencia está en una fuente interna o archivo controlado, se requiere aportarla o autorizar su acceso.'
          : 'El agente terminó sobre el objeto seleccionado. Sus resultados conservan la autoridad propia de ese agente y no se convierten automáticamente en evidencia ni decisión.',
        next: researchSources.length ? 'Revisar y admitir/rechazar las fuentes pertinentes como evidencia.' : 'Revisar el resultado y, si falta información, aportar una fuente, URL o archivo autorizado.',
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'manual_agent_execution_failed', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
