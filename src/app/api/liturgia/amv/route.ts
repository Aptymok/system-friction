import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';
import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';
import { writeInstitutionalMemory } from '@/core/memory/InstitutionalMemoryWriter';

type LiturgiaContext = {
  entity?: string;
  phenomenon?: string;
  anomalies?: string[];
  ihg?: number;
  nti?: number;
  ldi?: number;
  xi?: number;
  phi?: number;
  regime?: string;
};

type LiturgiaAmvBody = {
  node_id?: string | null;
  session_id?: string;
  message?: string;
  context?: LiturgiaContext;
};

function dominantTension(context: LiturgiaContext) {
  const ldi = typeof context.ldi === 'number' ? context.ldi : null;
  const nti = typeof context.nti === 'number' ? context.nti : null;
  const ihg = typeof context.ihg === 'number' ? context.ihg : null;
  if (ldi !== null && (ldi > 1 || (ihg !== null && ldi > ihg * 1.5))) return 'disipacion longitudinal';
  if (nti !== null && nti < 0.35) return 'opacidad de trazabilidad';
  if (ihg !== null && ihg < 0.35) return 'fragmentacion de gobernanza';
  if (ldi === null && nti === null && ihg === null) return 'tension no medida';
  return 'tension residual estable';
}

function observedLoop(context: LiturgiaContext, events: Array<Record<string, any>>) {
  const socialEvent = events.find((event) => event.event_name === 'social_resonance_ingested');
  if (socialEvent) {
    const score = Number(socialEvent.payload?.resonance_score);
    return Number.isFinite(score)
      ? `retorno del campo social registrado con resonancia ${score.toFixed(2)}`
      : 'retorno del campo social registrado';
  }
  const anomaly = context.anomalies?.[0];
  if (anomaly) return `reaparicion de ${anomaly} sin cierre estructural`;
  const repeated = events.find((event) => String(event.event_name || '').includes('registered'));
  return repeated ? `registro recurrente: ${repeated.event_name}` : 'loop no consolidado; observacion insuficiente';
}

function proposedAction(tension: string, context: LiturgiaContext, events: Array<Record<string, any>>) {
  const hasSocialReturn = events.some((event) => event.event_name === 'social_resonance_ingested');
  if (hasSocialReturn) return 'ajustar pieza activa: reducir saturacion, elevar evidencia y medir respuesta del campo';
  if (tension.includes('disipacion')) return 'reducir latencia: registrar una accion minima con responsable y fecha';
  if (tension.includes('opacidad')) return 'aumentar trazabilidad: convertir evidencia parcial en evento verificable';
  if (tension.includes('gobernanza')) return 'alinear autoridad: declarar un unico criterio de decision';
  if ((context.anomalies || []).length > 0) return `cerrar anomalia dominante: ${context.anomalies?.[0]}`;
  return 'mantener observacion y capturar el proximo residuo operativo';
}

function nextQuestion(tension: string, events: Array<Record<string, any>>) {
  const hasSocialReturn = events.some((event) => event.event_name === 'social_resonance_ingested');
  if (hasSocialReturn) return 'Que variante reduce ruido narrativo y aumenta evidencia observable frente al campo?';
  if (tension.includes('disipacion')) return 'Que accion sigue viva pero perdio fecha, responsable o criterio de cierre?';
  if (tension.includes('opacidad')) return 'Que evidencia existe pero todavia no esta registrada como traza verificable?';
  if (tension.includes('gobernanza')) return 'Quien decide realmente cuando la intencion y la ejecucion divergen?';
  return 'Que residuo se repite aunque el sistema declare estabilidad?';
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as LiturgiaAmvBody;
  const message = String(body.message || '').trim();
  if (!message) return NextResponse.json({ status: 'error', message: 'message_required' }, { status: 400 });

  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error || !ctx.node || !ctx.user) return ctx.error ?? NextResponse.json({ error: 'node_not_ready' }, { status: 404 });

  const { data: events, error: eventsError } = await ctx.service
    .from('epistemic_events')
    .select('id,event_name,payload,created_at')
    .eq('actor_id', ctx.user.id)
    .eq('node_id', ctx.node.id)
    .order('created_at', { ascending: false })
    .limit(12);

  if (eventsError) return NextResponse.json({ status: 'error', message: 'amv_context_unavailable' }, { status: 500 });

  const context: LiturgiaContext = {
    ...(body.context || {}),
    ihg: body.context?.ihg ?? ctx.node.current_ihg ?? undefined,
    nti: body.context?.nti ?? ctx.node.current_nti ?? undefined,
    ldi: body.context?.ldi ?? ctx.node.current_ldi ?? undefined,
  };
  const recentEvents = Array.isArray(events) ? events : [];
  const tension = dominantTension(context);
  const loop = observedLoop(context, recentEvents);
  const action = proposedAction(tension, context, recentEvents);
  const confidence = Math.min(0.82, Math.max(0.35, 0.42 + Math.min(12, recentEvents.length) * 0.02));
  const question = nextQuestion(tension, recentEvents);
  const assistantMessage = `AMV interno registra ${tension}. Loop observado: ${loop}. Vector operativo: ${action}. Proxima pregunta: ${question}`;

  const reading = {
    dominant_tension: tension,
    observed_loop: loop,
    proposed_action: action,
    confidence: Number(confidence.toFixed(2)),
    next_question: question,
  };

  const emitted = await emitEpistemicEvent({
    eventName: 'liturgia_amv_internal_response',
    logbookId: `ACTOR:${ctx.user.id}`,
    epistemicClass: 'inferred',
    schemaVersion: '2026-09-21.actor-event.v1',
    sourceId: body.session_id || createHash('sha256').update(message).digest('hex').slice(0, 24),
    sourceType: 'api/liturgia/amv',
    actorId: ctx.user.id,
    nodeId: ctx.node.id,
    confidence,
    payload: {
      streamType: 'liturgia_amv',
      session_id: body.session_id || null,
      message,
      context,
      reading,
    },
    uncertainty: tension === 'tension no medida' ? 'MIHM actor metrics unavailable' : null,
  });

  if (!emitted.ok) return NextResponse.json({ status: 'error', message: 'amv_event_persist_failed' }, { status: 500 });

  const memory = await writeInstitutionalMemory({
    source: 'liturgia_amv',
    entityType: 'ACTOR_LITURGIA_RESPONSE',
    entityId: emitted.event.id,
    eventType: 'liturgia_amv_internal_response',
    confidence,
    provenance: {
      epistemic_event_id: emitted.event.id,
      actor_id: ctx.user.id,
      node_id: ctx.node.id,
      session_id: body.session_id || null,
    },
    authorization: {
      mode: 'internal_response',
      external_execution: false,
      human_validation_required: true,
    },
    payload: {
      caseId: body.session_id || `actor:${ctx.user.id}`,
      message,
      context,
      reading,
      assistantMessage,
      observed_loop: loop.includes('insuficiente') ? null : loop,
    },
  });

  return NextResponse.json({
    status: 'connected_internal',
    mode: 'amv_minimal',
    message: assistantMessage,
    reading,
    memory_persisted: memory.ok,
    warnings: memory.ok ? [] : ['amv_memory_not_persisted'],
  });
}
