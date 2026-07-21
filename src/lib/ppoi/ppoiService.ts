import 'server-only';

import { createHash } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { calculatePpoiIndices, type PpoiEvidenceInput } from '@/lib/ppoi/calibration';
import { inferPpoiTrajectory } from '@/lib/ppoi/hypothesisEngine';

type Row = Record<string, unknown>;
type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

import type {
  PhenomenonState,
  PpoiIndices,
} from '@/lib/ppoi/ppoiTypes';

type PhenomenonRow = {
  id: string;
  name: string;
  status: string;
  current_indices: PpoiIndices;
  current_composite: number | null;
  opened_at?: string;
  last_evidence_at?: string;
  [key: string]: unknown;
};

type EvidenceRow = {
  id: string;
  evidence_type: string;
  source: string;
  domain: string;
  observed_at: string;
  content_text?: string | null;
  content_url?: string | null;
  [key: string]: unknown;
};

const TABLE_PHENOMENA = 'ppoi_phenomena';
const TABLE_EVIDENCE = 'ppoi_evidence';
const TABLE_HYPOTHESES = 'ppoi_hypotheses';
const TABLE_EVIDENCE_LINKS = 'ppoi_evidence_links';

const EVIDENCE_TYPES = [
  'text', 'audio', 'video', 'image', 'software', 'dataset',
  'interview', 'field', 'model', 'paper', 'conversation', 'institutional_record',
];

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Row)
    : {};
}

function requireText(value: unknown, field: string, maxLength = 400) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) throw new Error(`${field}_REQUIRED`);
  return trimmed.slice(0, maxLength);
}

function normalizeEvidenceType(value: unknown) {
  const normalized = requireText(value, 'EVIDENCE_TYPE', 60).toLowerCase();
  if (!EVIDENCE_TYPES.includes(normalized)) {
    throw new Error(`EVIDENCE_TYPE_INVALID:${EVIDENCE_TYPES.join(',')}`);
  }
  return normalized;
}

async function loadOwnedPhenomenon(
  client: ServiceClient,
  ownerId: string,
  phenomenonId: string,
) {
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

// --- Funciones principales (existentes) ---

export type OpenPhenomenonInput = {
  name: string;
  isCalibrationCase?: boolean;
  relatedStudioObjectId?: string | null;
};

export async function openPhenomenon(
  ownerId: string,
  input: OpenPhenomenonInput,
) {
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

// Alias para compatibilidad con importaciones que usan "createPhenomenon"
export const createPhenomenon = openPhenomenon;

export async function canCreatePhenomenon(ownerId: string, name: string) {
  const client = createServiceSupabaseClient();
  const existing = await client
    .from(TABLE_PHENOMENA)
    .select('id,name,fp_code,status,opened_at')
    .eq('owner_id', ownerId)
    .ilike('name', `%${name}%`)
    .limit(10);

  if (existing.error) throw new Error(`PPOI_EXISTENCE_CHECK_FAILED: ${existing.error.message}`);
  return existing.data ?? [];
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

export async function listPhenomenonIds(ownerId: string) {
  const phenomena = await listPhenomena(ownerId);
  return phenomena.map((p) => String(p.id));
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

export async function addEvidenceAndRecalibrate(
  ownerId: string,
  phenomenonId: string,
  input: AddEvidenceInput,
) {
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
  if (isNaN(observedAt.getTime())) throw new Error('OBSERVED_AT_INVALID');

  const evidenceHash = createHash('sha256')
    .update(JSON.stringify({
      phenomenonId,
      evidenceType,
      source,
      domain,
      contentUrl,
      contentText,
      observedAt: observedAt.toISOString(),
    }))
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

  await client
    .from(TABLE_PHENOMENA)
    .update({
      current_indices: result.indices,
      current_composite: result.composite,
      indices_calculated_at: new Date().toISOString(),
      last_evidence_at: evidenceInputs.length > 0 ? evidenceInputs[evidenceInputs.length - 1].observedAt : null,
      current_direction: trajectory.direction,
      current_rival_direction: trajectory.rivalDirection,
      updated_at: new Date().toISOString(),
    })
    .eq('id', phenomenonId)
    .eq('owner_id', ownerId);

  await client
    .from(TABLE_HYPOTHESES)
    .update({ is_current: false })
    .eq('phenomenon_id', phenomenonId)
    .eq('owner_id', ownerId)
    .eq('is_current', true);

  const { data: hypothesis, error: hypothesisError } = await client
    .from(TABLE_HYPOTHESES)
    .insert({
      phenomenon_id: phenomenonId,
      owner_id: ownerId,
      direction: trajectory.direction,
      rationale: trajectory.rationale,
      rival_direction: trajectory.rivalDirection,
      rival_rationale: trajectory.rivalRationale,
      trajectory_scores: trajectory.scores,
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
    trajectory,
    hypothesis: record(hypothesis),
  };
}

export async function getPhenomenonState(ownerId: string, phenomenonId: string): Promise<PhenomenonState> {
  const client = createServiceSupabaseClient();
  const phenomenonRaw = await loadOwnedPhenomenon(client, ownerId, phenomenonId);

  const phenomenon: PhenomenonRow = {
    id: String(phenomenonRaw.id),
    name: String(phenomenonRaw.name ?? ''),
    status: String(phenomenonRaw.status ?? ''),
    current_indices: (phenomenonRaw.current_indices && typeof phenomenonRaw.current_indices === 'object')
      ? phenomenonRaw.current_indices as PpoiIndices
      : {},
    current_composite: typeof phenomenonRaw.current_composite === 'number' ? phenomenonRaw.current_composite : null,
    opened_at: typeof phenomenonRaw.opened_at === 'string' ? phenomenonRaw.opened_at : undefined,
    last_evidence_at: typeof phenomenonRaw.last_evidence_at === 'string' ? phenomenonRaw.last_evidence_at : undefined,
    fp_code: typeof phenomenonRaw.fp_code === 'string' ? phenomenonRaw.fp_code : null,
    indices_calculated_at: typeof phenomenonRaw.indices_calculated_at === 'string' ? phenomenonRaw.indices_calculated_at : null,
  };

  const [{ data: evidence, error: evidenceError }, { data: hypothesis, error: hypothesisError }] = await Promise.all([
    client.from(TABLE_EVIDENCE).select('*').eq('phenomenon_id', phenomenonId).eq('owner_id', ownerId).order('observed_at', { ascending: false }),
    client.from(TABLE_HYPOTHESES).select('*').eq('phenomenon_id', phenomenonId).eq('owner_id', ownerId).eq('is_current', true).maybeSingle(),
  ]);

  if (evidenceError) throw new Error(`PPOI_EVIDENCE_READ_FAILED: ${evidenceError.message}`);
  if (hypothesisError) throw new Error(`PPOI_HYPOTHESIS_READ_FAILED: ${hypothesisError.message}`);

  return {
    phenomenon,
    evidence: Array.isArray(evidence) ? evidence.map((item) => {
      const row = item as EvidenceRow;
      return {
        id: String(row.id),
        evidence_type: String(row.evidence_type ?? ''),
        source: String(row.source ?? ''),
        domain: String(row.domain ?? ''),
        observed_at: String(row.observed_at ?? ''),
        content_text: typeof row.content_text === 'string' ? row.content_text : null,
        content_url: typeof row.content_url === 'string' ? row.content_url : null,
      };
    }) : [],
    currentHypothesis: hypothesis ? record(hypothesis) : null,
  };
}

// --- Evidence Graph (aditivo) ---

export type EvidenceLinkInput = {
  evidenceId: string;
  phenomenonId: string;
  relationType?: 'RELATED' | 'SHARED_ORIGIN' | 'CROSS_DOMAIN';
  note?: string | null;
};

export async function linkEvidenceToPhenomenon(
  ownerId: string,
  input: EvidenceLinkInput,
) {
  const client = createServiceSupabaseClient();

  const [{ data: evidenceRow, error: evidenceError }, phenomenon] = await Promise.all([
    client.from(TABLE_EVIDENCE).select('id, owner_id').eq('id', input.evidenceId).eq('owner_id', ownerId).maybeSingle(),
    loadOwnedPhenomenon(client, ownerId, input.phenomenonId),
  ]);

  if (evidenceError) throw new Error(`PPOI_EVIDENCE_READ_FAILED: ${evidenceError.message}`);
  if (!evidenceRow) throw new Error('PPOI_EVIDENCE_NOT_FOUND');
  if (!phenomenon) throw new Error('PPOI_PHENOMENON_NOT_FOUND');

  const { data, error } = await client
    .from(TABLE_EVIDENCE_LINKS)
    .upsert(
      {
        evidence_id: input.evidenceId,
        phenomenon_id: input.phenomenonId,
        owner_id: ownerId,
        relation_type: input.relationType ?? 'RELATED',
        note: input.note ?? null,
      },
      { onConflict: 'evidence_id,phenomenon_id' },
    )
    .select('*')
    .single();

  if (error) throw new Error(`PPOI_EVIDENCE_LINK_FAILED: ${error.message}`);
  return record(data);
}

export async function unlinkEvidenceFromPhenomenon(
  ownerId: string,
  evidenceId: string,
  phenomenonId: string,
) {
  const client = createServiceSupabaseClient();
  const { error } = await client
    .from(TABLE_EVIDENCE_LINKS)
    .delete()
    .eq('owner_id', ownerId)
    .eq('evidence_id', evidenceId)
    .eq('phenomenon_id', phenomenonId);

  if (error) throw new Error(`PPOI_EVIDENCE_UNLINK_FAILED: ${error.message}`);
  return { ok: true };
}

export async function listLinkedEvidence(
  ownerId: string,
  phenomenonId: string,
) {
  const client = createServiceSupabaseClient();

  const { data: links, error: linksError } = await client
    .from(TABLE_EVIDENCE_LINKS)
    .select('id, evidence_id, relation_type, note, created_at')
    .eq('owner_id', ownerId)
    .eq('phenomenon_id', phenomenonId)
    .order('created_at', { ascending: false });

  if (linksError) throw new Error(`PPOI_EVIDENCE_LINKS_READ_FAILED: ${linksError.message}`);

  const evidenceIds = (links ?? []).map((row) => String((row as Row).evidence_id));
  if (!evidenceIds.length) return [];

  const { data: evidenceRows, error: evidenceError } = await client
    .from(TABLE_EVIDENCE)
    .select('id, evidence_type, source, domain, content_text, content_url, observed_at, phenomenon_id')
    .in('id', evidenceIds);

  if (evidenceError) throw new Error(`PPOI_EVIDENCE_READ_FAILED: ${evidenceError.message}`);

  const evidenceById = new Map((evidenceRows ?? []).map((row) => [String((row as Row).id), row as Row]));

  return (links ?? []).map((link) => {
    const linkRow = link as Row;
    const evidence = evidenceById.get(String(linkRow.evidence_id));
    return {
      linkId: String(linkRow.id),
      relationType: String(linkRow.relation_type),
      note: linkRow.note ? String(linkRow.note) : null,
      linkedAt: String(linkRow.created_at),
      evidence: evidence ? record(evidence) : null,
    };
  });
}

// --- Promoción (existente) ---

export type PpoiPhenomenonPromotionInput = {
  module?: string;
  label?: string;
  attractorKeys?: string[];
  ejectorKeys?: string[];
};

function buildPhenomenonCandidateFromPpoi(
  phenomenon: Row,
  evidenceCount: number,
  indices: Record<string, number>,
  composite: number,
) {
  const firstSeen = typeof phenomenon.opened_at === 'string' ? phenomenon.opened_at : new Date().toISOString();
  const lastSeen = typeof phenomenon.last_evidence_at === 'string' ? phenomenon.last_evidence_at : firstSeen;

  return {
    module: 'ppoi',
    label: typeof phenomenon.name === 'string' ? phenomenon.name : 'ppoi phenomenon',
    evidenceIds: Array.from({ length: evidenceCount }, (_, i) => `ppoi-evidence-${i + 1}`),
    attractorKeys: [
      `composite:${composite.toFixed(2)}`,
      `direction:${String(phenomenon.current_direction ?? 'UNKNOWN')}`,
    ],
    ejectorKeys: composite < 1 ? ['low-structural-density'] : [],
    firstSeen,
    lastSeen,
    density: Math.min(1, evidenceCount / 10),
    trust: Math.min(1, (Number(indices.IE ?? 0) + Number(indices.ES ?? 0)) / 10),
    persistence: Math.min(1, Number(indices.PT ?? 0) / 5),
    velocity: Math.min(1, Number(indices.RC ?? 0) / 5),
  };
}

async function promotePpoiPhenomenon(
  ownerId: string,
  phenomenon: Row,
  result: { indices: Record<string, number>; composite: number; evidenceCount: number },
) {
  try {
    const { promotePhenomenonCandidate } = await import('@/lib/phenomena/phenomenon-engine');
    const candidate = buildPhenomenonCandidateFromPpoi(phenomenon, result.evidenceCount, result.indices, result.composite);
    return await promotePhenomenonCandidate(candidate);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'PPOI_PROMOTION_FAILED',
      ownerId,
    };
  }
}