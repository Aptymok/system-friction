import { NextResponse } from 'next/server';
import { runMophAgent } from '@/lib/agents/sfiAgents';
import { createParticipantWindow } from '@/lib/field/participantCapture';
import {
  attachCalibrationWindow,
  calibrationPrompts,
  createInitialAttractor,
  deriveInitialAttractor,
} from '@/lib/user-interface/attractor';
import { derivePhenotype, type MiniMophInput } from '@/lib/user-interface/phenotype';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function titleFrom(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > 88 ? `${compact.slice(0, 85)}...` : compact;
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    const { data: activeCalibration } = await supabase
      .from('field_participant_windows')
      .select('id,case_id,expected_close_at')
      .eq('owner_id', user.id)
      .eq('status', 'ACTIVE')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeCalibration) {
      return NextResponse.json({
        ok: false,
        error: 'calibration_already_active',
        windowId: activeCalibration.id,
        caseId: activeCalibration.case_id,
        nextPath: '/field/participant',
      }, { status: 409 });
    }

    const payload = body as Record<string, unknown>;
    const input: MiniMophInput = {
      stuckSystem: clean(payload.stuckSystem),
      objective: clean(payload.objective),
      attempts: clean(payload.attempts),
      evidence: clean(payload.evidence),
      consequence: clean(payload.consequence),
    };

    if (input.stuckSystem.length < 12) {
      return NextResponse.json({ ok: false, error: 'stuck_system_required' }, { status: 400 });
    }
    if (payload.consent !== true) {
      return NextResponse.json({ ok: false, error: 'observation_consent_required' }, { status: 400 });
    }

    const startedAt = new Date().toISOString();
    const result = await runMophAgent({ ...input, accountId: user.id });
    const phenotype = derivePhenotype(input, result);
    const initialAttractor = deriveInitialAttractor(input, result);

    await supabase.from('field_profiles').upsert({
      user_id: user.id,
      display_name: user.email?.split('@')[0] ?? 'FIELD user',
      consent_version: 'SFI-INTERFACE-2026-08-02',
      consented_at: startedAt,
      updated_at: startedAt,
    }, { onConflict: 'user_id' });

    const { data: fieldCase, error: caseError } = await supabase
      .from('field_cases')
      .insert({
        owner_id: user.id,
        title: titleFrom(input.stuckSystem),
        domain: 'systemic_friction',
        declared_attractor: 'calibration_pending',
        baseline: input.stuckSystem,
        consent: true,
        visibility: 'private',
        verification_window: '72h',
        status: 'CALIBRATION_72H',
        metadata: {
          source: 'sfi_user_interface',
          phenotype,
          attempts: input.attempts,
          evidence: input.evidence,
          consequence: input.consequence,
          initialAttractorDisclosure: 'internal_only',
        },
      })
      .select('id')
      .single();

    if (caseError || !fieldCase) {
      return NextResponse.json({ ok: false, error: caseError?.message ?? 'field_case_persistence_failed' }, { status: 500 });
    }

    const completedAt = new Date().toISOString();
    const { data: run, error: runError } = await supabase
      .from('field_moph_runs')
      .insert({
        case_id: fieldCase.id,
        owner_id: user.id,
        status: 'COMPLETED',
        input,
        output: { ...result, phenotype, initialAttractor: { code: initialAttractor.code, confidence: initialAttractor.confidence } },
        evidence_ids: [],
        started_at: startedAt,
        completed_at: completedAt,
      })
      .select('id')
      .single();

    if (runError || !run) {
      return NextResponse.json({ ok: false, error: runError?.message ?? 'moph_run_persistence_failed' }, { status: 500 });
    }

    const attractor = await createInitialAttractor({
      ownerId: user.id,
      caseId: fieldCase.id,
      mophRunId: run.id,
      descriptor: initialAttractor,
      sourceInput: input,
      result,
    });

    const window = await createParticipantWindow(user.id, {
      watchedThoughts: calibrationPrompts(),
      caseId: fieldCase.id,
      attractorId: String(attractor.id),
      calibrationKind: 'INITIAL_ATTRACTOR',
    });
    await attachCalibrationWindow(user.id, String(attractor.id), String(window.id));

    const { error: phenotypeError } = await supabase.from('sfi_user_phenotype_profiles').insert({
      owner_id: user.id,
      case_id: fieldCase.id,
      moph_run_id: run.id,
      code: phenotype.code,
      label: phenotype.label,
      summary: phenotype.summary,
      dimensions: phenotype.dimensions,
      confidence: phenotype.confidence,
      source: 'mini_moph',
      observed_at: completedAt,
    });

    return NextResponse.json({
      ok: true,
      caseId: fieldCase.id,
      runId: run.id,
      result,
      phenotype,
      calibration: {
        required: true,
        windowId: window.id,
        expectedCloseAt: window.expected_close_at,
        instruction: 'Durante 72 horas no cambies el patrón. Cada vez que aparezca, registra qué ocurrió, qué hacías, dónde estabas y qué pasó después.',
      },
      nextPath: '/field/participant',
      warnings: phenotypeError ? ['phenotype_profile_table_not_ready'] : [],
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: error.status });
    }
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'interface_moph_failed',
    }, { status: 500 });
  }
}
