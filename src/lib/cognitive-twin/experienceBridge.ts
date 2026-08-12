import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { evaluateCognitiveTwinAuthority } from './contract';
import { assessCognitiveExperienceAgainstFounderCanon, FOUNDER_COGNITIVE_CANON_VERSION } from './founderCognitiveCanon';

export type CognitiveTwinExperienceType = 'EVIDENCE' | 'STATE' | 'DECISION' | 'METHOD' | 'ERROR' | 'EXCEPTION';

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
  if (authority.decision !== 'ALLOW') return { ok:false as const, blocked:true, reason:authority.reason };

  const canonAssessment=assessCognitiveExperienceAgainstFounderCanon({memoryType:input.memoryType,content:input.content,evidenceRefs,sourceRef:input.sourceRef});
  if(canonAssessment.blocking){
    return {ok:false as const,blocked:true,reason:`FOUNDER_COGNITIVE_CANON_BLOCK:${[...canonAssessment.constraintRefs,...canonAssessment.warnings].join(',')}`,canonAssessment};
  }

  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_memory').upsert({
    memory_key: input.memoryKey,
    memory_type: input.memoryType,
    status: 'CANDIDATE',
    content: {
      ...input.content,
      cognitiveTwinExperienceContract:'SFI-CT-EXPERIENCE-1.1',
      founderCognitiveCanonVersion:FOUNDER_COGNITIVE_CANON_VERSION,
      cognitiveConstraintRefs:canonAssessment.constraintRefs,
      counterPatternRefs:canonAssessment.counterPatternRefs,
      canonWarnings:canonAssessment.warnings,
      promotionRule:'Institutional experience enters as CANDIDATE. A DECISION-typed memory is decision-like experience only; approved authority lives in sfi_cognitive_twin_decisions. CP→CR promotion requires scope, rival hypotheses, counterexamples, contrast and governance; learning never expands authority automatically.',
    },
    evidence_refs: evidenceRefs,
    source_kind: input.sourceKind,
    source_ref: input.sourceRef,
    version: input.version ?? 'sfi-experience-v1',
    created_by: input.createdBy ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict:'memory_key,version' }).select('id,memory_key,status,source_kind,source_ref,updated_at').single();

  if (result.error) return { ok:false as const, blocked:false, reason:result.error.message };
  return { ok:true as const, blocked:false, memory:result.data, canonAssessment };
}
