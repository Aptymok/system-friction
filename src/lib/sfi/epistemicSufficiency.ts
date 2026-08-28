import type { UniversalCycleInput, UniversalSignalInput } from './universalSignalCycle';

export type SfiAnalysisSufficiencyStatus = 'READY' | 'BLOCKED';
export type SfiAnalysisStatus = 'READY_FOR_ANALYSIS' | 'BLOCKED_INSUFFICIENT_OBJECT_OBSERVATION';

type Row = Record<string, unknown>;

export type SfiEpistemicSufficiency = {
  status: SfiAnalysisSufficiencyStatus;
  analysisStatus: SfiAnalysisStatus;
  representation: string;
  materialObservation: 'PRESENT' | 'MISSING';
  requiredObservations: string[];
  satisfiedObservations: string[];
  missingObservations: string[];
  requiredCapabilities: string[];
  reason: string | null;
  epistemicBoundary: string;
};

const IDENTITY_ONLY_KEYS = new Set([
  'objecthash',
  'contenthash',
  'fingerprint',
  'referencehash',
  'objectkey',
  'name',
  'mimetype',
  'assetref',
  'sourceurl',
]);

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasMaterialContent(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value as Row).length > 0;
  return false;
}

function substantiveExtractedKeys(extracted: Row): string[] {
  return Object.keys(extracted).filter((key) => !IDENTITY_ONLY_KEYS.has(key.toLowerCase()));
}

function hasSchema(extracted: Row): boolean {
  return [
    extracted.schema,
    extracted.columns,
    extracted.fields,
    extracted.variables,
    extracted.headers,
  ].some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value && typeof value === 'object' && Object.keys(value as Row).length > 0));
}

function hasCount(extracted: Row): boolean {
  const candidates = [
    extracted.rowCount,
    extracted.row_count,
    extracted.recordCount,
    extracted.record_count,
    extracted.totalRows,
    extracted.total_rows,
    extracted.totalRecords,
    extracted.total_records,
  ];
  if (candidates.some((value) => {
    const parsed = number(value);
    return parsed !== null && parsed >= 0;
  })) return true;
  if (Array.isArray(extracted.rows) || Array.isArray(extracted.records)) return true;
  return false;
}

function datasetCapability(signal: UniversalSignalInput): string {
  const mime = text(signal.mimeType).toLowerCase();
  const name = text(signal.name).toLowerCase();
  const kind = text(signal.kind).toLowerCase();
  if (mime.includes('spreadsheetml') || /\.xlsx$/i.test(name)) return 'DATASET.XLSX.PROFILE';
  if (mime.includes('ms-excel') || /\.xls$/i.test(name)) return 'DATASET.XLS.PROFILE';
  if (kind === 'csv' || mime.includes('csv') || /\.csv$/i.test(name)) return 'DATASET.CSV.PROFILE';
  if (kind === 'json' || mime.includes('json') || /\.jsonl?$/i.test(name)) return 'DATASET.JSON.PROFILE';
  return 'DATASET.GENERIC.PROFILE';
}

/**
 * Epistemic sufficiency is intentionally narrower than runtime capability.
 * A signal reference, filename, assetRef or content fingerprint proves identity,
 * not material observation of the represented object. The first enforced gate is
 * dataset-like input because a real XLSX case demonstrated that SFI could execute
 * a cognitive cycle over an unextracted reference. Other representations can be
 * added incrementally without changing this contract.
 */
export function evaluateUniversalAnalysisSufficiency(input: UniversalCycleInput): SfiEpistemicSufficiency {
  const signal = input.signal ?? {};
  const kind = text(signal.kind).toLowerCase();
  const datasetLike = kind === 'dataset' || kind === 'csv' || kind === 'json';

  if (!datasetLike) {
    return {
      status: 'READY',
      analysisStatus: 'READY_FOR_ANALYSIS',
      representation: kind || 'unknown',
      materialObservation: hasMaterialContent(signal.content) || substantiveExtractedKeys(row(signal.extracted)).length > 0 ? 'PRESENT' : 'MISSING',
      requiredObservations: [],
      satisfiedObservations: [],
      missingObservations: [],
      requiredCapabilities: [],
      reason: null,
      epistemicBoundary: 'No material-observation gate is enforced yet for this representation. Runtime execution must not be interpreted as empirical validation.',
    };
  }

  const extracted = row(signal.extracted);
  const contentPresent = hasMaterialContent(signal.content);
  const extractedPresent = substantiveExtractedKeys(extracted).length > 0;
  const schemaPresent = hasSchema(extracted) || (contentPresent && kind === 'json');
  const countPresent = hasCount(extracted) || (Array.isArray(signal.content));

  const checks = [
    { id: 'MATERIAL_CONTENT_OR_EXTRACTION', ok: contentPresent || extractedPresent },
    { id: 'SCHEMA_OR_FIELDS', ok: schemaPresent },
    { id: 'ROW_OR_RECORD_COUNT', ok: countPresent },
  ];
  const satisfiedObservations = checks.filter((check) => check.ok).map((check) => check.id);
  const missingObservations = checks.filter((check) => !check.ok).map((check) => check.id);
  const ready = missingObservations.length === 0;

  return {
    status: ready ? 'READY' : 'BLOCKED',
    analysisStatus: ready ? 'READY_FOR_ANALYSIS' : 'BLOCKED_INSUFFICIENT_OBJECT_OBSERVATION',
    representation: kind,
    materialObservation: contentPresent || extractedPresent ? 'PRESENT' : 'MISSING',
    requiredObservations: checks.map((check) => check.id),
    satisfiedObservations,
    missingObservations,
    requiredCapabilities: ready ? [] : [datasetCapability(signal)],
    reason: ready ? null : 'The dataset is identified but has not been materially observed with enough deterministic structure to support substantive analysis.',
    epistemicBoundary: 'REFERENCE/DECLARATION ≠ MATERIAL OBSERVATION. A dataset cognitive cycle may run only after extracted or supplied material observations satisfy the declared analysis requirements.',
  };
}
