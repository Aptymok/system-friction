import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { continuityDatabase, recordContinuityEvent } from '@/lib/sfi/continuityPostgres';
import { readDataPlaneState } from '@/lib/persistence/dataPlaneContinuityStore';
import { probePrimaryDataPlane } from '@/lib/persistence/dataPlaneRpc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const TARGET_CYCLE_ID = '924c7fbd-16fe-400d-9d43-7f1fbec7b1f0';
const NONCE_BINDING_SHA256 = 'e6532828cd8667be89d7388a54868995ca3edb631323a07312b637ff1274d222';
const AUTH_EXPIRES_AT = Date.parse('2026-09-25T00:00:00.000Z');
const EVIDENCE_PRIVATE_REF = 'sfi-closure-2026-09-24:continuity-primary-rest-return';
const PUBLICATION_SOURCE_TYPE = 'continuity_operating_cycle';

type Row = Record<string, any>;

function asRow(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function boundNonceHash(nonce: string, cycleId: string) {
  return createHash('sha256').update(`${nonce}:${cycleId}`).digest('hex');
}

function equalHex(a: string, b: string) {
  if (!/^[0-9a-f]{64}$/i.test(a) || !/^[0-9a-f]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1800) : String(error).slice(0, 1800);
}

async function priorCompletion(sql: ReturnType<typeof continuityDatabase>) {
  const rows = await sql`
    select details
      from sfi_continuity_ledger
     where event_type = 'SFI_CONTINUITY_CLOSURE_COMPLETED'
       and entity_type = 'sfi_operating_cycle'
       and entity_id = ${TARGET_CYCLE_ID}
       and status = 'COMPLETED'
     order by created_at desc
     limit 1
  `;
  return rows[0] ? asRow((rows[0] as Row).details) : null;
}

async function continuityActorId(sql: ReturnType<typeof continuityDatabase>) {
  const rows = await sql`
    select user_id::text
      from profiles
     where lower(role) = 'root'
     order by created_at asc
     limit 1
  `;
  const id = rows[0]?.user_id ? String(rows[0].user_id) : '';
  if (!id) throw new Error('CONTINUITY_ROOT_ACTOR_NOT_FOUND');
  return id;
}

async function ensureObservedEvidence(
  sql: ReturnType<typeof continuityDatabase>,
  primaryProbe: Awaited<ReturnType<typeof probePrimaryDataPlane>>,
  dataPlane: Awaited<ReturnType<typeof readDataPlaneState>>,
) {
  const existing = await sql`
    select id::text, public_summary, evidence_hash, observed_at::text
      from sfi_evidence_ledger
     where private_ref = ${EVIDENCE_PRIVATE_REF}
     order by observed_at desc
     limit 1
  `;
  if (existing[0]?.id) {
    return {
      id: String(existing[0].id),
      summary: asRow(existing[0].public_summary),
      hash: String(existing[0].evidence_hash ?? ''),
      observedAt: String(existing[0].observed_at ?? ''),
      reused: true,
    };
  }

  const observedAt = new Date().toISOString();
  const summary = {
    observedAt,
    epistemicClass: 'OBSERVED',
    observation: 'Production primary REST access is unavailable while the authorized continuity plane remains active.',
    primaryProbe: {
      ok: primaryProbe.ok,
      status: primaryProbe.status,
      error: 'error' in primaryProbe ? primaryProbe.error ?? null : null,
    },
    dataPlane: {
      mode: dataPlane.mode,
      epoch: dataPlane.epoch,
      primaryMirrorCertified: dataPlane.primary_mirror_certified,
      primaryMirrorBacklog: dataPlane.primary_mirror_backlog,
      primaryMirrorLastError: dataPlane.primary_mirror_last_error,
    },
    claimBoundary: 'This evidence records observed service/data-plane state. It does not claim that canonical Supabase persistence is currently writable or that continuity state has been reconciled back to the primary.',
  };
  const evidenceHash = digest(summary);
  const summaryJson = JSON.stringify(summary);

  const inserted = await sql`
    insert into sfi_evidence_ledger (
      module,evidence_kind,source_name,source_url,private_ref,public_summary,
      evidence_hash,anonymized,trust_level,trust_score,ldi,public_weight,observed_at
    ) values (
      'continuity',
      'operational_return',
      'SFI production data-plane probe',
      null,
      ${EVIDENCE_PRIVATE_REF},
      ${summaryJson}::jsonb,
      ${evidenceHash},
      true,
      'first_party_runtime',
      1,
      1,
      0,
      ${observedAt}::timestamptz
    )
    returning id::text, observed_at::text
  `;

  return {
    id: String(inserted[0].id),
    summary,
    hash: evidenceHash,
    observedAt: String(inserted[0].observed_at),
    reused: false,
  };
}

async function existingLabReceipt(sql: ReturnType<typeof continuityDatabase>) {
  const rows = await sql`
    select details
      from sfi_continuity_ledger
     where event_type = 'SFI_CONTINUITY_CLOSURE_METHOD_LAB_COMPLETED'
       and entity_type = 'sfi_operating_cycle'
       and entity_id = ${TARGET_CYCLE_ID}
       and status = 'COMPLETED'
     order by created_at desc
     limit 1
  `;
  return rows[0] ? asRow((rows[0] as Row).details) : null;
}

async function existingInstitutionalReceipt(sql: ReturnType<typeof continuityDatabase>) {
  const rows = await sql`
    select details
      from sfi_continuity_ledger
     where event_type = 'SFI_CONTINUITY_CLOSURE_INSTITUTIONAL_CYCLE_COMPLETED'
       and entity_type = 'sfi_operating_cycle'
       and entity_id = ${TARGET_CYCLE_ID}
       and status = 'COMPLETED'
     order by created_at desc
     limit 1
  `;
  return rows[0] ? asRow((rows[0] as Row).details) : null;
}

async function upsertPublication(
  sql: ReturnType<typeof continuityDatabase>,
  payload: Row,
) {
  const payloadJson = JSON.stringify(payload);
  const now = new Date().toISOString();
  const existing = await sql`
    select id::text
      from sfi_publications
     where source_type = ${PUBLICATION_SOURCE_TYPE}
       and source_id = ${TARGET_CYCLE_ID}
     order by created_at desc
     limit 1
  `;

  if (existing[0]?.id) {
    const updated = await sql`
      update sfi_publications
         set public_fields = array[
               'title','result','primaryRest','dataPlane','methodLab',
               'institutionalCycle','canonicalReconciliation','limitations','finalClosure'
             ]::text[],
             public_payload = ${payloadJson}::jsonb,
             snapshot_version = 'SFI-CONTINUITY-CLOSURE-1.0',
             status = 'PUBLISHED',
             reviewed_at = ${now}::timestamptz,
             approved_at = ${now}::timestamptz,
             published_at = coalesce(published_at, ${now}::timestamptz),
             updated_at = ${now}::timestamptz
       where id = ${String(existing[0].id)}::uuid
       returning id::text, published_at::text
    `;
    return { id: String(updated[0].id), publishedAt: String(updated[0].published_at), reused: true };
  }

  const inserted = await sql`
    insert into sfi_publications (
      source_type,source_id,approved_by,public_fields,public_payload,
      snapshot_version,status,reviewed_at,approved_at,published_at
    ) values (
      ${PUBLICATION_SOURCE_TYPE},
      ${TARGET_CYCLE_ID},
      null,
      array[
        'title','result','primaryRest','dataPlane','methodLab',
        'institutionalCycle','canonicalReconciliation','limitations','finalClosure'
      ]::text[],
      ${payloadJson}::jsonb,
      'SFI-CONTINUITY-CLOSURE-1.0',
      'PUBLISHED',
      ${now}::timestamptz,
      ${now}::timestamptz,
      ${now}::timestamptz
    )
    returning id::text, published_at::text
  `;
  return { id: String(inserted[0].id), publishedAt: String(inserted[0].published_at), reused: false };
}

export async function GET(request: NextRequest) {
  const cycleId = request.nextUrl.searchParams.get('cycleId')?.trim() || '';
  const nonce = request.nextUrl.searchParams.get('nonce')?.trim() || '';

  if (cycleId !== TARGET_CYCLE_ID || nonce.length < 32 || Date.now() > AUTH_EXPIRES_AT) {
    return NextResponse.json({ ok: false, error: 'continuity_closure_not_authorized' }, { status: 403 });
  }
  if (!equalHex(boundNonceHash(nonce, cycleId), NONCE_BINDING_SHA256)) {
    return NextResponse.json({ ok: false, error: 'continuity_closure_not_authorized' }, { status: 403 });
  }

  const sql = continuityDatabase();
  const completed = await priorCompletion(sql);
  if (completed) {
    return NextResponse.json({ ok: true, state: 'ALREADY_COMPLETED', receipt: completed }, {
      headers: { 'Cache-Control': 'no-store, private' },
    });
  }

  try {
    const dataPlane = await readDataPlaneState();
    const primaryProbe = await probePrimaryDataPlane();
    if (dataPlane.mode === 'PRIMARY' && primaryProbe.ok) {
      return NextResponse.json({
        ok: false,
        error: 'continuity_closure_not_required_primary_is_healthy',
        dataPlane: { mode: dataPlane.mode },
        primaryProbe: { ok: primaryProbe.ok, status: primaryProbe.status },
      }, { status: 409 });
    }

    await recordContinuityEvent({
      eventType: 'SFI_CONTINUITY_CLOSURE_INVOKED',
      entityType: 'sfi_operating_cycle',
      entityId: TARGET_CYCLE_ID,
      operation: 'CONTINUITY_CLOSURE',
      status: 'STARTED',
      details: {
        observedAt: new Date().toISOString(),
        dataPlaneMode: dataPlane.mode,
        primaryProbeStatus: primaryProbe.status,
        canonicalReconciliationPending: true,
      },
    });

    const actorId = await continuityActorId(sql);
    const evidence = await ensureObservedEvidence(sql, primaryProbe, dataPlane);

    let labReceipt = await existingLabReceipt(sql);
    if (!labReceipt?.labAnalysisId) {
      const { runMethodLabSimulation } = await import('@/lib/method-lab/simulationRun');
      const lab = await runMethodLabSimulation({
        protocolId: 'sociotechnical_simulation',
        evidenceIds: [evidence.id],
        actorId,
        parameters: {
          operatingCycleId: TARGET_CYCLE_ID,
          purpose: 'Continuity-mode closure under observed primary REST restriction',
          claimBoundary: 'SIMULATED output only. Primary provider restriction and continuity state are observed separately.',
        },
      });
      labReceipt = {
        labAnalysisId: lab.labAnalysisId,
        epistemicClass: lab.run.epistemicClass,
        validationLevel: lab.run.validationLevel,
        resultHash: lab.run.resultHash,
        evidenceRefs: lab.run.evidenceRefs,
        claimBoundary: lab.claimBoundary,
      };
      await recordContinuityEvent({
        eventType: 'SFI_CONTINUITY_CLOSURE_METHOD_LAB_COMPLETED',
        entityType: 'sfi_operating_cycle',
        entityId: TARGET_CYCLE_ID,
        operation: 'METHOD_LAB_SIMULATION',
        status: 'COMPLETED',
        details: labReceipt,
      });
    }

    let institutionalReceipt = await existingInstitutionalReceipt(sql);
    if (!institutionalReceipt?.observedAt) {
      const { runIntegratedInstitutionalCycle } = await import('@/core/cognitive-twin/integratedInstitutionalCycle');
      const institutional = await runIntegratedInstitutionalCycle(`continuity_closure:${TARGET_CYCLE_ID}`);
      institutionalReceipt = {
        observedAt: new Date().toISOString(),
        ok: institutional.ok,
        status: institutional.status,
        closureState: institutional.closureState,
        runId: institutional.run?.id ? String(institutional.run.id) : null,
        cycleId: institutional.cycleId,
        agentCount: institutional.agentCount,
        connected: institutional.cognitiveTwinIntegration.connected,
        exercised: institutional.cognitiveTwinIntegration.exercised,
        warnings: institutional.warnings,
      };
      await recordContinuityEvent({
        eventType: 'SFI_CONTINUITY_CLOSURE_INSTITUTIONAL_CYCLE_COMPLETED',
        entityType: 'sfi_operating_cycle',
        entityId: TARGET_CYCLE_ID,
        operation: 'INSTITUTIONAL_COGNITIVE_CYCLE',
        status: 'COMPLETED',
        details: institutionalReceipt,
      });
    }

    const journalRows = await sql`
      select
        count(*) filter (where status in ('PENDING','REPLAYING'))::int as pending,
        count(*) filter (where status = 'CONFLICT')::int as conflicts
      from sfi_data_plane_write_journal
    `;
    const journal = {
      pending: Number(journalRows[0]?.pending ?? 0),
      conflicts: Number(journalRows[0]?.conflicts ?? 0),
    };

    const primaryError = 'error' in primaryProbe ? String(primaryProbe.error ?? '') : '';
    const restrictedByQuota = /exceed_egress_quota|service for this project is restricted/i.test(primaryError);
    const result = restrictedByQuota
      ? 'PRIMARY_REST_RESTRICTED_CONTINUITY_ACTIVE'
      : primaryProbe.ok
        ? 'PRIMARY_AVAILABLE_CONTINUITY_STATE_REQUIRES_RECONCILIATION'
        : 'PRIMARY_REST_UNAVAILABLE_CONTINUITY_ACTIVE';

    const publicPayload = {
      contract: 'SFI-CONTINUITY-CLOSURE-PUBLIC-RETURN-1.0',
      title: 'SFI Operational RETURN — Primary / Continuity Boundary',
      result,
      primaryRest: {
        ok: primaryProbe.ok,
        status: primaryProbe.status,
        restrictionObserved: restrictedByQuota,
      },
      dataPlane: {
        mode: dataPlane.mode,
        epoch: dataPlane.epoch,
        primaryMirrorCertified: dataPlane.primary_mirror_certified,
        primaryMirrorBacklog: dataPlane.primary_mirror_backlog,
        continuityJournalPending: journal.pending,
        continuityJournalConflicts: journal.conflicts,
      },
      methodLab: {
        analysisId: labReceipt.labAnalysisId,
        epistemicClass: 'SIMULATED',
        validationLevel: labReceipt.validationLevel ?? 'SIMULATION',
      },
      institutionalCycle: {
        status: institutionalReceipt.status ?? null,
        closureState: institutionalReceipt.closureState ?? null,
        runId: institutionalReceipt.runId ?? null,
        connected: institutionalReceipt.connected ?? null,
        exercised: institutionalReceipt.exercised ?? null,
      },
      canonicalReconciliation: {
        state: 'PENDING',
        reason: restrictedByQuota
          ? 'Supabase production REST is provider-restricted; continuity writes must be replayed after primary service is restored.'
          : 'Continuity writes remain subject to governed replay/fingerprint verification before canonical convergence.',
      },
      limitations: [
        'Continuity execution is not canonical reconciliation.',
        'Method Lab output remains SIMULATED and is not observed evidence.',
        'A published RETURN is exposure only; it is not external validation or institutional recognition.',
        'Final closure remains false until the continuity journal is replayed and primary/continuity fingerprints converge.',
      ],
      finalClosure: false,
    };

    const publication = await upsertPublication(sql, publicPayload);
    const receipt = {
      cycleId: TARGET_CYCLE_ID,
      completedAt: new Date().toISOString(),
      evidence: { id: evidence.id, hash: evidence.hash, reused: evidence.reused },
      methodLab: labReceipt,
      institutionalCycle: institutionalReceipt,
      primaryProbe: {
        ok: primaryProbe.ok,
        status: primaryProbe.status,
        restrictedByQuota,
      },
      dataPlane: {
        mode: dataPlane.mode,
        primaryMirrorCertified: dataPlane.primary_mirror_certified,
        primaryMirrorBacklog: dataPlane.primary_mirror_backlog,
      },
      continuityJournal: journal,
      publication,
      canonicalReconciliation: 'PENDING',
      finalClosure: false,
      claimBoundary: 'This receipt proves bounded continuity execution and publication. It does not claim Supabase/Neon convergence while the canonical primary REST service is restricted.',
    };

    await recordContinuityEvent({
      eventType: 'SFI_CONTINUITY_CLOSURE_COMPLETED',
      entityType: 'sfi_operating_cycle',
      entityId: TARGET_CYCLE_ID,
      operation: 'CONTINUITY_CLOSURE',
      status: 'COMPLETED',
      details: receipt,
    });

    return NextResponse.json({ ok: true, receipt }, {
      headers: { 'Cache-Control': 'no-store, private' },
    });
  } catch (error) {
    const message = errorText(error);
    await recordContinuityEvent({
      eventType: 'SFI_CONTINUITY_CLOSURE_FAILED',
      entityType: 'sfi_operating_cycle',
      entityId: TARGET_CYCLE_ID,
      operation: 'CONTINUITY_CLOSURE',
      status: 'FAILED',
      details: { observedAt: new Date().toISOString(), error: message },
    }).catch(() => null);

    return NextResponse.json({
      ok: false,
      error: 'continuity_closure_execution_failed',
      details: message,
    }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, private' },
    });
  }
}
