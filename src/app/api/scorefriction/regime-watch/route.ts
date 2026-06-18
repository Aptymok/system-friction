import { NextRequest, NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { buildOperationalCycle } from '@/lib/scorefriction/operationalCycle';
import { evaluateRegimeWatch } from '@/lib/scorefriction/regimeWatch';

export const dynamic = 'force-dynamic';

async function readWatch(request: NextRequest, body?: Record<string, unknown>) {
  const case_id = String(body?.case_id ?? request.nextUrl.searchParams.get('case_id') ?? 'SFI-OP-LOCAL');
  const state = await buildOperationalCycle({ case_id, scope: 'culture', analysis_modes: ['WSV', 'SCOREFRICTION', 'AMV'] });
  return evaluateRegimeWatch(state);
}

export async function GET(request: NextRequest) {
  return NextResponse.json(await readWatch(request));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const watch = await readWatch(request, body);
  if (watch.severity === 'warning' || watch.severity === 'critical') {
    await appendLogbookEntry({
      scope: 'scorefriction',
      visibility: 'root',
      case_id: typeof body.case_id === 'string' ? body.case_id : null,
      event_type: 'regime_watch_alert',
      title: 'Regime Watch alert',
      summary: `${watch.severity}: ${watch.minimal_action ?? 'requiere observacion'}`,
      payload: watch,
    });
  }
  return NextResponse.json(watch);
}

