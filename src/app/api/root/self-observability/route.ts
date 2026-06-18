import { NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { runRootSelfObservability } from '@/lib/root/selfObservability';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await runRootSelfObservability();
  await appendLogbookEntry({
    scope: 'self_observability',
    visibility: 'system',
    event_type: 'self_observability_check',
    title: 'ROOT self observability',
    summary: result.ok ? 'Sistema sin faltantes detectados.' : `Sistema ${result.system_health}: ${result.missing_parts.length} piezas faltantes.`,
    payload: result,
  });
  return NextResponse.json(result);
}

