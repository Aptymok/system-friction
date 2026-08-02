import { NextResponse } from 'next/server';

import { runAutonomousProspectRadar, type ProspectRadarInput } from '@/lib/agents/autonomousProspectRadar';
import { asRecord, auditRootAction, requireRootActor, stringValue } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

export async function GET() {
  const gate = await requireRootActor('agentic.prospect_radar.health');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({
    ok: true,
    capability: 'autonomous_prospect_radar',
    searchProviders: {
      openaiWebSearch: Boolean(process.env.OPENAI_API_KEY),
      braveSearch: Boolean(process.env.BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_API_KEY),
    },
    requirements: ['OPENAI_API_KEY or BRAVE_SEARCH_API_KEY', 'ROOT authentication', 'prospect radar migration for persistence'],
  });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('agentic.prospect_radar.execute');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = asRecord(await request.json().catch(() => ({})));
  const company = stringValue(body.company);
  const requestedMode = stringValue(body.mode);
  const mode: ProspectRadarInput['mode'] = requestedMode === 'investigate' || requestedMode === 'discover'
    ? requestedMode
    : company ? 'investigate' : 'discover';

  const input: ProspectRadarInput = {
    mode,
    company: company ?? undefined,
    sector: stringValue(body.sector) ?? undefined,
    region: stringValue(body.region) ?? 'Mexico',
    painFocus: stringValue(body.painFocus) ?? undefined,
    lookbackDays: numberValue(body.lookbackDays),
    maxCandidates: numberValue(body.maxCandidates),
    allowProvisionalOffers: body.allowProvisionalOffers === true,
  };

  try {
    const report = await runAutonomousProspectRadar(input, gate.ctx.user.id);
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'agentic.prospect_radar.execute',
      target: report.company.name,
      payload: {
        runId: report.runId,
        provider: report.researchProvider,
        company: report.company.name,
        confidence: report.confidence,
        sourceCount: report.sources.length,
        windowStart: report.criticalWindow.startDate,
        windowEnd: report.criticalWindow.endDate,
        contactVerified: report.contact.verified,
      },
      request,
    });
    if (!audit.ok) {
      return NextResponse.json({
        ok: false,
        error: 'prospect_radar_completed_but_audit_failed',
        report,
        audit,
      }, { status: 500 });
    }
    return NextResponse.json({ ok: true, report, audit });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'prospect_radar_failed',
      details: error instanceof Error ? error.message : 'unknown',
    }, { status: 500 });
  }
}
