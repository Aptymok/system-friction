import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { sha256 } from '@/lib/operational/common';
import { recordOperationalCaseObject } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import { assertCaseSourceStoragePath, assertCaseSourceWriteAccess, SFI_CASE_SOURCE_BUCKET } from '@/lib/sfi/case-platform/directUpload';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

const ATTESTATION_VERSION = 'SFI-INGESTION-ATTESTATION-1.0';
const PROFILE_CONTRACT = 'SFI-DATASET-PROFILE-1.0';
const MAX_RESULT_JSON_BYTES = 750_000;

type RouteContext = { params: Promise<{ caseId: string }> };
type Row = Record<string, unknown>;
type CanonicalRef = { id: string; version?: string | null; hash?: string | null };

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Row).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]));
  }
  return value;
}

function canonicalPayload(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function verifyAttestation(result: Row, attestation: Row) {
  const version = text(attestation.version);
  const algorithm = text(attestation.algorithm);
  const digest = text(attestation.digest).toLowerCase();
  if (version !== ATTESTATION_VERSION || algorithm !== 'HMAC-SHA256' || !/^[a-f0-9]{64}$/.test(digest)) return false;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SFI_INGESTION_ATTESTATION_SECRET_UNAVAILABLE');
  const expected = createHmac('sha256', secret).update(`${ATTESTATION_VERSION}|${canonicalPayload(result)}`).digest('hex');
  const left = Buffer.from(digest, 'hex');
  const right = Buffer.from(expected, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 9) return '[depth-truncated]';
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.slice(0, 4_000);
  if (Array.isArray(value)) return value.slice(0, 1_000).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Row).slice(0, 1_000).map(([key, item]) => [key.slice(0, 180), sanitize(item, depth + 1)]));
  }
  return String(value).slice(0, 4_000);
}

function canonicalRef(value: unknown): CanonicalRef | null {
  const ref = row(value);
  const id = text(ref.id);
  if (!id) return null;
  return { id, version: text(ref.version) || null, hash: text(ref.hash) || null };
}

function sourceStoragePath(payloadValue: unknown) {
  const payload = row(payloadValue);
  const metadata = row(payload.metadata);
  return text(metadata.storagePath);
}

function profileSummary(profile: Row) {
  const observations = row(profile.observations);
  const sheets = Array.isArray(profile.sheets) ? profile.sheets : [];
  const first = row(sheets[0]);
  const headers = Array.isArray(first.headers) ? first.headers.filter((item): item is string => typeof item === 'string').slice(0, 300) : [];
  return {
    contract: text(profile.contract),
    format: text(profile.format),
    sheetCount: Number(observations.sheetCount ?? sheets.length) || 0,
    totalRows: Number(observations.totalRows ?? 0) || 0,
    totalAnalyzableRows: Number(observations.totalAnalyzableRows ?? 0) || 0,
    totalMalformedRows: Number(observations.totalMalformedRows ?? 0) || 0,
    primaryHeaders: headers,
    warningCount: Array.isArray(profile.warnings) ? profile.warnings.length : 0,
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_RESULT_JSON_BYTES) {
      return NextResponse.json({ ok: false, error: 'SFI_DATASET_PROFILE_RESULT_TOO_LARGE', maxBytes: MAX_RESULT_JSON_BYTES }, { status: 413 });
    }

    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const access = await assertCaseSourceWriteAccess({ caseId, userId: user.id });
    const body = await request.json().catch(() => ({})) as Row;
    const result = row(body.result);
    const attestation = row(body.attestation);
    const serialized = JSON.stringify(result);
    if (!serialized || serialized.length > MAX_RESULT_JSON_BYTES) {
      return NextResponse.json({ ok: false, error: 'SFI_DATASET_PROFILE_RESULT_TOO_LARGE', maxBytes: MAX_RESULT_JSON_BYTES }, { status: 413 });
    }
    if (!verifyAttestation(result, attestation)) return NextResponse.json({ ok: false, error: 'SFI_DATASET_PROFILE_ATTESTATION_INVALID' }, { status: 403 });

    if (text(result.caseId) !== caseId || text(result.tenantId) !== access.tenantId || text(result.profiledByUserId) !== user.id) {
      return NextResponse.json({ ok: false, error: 'SFI_DATASET_PROFILE_IDENTITY_MISMATCH' }, { status: 409 });
    }

    const storagePath = assertCaseSourceStoragePath({ tenantId: access.tenantId, caseId, storagePath: text(result.storagePath) });
    const profile = row(result.profile);
    if (text(profile.contract) !== PROFILE_CONTRACT) return NextResponse.json({ ok: false, error: 'SFI_DATASET_PROFILE_CONTRACT_INVALID' }, { status: 400 });
    const source = row(profile.source);
    const contentHash = text(source.contentHash).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(contentHash) || text(source.contentHashBasis) !== 'SERVER_VERIFIED_SHA256') {
      return NextResponse.json({ ok: false, error: 'SFI_DATASET_PROFILE_CONTENT_IDENTITY_INVALID' }, { status: 400 });
    }
    const security = row(profile.security);
    if (security.formulasEvaluated !== false || security.macrosExecuted !== false || security.externalLinksFollowed !== false || security.rawRowsReturned !== false) {
      return NextResponse.json({ ok: false, error: 'SFI_DATASET_PROFILE_SECURITY_BOUNDARY_INVALID' }, { status: 400 });
    }

    const db = createServiceSupabaseClient();
    const sources = await db.from('sfi_case_objects')
      .select('canonical_ref,payload')
      .eq('case_id', caseId)
      .eq('object_kind', 'SOURCE')
      .order('created_at', { ascending: false })
      .limit(250);
    if (sources.error) throw new Error(`SFI_DATASET_SOURCE_LOOKUP_FAILED:${sources.error.message}`);
    const sourceRow = (sources.data ?? []).find((item) => sourceStoragePath(item.payload) === storagePath);
    const sourceRef = canonicalRef(sourceRow?.canonical_ref);
    if (!sourceRef) {
      return NextResponse.json({
        ok: false,
        error: 'SFI_DATASET_SOURCE_NOT_REGISTERED',
        instruction: 'Finalize the direct Storage upload as a Case SOURCE before admitting its deterministic profile.',
      }, { status: 409 });
    }

    const sanitizedProfile = sanitize(profile) as Row;
    const profileHash = sha256(sanitizedProfile);
    const observationRef = { id: `dataset-profile:${contentHash}`, version: '1.0', hash: profileHash };
    const observedAt = text(profile.generatedAt) || new Date().toISOString();
    const summary = profileSummary(sanitizedProfile);

    const observation = await recordOperationalCaseObject({
      caseId,
      userId: user.id,
      kind: 'OBSERVATION',
      epistemicRole: 'RECORD',
      canonicalRef: observationRef,
      sourceRefs: [sourceRef],
      recordRefs: [],
      evidenceRefs: [],
      payload: {
        contract: PROFILE_CONTRACT,
        ingestionProvider: 'SUPABASE_EDGE_FUNCTION',
        worker: 'sfi-dataset-profile',
        storage: { bucket: SFI_CASE_SOURCE_BUCKET, storagePath },
        profile: sanitizedProfile,
        summary,
        attestation: { version: ATTESTATION_VERSION, verified: true },
        epistemicBoundary: 'DETERMINISTIC_PROFILE_IS_A_CASE_OBSERVATION_RECORD_NOT_ACCEPTED_EVIDENCE_OR_CANONICAL_TRUTH',
      },
      observedAt,
    });

    const event = await appendEpistemicEvent({
      eventName: 'SFI_DATASET_PROFILE_ADMITTED',
      epistemicClass: 'derived',
      confidence: 1,
      payload: {
        caseId,
        tenantId: access.tenantId,
        actorId: user.id,
        sourceRef,
        observationRef,
        storagePath,
        contentHash,
        profileHash,
        summary,
        epistemicPartition: sanitizedProfile.epistemicPartition ?? null,
        security: sanitizedProfile.security ?? null,
        rawObjectPersistedInEvent: false,
      },
      occurredAt: observedAt,
      source: { sourceId: 'sfi-dataset-profile', sourceType: 'deterministic_ingestion_worker' },
      logbookId: `case:${caseId}`,
      lineage: [sourceRef.id, contentHash, profileHash],
    });
    if (!event.ok) throw new Error(`SFI_DATASET_PROFILE_EVENT_FAILED:${event.error}`);

    return NextResponse.json({
      ok: true,
      caseId,
      observation,
      eventId: String(event.data.event_id ?? ''),
      sourceRef,
      observationRef,
      summary,
      universalSignal: {
        kind: 'dataset',
        name: text(source.filename) || storagePath.split('/').at(-1) || 'dataset',
        mimeType: text(source.contentType) || 'application/octet-stream',
        assetRef: `storage://${SFI_CASE_SOURCE_BUCKET}/${storagePath}`,
        objectHash: contentHash,
        extracted: {
          schema: summary.primaryHeaders,
          rowCount: summary.totalRows,
          analyzableRowCount: summary.totalAnalyzableRows,
          malformedRows: summary.totalMalformedRows,
          sheetCount: summary.sheetCount,
          profileRef: observationRef.id,
          profileHash,
          profile: sanitizedProfile,
        },
        provenance: {
          caseId,
          sourceRef: sourceRef.id,
          observationRef: observationRef.id,
          epistemicEventId: String(event.data.event_id ?? ''),
          ingestionProvider: 'SUPABASE_EDGE_FUNCTION',
          attestationVerified: true,
        },
      },
      next: 'This material profile now satisfies the dataset observation layer. Re-run the SFI analysis sufficiency check before invoking cognitive agents.',
      vercelBoundary: 'CONTROL_PLANE_ONLY: this route verified and persisted structured JSON; it did not receive or download raw dataset bytes.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
