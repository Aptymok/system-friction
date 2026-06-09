import { inferEvidenceType } from '../evidence-vector-mapper';
import { isScoreFrictionEvidenceType, type ScoreFrictionEvidenceInput, type ScoreFrictionEvidenceType } from '../evidence-contract';

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    return headers.reduce<Record<string, unknown>>((acc, header, index) => {
      acc[header] = cells[index]?.trim() ?? '';
      return acc;
    }, {});
  });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseEvidenceUpload(input: {
  case_id: string;
  source_name: string;
  territory?: string;
  fileName: string;
  content: string;
  evidence_type?: ScoreFrictionEvidenceType;
  reliability_score?: number;
  provenance_notes?: string | null;
}): ScoreFrictionEvidenceInput[] {
  const lower = input.fileName.toLowerCase();
  const parsedJson = safeJson(input.content);
  const base = {
    case_id: input.case_id,
    source_name: input.source_name,
    territory: input.territory ?? 'MX',
    reliability_score: input.reliability_score,
    provenance_notes: input.provenance_notes ?? `operator upload: ${input.fileName}`,
  };

  if (Array.isArray(parsedJson)) {
    return parsedJson.map((row) => ({
      ...base,
      evidence_type: input.evidence_type ?? inferEvidenceType({ source_name: input.source_name, raw_payload: row && typeof row === 'object' ? row as Record<string, unknown> : {}, fileName: input.fileName }),
      raw_payload: row && typeof row === 'object' ? row as Record<string, unknown> : { value: row },
    }));
  }

  if (parsedJson && typeof parsedJson === 'object') {
    const raw = parsedJson as Record<string, unknown>;
    return [{ ...base, evidence_type: input.evidence_type ?? inferEvidenceType({ source_name: input.source_name, raw_payload: raw, fileName: input.fileName }), raw_payload: raw }];
  }

  if (lower.endsWith('.csv')) {
    return parseCsv(input.content).map((row) => ({
      ...base,
      evidence_type: input.evidence_type ?? inferEvidenceType({ source_name: input.source_name, raw_payload: row, fileName: input.fileName }),
      raw_payload: { ...row, rows: [row], file_name: input.fileName },
    }));
  }

  const evidenceType = input.evidence_type ?? (lower.endsWith('.txt') || lower.endsWith('.md')
    ? inferEvidenceType({ source_name: input.source_name, raw_payload: { text: input.content }, fileName: input.fileName })
    : 'dataset_sample');

  return [{ ...base, evidence_type: evidenceType, raw_payload: { text: input.content, file_name: input.fileName } }];
}

export function normalizeEvidenceInput(value: unknown): ScoreFrictionEvidenceInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.case_id !== 'string' || row.case_id.trim().length === 0) return null;
  const sourceName = typeof row.source_name === 'string' && row.source_name.trim().length > 0 ? row.source_name : 'manual_upload';
  const rawPayload = row.raw_payload && typeof row.raw_payload === 'object' && !Array.isArray(row.raw_payload) ? row.raw_payload as Record<string, unknown> : row;
  return {
    case_id: row.case_id,
    source_name: sourceName,
    source_url: typeof row.source_url === 'string' ? row.source_url : null,
    territory: typeof row.territory === 'string' ? row.territory : 'MX',
    evidence_type: isScoreFrictionEvidenceType(row.evidence_type)
      ? row.evidence_type
      : inferEvidenceType({ source_name: sourceName, raw_payload: rawPayload }),
    reliability_score: typeof row.reliability_score === 'number' ? row.reliability_score : undefined,
    provenance_notes: typeof row.provenance_notes === 'string' ? row.provenance_notes : null,
    raw_payload: rawPayload,
    vector_overrides: row.vector_overrides && typeof row.vector_overrides === 'object' && !Array.isArray(row.vector_overrides)
      ? row.vector_overrides as ScoreFrictionEvidenceInput['vector_overrides']
      : {
        acoustic_vector: row.acoustic_vector && typeof row.acoustic_vector === 'object' && !Array.isArray(row.acoustic_vector) ? row.acoustic_vector as Record<string, unknown> : undefined,
        semantic_vector: row.semantic_vector && typeof row.semantic_vector === 'object' && !Array.isArray(row.semantic_vector) ? row.semantic_vector as Record<string, unknown> : undefined,
        mihm_cultural_vector: row.mihm_cultural_vector && typeof row.mihm_cultural_vector === 'object' && !Array.isArray(row.mihm_cultural_vector) ? row.mihm_cultural_vector as Record<string, unknown> : undefined,
      },
  };
}
