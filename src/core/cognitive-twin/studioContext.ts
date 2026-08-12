import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { recordCognitiveTwinExperience } from './experience';

const STUDIO_LEARNING_VERSION = 'studio-observed-return-v1';

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function readStudioCognitiveContext(input: { ownerId: string; objectId?: string | null; limit?: number }) {
  const db = createServiceSupabaseClient();
  const limit = Math.max(1, Math.min(100, input.limit ?? 24));
  const [memory, decisions] = await Promise.all([
    db.from('sfi_cognitive_twin_memory')
      .select('id,memory_key,memory_type,status,content,evidence_refs,source_kind,source_ref,version,created_at,updated_at')
      .in('status', ['CANDIDATE','VERIFIED'])
      .order('updated_at', { ascending: false })
      .limit(limit),
    db.from('sfi_cognitive_twin_decisions')
      .select('id,decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,approved_by,approved_at,created_at,updated_at')
      .eq('status','APPROVED')
      .order('approved_at', { ascending: false })
      .limit(limit),
  ]);

  const warnings = [memory.error?.message, decisions.error?.message].filter(Boolean);
  const memoryRows = (memory.data ?? []) as Row[];
  const decisionRows = (decisions.data ?? []) as Row[];

  return {
    ok: !memory.error && !decisions.error,
    memory: memoryRows,
    decisions: decisionRows,
    objectId: input.objectId ?? null,
    ownerId: input.ownerId,
    warnings,
    boundary: 'Studio may read Cognitive Twin candidate/verified memory and approved decisions as context. Studio does not grant authority, promote canon, or rewrite Cognitive Twin identity.',
  };
}

export async function persistStudioObservedReturn(input: {
  ownerId: string;
  objectId: string;
  sourceRef: string;
  content: Record<string, unknown>;
  evidenceRefs?: string[];
  createdBy?: string | null;
}) {
  const memoryKey = `STUDIO:OBSERVED_RETURN:${input.objectId}:${text(input.sourceRef) ?? crypto.randomUUID()}`;
  const persisted = await recordCognitiveTwinExperience({
    memoryKey,
    memoryType: 'EVIDENCE',
    content: input.content,
    evidenceRefs: input.evidenceRefs,
    sourceKind: 'STUDIO_OBSERVED_RETURN',
    sourceRef: input.sourceRef,
    createdBy: input.createdBy,
    version: STUDIO_LEARNING_VERSION,
  });

  if (!persisted.ok) {
    return { ok: false as const, blocked: persisted.blocked, reason: persisted.reason };
  }
  return {
    ok: true as const,
    blocked: false,
    id: String(persisted.memory?.id ?? persisted.event.id),
    status: 'CANDIDATE' as const,
    version: STUDIO_LEARNING_VERSION,
    memoryKey,
  };
}
