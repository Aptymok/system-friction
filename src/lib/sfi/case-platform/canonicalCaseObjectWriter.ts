import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { validateSfiCaseObjectDraft, type SfiCaseObjectDraft, type SfiCaseObjectKind } from '@/core/case-platform';
import type { SfiCanonicalRef, SfiEpistemicClass } from '@/core/contracts/sfi';

export type CanonicalCaseObjectWrite = {
  id: string;
  caseId: string;
  kind: SfiCaseObjectKind;
  epistemicRole: SfiEpistemicClass;
  canonicalRef: SfiCanonicalRef;
  sourceRefs?: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
  payload?: Record<string, unknown>;
  observedAt?: string | null;
};

export async function recordCanonicalCaseObjectAtomic(input: {
  service: SupabaseClient;
  actorId: string;
  object: CanonicalCaseObjectWrite;
  auditAction?: string;
  auditContext?: Record<string, unknown>;
}) {
  const draft: SfiCaseObjectDraft = {
    kind: input.object.kind,
    epistemicRole: input.object.epistemicRole,
    canonicalRef: input.object.canonicalRef,
    sourceRefs: input.object.sourceRefs ?? [],
    recordRefs: input.object.recordRefs ?? [],
    evidenceRefs: input.object.evidenceRefs ?? [],
  };
  const violations = validateSfiCaseObjectDraft(draft);
  if (violations.length) throw new Error(`SFI_CASE_OBJECT_INVALID:${violations.join(',')}`);
  if (!input.object.id.trim()) throw new Error('SFI_CASE_OBJECT_ID_REQUIRED');
  if (!input.object.caseId.trim()) throw new Error('SFI_CASE_OBJECT_CASE_ID_REQUIRED');
  if (!input.object.canonicalRef.id.trim()) throw new Error('SFI_CASE_OBJECT_CANONICAL_REF_REQUIRED');
  if (!input.object.canonicalRef.hash?.trim()) throw new Error('SFI_CASE_OBJECT_CANONICAL_HASH_REQUIRED');
  if (input.object.observedAt && Number.isNaN(Date.parse(input.object.observedAt))) throw new Error('SFI_CASE_OBJECT_OBSERVED_AT_INVALID');

  const result = await input.service.rpc('sfi_record_case_object_atomic_v1', {
    p_case_id: input.object.caseId,
    p_actor_id: input.actorId,
    p_object: {
      id: input.object.id,
      kind: input.object.kind,
      epistemicRole: input.object.epistemicRole,
      canonicalRef: input.object.canonicalRef,
      sourceRefs: input.object.sourceRefs ?? [],
      recordRefs: input.object.recordRefs ?? [],
      evidenceRefs: input.object.evidenceRefs ?? [],
      payload: input.object.payload ?? {},
      observedAt: input.object.observedAt ?? null,
    },
    p_audit_action: input.auditAction?.trim() || 'CASE_OBJECT_RECORDED',
    p_audit_context: input.auditContext ?? {},
  });
  if (result.error) throw new Error(`SFI_CASE_OBJECT_ATOMIC_WRITE_FAILED:${result.error.message}`);
  if (!result.data || typeof result.data !== 'object') throw new Error('SFI_CASE_OBJECT_ATOMIC_WRITE_EMPTY');
  return result.data as Record<string, unknown>;
}
