import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { evaluateCognitiveTwinAuthority } from './contract';

export type CognitiveTwinExperienceType = 'EVIDENCE' | 'STATE' | 'METHOD' | 'ERROR' | 'EXCEPTION';

export async function persistCognitiveTwinExperience(input: {
  memoryKey: string;
  memoryType: CognitiveTwinExperienceType;
  sourceKind: string;
  sourceRef: string;
  content: Record<string, unknown>;
  evidenceRefs?: string[];
  createdBy?: string | null;
  version?: string;
}) {
  const evidenceRefs = [...new Set((input.evidenceRefs ?? []).filter(Boolean))];
  const authority = evaluateCognitiveTwinAuthority({
    action: 'persist_memory',
    founderAbsent: false,
    evidencePresent: evidenceRefs.length > 0 || Boolean(input.sourceRef),
  });
  if (authority.decision !== 'ALLOW') {
    return { ok:false as const, blocked:true, reason:authority.reason };
  }

  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_memory').upsert({
    memory_key: input.memoryKey,
    memory_type: input.memoryType,
    status: 'CANDIDATE',
    content: {
      ...input.content,
      cognitiveTwinExperienceContract:'SFI-CT-EXPERIENCE-1.0',
      promotionRule:'Institutional experience enters as CANDIDATE. Promotion requires evidence/evaluation and never expands authority automatically.',
    },
    evidence_refs: evidenceRefs,
    source_kind: input.sourceKind,
    source_ref: input.sourceRef,
    version: input.version ?? 'sfi-experience-v1',
    created_by: input.createdBy ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict:'memory_key,version' }).select('id,memory_key,status,source_kind,source_ref,updated_at').single();

  if (result.error) return { ok:false as const, blocked:false, reason:result.error.message };
  return { ok:true as const, blocked:false, memory:result.data };
}
