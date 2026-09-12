import { NextRequest, NextResponse } from 'next/server';
import { runIntegratedInstitutionalCycle } from '@/core/cognitive-twin/integratedInstitutionalCycle';
import { readInstitutionalAttractor } from '@/lib/institution/institutionalAttractor';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function secret() {
  return process.env.SFI_CRON_SECRET || process.env.WORLDSPECT_INGEST_SECRET || process.env.CRON_SECRET || '';
}

function authorized(request: NextRequest) {
  const configured = secret();
  if (!configured && process.env.NODE_ENV !== 'production') return true;
  if (!configured) return false;
  return request.headers.get('authorization') === `Bearer ${configured}`;
}

async function readScheduledCycleGate() {
  const db = createServiceSupabaseClient();
  const [rootEvidence, evidenceLedger, attractorState] = await Promise.all([
    db.from('root_evidence_entries').select('id').limit(1),
    db.from('sfi_evidence_ledger').select('id').limit(1),
    readInstitutionalAttractor(),
  ]);

  const readErrors = [
    rootEvidence.error?.message,
    evidenceLedger.error?.message,
    ...attractorState.warnings,
  ].filter((value): value is string => Boolean(value));
  if (readErrors.length) {
    return {
      shouldRun: false as const,
      reason: 'INSTITUTIONAL_CYCLE_GATE_READ_FAILED' as const,
      state: null,
      errors: readErrors,
    };
  }

  const state = {
    rootEvidencePresent: (rootEvidence.data?.length ?? 0) > 0,
    evidenceLedgerPresent: (evidenceLedger.data?.length ?? 0) > 0,
    attractorDeclared: Boolean(attractorState.attractor),
  };

  return {
    shouldRun: state.rootEvidencePresent || state.evidenceLedgerPresent || state.attractorDeclared,
    reason: state.rootEvidencePresent || state.evidenceLedgerPresent || state.attractorDeclared
      ? 'ACTIONABLE_INSTITUTIONAL_INPUT'
      : 'IDLE_NO_INSTITUTIONAL_INPUT',
    state,
    errors: [],
  } as const;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const gate = await readScheduledCycleGate();
  if (!gate.shouldRun) {
    const gateFailure = gate.reason === 'INSTITUTIONAL_CYCLE_GATE_READ_FAILED';
    return NextResponse.json({
      ok: !gateFailure,
      status: gateFailure ? 'DEGRADED' : 'IDLE',
      reason: gate.reason,
      gate: gate.state,
      errors: gate.errors,
      writesPerformed: false,
      executionRule: 'A scheduled institutional cycle requires persisted institutional evidence or a declared institutional attractor. Missing purpose, empty targets and absence of institutional input do not authorize agent execution, Cognitive Twin synchronization, checkpoints, RETURN planning or memory writes. ROOT manual execution remains a separate governed path.',
    }, { status: gateFailure ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
  }

  const result = await runIntegratedInstitutionalCycle('scheduled');
  return NextResponse.json(result, { status: result.ok ? 200 : 207 });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
