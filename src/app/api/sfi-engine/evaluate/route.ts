import { NextResponse } from 'next/server';
import { evaluateWithSfiEngine, type SfiEngineInput } from '@/lib/sfi-engine/client';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = normalizeInput(body);
  const result = await evaluateWithSfiEngine(input);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 502,
    headers: { 'cache-control': 'no-store' },
  });
}

function normalizeInput(body: unknown): SfiEngineInput {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const vectors = record.vectors && typeof record.vectors === 'object' && !Array.isArray(record.vectors)
    ? record.vectors as Record<string, unknown>
    : {};

  return {
    object_id: typeof record.object_id === 'string' && record.object_id.trim() ? record.object_id.trim() : 'sfi-object',
    module: typeof record.module === 'string' && record.module.trim() ? record.module.trim() : 'sfi',
    evidence: Array.isArray(record.evidence) ? record.evidence : [],
    worldspect: record.worldspect,
    vectors,
  };
}
