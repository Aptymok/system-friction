import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';

type FieldContext = {
  regime: string;
  sourceState: string;
  evidenceLevel: string;
  degradation: number;
  capacity: number;
  confidence: number;
  wsi: number | null;
  nti: number | null;
  worldSpectState: 'observed' | 'degraded' | 'missing';
};

type AmvFieldResponseData = {
  responseText: string;
  responseSource: 'gemini' | 'deterministic_fallback';
  sourceState: 'observed' | 'degraded';
  confidence: number;
};

type ParsedRequest = {
  message: string;
  nodeId: string | null;
  fieldContext: FieldContext;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function sanitizeText(value: string, max = 900) {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function parseNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : 0;
}

function parseNullableNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseRequest(value: unknown): ParsedRequest | null {
  if (!isRecord(value) || typeof value.message !== 'string' || !isRecord(value.fieldContext)) return null;
  const context = value.fieldContext;
  return {
    message: sanitizeText(value.message, 500),
    nodeId: typeof value.node_id === 'string' && value.node_id.trim().length > 0
      ? value.node_id.trim()
      : typeof context.nodeId === 'string' && context.nodeId.trim().length > 0
        ? context.nodeId.trim()
        : null,
    fieldContext: {
      regime: typeof context.regime === 'string' ? sanitizeText(context.regime, 64) : 'unknown',
      sourceState: typeof context.sourceState === 'string' ? sanitizeText(context.sourceState, 64) : 'missing',
      evidenceLevel: typeof context.evidenceLevel === 'string' ? sanitizeText(context.evidenceLevel, 64) : 'none',
      degradation: parseNumber(context.degradation),
      capacity: parseNumber(context.capacity),
      confidence: parseNumber(context.confidence),
      wsi: parseNullableNumber(context.wsi),
      nti: parseNullableNumber(context.nti),
      worldSpectState: context.worldSpectState === 'observed' || context.worldSpectState === 'degraded' || context.worldSpectState === 'missing'
        ? context.worldSpectState
        : 'missing',
    },
  };
}

async function logAmvResponse(input: {
  nodeId: string | null;
  message: string;
  fieldContext: FieldContext;
  response: AmvFieldResponseData;
}) {
  if (!input.nodeId) return;

  try {
    const ctx = await ensureOwnedNode(input.nodeId);
    if (ctx.error || !ctx.node || !ctx.user) return;

    await ctx.service.from('cognitive_event_stream').insert({
      node_id: ctx.node.id,
      stream_type: 'agent',
      event_name: 'AMV_RESPONSE',
      payload: {
        message: input.message,
        responseText: input.response.responseText,
        responseSource: input.response.responseSource,
        fieldContext: input.fieldContext,
        confidence: input.response.confidence,
        sourceState: input.response.sourceState,
      },
      emitted_by: 'api/amv/field-response',
    });
  } catch {
    // Optional ledger logging must never block AMV visibility.
  }
}

function deterministicFallback(message: string, context: FieldContext): AmvFieldResponseData {
  const world = context.worldSpectState === 'observed'
    ? 'WorldSpect medido disponible'
    : context.worldSpectState === 'degraded'
      ? 'WorldSpect degradado, no usar como verdad completa'
      : 'WorldSpect faltante';
  const action = context.degradation > 0.55
    ? 'reduce alcance y registra una sola senal verificable'
    : context.capacity < 0.35
      ? 'pausa decision fuerte y pide evidencia minima'
      : 'declara la senal, observa degradacion y evita inferir mas de lo medido';

  return {
    responseText: `AMV operativo: ${world}. Lectura actual: regimen ${context.regime}, confianza ${Math.round(context.confidence * 100)}%. Siguiente accion: ${action}. Entrada recibida: "${sanitizeText(message, 120)}".`,
    responseSource: 'deterministic_fallback',
    sourceState: context.worldSpectState === 'observed' ? 'observed' : 'degraded',
    confidence: context.worldSpectState === 'observed' ? 0.62 : 0.42,
  };
}

function sanitizeGeminiOutput(value: unknown) {
  const text = typeof value === 'string' ? sanitizeText(value, 700) : '';
  if (!text) return '';
  return text
    .replace(/\byo pienso\b/gi, 'la lectura indica')
    .replace(/\byo siento\b/gi, 'la senal sugiere')
    .replace(/\bsoy consciente\b/gi, 'operacion no subjetiva')
    .slice(0, 700);
}

async function callGemini(message: string, context: FieldContext, apiKey: string): Promise<string> {
  const prompt = [
    'Eres AMV operativo dentro del Observatorio SFI.',
    'Responde breve, clinico y operacional.',
    'No digas que eres consciente. No digas que piensas. No finjas dato vivo.',
    'Si WorldSpect esta degradado, dilo claramente.',
    `Contexto: regimen=${context.regime}; sourceState=${context.sourceState}; evidenceLevel=${context.evidenceLevel}; degradation=${context.degradation}; capacity=${context.capacity}; confidence=${context.confidence}; wsi=${context.wsi ?? 'missing'}; nti=${context.nti ?? 'missing'}; worldSpectState=${context.worldSpectState}.`,
    `Mensaje del operador: ${message}`,
  ].join('\n');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 130 },
    }),
  });
  if (!response.ok) throw new Error('gemini_request_failed');
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error('gemini_invalid_payload');
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const first = candidates.find(isRecord);
  const content = first && isRecord(first.content) ? first.content : null;
  const parts = content && Array.isArray(content.parts) ? content.parts : [];
  const text = parts.filter(isRecord).map((part) => typeof part.text === 'string' ? part.text : '').join(' ');
  const sanitized = sanitizeGeminiOutput(text);
  if (!sanitized) throw new Error('gemini_empty_response');
  return sanitized;
}

export async function POST(req: NextRequest) {
  const parsed = parseRequest(await req.json().catch(() => null));
  if (!parsed || !parsed.message) {
    return NextResponse.json({ ok: false, error: 'invalid_amv_field_request' }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (key) {
    try {
      const responseText = await callGemini(parsed.message, parsed.fieldContext, key);
      const data: AmvFieldResponseData = {
        responseText,
        responseSource: 'gemini',
        sourceState: parsed.fieldContext.worldSpectState === 'observed' ? 'observed' : 'degraded',
        confidence: parsed.fieldContext.worldSpectState === 'observed' ? 0.78 : 0.58,
      };
      await logAmvResponse({ nodeId: parsed.nodeId, message: parsed.message, fieldContext: parsed.fieldContext, response: data });
      return NextResponse.json({ ok: true, data });
    } catch {
      const data = deterministicFallback(parsed.message, parsed.fieldContext);
      await logAmvResponse({ nodeId: parsed.nodeId, message: parsed.message, fieldContext: parsed.fieldContext, response: data });
      return NextResponse.json({ ok: true, data });
    }
  }

  const data = deterministicFallback(parsed.message, parsed.fieldContext);
  await logAmvResponse({ nodeId: parsed.nodeId, message: parsed.message, fieldContext: parsed.fieldContext, response: data });
  return NextResponse.json({ ok: true, data });
}
