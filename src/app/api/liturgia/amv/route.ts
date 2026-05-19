import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';

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

function dominantTension(context: LiturgiaContext, latestAudit?: any) {
  const ldi = Number(context.ldi ?? latestAudit?.ldi ?? 0);
  const nti = Number(context.nti ?? latestAudit?.nti ?? 0.5);
  const ihg = Number(context.ihg ?? latestAudit?.ihg ?? 0.5);
  if (ldi > 1 || ldi > ihg * 1.5) return 'disipacion longitudinal';
  if (nti < 0.35) return 'opacidad de trazabilidad';
  if (ihg < 0.35) return 'fragmentacion de gobernanza';
  return 'tension residual estable';
}

function observedLoop(context: LiturgiaContext, memoryFacts: any[], events: any[]) {
  const socialEvent = events.find((event) => event.event_name === 'social_resonance_ingested');
  if (socialEvent) {
    const score = Number(socialEvent.payload?.resonance_score);
    return Number.isFinite(score)
      ? `retorno del campo social registrado con resonancia ${score.toFixed(2)}`
      : 'retorno del campo social registrado';
  }

  const loopFact = memoryFacts.find((fact) => fact.fact_type === 'loop');
  if (loopFact?.value) return String(loopFact.value);
  const anomaly = context.anomalies?.[0];
  if (anomaly) return `reaparicion de ${anomaly} sin cierre estructural`;
  const repeated = events.find((event) => String(event.event_name || '').includes('registered'));
  return repeated ? `registro recurrente: ${repeated.event_name}` : 'loop no consolidado; observacion insuficiente';
}

function proposedAction(tension: string, context: LiturgiaContext, events: any[]) {
  const hasSocialReturn = events.some((event) => event.event_name === 'social_resonance_ingested');
  if (hasSocialReturn) {
    return 'ajustar pieza activa: reducir saturacion, elevar evidencia y medir respuesta del campo';
  }
  if (tension.includes('disipacion')) return 'reducir latencia: registrar una accion minima con responsable y fecha';
  if (tension.includes('opacidad')) return 'aumentar trazabilidad: convertir evidencia parcial en evento verificable';
  if (tension.includes('gobernanza')) return 'alinear autoridad: declarar un unico criterio de decision';
  if ((context.anomalies || []).length > 0) return `cerrar anomalia dominante: ${context.anomalies?.[0]}`;
  return 'mantener observacion y capturar el proximo residuo operativo';
}

function nextQuestion(tension: string, events: any[]) {
  const hasSocialReturn = events.some((event) => event.event_name === 'social_resonance_ingested');
  if (hasSocialReturn) return 'Que variante reduce ruido narrativo y aumenta evidencia observable frente al campo?';
  if (tension.includes('disipacion')) return 'Que accion sigue viva pero perdio fecha, responsable o criterio de cierre?';
  if (tension.includes('opacidad')) return 'Que evidencia existe pero todavia no esta registrada como traza verificable?';
  if (tension.includes('gobernanza')) return 'Quien decide realmente cuando la intencion y la ejecucion divergen?';
  return 'Que residuo se repite aunque el sistema declare estabilidad?';
}

async function ensureAmvSession(service: any, nodeId: string, userId: string, liturgiaSessionId?: string) {
  if (!liturgiaSessionId) return null;
  const { data: existing } = await service
    .from('amv_sessions')
    .select('*')
    .eq('node_id', nodeId)
    .eq('status', 'active')
    .contains('final_reading', { liturgia_session_id: liturgiaSessionId })
    .limit(1);

  if (existing?.[0]) return existing[0];

  const { data } = await service
    .from('amv_sessions')
    .insert({
      node_id: nodeId,
      user_id: userId,
      status: 'active',
      final_reading: { liturgia_session_id: liturgiaSessionId, mode: 'amv_minimal' },
    })
    .select('*')
    .single();
  return data;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as LiturgiaAmvBody;
  const message = String(body.message || '').trim();
  if (!message) return NextResponse.json({ status: 'error', message: 'message_required' }, { status: 400 });

  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error) return ctx.error;

  const [audits, actions, memoryFacts, events] = await Promise.all([
    ctx.service.from('audits').select('*').eq('node_id', ctx.node.id).order('created_at', { ascending: false }).limit(8),
    ctx.service.from('actions').select('*').eq('node_id', ctx.node.id).order('created_at', { ascending: false }).limit(8),
    ctx.service.from('memory_facts').select('*').eq('node_id', ctx.node.id).order('last_seen_at', { ascending: false }).limit(12),
    ctx.service.from('cognitive_event_stream').select('*').eq('node_id', ctx.node.id).order('created_at', { ascending: false }).limit(12),
  ]);

  const latestAudit = audits.data?.[0];
  const context = body.context || {};
  const recentEvents = events.data || [];
  const tension = dominantTension(context, latestAudit);
  const loop = observedLoop(context, memoryFacts.data || [], recentEvents);
  const action = proposedAction(tension, context, recentEvents);
  const confidence = Math.min(0.86, Math.max(0.42, 0.48 + (audits.data?.length || 0) * 0.03 + (memoryFacts.data?.length || 0) * 0.015));
  const question = nextQuestion(tension, recentEvents);
  const assistantMessage = `AMV interno registra ${tension}. Loop observado: ${loop}. Vector operativo: ${action}. Proxima pregunta: ${question}`;

  const amvSession = await ensureAmvSession(ctx.service, ctx.node.id, ctx.user.id, body.session_id);
  if (amvSession?.id) {
    await ctx.service.from('amv_messages').insert([
      { session_id: amvSession.id, node_id: ctx.node.id, role: 'user', content: message },
      { session_id: amvSession.id, node_id: ctx.node.id, role: 'assistant', content: assistantMessage },
    ]);
    await ctx.service.from('amv_sessions').update({ question_count: Number(amvSession.question_count || 0) + 1 }).eq('id', amvSession.id);
  }

  const reading = {
    dominant_tension: tension,
    observed_loop: loop,
    proposed_action: action,
    confidence: Number(confidence.toFixed(2)),
    next_question: question,
  };

  await ctx.service.from('cognitive_event_stream').insert({
    node_id: ctx.node.id,
    stream_type: 'liturgia_amv',
    event_name: 'liturgia_amv_internal_response',
    payload: {
      session_id: body.session_id || null,
      message,
      context,
      reading,
      recent_actions: actions.data?.length || 0,
      recent_audits: audits.data?.length || 0,
    },
    emitted_by: 'api/liturgia/amv',
  });

  if (loop && !loop.includes('insuficiente')) {
    await ctx.service.from('memory_facts').insert({
      node_id: ctx.node.id,
      fact_type: 'loop',
      label: 'amv_loop_detected',
      value: loop,
      confidence,
    });
  }

  return NextResponse.json({
    status: 'connected_internal',
    mode: 'amv_minimal',
    message: assistantMessage,
    reading,
  });
}
