export type PredictionRouteBand = 'high' | 'mediumHigh' | 'medium' | 'mediumLow' | 'low';

export type PredictionDraftNode = {
  id: string;
  label: string;
  domain: string;
  probability: number;
  persistence: string;
  evidenceBasis: string;
  approvalState: string;
};

export type PredictionPathNode = {
  id: string;
  x: number;
  y: number;
  probability: number;
  band: PredictionRouteBand;
};

export type PredictionTopologyPath = {
  id: string;
  hypothesisId: string;
  band: PredictionRouteBand;
  nodes: PredictionPathNode[];
  source: string;
};

export type PredictionTopologyModel = {
  drafts: PredictionDraftNode[];
  paths: PredictionTopologyPath[];
  returnWindows: Array<{ id: '72h' | '7d' | '30d' | '90d'; coverage: number; source: string }>;
  falsificationRisk: number;
  calibrationReadiness: number;
  qualityIndex: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = 'not_available') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function probabilityBand(probability: number): PredictionRouteBand {
  if (probability >= 0.7) return 'high';
  if (probability >= 0.5) return 'mediumHigh';
  if (probability >= 0.3) return 'medium';
  if (probability >= 0.1) return 'mediumLow';
  return 'low';
}

export function buildPredictionTopologyModel(entries: unknown[], confidence: number): PredictionTopologyModel {
  const drafts = entries.slice(0, 8).map((entry, index) => {
    const record = asRecord(entry);
    const probability = clamp01(num(record.probabilidad_estimativa ?? record.probability ?? record.estimated_probability, 0.52 + index * 0.025));
    return {
      id: text(record.id ?? record.hypothesis_id ?? record.case_id, `P-${String(index + 1).padStart(4, '0')}`),
      label: text(record.prediccion_explicita ?? record.hypothesis_id ?? record.case_id, `Prediction Draft ${index + 1}`),
      domain: text(record.domain ?? record.fenotipo_estimado ?? record.substrate_kind, 'institutional'),
      probability,
      persistence: text(record.persistence ?? record.ep_estado_inicial, probability > 0.67 ? 'high' : probability > 0.48 ? 'med-high' : 'medium'),
      evidenceBasis: text(record.evidence_basis ?? record.evidence_hash ?? record.case_id, 'model + evidence'),
      approvalState: text(record.approval_state ?? record.estado_observacion ?? record.evidence_state, 'pending'),
    };
  });

  const activeDrafts = drafts.length ? drafts : Array.from({ length: 6 }, (_, index) => ({
    id: `P-${String(index + 1).padStart(4, '0')}`,
    label: ['Recursive Governance Upgrade', 'SFI Education Stack v2', 'Open Science Mandate', 'Agent Alignment Protocol', 'Friction Budget Framework', 'Infra Compute Expansion'][index],
    domain: ['governance', 'education', 'research', 'alignment', 'economics', 'infrastructure'][index],
    probability: [0.71, 0.64, 0.58, 0.62, 0.66, 0.59][index],
    persistence: ['high', 'med-high', 'medium', 'med-high', 'high', 'medium'][index],
    evidenceBasis: 'derived placeholder until registry records are present',
    approvalState: 'gated',
  }));

  const columns = [18, 32, 46, 60, 74, 88];
  const paths = activeDrafts.slice(0, 5).map((draft, row) => {
    const band = probabilityBand(draft.probability);
    const yBase = 28 + row * 9;
    const nodes = columns.map((x, index) => ({
      id: `${draft.id}-${index}`,
      x,
      y: yBase + Math.sin(index + row) * 3,
      probability: clamp01(draft.probability + (index - 2) * 0.018),
      band,
    }));
    return { id: `path-${draft.id}`, hypothesisId: draft.id, band, nodes, source: 'predictionRegistry.entries derived path projection' };
  });

  const count = activeDrafts.length;
  const meanProbability = activeDrafts.reduce((sum, item) => sum + item.probability, 0) / Math.max(1, count);
  const confidenceBounded = clamp01(confidence);

  return {
    drafts: activeDrafts,
    paths,
    returnWindows: [
      { id: '72h', coverage: clamp01(meanProbability + 0.08), source: 'prediction registry near-term readiness proxy' },
      { id: '7d', coverage: clamp01(meanProbability), source: 'prediction registry short horizon proxy' },
      { id: '30d', coverage: clamp01(meanProbability - 0.08), source: 'prediction registry medium horizon proxy' },
      { id: '90d', coverage: clamp01(meanProbability - 0.16), source: 'prediction registry long horizon proxy' },
    ],
    falsificationRisk: clamp01(1 - confidenceBounded + count / 40),
    calibrationReadiness: clamp01((confidenceBounded + meanProbability) / 2),
    qualityIndex: clamp01((meanProbability * 0.55) + (confidenceBounded * 0.45)),
  };
}
