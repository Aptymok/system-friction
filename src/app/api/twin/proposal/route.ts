import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';

type EventRow = Record<string, unknown>;
type ApiResult<TData = unknown> =
  | { ok: true; data: TData; traceId?: string; warnings?: string[] }
  | { ok: false; error: string; traceId?: string; details?: unknown };

type SignalEventRecord = {
  id: string;
  node_id: string;
  content: string;
  signal_type: string;
  sourceState: string;
  evidenceLevel: string;
  confidence: number;
  payloadHash: string | null;
  created_at: string | null;
  idempotencyKey: string | null;
};

type TwinProposal = {
  nodeId: string;
  mode: 'minimal_directional_intervention';
  observedPattern: string;
  risk: 'none' | 'low' | 'moderate' | 'high';
  trajectory: 'insufficient_data' | 'stabilizing' | 'drifting' | 'degrading' | 'active_learning';
  minimalIntervention: {
    action: string;
    reason: string;
    expectedPerturbation: 'minimal' | 'moderate';
    requiresPermission: boolean;
    permissionPrompt: string | null;
  };
  canAct: boolean;
  shouldAskPermission: boolean;
  dataUsed: {
    totalEvents: number;
    signalCount: number;
    amvResponseCount: number;
    degradation: number;
    operationalCapacity: number;
    confidence: number;
  };
  warnings: string[];
};

function apiOk<TData>(data: TData, traceId?: string, warnings?: string[]) {
  const result: ApiResult<TData> = { ok: true, data, traceId, warnings };
  return NextResponse.json(result);
}

function apiError(error: string, status = 400, traceId?: string, details?: unknown) {
  const result: ApiResult = { ok: false, error, traceId, details };
  return NextResponse.json(result, { status });
}

function apiSanitizedError(_error: unknown, status = 500, traceId?: string) {
  return apiError('internal_error', status, traceId);
}

function queryValue(req: NextRequest, key: string) {
  const value = req.nextUrl.searchParams.get(key);
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function clamp01(value: unknown) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function mapSignalEventRow(row: EventRow): SignalEventRecord | null {
  if (stringValue(row.stream_type) !== 'signal' || stringValue(row.event_name) !== 'SIGNAL_DECLARED') return null;
  const payload = isRecord(row.payload) ? row.payload : {};
  const content = stringValue(payload.content);
  const nodeId = stringValue(row.node_id);
  const id = stringValue(row.id);
  if (!content || !nodeId || !id) return null;
  return {
    id,
    node_id: nodeId,
    content,
    signal_type: stringValue(payload.signal_type) || 'manual',
    sourceState: stringValue(payload.sourceState) || 'declared',
    evidenceLevel: stringValue(payload.evidenceLevel) || 'direct',
    confidence: clamp01(payload.confidence),
    payloadHash: stringValue(payload.payloadHash),
    created_at: stringValue(row.created_at),
    idempotencyKey: stringValue(payload.idempotencyKey),
  };
}

function buildSignalReadModel(rows: EventRow[]) {
  const warnings: string[] = [];
  const signals: SignalEventRecord[] = [];
  for (const row of rows) {
    const mapped = mapSignalEventRow(row);
    if (mapped) signals.push(mapped);
    else if (stringValue(row.stream_type) === 'signal' || stringValue(row.event_name) === 'SIGNAL_DECLARED') warnings.push('invalid_signal_event_row_ignored');
  }
  return { signals, warnings: Array.from(new Set(warnings)) };
}

function countAmvResponses(rows: EventRow[]) {
  return rows.filter((row) => {
    const eventName = stringValue(row.event_name) || '';
    const streamType = stringValue(row.stream_type) || '';
    return eventName === 'AMV_RESPONSE' || streamType === 'agent';
  }).length;
}

function topSignalContent(signals: Array<{ content: string }>) {
  const counts: Record<string, number> = {};
  for (const signal of signals) {
    const key = signal.content.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  const [content, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  return content && count ? { content, count } : null;
}

function deriveMinimalFieldStateFromSignals(signals: SignalEventRecord[]) {
  if (!signals.length) {
    return { degradation: 0, operationalCapacity: 0, confidence: 0 };
  }
  const confidence = clamp01(signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length);
  const recurrencePressure = Math.min(0.45, Math.max(0, signals.length - 1) * 0.045);
  const degradation = clamp01((1 - confidence) * 0.35 + recurrencePressure);
  return {
    degradation,
    operationalCapacity: clamp01(1 - degradation),
    confidence,
  };
}

function buildProposal(nodeId: string, rows: EventRow[]): TwinProposal {
  const warnings: string[] = [];
  const signalReadModel = buildSignalReadModel(rows);
  warnings.push(...signalReadModel.warnings);

  const signals = signalReadModel.signals;
  const amvResponseCount = countAmvResponses(rows);
  const fieldState = deriveMinimalFieldStateFromSignals(signals);

  const degradation = clamp01(fieldState.degradation);
  const operationalCapacity = clamp01(fieldState.operationalCapacity);
  const confidence = clamp01(fieldState.confidence);
  const recurringSignal = topSignalContent(signals);

  if (!signals.length) warnings.push('proposal_has_no_signals');
  if (!amvResponseCount) warnings.push('proposal_has_no_agent_memory');
  if (confidence < 0.35) warnings.push('proposal_low_confidence');

  const risk: TwinProposal['risk'] = degradation >= 0.7
    ? 'high'
    : degradation >= 0.45 || operationalCapacity < 0.35
      ? 'moderate'
      : signals.length === 0
        ? 'none'
        : 'low';

  const trajectory: TwinProposal['trajectory'] = signals.length === 0
    ? 'insufficient_data'
    : degradation >= 0.65
      ? 'degrading'
      : amvResponseCount > 0 && confidence >= 0.45
        ? 'active_learning'
        : operationalCapacity >= 0.55
          ? 'stabilizing'
          : 'drifting';

  const observedPattern = signals.length === 0
    ? 'No hay señales suficientes para inferir patrón longitudinal. El twin debe observar antes de intervenir.'
    : recurringSignal && recurringSignal.count >= 2
      ? `Recurrencia detectada: "${recurringSignal.content}" aparece ${recurringSignal.count} veces en el ledger reciente.`
      : `Hay ${signals.length} señal(es) declaradas y ${amvResponseCount} respuesta(s) AMV registradas. Patrón semántico aún débil; el sistema opera con mínima inferencia.`;

  const shouldAskPermission = risk === 'moderate' || risk === 'high' || confidence < 0.5;
  const canAct = signals.length > 0 && risk !== 'high';

  const action = signals.length === 0
    ? 'Registrar una señal real más antes de proponer intervención.'
    : risk === 'high'
      ? 'No ejecutar intervención automática. Solicitar revisión humana y reducir alcance operativo.'
      : risk === 'moderate'
        ? 'Aplicar una perturbación mínima: elegir una sola acción verificable y registrar outcome en el siguiente ciclo.'
        : 'Mantener curso y registrar el próximo delta observable antes de abrir nueva rama.';

  const reason = signals.length === 0
    ? 'Sin señales reales, cualquier intervención sería narrativa sin base.'
    : risk === 'high'
      ? 'La degradación supera el umbral seguro para acción autónoma mínima.'
      : risk === 'moderate'
        ? 'Existe fricción suficiente para intervenir, pero no para alterar múltiples nodos.'
        : 'El campo no requiere fuerza adicional; requiere continuidad y silencio operativo.';

  return {
    nodeId,
    mode: 'minimal_directional_intervention',
    observedPattern,
    risk,
    trajectory,
    minimalIntervention: {
      action,
      reason,
      expectedPerturbation: risk === 'moderate' ? 'moderate' : 'minimal',
      requiresPermission: shouldAskPermission,
      permissionPrompt: shouldAskPermission
        ? 'El twin detecta fricción suficiente para intervenir. ¿Autorizas una perturbación mínima y trazable?'
        : null,
    },
    canAct,
    shouldAskPermission,
    dataUsed: {
      totalEvents: rows.length,
      signalCount: signals.length,
      amvResponseCount,
      degradation,
      operationalCapacity,
      confidence,
    },
    warnings: Array.from(new Set(warnings)),
  };
}

export async function GET(req: NextRequest) {
  const nodeId = queryValue(req, 'node_id');
  const traceId = queryValue(req, 'correlationId') || nodeId || undefined;

  if (!nodeId) {
    return apiError('missing_node_id', 400, traceId, { expectedQuery: 'node_id' });
  }

  try {
    const ctx = await ensureOwnedNode(nodeId);
    if (ctx.error || !ctx.node || !ctx.user) return apiError('node_not_ready', 404, traceId);

    const { data, error } = await ctx.service
      .from('cognitive_event_stream')
      .select('*')
      .eq('node_id', ctx.node.id)
      .order('created_at', { ascending: false })
      .limit(250);

    if (error) return apiSanitizedError(error, 500, traceId);

    const rows = Array.isArray(data) ? data.filter(isRecord) : [];
    const proposal = buildProposal(ctx.node.id, rows);

    return apiOk(proposal, traceId, proposal.warnings.length ? proposal.warnings : undefined);
  } catch (error) {
    return apiSanitizedError(error, 500, traceId);
  }
}
