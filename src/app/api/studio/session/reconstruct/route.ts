import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { createCognitiveTwinEnvelope } from '@/core/cognitive-twin/contract';
import { readStudioTwinContext, registerStudioTwinRun } from '@/core/cognitive-twin/studioContext';
import type { KernelContext, KernelEvidence } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { executeSfiRuntime } from '@/lib/sfi/cognitive-runtime/runtime';
import { analyzeStudioSessionRelations } from '@/lib/studio/audio/sessionRelationalAnalysis';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Row = Record<string, unknown>;

type ReconstructionResult = {
  summary: string;
  reconstructedObjects: Array<{
    objectId: string;
    title: string;
    role: string | null;
    status: string;
    evidenceRefs: string[];
  }>;
  relations: Array<{
    statement: string;
    epistemicClass: 'OBSERVED' | 'DERIVED' | 'INFERENCE';
    evidenceRefs: string[];
  }>;
  chronology: Array<{
    at: string;
    event: string;
    objectId: string | null;
    evidenceRefs: string[];
  }>;
  contradictions: string[];
  missingEvidence: string[];
  nextAction: string;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function text(value: unknown, max = 2400): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function number01(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
}

function stringArray(value: unknown, max = 40) {
  return Array.isArray(value)
    ? value.map((item) => text(item, 1000)).filter((item): item is string => Boolean(item)).slice(0, max)
    : [];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function roleFromObject(row: Row) {
  const metadata = record(row.metadata);
  const declared = text(metadata.declaredRole ?? metadata.role, 80);
  if (declared) return declared.toUpperCase();
  const title = (text(row.title, 300) ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  if (/\bpre\s*master\b|\bpremaster\b/.test(title)) return 'PREMASTER';
  if (/\bmaster\b|\bmastered\b|\bfinal\b/.test(title)) return 'MASTER';
  if (/\breverb\b|\bverb\b/.test(title)) return 'REVERB';
  if (/\bdelay\b|\becho\b/.test(title)) return 'DELAY';
  if (/\bparallel\b/.test(title)) return 'PARALLEL';
  if (/\bbass\b|\bbajo\b/.test(title)) return 'BASS';
  if (/\bgtr\b|\bguitar\b|\bguitarra\b/.test(title)) return 'GTR';
  if (/\bvox\b|\bvocal\b|\bvoice\b|\bvoz\b/.test(title)) return 'VOX';
  if (/\binst\b|\binstrument\b|\bcassette\b|\bnoise\b/.test(title)) return 'INST';
  if (/\bfx\b|\beffects\b|\befectos\b/.test(title)) return 'FX';
  return null;
}

function stripFence(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    : trimmed;
}

function deterministicChronology(input: {
  session: Row;
  objects: Row[];
  evidence: Row[];
  hypotheses: Row[];
  interventions: Row[];
  archive: Row[];
}) {
  const events: ReconstructionResult['chronology'] = [];
  const push = (at: unknown, event: string, objectId: string | null, evidenceRefs: string[] = []) => {
    const value = text(at, 80);
    if (!value || Number.isNaN(new Date(value).getTime())) return;
    events.push({ at: new Date(value).toISOString(), event, objectId, evidenceRefs });
  };
  push(input.session.created_at, 'SESSION_CREATED', null);
  for (const item of input.objects) push(item.created_at, 'OBJECT_REGISTERED', text(item.id, 100), []);
  for (const item of input.evidence) push(item.created_at, `EVIDENCE:${text(item.source, 120) ?? 'unknown'}`, text(item.object_id, 100), text(item.id, 100) ? [String(item.id)] : []);
  for (const item of input.hypotheses) push(item.created_at, 'HYPOTHESIS_RECORDED', text(item.object_id, 100), text(item.id, 100) ? [String(item.id)] : []);
  for (const item of input.interventions) push(item.created_at, 'INTERVENTION_RECORDED', text(item.object_id, 100), text(item.id, 100) ? [String(item.id)] : []);
  for (const item of input.archive) push(item.created_at, text(item.event_type, 160) ?? 'ARCHIVE_EVENT', text(item.object_id, 100), []);
  return events.sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime()).slice(-300);
}

function evidenceFromSession(objects: Row[], evidence: Row[]): KernelEvidence[] {
  const output: KernelEvidence[] = objects.map((item) => ({
    id: `object:${String(item.id)}`,
    source: 'studio_objects',
    confidence: 1,
    payload: {
      epistemicClass: 'OBSERVED_RECORD_EXISTENCE',
      objectId: String(item.id),
      title: text(item.title),
      objectType: text(item.object_type),
      status: text(item.status),
      declaredRole: roleFromObject(item),
      metadata: record(item.metadata),
      createdAt: text(item.created_at),
      rule: 'Object existence is observed. Filename/title and declared role remain declared context until signal evidence supports the relation.',
    },
  }));

  for (const item of evidence) {
    const payload = record(item.payload);
    output.push({
      id: String(item.id),
      source: text(item.source, 180) ?? 'studio_evidence_traces',
      confidence: number01(payload.confidence ?? payload.reliability),
      payload: {
        epistemicClass: text(payload.epistemicClass ?? payload.epistemic_class, 80) ?? 'PERSISTED_TRACE',
        objectId: text(item.object_id, 100),
        label: text(item.label, 600),
        observedAt: text(payload.observedAt ?? item.created_at, 100),
        trace: payload,
      },
    });
  }
  return output.slice(0, 700);
}

function parseReconstruction(raw: string, allowedEvidence: Set<string>, deterministic: ReconstructionResult): ReconstructionResult {
  try {
    const parsed = record(JSON.parse(stripFence(raw)));
    const reconstructedObjects = Array.isArray(parsed.reconstructedObjects)
      ? parsed.reconstructedObjects.map(record).slice(0, 120).map((item) => ({
          objectId: text(item.objectId, 120) ?? '',
          title: text(item.title, 500) ?? 'Objeto',
          role: text(item.role, 120),
          status: text(item.status, 120) ?? 'UNKNOWN',
          evidenceRefs: stringArray(item.evidenceRefs, 30).filter((id) => allowedEvidence.has(id)),
        })).filter((item) => item.objectId)
      : deterministic.reconstructedObjects;
    const relations = Array.isArray(parsed.relations)
      ? parsed.relations.map(record).slice(0, 40).map((item) => {
          const requested = String(item.epistemicClass ?? 'INFERENCE').toUpperCase();
          const refs = stringArray(item.evidenceRefs, 30).filter((id) => allowedEvidence.has(id));
          const epistemicClass: 'OBSERVED' | 'DERIVED' | 'INFERENCE' = requested === 'OBSERVED' && refs.length
            ? 'OBSERVED'
            : requested === 'DERIVED' && refs.length
              ? 'DERIVED'
              : 'INFERENCE';
          return { statement: text(item.statement, 1600) ?? '', epistemicClass, evidenceRefs: refs };
        }).filter((item) => item.statement)
      : deterministic.relations;
    const chronology = Array.isArray(parsed.chronology)
      ? parsed.chronology.map(record).slice(0, 300).map((item) => ({
          at: text(item.at, 100) ?? '',
          event: text(item.event, 500) ?? 'EVENT',
          objectId: text(item.objectId, 120),
          evidenceRefs: stringArray(item.evidenceRefs, 20).filter((id) => allowedEvidence.has(id)),
        })).filter((item) => item.at && !Number.isNaN(new Date(item.at).getTime()))
      : deterministic.chronology;
    return {
      summary: text(parsed.summary, 3000) ?? deterministic.summary,
      reconstructedObjects: reconstructedObjects.length ? reconstructedObjects : deterministic.reconstructedObjects,
      relations: relations.length ? relations : deterministic.relations,
      chronology: chronology.length ? chronology : deterministic.chronology,
      contradictions: stringArray(parsed.contradictions, 30),
      missingEvidence: stringArray(parsed.missingEvidence, 30),
      nextAction: text(parsed.nextAction, 1600) ?? deterministic.nextAction,
    };
  } catch {
    return deterministic;
  }
}

async function ownedSessionState(ownerId: string, sessionId: string) {
  const db = createServiceSupabaseClient();
  const sessionResult = await db.from('studio_sessions').select('*').eq('id', sessionId).eq('owner_id', ownerId).maybeSingle();
  if (sessionResult.error || !sessionResult.data) return { db, session: null, objects: [], evidence: [], hypotheses: [], interventions: [], archive: [], warnings: [sessionResult.error?.message ?? 'session_not_found'] };
  const session = record(sessionResult.data);
  const objectsResult = await db.from('studio_objects').select('id,title,object_type,status,metadata,created_at,updated_at').eq('session_id', sessionId).eq('owner_id', ownerId).order('created_at', { ascending: true }).limit(120);
  const objects = rows(objectsResult.data);
  const objectIds = objects.map((item) => text(item.id, 100)).filter((item): item is string => Boolean(item));
  if (!objectIds.length) return { db, session, objects, evidence: [], hypotheses: [], interventions: [], archive: [], warnings: [objectsResult.error?.message ?? 'session_has_no_objects'] };
  const [evidenceResult, hypothesesResult, interventionsResult, archiveResult] = await Promise.all([
    db.from('studio_evidence_traces').select('*').in('object_id', objectIds).eq('owner_id', ownerId).order('created_at', { ascending: true }).limit(1000),
    db.from('studio_hypotheses').select('*').in('object_id', objectIds).eq('owner_id', ownerId).order('created_at', { ascending: true }).limit(500),
    db.from('studio_interventions').select('*').in('object_id', objectIds).eq('owner_id', ownerId).order('created_at', { ascending: true }).limit(500),
    db.from('studio_archive_events').select('*').eq('session_id', sessionId).eq('owner_id', ownerId).order('created_at', { ascending: true }).limit(1000),
  ]);
  return {
    db,
    session,
    objects,
    evidence: rows(evidenceResult.data),
    hypotheses: rows(hypothesesResult.data),
    interventions: rows(interventionsResult.data),
    archive: rows(archiveResult.data),
    warnings: [objectsResult.error, evidenceResult.error, hypothesesResult.error, interventionsResult.error, archiveResult.error]
      .filter(Boolean)
      .map((item) => item?.message ?? 'studio_session_source_error'),
  };
}

export async function GET(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId')?.trim() ?? '';
    if (!sessionId) return NextResponse.json({ ok: false, error: 'SESSION_ID_REQUIRED' }, { status: 400 });
    const state = await ownedSessionState(user.id, sessionId);
    if (!state.session) return NextResponse.json({ ok: false, error: 'STUDIO_SESSION_NOT_FOUND' }, { status: 404 });
    const objectIds = state.objects.map((item) => String(item.id));
    const latest = objectIds.length
      ? await state.db.from('studio_evidence_traces')
        .select('id,object_id,label,source,payload,created_at')
        .in('object_id', objectIds)
        .eq('owner_id', user.id)
        .eq('source', 'studio_session_reconstruction_v1')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      : { data: null, error: null };
    if (latest.error) return NextResponse.json({ ok: false, error: 'SESSION_RECONSTRUCTION_READ_FAILED', details: latest.error.message }, { status: 503 });
    return NextResponse.json({ ok: true, sessionId, reconstruction: latest.data ?? null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'SESSION_RECONSTRUCTION_READ_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const startedAt = new Date().toISOString();
  try {
    const { user } = await requireAuthenticatedUser();
    const body = record(await request.json().catch(() => null));
    const sessionId = text(body.sessionId, 100);
    const activeObjectId = text(body.activeObjectId, 100);
    if (!sessionId) return NextResponse.json({ ok: false, error: 'SESSION_ID_REQUIRED' }, { status: 400 });

    const state = await ownedSessionState(user.id, sessionId);
    if (!state.session) return NextResponse.json({ ok: false, error: 'STUDIO_SESSION_NOT_FOUND' }, { status: 404 });
    if (!state.objects.length) return NextResponse.json({ ok: false, error: 'STUDIO_SESSION_OBJECTS_REQUIRED' }, { status: 409 });

    const activeObject = activeObjectId
      ? state.objects.find((item) => String(item.id) === activeObjectId) ?? null
      : state.objects[state.objects.length - 1] ?? null;
    if (!activeObject) return NextResponse.json({ ok: false, error: 'ACTIVE_OBJECT_NOT_IN_SESSION' }, { status: 404 });

    const relational = await analyzeStudioSessionRelations({ sessionId, ownerId: user.id, activeObjectId: String(activeObject.id) });
    const chronology = deterministicChronology({
      session: state.session,
      objects: state.objects,
      evidence: state.evidence,
      hypotheses: state.hypotheses,
      interventions: state.interventions,
      archive: state.archive,
    });
    const kernelEvidence = evidenceFromSession(state.objects, state.evidence);
    for (const finding of relational.findings) {
      kernelEvidence.push({
        id: `relational:${finding.id}`,
        source: relational.engine,
        confidence: finding.confidence,
        payload: { ...finding, epistemicClass: finding.epistemicClass },
      });
    }

    const twin = await readStudioTwinContext();
    const taskId = `studio-session-reconstruct-${randomUUID()}`;
    const context: KernelContext = {
      cycleId: randomUUID(),
      logbookId: `studio:${sessionId}:reconstruction:${randomUUID()}`,
      phenomenonId: String(activeObject.id),
      taskId,
      currentEvent: 'STUDIO_SESSION_RECONSTRUCTION',
      evidence: kernelEvidence,
      hypotheses: state.hypotheses.slice(-12).map((item) => ({
        id: String(item.id),
        statement: text(item.statement, 1600) ?? 'Persisted Studio hypothesis',
        confidence: number01(record(item.payload).confidence),
      })),
      contradictions: [],
      simulations: [],
      predictions: [],
      risks: [],
      opportunities: [],
      metadata: {
        studioAction: 'reconstruct_session',
        requestedAgents: [
          'field_observer', 'evidence_hunter', 'temporal_resolver', 'historical_scout', 'phenotype_resolver',
          'context_builder', 'cross_impact', 'friction_field_simulator', 'cultural_simulator', 'entropy_redistribution',
          'trajectory_agent', 'risk_agent', 'opportunity_agent', 'project_execution_manager',
        ],
        llmAugmentation: true,
        preferredLlmProvider: 'groq',
        cognitiveTwinContext: twin,
        studio: {
          sessionId,
          activeObjectId: String(activeObject.id),
          objectIds: state.objects.map((item) => String(item.id)),
          relational,
          chronology,
          reconstructionRule: 'Reconstruct only from persisted private session evidence belonging to the authenticated owner. Do not import another user workspace or infer hidden DAW routing from filenames.',
        },
      },
    };

    const cycle = await executeSfiRuntime(context);
    const allowedEvidence = new Set(kernelEvidence.map((item) => item.id));
    const deterministic: ReconstructionResult = {
      summary: `Sesión ${text(state.session.title, 500) ?? sessionId}: ${state.objects.length} objetos persistidos, ${state.evidence.length} trazas de evidencia y ${relational.findings.length} relaciones derivadas disponibles para reconstrucción.`,
      reconstructedObjects: state.objects.map((item) => ({
        objectId: String(item.id),
        title: text(item.title, 500) ?? 'Objeto',
        role: roleFromObject(item),
        status: text(item.status, 120) ?? 'UNKNOWN',
        evidenceRefs: state.evidence.filter((entry) => String(entry.object_id) === String(item.id)).map((entry) => String(entry.id)).slice(0, 30),
      })),
      relations: relational.findings.map((finding) => ({
        statement: finding.statement,
        epistemicClass: 'DERIVED' as const,
        evidenceRefs: finding.evidenceObjectIds.map((id) => `object:${id}`).filter((id) => allowedEvidence.has(id)),
      })),
      chronology,
      contradictions: cycle.context.contradictions.map((item) => item.id),
      missingEvidence: state.warnings,
      nextAction: relational.audioObjectCount > 1
        ? 'Revisar la reconstrucción, corregir roles declarados si hace falta y generar una sola hipótesis falsable sólo cuando exista una divergencia material.'
        : 'Agregar al mismo campo los estados u objetos comparables necesarios antes de inferir relaciones de mezcla o trayectoria.',
    };

    const agentInsights = record(cycle.context.metadata?.agentInsights);
    const prompt = JSON.stringify({
      session: {
        id: sessionId,
        title: text(state.session.title, 500),
        objects: deterministic.reconstructedObjects,
        chronology,
      },
      persistedEvidence: state.evidence.slice(-250).map((item) => ({
        id: String(item.id),
        objectId: text(item.object_id, 100),
        source: text(item.source, 180),
        label: text(item.label, 600),
        payload: record(item.payload),
        createdAt: text(item.created_at, 100),
      })),
      hypotheses: state.hypotheses.slice(-80),
      interventions: state.interventions.slice(-80),
      relational,
      agentInsights,
      cognitiveTwin: {
        contractVersion: twin.contractVersion,
        memory: twin.memory.slice(0, 30),
        approvedDecisions: twin.decisions.slice(0, 24),
        warnings: twin.warnings,
      },
    });
    const llm = await runLlmTask({
      task: 'graph_interpretation',
      system: [
        'You reconstruct a private System Friction Institute Studio analysis session from persisted evidence.',
        'Evidence before inference. The goal is to recover the structure of the analysis, not to imitate a previous conversation.',
        'A filename or title may declare PREMASTER, MASTER, stem or role, but it does not prove routing. Signal-derived relations remain DERIVED unless independently observed.',
        'Preserve chronology, contradictions and missing evidence. Do not invent plugins, buses, processing chains, measurements or causal routing.',
        'Use only evidenceRefs that exist in the supplied session.',
        'Return only JSON: {"summary":string,"reconstructedObjects":[{"objectId":string,"title":string,"role":string|null,"status":string,"evidenceRefs":string[]}],"relations":[{"statement":string,"epistemicClass":"OBSERVED|DERIVED|INFERENCE","evidenceRefs":string[]}],"chronology":[{"at":string,"event":string,"objectId":string|null,"evidenceRefs":string[]}],"contradictions":string[],"missingEvidence":string[],"nextAction":string}.',
      ].join('\n'),
      prompt,
      fallbackResult: JSON.stringify(deterministic),
      preferredProvider: 'groq',
      maxTokens: 2200,
    });
    const result = llm.ok ? parseReconstruction(llm.result, allowedEvidence, deterministic) : deterministic;
    const finishedAt = new Date().toISOString();
    const limitations = unique([
      ...state.warnings,
      ...relational.warnings,
      ...twin.warnings,
      ...llm.warnings,
      'SESSION_RECONSTRUCTION_IS_NOT_SAMPLE_ACCURATE_DAW_ROUTING_PROOF',
      'PRIVATE_OWNER_SCOPE_REQUIRED',
    ]);

    const envelope = createCognitiveTwinEnvelope({
      taskId,
      status: llm.ok ? 'EXECUTED' : 'ESCALATED',
      modelId: llm.ok ? `${llm.provider}:${llm.model}` : null,
      result,
      claims: result.relations.map((item) => ({ statement: item.statement, epistemicClass: item.epistemicClass, evidenceRefs: item.evidenceRefs })),
      limitations,
      contradictions: result.contradictions,
      missingEvidence: result.missingEvidence,
      actionsExecuted: cycle.executedAgents.map((agent) => `agent:${agent}`),
      testsRun: [relational.audioObjectCount > 1 ? 'studio_audio_relational_v1' : 'studio_audio_relational_not_applicable', 'studio_session_reconstruction_v1'],
      recommendedTransition: result.missingEvidence.length ? 'EVIDENCE_PENDING' : 'VERIFYING',
    });

    const trace = await state.db.from('studio_evidence_traces').insert({
      object_id: String(activeObject.id),
      owner_id: user.id,
      source: 'studio_session_reconstruction_v1',
      label: `Session reconstruction · ${text(state.session.title, 500) ?? sessionId}`,
      payload: {
        observedAt: finishedAt,
        sessionId,
        activeObjectId: String(activeObject.id),
        result,
        envelope,
        relational,
        executedAgents: cycle.executedAgents,
        agentInsights,
        provider: llm.ok ? llm.provider : null,
        model: llm.ok ? llm.model : null,
        warnings: limitations,
      },
    }).select('id').single();
    if (trace.error || !trace.data) return NextResponse.json({ ok: false, error: 'SESSION_RECONSTRUCTION_PERSISTENCE_FAILED', details: trace.error?.message }, { status: 503 });

    const twinRun = await registerStudioTwinRun({
      taskId,
      role: 'studio_session_reconstruction',
      objective: `Reconstruct Studio session ${sessionId} from owner-scoped persisted objects, evidence, relations and chronology.`,
      provider: llm.ok ? llm.provider : null,
      model: llm.ok ? llm.model : null,
      status: result.missingEvidence.length ? 'EVIDENCE_PENDING' : 'READY',
      inputSnapshot: { sessionId, activeObjectId: String(activeObject.id), objectIds: state.objects.map((item) => String(item.id)), agentIds: cycle.executedAgents },
      outputEnvelope: envelope as unknown as Record<string, unknown>,
      evidenceRefs: unique([...kernelEvidence.map((item) => item.id), String(trace.data.id)]),
      limitations,
      startedAt,
      finishedAt,
    });

    await state.db.from('studio_archive_events').insert({
      session_id: sessionId,
      object_id: String(activeObject.id),
      owner_id: user.id,
      event_type: 'SESSION_RECONSTRUCTION_COMPLETED',
      label: result.summary.slice(0, 1000),
      source: 'studio_session_reconstruction_v1',
      payload: {
        evidenceId: String(trace.data.id),
        twinRunId: twinRun.id,
        objectCount: state.objects.length,
        evidenceCount: state.evidence.length,
        relationCount: result.relations.length,
        provider: llm.ok ? llm.provider : null,
        model: llm.ok ? llm.model : null,
      },
    });

    return NextResponse.json({
      ok: true,
      sessionId,
      activeObjectId: String(activeObject.id),
      result,
      relational,
      agents: { executed: cycle.executedAgents },
      llm: { ok: llm.ok, provider: llm.ok ? llm.provider : null, model: llm.ok ? llm.model : null, warnings: limitations },
      twin: { runId: twinRun.id, evidenceId: String(trace.data.id), contractVersion: twin.contractVersion },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'SESSION_RECONSTRUCTION_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
