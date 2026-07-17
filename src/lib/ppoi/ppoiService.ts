import 'server-only';

import { createHash } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { calculatePpoiIndices, type PpoiEvidenceInput } from '@/lib/ppoi/calibration';
import { inferPpoiTrajectory } from '@/lib/ppoi/hypothesisEngine';

type Row = Record<string, unknown>;
type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

const TABLE_PHENOMENA = 'ppoi_phenomena';
const TABLE_EVIDENCE = 'ppoi_evidence';
const TABLE_HYPOTHESES = 'ppoi_hypotheses';
const EVIDENCE_TYPES = ['text', 'audio', 'video', 'image', 'software', 'dataset', 'interview', 'field', 'model', 'paper', 'conversation', 'institutional_record'];

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

function requireText(value: unknown, field: string, maxLength = 400) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) throw new Error(`${field}_REQUIRED`);
  return trimmed.slice(0, maxLength);
}

function normalizeEvidenceType(value: unknown) {
  const normalized = requireText(value, 'EVIDENCE_TYPE', 60).toLowerCase();
  if (!EVIDENCE_TYPES.includes(normalized)) throw new Error(`EVIDENCE_TYPE_INVALID:${EVIDENCE_TYPES.join(',')}`);
  return normalized;
}

async function loadOwnedPhenomenon(client: ServiceClient, ownerId: string, phenomenonId: string) {
  const { data, error } = await client
    .from(TABLE_PHENOMENA)
    .select('*')
    .eq('id', phenomenonId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw new Error(`PPOI_PHENOMENON_READ_FAILED: ${error.message}`);
  if (!data) throw new Error('PPOI_PHENOMENON_NOT_FOUND');
  return record(data);
}

export type OpenPhenomenonInput = {
  name: string;
  isCalibrationCase?: boolean;
  relatedStudioObjectId?: string | null;
};

export async function openPhenomenon(ownerId: string, input: OpenPhenomenonInput) {
  const client = createServiceSupabaseClient();
  const name = requireText(input.name, 'PHENOMENON_NAME', 200);
  const { data, error } = await client
    .from(TABLE_PHENOMENA)
    .insert({
      owner_id: ownerId,
      name,
      status: 'ACTIVE',
      is_calibration_case: Boolean(input.isCalibrationCase),
      related_studio_object_id: input.relatedStudioObjectId || null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`PPOI_PHENOMENON_CREATE_FAILED: ${error.message}`);
  return record(data);
}

export async function listPhenomena(ownerId: string) {
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from(TABLE_PHENOMENA)
    .select('*')
    .eq('owner_id', ownerId)
    .order('opened_at', { ascending: false });
  if (error) throw new Error(`PPOI_PHENOMENA_LIST_FAILED: ${error.message}`);
  return Array.isArray(data) ? data.map(record) : [];
}

export type AddEvidenceInput = {
  evidenceType: string;
  source: string;
  domain: string;
  contentUrl?: string | null;
  contentText?: string | null;
  generatesArtifact?: boolean;
  artifactNote?: string | null;
  observedAt?: string | null;
};

export async function addEvidenceAndRecalibrate(ownerId: string, phenomenonId: string, input: AddEvidenceInput) {
  const client = createServiceSupabaseClient();
  const phenomenon = await loadOwnedPhenomenon(client, ownerId, phenomenonId);
  if (phenomenon.status !== 'ACTIVE') throw new Error('PPOI_PHENOMENON_NOT_ACTIVE');

  const evidenceType = normalizeEvidenceType(input.evidenceType);
  const source = requireText(input.source, 'EVIDENCE_SOURCE', 200);
  const domain = requireText(input.domain, 'EVIDENCE_DOMAIN', 100).toLowerCase();
  const contentUrl = typeof input.contentUrl === 'string' ? input.contentUrl.trim().slice(0, 2000) || null : null;
  const contentText = typeof input.contentText === 'string' ? input.contentText.trim().slice(0, 8000) || null : null;
  if (!contentUrl && !contentText) throw new Error('EVIDENCE_CONTENT_REQUIRED');

  const observedAt = input.observedAt ? new Date(input.observedAt) : new Date();
  if (Number.isNaN(observedAt.getTime())) throw new Error('OBSERVED_AT_INVALID');

  const evidenceHash = createHash('sha256')
    .update(JSON.stringify({ phenomenonId, evidenceType, source, domain, contentUrl, contentText, observedAt: observedAt.toISOString() }))
    .digest('hex');

  const existing = await client
    .from(TABLE_EVIDENCE)
    .select('id')
    .eq('phenomenon_id', phenomenonId)
    .eq('evidence_hash', evidenceHash)
    .maybeSingle();
  if (existing.error) throw new Error(`PPOI_EVIDENCE_LOOKUP_FAILED: ${existing.error.message}`);

  if (!existing.data) {
    const insertEvidence = await client
      .from(TABLE_EVIDENCE)
      .insert({
        phenomenon_id: phenomenonId,
        owner_id: ownerId,
        evidence_hash: evidenceHash,
        evidence_type: evidenceType,
        source,
        domain,
        content_url: contentUrl,
        content_text: contentText,
        generates_artifact: Boolean(input.generatesArtifact),
        artifact_note: typeof input.artifactNote === 'string' ? input.artifactNote.trim().slice(0, 2000) || null : null,
        observed_at: observedAt.toISOString(),
      })
      .select('*')
      .single();
    if (insertEvidence.error) throw new Error(`PPOI_EVIDENCE_INSERT_FAILED: ${insertEvidence.error.message}`);
  }

  return runRecalibration(client, ownerId, phenomenonId);
}

export async function recalibratePhenomenon(ownerId: string, phenomenonId: string) {
  const client = createServiceSupabaseClient();
  await loadOwnedPhenomenon(client, ownerId, phenomenonId);
  return runRecalibration(client, ownerId, phenomenonId);
}

async function runRecalibration(client: ServiceClient, ownerId: string, phenomenonId: string) {
  const { data: evidenceRows, error } = await client
    .from(TABLE_EVIDENCE)
    .select('domain, source, generates_artifact, artifact_note, content_text, observed_at')
    .eq('phenomenon_id', phenomenonId)
    .eq('owner_id', ownerId)
    .order('observed_at', { ascending: true });
  if (error) throw new Error(`PPOI_EVIDENCE_READ_FAILED: ${error.message}`);

  const evidenceInputs: PpoiEvidenceInput[] = Array.isArray(evidenceRows)
    ? evidenceRows.map((row) => ({
        domain: String(row.domain ?? ''),
        source: String(row.source ?? ''),
        generatesArtifact: Boolean(row.generates_artifact),
        artifactNote: typeof row.artifact_note === 'string' ? row.artifact_note : null,
        contentText: typeof row.content_text === 'string' ? row.content_text : null,
        observedAt: String(row.observed_at),
      }))
    : [];

  const result = calculatePpoiIndices(evidenceInputs);
  const trajectory = inferPpoiTrajectory(result.indices, result.composite);

  const { error: updatePhenomenonError } = await client
    .from(TABLE_PHENOMENA)
    .update({
      current_indices: result.indices,
      current_composite: result.composite,
      indices_calculated_at: new Date().toISOString(),
      last_evidence_at: evidenceInputs.length > 0 ? evidenceInputs[evidenceInputs.length - 1].observedAt : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', phenomenonId)
    .eq('owner_id', ownerId);
  if (updatePhenomenonError) throw new Error(`PPOI_PHENOMENON_UPDATE_FAILED: ${updatePhenomenonError.message}`);

  await client.from(TABLE_HYPOTHESES).update({ is_current: false }).eq('phenomenon_id', phenomenonId).eq('owner_id', ownerId).eq('is_current', true);

  const { data: hypothesis, error: hypothesisError } = await client
    .from(TABLE_HYPOTHESES)
    .insert({
      phenomenon_id: phenomenonId,
      owner_id: ownerId,
      direction: trajectory.direction,
      rationale: trajectory.rationale,
      rival_direction: trajectory.rivalDirection,
      rival_rationale: trajectory.rivalRationale,
      index_snapshot: result.indices,
      composite_snapshot: result.composite,
      is_current: true,
    })
    .select('*')
    .single();
  if (hypothesisError) throw new Error(`PPOI_HYPOTHESIS_INSERT_FAILED: ${hypothesisError.message}`);

  return {
    indices: result.indices,
    composite: result.composite,
    evidenceCount: result.evidenceCount,
    spanDays: result.spanDays,
    calibrationNotes: result.notes,
    hypothesis: record(hypothesis),
  };
}

export async function getPhenomenonState(ownerId: string, phenomenonId: string) {
  const client = createServiceSupabaseClient();
  const phenomenon = await loadOwnedPhenomenon(client, ownerId, phenomenonId);
  const [{ data: evidence, error: evidenceError }, { data: hypothesis, error: hypothesisError }] = await Promise.all([
    client.from(TABLE_EVIDENCE).select('*').eq('phenomenon_id', phenomenonId).eq('owner_id', ownerId).order('observed_at', { ascending: false }),
    client.from(TABLE_HYPOTHESES).select('*').eq('phenomenon_id', phenomenonId).eq('owner_id', ownerId).eq('is_current', true).maybeSingle(),
  ]);
  if (evidenceError) throw new Error(`PPOI_EVIDENCE_READ_FAILED: ${evidenceError.message}`);
  if (hypothesisError) throw new Error(`PPOI_HYPOTHESIS_READ_FAILED: ${hypothesisError.message}`);

  return {
    phenomenon,
    evidence: Array.isArray(evidence) ? evidence.map(record) : [],
    currentHypothesis: hypothesis ? record(hypothesis) : null,
  };
}
