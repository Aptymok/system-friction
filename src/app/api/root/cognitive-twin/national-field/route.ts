import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import {
  ingestInegiNationalField,
  readInegiNationalFieldConfiguration,
} from '@/lib/world-observatory/inegiNationalField';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type Row = Record<string, unknown>;

export async function GET() {
  const gate = await requireRootActor('national_field.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({ ok: true, nationalField: readInegiNationalFieldConfiguration() });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('national_field.ingest');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Row;
  const result = await ingestInegiNationalField({
    includeStates: body.includeStates === true,
    includeDenue: body.includeDenue === true,
  });

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'national_field.ingest',
    target: 'world_source_observations',
    payload: {
      collected: result.collected,
      persisted: result.persisted,
      sources: result.sources,
      warningCount: result.warnings.length,
      includeStates: body.includeStates === true,
      includeDenue: body.includeDenue === true,
      epistemicClass: result.epistemicClass,
      noAutomaticFrictionReading: result.noAutomaticFrictionReading,
      noAutomaticHypothesisPromotion: result.noAutomaticHypothesisPromotion,
    },
    request,
  });

  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ok: result.ok, nationalField: result, audit }, { status: result.ok ? 200 : 503 });
}
