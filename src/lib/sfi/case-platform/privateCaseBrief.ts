import 'server-only';

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateSfiCaseObjectDraft, type SfiCaseObjectDraft } from '@/core/case-platform';
import type { SfiCanonicalRef } from '@/core/contracts/sfi';
import { recordCanonicalCaseObjectAtomic } from './canonicalCaseObjectWriter';
import {
  SFI_CASE_ASSET_BUCKET,
  SFI_PRIVATE_CASE_BRIEF_ASSET_CONTRACT,
  buildSfiCaseCoverBrief,
  formatCanonicalRef,
  renderPrivateCaseBriefPdf,
  requiredPrivateCaseBriefCodePoints,
  sha256Hex,
} from './privateCaseBriefContract';
import { loadUnifontGlyphs, SFI_UNIFONT_SOURCE, SFI_UNIFONT_VERSION } from './unifontType3';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown) {
  const valueText = text(value);
  return valueText || null;
}

function canonicalRef(value: unknown): SfiCanonicalRef {
  const row = record(value);
  const id = text(row.id);
  if (!id) throw new Error('SFI_PRIVATE_CASE_BRIEF_CORRUPT_EVIDENCE_REF');
  return { id, version: nullableText(row.version), hash: nullableText(row.hash) };
}

function canonicalRefKey(ref: SfiCanonicalRef) {
  return `${ref.id}\u0000${ref.version ?? ''}\u0000${ref.hash ?? ''}`;
}

function uniqueCanonicalRefs(values: unknown[]) {
  const byKey = new Map<string, SfiCanonicalRef>();
  for (const value of values) {
    const ref = canonicalRef(value);
    byKey.set(canonicalRefKey(ref), ref);
  }
  return [...byKey.values()].sort((a, b) => canonicalRefKey(a).localeCompare(canonicalRefKey(b)));
}

function safeVersion(now: Date, nonce: string) {
  const timestamp = now.toISOString().replace(/\D/g, '').slice(0, 17);
  const suffix = nonce.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  return `${timestamp}-${suffix}`;
}

async function removeStoredAsset(service: SupabaseClient, storagePath: string) {
  const removed = await service.storage.from(SFI_CASE_ASSET_BUCKET).remove([storagePath]);
  return removed.error?.message ?? null;
}

export async function createRootPrivateCaseBrief(input: {
  service: SupabaseClient;
  actorId: string;
  caseId: string;
}) {
  const caseId = input.caseId.trim();
  if (!caseId) throw new Error('SFI_PRIVATE_CASE_BRIEF_CASE_REQUIRED');

  const caseRead = await input.service.from('sfi_cases')
    .select('id,owner_id,tenant_id,subject,scope,status,version')
    .eq('id', caseId)
    .is('deleted_at', null)
    .maybeSingle();
  if (caseRead.error) throw new Error(`SFI_PRIVATE_CASE_BRIEF_CASE_READ_FAILED:${caseRead.error.message}`);
  if (!caseRead.data) throw new Error('SFI_PRIVATE_CASE_BRIEF_CASE_NOT_FOUND');

  const caseStatus = text(caseRead.data.status);
  if (caseStatus === 'REJECTED') throw new Error('SFI_CASE_OBJECT_WRITE_FORBIDDEN:REJECTED');

  const evidenceRead = await input.service.from('sfi_case_objects')
    .select('canonical_ref')
    .eq('case_id', caseId)
    .eq('owner_id', caseRead.data.owner_id)
    .eq('tenant_id', caseRead.data.tenant_id)
    .eq('object_kind', 'EVIDENCE')
    .order('created_at', { ascending: true });
  if (evidenceRead.error) throw new Error(`SFI_PRIVATE_CASE_BRIEF_EVIDENCE_READ_FAILED:${evidenceRead.error.message}`);
  const evidenceRefs = uniqueCanonicalRefs(((evidenceRead.data ?? []) as Row[]).map((row) => row.canonical_ref));

  const generatedAt = new Date();
  const objectId = randomUUID();
  const version = safeVersion(generatedAt, objectId);
  const coverBrief = buildSfiCaseCoverBrief({ caseId, sourceEvidenceRefs: evidenceRefs });
  const renderInput = {
    caseId,
    version,
    subject: text(caseRead.data.subject),
    scope: text(caseRead.data.scope),
    generatedAt: generatedAt.toISOString(),
    evidenceRefs,
    coverBrief,
  };
  const unicodeGlyphs = await loadUnifontGlyphs(requiredPrivateCaseBriefCodePoints(renderInput));
  const pdf = renderPrivateCaseBriefPdf(renderInput, unicodeGlyphs);
  const pdfSha256 = sha256Hex(pdf);
  const storagePath = `${caseRead.data.tenant_id}/${caseId}/${version}/case-brief-${pdfSha256.slice(0, 12)}.pdf`;
  const briefRef: SfiCanonicalRef = {
    id: `sfi-private-case-brief:${caseId}:${version}`,
    version,
    hash: pdfSha256,
  };
  const payload = {
    contract: SFI_PRIVATE_CASE_BRIEF_ASSET_CONTRACT,
    caseId,
    version,
    assetType: 'PRIVATE_CASE_BRIEF_PDF',
    privateStorage: true,
    storageBucket: SFI_CASE_ASSET_BUCKET,
    storagePath,
    mimeType: 'application/pdf',
    byteLength: pdf.byteLength,
    sha256: pdfSha256,
    sourceEvidenceRefs: evidenceRefs,
    sourceEvidenceIds: evidenceRefs.map((ref) => ref.id),
    sourceEvidenceLabels: evidenceRefs.map(formatCanonicalRef),
    coverBrief,
    unicodeFont: {
      state: 'EMBEDDED_TYPE3',
      family: 'GNU Unifont',
      version: SFI_UNIFONT_VERSION,
      source: SFI_UNIFONT_SOURCE,
      authoredCodePointsPreserved: true,
      toUnicodeCMap: true,
      sourceFetchedBeforeMutation: true,
    },
    imageProvider: {
      state: 'NOT_CONFIGURED',
      provider: null,
      model: null,
      generatedImageBytesClaimed: false,
      rule: 'No external cover-image bytes are claimed without a configured provider receipt.',
    },
    generatedAt: generatedAt.toISOString(),
    generatedBy: input.actorId,
    approvedBy: null,
    approvedAt: null,
    publicationState: 'PRIVATE_DRAFT',
    executionAuthority: false,
    canonicalPromotion: false,
    limitations: evidenceRefs.length ? [] : ['NO_ADMITTED_CASE_EVIDENCE_REFS_AT_ASSEMBLY_TIME'],
  };

  const draft: SfiCaseObjectDraft = {
    kind: 'REPORT',
    epistemicRole: 'PROJECTION',
    canonicalRef: briefRef,
    sourceRefs: [],
    recordRefs: [],
    evidenceRefs,
  };
  const violations = validateSfiCaseObjectDraft(draft);
  if (violations.length) throw new Error(`SFI_PRIVATE_CASE_BRIEF_OBJECT_INVALID:${violations.join(',')}`);

  const upload = await input.service.storage.from(SFI_CASE_ASSET_BUCKET).upload(storagePath, pdf, {
    contentType: 'application/pdf',
    cacheControl: '0',
    upsert: false,
  });
  if (upload.error) throw new Error(`SFI_PRIVATE_CASE_BRIEF_UPLOAD_FAILED:${upload.error.message}`);

  let persisted: Record<string, unknown>;
  try {
    persisted = await recordCanonicalCaseObjectAtomic({
      service: input.service,
      actorId: input.actorId,
      object: {
        id: objectId,
        caseId,
        kind: 'REPORT',
        epistemicRole: 'PROJECTION',
        canonicalRef: briefRef,
        sourceRefs: [],
        recordRefs: [],
        evidenceRefs,
        payload,
        observedAt: null,
      },
      auditAction: 'case.private_brief.generated',
      auditContext: { storagePath, pdfSha256, evidenceRefs, publicationState: 'PRIVATE_DRAFT' },
    });
  } catch (error) {
    const storageRollbackError = await removeStoredAsset(input.service, storagePath);
    const reason = error instanceof Error ? error.message : String(error);
    if (storageRollbackError) {
      throw new Error(`SFI_PRIVATE_CASE_BRIEF_ATOMIC_PERSIST_FAILED_STORAGE_ROLLBACK_FAILED:${reason}:${storageRollbackError}`);
    }
    throw new Error(`SFI_PRIVATE_CASE_BRIEF_ATOMIC_PERSIST_FAILED:${reason}`);
  }

  const persistedObject = record(persisted.object);
  if (text(persistedObject.id) !== objectId) throw new Error('SFI_PRIVATE_CASE_BRIEF_ATOMIC_WRITER_ID_MISMATCH');
  return {
    ok: true as const,
    objectId,
    canonicalRef: briefRef,
    payload,
    createdAt: text(persistedObject.created_at) || generatedAt.toISOString(),
    atomic: persisted.atomic === true,
  };
}

export async function readRootPrivateCaseBrief(input: {
  service: SupabaseClient;
  caseId: string;
}) {
  const latest = await input.service.from('sfi_case_objects')
    .select('id,canonical_ref,payload,created_at')
    .eq('case_id', input.caseId)
    .eq('object_kind', 'REPORT')
    .eq('epistemic_role', 'PROJECTION')
    .filter('payload->>contract', 'eq', SFI_PRIVATE_CASE_BRIEF_ASSET_CONTRACT)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) throw new Error(`SFI_PRIVATE_CASE_BRIEF_READ_FAILED:${latest.error.message}`);
  if (!latest.data) return null;
  const payload = latest.data.payload as Row;
  const storagePath = text(payload.storagePath);
  if (!storagePath) throw new Error('SFI_PRIVATE_CASE_BRIEF_STORAGE_PATH_MISSING');
  const signed = await input.service.storage.from(SFI_CASE_ASSET_BUCKET).createSignedUrl(storagePath, 300);
  if (signed.error || !signed.data?.signedUrl) throw new Error(`SFI_PRIVATE_CASE_BRIEF_SIGN_FAILED:${signed.error?.message ?? 'unknown'}`);
  return {
    id: latest.data.id,
    canonicalRef: latest.data.canonical_ref,
    payload,
    createdAt: latest.data.created_at,
    signedUrl: signed.data.signedUrl,
    signedUrlExpiresInSeconds: 300,
  };
}
