import { randomUUID } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { createScoreFrictionIntake } from '@/lib/scorefriction/intake';
import { createPredictionEntry } from '@/lib/sfi/predictions/service';
import { createVerificationRule, closeVerification } from '@/lib/sfi/predictions/verificationService';
import { writeInstitutionalMemory } from '@/lib/memory/institutionalMemoryWriter';
import { buildEntityContext } from '@/lib/sfi/entityContext';
import { buildFrictionField } from '@/lib/sfi/frictionFieldEngine';
import { buildAttractorScorecard } from '@/lib/sfi/attractorManagement';
import { buildInstitutionalTomography } from '@/lib/sfi/tomography';
import { buildInstitutionalEntityGraph } from '@/lib/sfi/entityGraph';

export type IcoScenarioInput = {
  phenomenon: string;
  signal?: string;
  domain?: string;
  description?: string;
  createdBy?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || `phenomenon_${Date.now()}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function runInstitutionalCognitiveScenario(input: IcoScenarioInput) {
  const phenomenon = input.phenomenon?.trim() || 'Fenómeno institucional';
  const entityId = slugify(phenomenon);
  const caseId = `SFI-${entityId}`;
  const createdAt = new Date().toISOString();
  const traceId = randomUUID();

  const observationResult = await createScoreFrictionIntake({
    case_id: caseId,
    object: phenomenon,
    signal: input.signal || phenomenon,
    domain: input.domain || 'institutional',
    narrative: input.description || `Observación operativa para ${phenomenon}`,
    raw_payload: {
      phenomenon,
      traceId,
      createdAt,
      createdBy: input.createdBy || 'sfi-ico-runtime',
    },
    wsv: {
      cultural: 0.68,
      affective: 0.62,
      institutional: 0.71,
    },
  });

  if (!observationResult.ok) {
    throw new Error(`observation_init_failed: ${observationResult.status || 'unknown'}`);
  }

  const service = createServiceSupabaseClient();
  const evidenceId = randomUUID();
  const evidencePayload = {
    case_id: caseId,
    module: 'ico-runtime',
    evidence_kind: 'metric',
    source_name: 'ico-runtime',
    source_url: null,
    private_ref: `trace:${traceId}`,
    public_summary: {
      phenomenon,
      signal: input.signal || phenomenon,
      observation_id: observationResult.observation?.id,
      createdAt,
    },
    evidence_hash: randomUUID(),
    anonymized: true,
    trust_level: 'declared',
    trust_score: 0.72,
    ldi: 0.14,
    public_weight: 0.62,
    observed_at: createdAt,
  };

  const evidenceInsert = await service.from('sfi_evidence_ledger').insert(evidencePayload).select('id').single();
  if (evidenceInsert.error) {
    throw new Error(`evidence_insert_failed: ${evidenceInsert.error.message}`);
  }

  const predictionEntry = await createPredictionEntry({
    case_id: caseId,
    hypothesis_id: `HYP_${entityId}`,
    fenotipo_estimado: phenomenon,
    ep_estado_inicial: 'observed',
    ssp_esperada: 'evidence_and_verification_ready',
    perturbacion_tipo: 'institutional_observation',
    perturbacion_aplicada: 'ico_runtime_run',
    prediccion_explicita: `La entidad ${phenomenon} será rastreada y convertida en memoria institucional con verificación formal.`,
    probabilidad_estimativa: 0.72,
    case_label: phenomenon,
    operator_mode: 'ico_runtime',
    perturbation_applied_at: createdAt,
    created_by: input.createdBy || 'sfi-ico-runtime',
  });

  if (!predictionEntry.ok) {
    throw new Error(`prediction_create_failed: ${predictionEntry.error}`);
  }

  const verificationRule = await createVerificationRule({
    prediction_entry_id: predictionEntry.data.id,
    hypothesis_id: predictionEntry.data.hypothesis_id,
    return_window: '72h',
    verification_rule: {
      observable: phenomenon,
      entity: entityId,
      window: '72h',
      comparator: 'contains',
      threshold: '1',
      source_priority: ['tier_3'],
      source_query: 'sfi_evidence_ledger public_summary',
      true_condition: 'evidence exists for the phenomenon and trust_score >= 0.6',
      false_condition: 'no evidence exists or trust_score < 0.6',
      partial_condition: 'evidence exists but verification is pending',
      unverifiable_condition: 'external source unavailable',
    },
    ground_truth_source_type: 'sfi_evidence_ledger',
    ground_truth_source_url: null,
    ground_truth_source_query: `case_id = ${caseId}`,
    source_quality_tier: 3,
  });

  if (!verificationRule.ok) {
    throw new Error(`verification_rule_create_failed: ${verificationRule.error}`);
  }

  const verificationClose = await closeVerification({
    id: verificationRule.data.id,
    evaluation_result: evidenceInsert.data?.id ? 'TRUE' : 'UNVERIFIABLE',
    source_snapshot_hash: evidencePayload.evidence_hash,
    source_value: asRecord(evidencePayload.public_summary),
    evaluation_confidence: 0.76,
    evidence_state_after_verification: 'VERIFIED',
    verification_notes: 'Verificación cerrada desde el flujo ICO con evidencia insertada en el ledger.',
    verified_by: input.createdBy || 'sfi-ico-runtime',
  });

  if (!verificationClose.ok) {
    throw new Error(`verification_close_failed: ${verificationClose.error}`);
  }

  await writeInstitutionalMemory({
    entityType: 'OBSERVATION',
    entityId: observationResult.observation?.id || caseId,
    source: { component: 'ico-runtime', agentId: input.createdBy || 'sfi-ico-runtime' },
    provenance: { originTable: 'scorefriction_observations', originId: observationResult.observation?.id },
    authorization: { rule: 'ICO_OBSERVATION_MEMORY' },
    payload: { phenomenon, caseId, traceId },
  });

  await writeInstitutionalMemory({
    entityType: 'EVIDENCE',
    entityId: evidenceInsert.data?.id || evidenceId,
    source: { component: 'ico-runtime', agentId: input.createdBy || 'sfi-ico-runtime' },
    provenance: { originTable: 'sfi_evidence_ledger', originId: evidenceInsert.data?.id },
    authorization: { rule: 'ICO_EVIDENCE_MEMORY' },
    payload: { phenomenon, caseId, traceId },
  });

  await writeInstitutionalMemory({
    entityType: 'PREDICTION',
    entityId: predictionEntry.data.id,
    source: { component: 'ico-runtime', agentId: input.createdBy || 'sfi-ico-runtime' },
    provenance: { originTable: 'sfi_prediction_entries', originId: predictionEntry.data.id },
    authorization: { rule: 'ICO_PREDICTION_MEMORY' },
    payload: { phenomenon, caseId, traceId },
  });

  const graphState = await buildInstitutionalEntityGraph({ entityId, entityType: 'PHENOMENON', label: phenomenon });
  const entityContext = await buildEntityContext(graphState, entityId);
  const friction = await buildFrictionField();
  const attractor = await buildAttractorScorecard();
  const tomography = await buildInstitutionalTomography();

  const graphNodes = [
    { node_id: entityId, label: phenomenon, ontology_type: 'PHENOMENON', profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { caseId, traceId, createdAt }, created_at: createdAt, updated_at: createdAt },
    { node_id: `${entityId}:observation`, label: 'Observation', ontology_type: 'OBSERVATION', profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { caseId, traceId }, created_at: createdAt, updated_at: createdAt },
    { node_id: `${entityId}:evidence`, label: 'Evidence', ontology_type: 'EVIDENCE', profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { caseId, evidenceId: evidenceInsert.data?.id ?? evidenceId }, created_at: createdAt, updated_at: createdAt },
    { node_id: `${entityId}:prediction`, label: 'Prediction', ontology_type: 'PREDICTION', profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { predictionId: predictionEntry.data.id }, created_at: createdAt, updated_at: createdAt },
    { node_id: `${entityId}:memory`, label: 'Institutional Memory', ontology_type: 'MEMORY', profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { traceId }, created_at: createdAt, updated_at: createdAt },
    { node_id: `${entityId}:decision`, label: 'Decision', ontology_type: 'DECISION', profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { verificationId: verificationRule.data.id }, created_at: createdAt, updated_at: createdAt },
  ];

  const graphEdges = [
    { edge_id: `${entityId}:obs`, source_node_id: entityId, target_node_id: `${entityId}:observation`, relation: 'observed_by', weight: 1, profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { traceId }, created_at: createdAt, updated_at: createdAt },
    { edge_id: `${entityId}:ev`, source_node_id: `${entityId}:observation`, target_node_id: `${entityId}:evidence`, relation: 'supports', weight: 1, profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { traceId }, created_at: createdAt, updated_at: createdAt },
    { edge_id: `${entityId}:pred`, source_node_id: `${entityId}:evidence`, target_node_id: `${entityId}:prediction`, relation: 'derived_from', weight: 1, profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { traceId }, created_at: createdAt, updated_at: createdAt },
    { edge_id: `${entityId}:dec`, source_node_id: `${entityId}:prediction`, target_node_id: `${entityId}:decision`, relation: 'verified_by', weight: 1, profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { traceId }, created_at: createdAt, updated_at: createdAt },
    { edge_id: `${entityId}:mem`, source_node_id: `${entityId}:decision`, target_node_id: `${entityId}:memory`, relation: 'stored_as', weight: 1, profile: 'shared', origin: 'ico-runtime', provenance: 'ico-runtime', lineage: ['ICO'], attributes: { traceId }, created_at: createdAt, updated_at: createdAt },
  ];

  await service.from('graph_nodes').insert(graphNodes).select('node_id');
  await service.from('graph_edges').insert(graphEdges).select('edge_id');

  return {
    ok: true,
    entityId,
    caseId,
    traceId,
    observation: observationResult.observation,
    evidenceId: evidenceInsert.data?.id ?? evidenceId,
    prediction: predictionEntry.data,
    verification: verificationClose.data,
    graph: {
      nodes: graphNodes.map((node) => node.node_id),
      edges: graphEdges.map((edge) => edge.edge_id),
    },
    entityContext,
    friction,
    attractor,
    tomography,
    timeline: [
      { step: 'Reality Signal', value: phenomenon },
      { step: 'Observation Registry', value: observationResult.observation?.id || caseId },
      { step: 'Evidence Registry', value: evidenceInsert.data?.id || evidenceId },
      { step: 'Prediction', value: predictionEntry.data.id },
      { step: 'Verification', value: verificationClose.data?.id || verificationRule.data.id },
      { step: 'Institutional Memory', value: entityId },
      { step: 'Entity Graph', value: entityId },
      { step: 'Atlas / WorldSpect / Ledger / Command', value: 'linked through entity context' },
    ],
  };
}
