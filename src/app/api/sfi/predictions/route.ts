import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import {
  createPredictionEntry,
  listPredictionEntries,
  normalizeCreatePredictionInput,
} from '@/lib/sfi/predictions/service';
import { runEvidenceStateAgent, runReturnWindowAgent } from '@/lib/sfi/predictions/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireRoot(action: string) {
  try {
    return await requireRootActor(action);
  } catch (error) {
    return {
      ok: false as const,
      status: 503,
      body: {
        ok: false,
        error: 'root_auth_unavailable',
        details: error instanceof Error ? error.message : 'unknown_root_auth_error',
      },
    };
  }
}

export async function GET() {
  const gate = await requireRoot('sfi.predictions.list');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const result = await listPredictionEntries({ limit: 100 });
  if (!result.ok) return NextResponse.json(result, { status: result.status ?? 400 });

  return NextResponse.json({
    ok: true,
    entries: result.data.entries,
    count: result.data.count,
    private: true,
  });
}

export async function POST(request: Request) {
  const gate = await requireRoot('sfi.predictions.create');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const normalized = normalizeCreatePredictionInput(await request.json().catch(() => ({})));
  if (!normalized.ok) return NextResponse.json(normalized, { status: normalized.status ?? 400 });

  const result = await createPredictionEntry({
    ...normalized.data,
    created_by: gate.ctx.user.id,
  });
  if (!result.ok) return NextResponse.json(result, { status: result.status ?? 400 });

  return NextResponse.json({
    ok: true,
    entry: result.data,
    agents: {
      evidenceStateAgent: runEvidenceStateAgent(result.data),
      returnWindowAgent: runReturnWindowAgent(result.data),
    },
  }, { status: 201 });
}
