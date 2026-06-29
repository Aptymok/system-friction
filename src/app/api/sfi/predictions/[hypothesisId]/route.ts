import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { getPredictionEntry } from '@/lib/sfi/predictions/service';
import { runEvidenceStateAgent, runReturnWindowAgent } from '@/lib/sfi/predictions/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ hypothesisId: string }> | { hypothesisId: string };
};

async function routeHypothesisId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.hypothesisId === 'string' && params.hypothesisId.trim().length > 0
    ? decodeURIComponent(params.hypothesisId.trim())
    : null;
}

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

export async function GET(_request: Request, ctx: RouteContext) {
  const gate = await requireRoot('sfi.predictions.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const hypothesisId = await routeHypothesisId(ctx);
  if (!hypothesisId) return NextResponse.json({ ok: false, error: 'missing_hypothesis_id' }, { status: 400 });

  const result = await getPredictionEntry(hypothesisId);
  if (!result.ok) return NextResponse.json(result, { status: result.status ?? 400 });

  return NextResponse.json({
    ok: true,
    entry: result.data,
    agents: {
      evidenceStateAgent: runEvidenceStateAgent(result.data),
      returnWindowAgent: runReturnWindowAgent(result.data),
    },
    private: true,
  });
}
