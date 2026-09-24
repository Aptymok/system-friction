import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from '@/runtime/supabase/url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AUTH_SCOPE = 'METHOD_LAB_INSTITUTIONAL_CYCLE_MIRROR_RETURN_PUBLICATION';

type Row = Record<string, any>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))]
    : [];
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function equalHex(a: string, b: string) {
  if (!/^[0-9a-f]{64}$/i.test(a) || !/^[0-9a-f]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1600) : String(error).slice(0, 1600);
}

function canonicalPrimaryClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawUrl || !serviceRoleKey) throw new Error('CLOSURE_ONCE_PRIMARY_CLIENT_NOT_CONFIGURED');
  const url = normalizeSupabaseUrl(rawUrl);
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch,
      headers: {
        'X-Client-Info': 'sfi-closure-once-primary',
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const cycleId = request.nextUrl.searchParams.get('cycleId')?.trim() || '';
  const nonce = request.nextUrl.searchParams.get('nonce')?.trim() || '';

  if (!/^[0-9a-f-]{36}$/i.test(cycleId) || nonce.length < 32) {
    return NextResponse.json({ ok: false, error: 'closure_once_identity_required' }, { status: 400 });
  }

  const db = canonicalPrimaryClient();
  const cycleRead = await db
    .from('sfi_operating_cycles')
    .select('id,owner_id,cycle_code,status,evidence_refs,method_lab_refs,cognitive_twin_refs,metadata')
    .eq('id', cycleId)
    .maybeSingle();

  if (cycleRead.error || !cycleRead.data) {
    return NextResponse.json({
      ok: false,
      error: 'closure_once_cycle_not_found_in_primary',
      details: cycleRead.error?.message ?? null,
    }, { status: 404 });
  }

  const cycle = cycleRead.data as Row;
  const metadata = row(cycle.metadata);
  const expectedHash = typeof metadata.closureInvokeNonceHash === 'string' ? metadata.closureInvokeNonceHash : '';
  const expiresAt = typeof metadata.closureInvokeExpiresAt === 'string' ? Date.parse(metadata.closureInvokeExpiresAt) : NaN;
  const consumedAt = typeof metadata.closureInvokeConsumedAt === 'string' ? metadata.closureInvokeConsumedAt : null;

  if (
    metadata.machineExecutionAuthorized !== true ||
    metadata.machineExecutionScope !== AUTH_SCOPE ||
    !expectedHash ||
    !Number.isFinite(expiresAt) ||
    Date.now() > expiresAt ||
    consumedAt ||
    !equalHex(expectedHash, sha256(nonce))
  ) {
    return NextResponse.json({ ok: false, error: 'closure_once_not_authorized' }, { status: 403 });
  }

  const ownerId = String(cycle.owner_id);
  const profile = await db.from('profiles').select('user_id,role').eq('user_id', ownerId).maybeSingle();
  if (profile.error || !profile.data || String(profile.data.role).toLowerCase() !== 'root') {
    return NextResponse.json({ ok: false, error: 'closure_once_owner_not_root' }, { status: 403 });
  }

  const consumedIso = new Date().toISOString();
  const consumedMetadata = {
    ...metadata,
    closureInvokeConsumedAt: consumedIso,
    closureInvokeNonceHash: null,
  };

  const consume = await db.from('sfi_operating_cycles').update({
    metadata: consumedMetadata,
    updated_at: consumedIso,
  }).eq('id', cycleId).eq('owner_id', ownerId);

  if (consume.error) {
    return NextResponse.json({ ok: false, error: 'closure_once_consume_failed', details: consume.error.message }, { status: 503 });
  }

  await db.from('sfi_audit_events').insert({
    actor_id: ownerId,
    action: 'SFI_OPERATING_CYCLE_CLOSURE_ONCE_INVOKED',
    target_type: 'sfi_operating_cycle',
    target_id: cycleId,
    before_state: { status: cycle.status },
    after_state: { consumedAt: consumedIso },
    context: {
      authority: 'FOUNDER_AUTHORIZED_ADMIN_CLOSURE',
      machineExecutionScope: AUTH_SCOPE,
      route: '/api/internal/closure-once',
      authorityPlane: 'SUPABASE_PRIMARY_DIRECT',
    },
  });

  try {
    const [
      { flushPrimaryMirror, readPrimaryOutboxStatus },
      { recoverPrimaryDataPlane },
      { readDataPlaneState },
    ] = await Promise.all([
      import('@/lib/persistence/primaryMirror'),
      import('@/lib/persistence/continuityRecovery'),
      import('@/lib/persistence/dataPlaneContinuityStore'),
    ]);

    const mirrorBeforeRuntime = await flushPrimaryMirror({ maxTransactions: 32 });
    if (!mirrorBeforeRuntime.ok) {
      throw new Error(`CLOSURE_ONCE_PRIMARY_TO_CONTINUITY_MIRROR_BLOCKED:${JSON.stringify(mirrorBeforeRuntime).slice(0, 1000)}`);
    }

    const recovery = await recoverPrimaryDataPlane({ maxTransactions: 64 });
    if (!recovery.ok) {
      throw new Error(`CLOSURE_ONCE_RECOVERY_BLOCKED:${JSON.stringify(recovery).slice(0, 1200)}`);
    }

    const dataPlaneState = await readDataPlaneState();
    if (dataPlaneState.mode !== 'PRIMARY') {
      throw new Error(`CLOSURE_ONCE_PRIMARY_NOT_ACTIVE_AFTER_RECOVERY:${dataPlaneState.mode}`);
    }

    const [{ runMethodLabSimulation }, { runIntegratedInstitutionalCycle }] = await Promise.all([
      import('@/lib/method-lab/simulationRun'),
      import('@/core/cognitive-twin/integratedInstitutionalCycle'),
    ]);

    const evidenceRefs = strings(cycle.evidence_refs);
    if (!evidenceRefs.length) throw new Error('CLOSURE_ONCE_EVIDENCE_REQUIRED');

    let methodLabRefs = strings(cycle.method_lab_refs);
    let labAnalysisId = methodLabRefs[0] ?? null;
    let labReceipt: Row = { reused: Boolean(labAnalysisId), labAnalysisId };

    if (!labAnalysisId) {
      const lab = await runMethodLabSimulation({
        protocolId: 'sociotechnical_simulation',
        evidenceIds: evidenceRefs,
        actorId: ownerId,
        parameters: {
          operatingCycleId: cycleId,
          cycleCode: cycle.cycle_code,
          purpose: 'Operational mirror closure contrast',
          claimBoundary: 'SIMULATED output only. The mirror RETURN is observed separately.',
        },
      });
      labAnalysisId = lab.labAnalysisId;
      methodLabRefs = [...new Set([...methodLabRefs, labAnalysisId])];
      labReceipt = {
        reused: false,
        labAnalysisId,
        epistemicClass: lab.run.epistemicClass,
        validationLevel: lab.run.validationLevel,
        resultHash: lab.run.resultHash,
        evidenceRefs: lab.run.evidenceRefs,
      };
    }

    const institutional = await runIntegratedInstitutionalCycle(`closure_once:${cycleId}`);
    const institutionalRunId = institutional.run?.id ? String(institutional.run.id) : null;
    const cognitiveTwinRefs = [...new Set([
      ...strings(cycle.cognitive_twin_refs),
      ...(institutionalRunId ? [institutionalRunId] : []),
    ])];

    const runtimeObservedAt = new Date().toISOString();
    const preliminaryMirrorStatus = await readPrimaryOutboxStatus();
    const runtimeReceipt = {
      executedAt: runtimeObservedAt,
      authorityPlane: 'SUPABASE_PRIMARY_DIRECT',
      preRuntimeMirror: mirrorBeforeRuntime,
      recovery,
      dataPlaneModeBeforeRuntime: dataPlaneState.mode,
      methodLab: labReceipt,
      institutionalCycle: {
        ok: institutional.ok,
        status: institutional.status,
        closureState: institutional.closureState,
        runId: institutionalRunId,
        agentCount: institutional.agentCount,
        connected: institutional.cognitiveTwinIntegration.connected,
        exercised: institutional.cognitiveTwinIntegration.exercised,
        warnings: institutional.warnings,
      },
      preliminaryMirrorStatus,
      claimBoundary: 'Method Lab remains SIMULATED. Institutional runtime state is recorded separately. Mirror state is OBSERVED operational state and does not imply scientific or external validation.',
    };

    const update = await db.from('sfi_operating_cycles').update({
      method_lab_refs: methodLabRefs,
      cognitive_twin_refs: cognitiveTwinRefs,
      metadata: {
        ...consumedMetadata,
        closureOnceRuntimeReceipt: runtimeReceipt,
      },
      updated_at: runtimeObservedAt,
    }).eq('id', cycleId).eq('owner_id', ownerId);

    if (update.error) throw new Error(`CLOSURE_ONCE_LINK_FAILED:${update.error.message}`);

    await db.from('sfi_audit_events').insert({
      actor_id: ownerId,
      action: 'SFI_OPERATING_CYCLE_CLOSURE_ONCE_COMPLETED',
      target_type: 'sfi_operating_cycle',
      target_id: cycleId,
      before_state: { status: cycle.status },
      after_state: {
        labAnalysisId,
        institutionalRunId,
        dataPlaneMode: dataPlaneState.mode,
      },
      context: {
        authority: 'FOUNDER_AUTHORIZED_ADMIN_CLOSURE',
        methodLabEpistemicClass: 'SIMULATED',
        primaryRecoveredBeforeRuntime: true,
      },
    });

    const finalMirror = await flushPrimaryMirror({ maxTransactions: 32 });
    const finalMirrorStatus = await readPrimaryOutboxStatus();

    return NextResponse.json({
      ok: finalMirror.ok === true && finalMirrorStatus.pending === 0 && finalMirrorStatus.conflicts === 0,
      cycleId,
      runtimeReceipt,
      finalMirror,
      finalMirrorStatus,
    }, {
      headers: { 'Cache-Control': 'no-store, private' },
    });
  } catch (error) {
    const message = errorText(error);
    const failedAt = new Date().toISOString();

    await db.from('sfi_operating_cycles').update({
      metadata: {
        ...consumedMetadata,
        closureOnceFailure: { observedAt: failedAt, error: message },
      },
      updated_at: failedAt,
    }).eq('id', cycleId).eq('owner_id', ownerId);

    await db.from('sfi_audit_events').insert({
      actor_id: ownerId,
      action: 'SFI_OPERATING_CYCLE_CLOSURE_ONCE_FAILED',
      target_type: 'sfi_operating_cycle',
      target_id: cycleId,
      before_state: { status: cycle.status },
      after_state: { error: message },
      context: {
        authority: 'FOUNDER_AUTHORIZED_ADMIN_CLOSURE',
        phase: 'mirror_recovery_runtime_execution',
      },
    });

    return NextResponse.json({ ok: false, error: 'closure_once_execution_failed', details: message }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, private' },
    });
  }
}
