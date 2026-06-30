import { NextResponse } from 'next/server';
import { runNeuralGraphAgent, type NeuralGraphFilter } from '@/lib/agents/neuralGraphAgent';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FILTERS = new Set<NeuralGraphFilter>(['evidence', 'signal', 'prospect', 'hypothesis', 'prediction', 'outcome', 'report', 'atlas', 'moph', 'world_vector', 'amv']);

export async function POST(request: Request) {
  const gate = await requireRootActor('agentic.neural_graph');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const filters = Array.isArray(body.filters)
    ? body.filters.filter((item): item is NeuralGraphFilter => typeof item === 'string' && FILTERS.has(item as NeuralGraphFilter))
    : undefined;
  const result = await runNeuralGraphAgent({
    query: typeof body.query === 'string' ? body.query : null,
    filters,
    generateInterpretation: body.generateInterpretation === true,
  });
  return NextResponse.json(result);
}
