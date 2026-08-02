import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

async function centralNode(ownerId: string, caseId: string, attractorId: string) {
  const service = createServiceSupabaseClient();
  const { data } = await service
    .from('sfi_user_graph_nodes')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('case_id', caseId)
    .eq('attractor_id', attractorId)
    .eq('is_central', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function ensurePerturbationGraphNode(input: {
  ownerId: string;
  caseId: string;
  attractorId: string;
  interventionId: string;
  instruction: string;
  confidence: number;
}) {
  const service = createServiceSupabaseClient();
  const { data: existing } = await service
    .from('sfi_user_graph_nodes')
    .select('id')
    .eq('owner_id', input.ownerId)
    .eq('case_id', input.caseId)
    .eq('source_type', 'field_intervention')
    .eq('source_id', input.interventionId)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const targetId = await centralNode(input.ownerId, input.caseId, input.attractorId);
  if (!targetId) return null;
  const { data: node, error } = await service.from('sfi_user_graph_nodes').insert({
    owner_id: input.ownerId,
    case_id: input.caseId,
    attractor_id: input.attractorId,
    node_type: 'intervention',
    label: 'Perturbación mínima',
    summary: input.instruction,
    weight: Math.max(0, Math.min(1, input.confidence)),
    is_central: false,
    source_type: 'field_intervention',
    source_id: input.interventionId,
    metadata: { status: 'PENDING', reversible: true },
    observed_at: new Date().toISOString(),
  }).select('id').single();
  if (error || !node) return null;
  await service.from('sfi_user_graph_edges').insert({
    owner_id: input.ownerId,
    case_id: input.caseId,
    attractor_id: input.attractorId,
    source_node_id: node.id,
    target_node_id: targetId,
    relation: 'tests_trajectory_toward_attractor',
    strength: Math.max(0, Math.min(1, input.confidence)),
    direction: 'toward_attractor',
    curvature: -0.12,
    metadata: { interventionId: input.interventionId },
  });
  return node.id;
}

export async function createLearningGraphNode(input: {
  ownerId: string;
  caseId: string;
  attractorId: string;
  evidenceNodeId: string;
  sourceId: string;
  summary: string;
  nextAction: string;
  confidence: number;
}) {
  const service = createServiceSupabaseClient();
  const targetId = await centralNode(input.ownerId, input.caseId, input.attractorId);
  if (!targetId) return null;
  const { data: node, error } = await service.from('sfi_user_graph_nodes').insert({
    owner_id: input.ownerId,
    case_id: input.caseId,
    attractor_id: input.attractorId,
    node_type: 'learning',
    label: 'Aprendizaje incorporado',
    summary: input.summary,
    weight: Math.max(0, Math.min(1, input.confidence)),
    is_central: false,
    source_type: 'evidence_assessment',
    source_id: input.sourceId,
    metadata: { nextAction: input.nextAction, disclosure: 'user_operational_summary' },
    observed_at: new Date().toISOString(),
  }).select('id').single();
  if (error || !node) return null;

  await service.from('sfi_user_graph_edges').insert([
    {
      owner_id: input.ownerId,
      case_id: input.caseId,
      attractor_id: input.attractorId,
      source_node_id: input.evidenceNodeId,
      target_node_id: node.id,
      relation: 'produces_learning',
      strength: input.confidence,
      direction: 'toward_attractor',
      curvature: 0.18,
      metadata: { sourceId: input.sourceId },
    },
    {
      owner_id: input.ownerId,
      case_id: input.caseId,
      attractor_id: input.attractorId,
      source_node_id: node.id,
      target_node_id: targetId,
      relation: 'updates_trajectory',
      strength: input.confidence,
      direction: 'toward_attractor',
      curvature: -0.08,
      metadata: { sourceId: input.sourceId },
    },
  ]);
  return node.id;
}
