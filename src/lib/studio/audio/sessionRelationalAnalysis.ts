import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;
type Segment = { t0: number; t1: number; rms: number; peak: number | null; centroidHz: number | null };

type AudioObject = {
  id: string;
  title: string;
  role: string | null;
  createdAt: string | null;
  segments: Segment[];
  bands: number[];
  metrics: Map<string, number | string>;
};

export type StudioRelationalFinding = {
  id: string;
  kind: 'PAIR_CORRELATION' | 'ROUTE_TEST' | 'STATE_CONTRAST';
  statement: string;
  confidence: number;
  epistemicClass: 'DERIVED';
  evidenceObjectIds: string[];
  payload: Record<string, unknown>;
  limitations: string[];
};

export type StudioSessionRelationalAnalysis = {
  engine: 'studio_audio_relational_v1';
  sessionId: string;
  generatedAt: string;
  objectCount: number;
  audioObjectCount: number;
  roleAssignments: Array<{ objectId: string; title: string; declaredRole: string | null }>;
  pairwise: Array<{ a: string; b: string; rmsEnvelopeCorrelation: number | null; centroidCorrelation: number | null; durationDeltaSeconds: number | null }>;
  routeTests: Array<{ targetRole: string; targetObjectId: string; sourceRoles: string[]; sourceObjectIds: string[]; rSquared: number | null; coefficients: number[]; intercept: number | null; limitations: string[] }>;
  stateContrast: Record<string, unknown> | null;
  findings: StudioRelationalFinding[];
  warnings: string[];
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function numeric(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function numbers(value: unknown): number[] {
  return Array.isArray(value) ? value.map(numeric).filter((item): item is number => item !== null) : [];
}
function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function segments(value: unknown): Segment[] {
  return Array.isArray(value) ? value.map((item) => record(item)).map((item) => ({
    t0: numeric(item.t0) ?? 0,
    t1: numeric(item.t1) ?? 0,
    rms: numeric(item.rms) ?? 0,
    peak: numeric(item.peak),
    centroidHz: numeric(item.centroidHz),
  })).filter((item) => item.t1 > item.t0) : [];
}

function duration(items: Segment[]) {
  return items.length ? Math.max(...items.map((item) => item.t1)) : null;
}

function roleFromTitle(title: string): string | null {
  const value = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  if (/\bpre\s*master\b|\bpremaster\b/.test(value)) return 'PREMASTER';
  if (/\bmaster\b|\bmastered\b|\bfinal\b/.test(value)) return 'MASTER';
  if (/\breverb\b|\bverb\b/.test(value)) return 'REVERB';
  if (/\bdelay\b|\becho\b/.test(value)) return 'DELAY';
  if (/\bparallel\b|\bcomp\s*parallel\b/.test(value)) return 'PARALLEL';
  if (/\bbass\b|\bbajo\b/.test(value)) return 'BASS';
  if (/\bgtr\b|\bguitar\b|\bguitarra\b/.test(value)) return 'GTR';
  if (/\bvox\b|\bvocal\b|\bvoice\b|\bvoz\b/.test(value)) return 'VOX';
  if (/\binst\b|\binstrument\b|\bcassette\b|\bnoise\b/.test(value)) return 'INST';
  if (/\bfx\b|\beffects\b|\befectos\b/.test(value)) return 'FX';
  return null;
}

function interpolateSeries(items: Segment[], key: 'rms' | 'centroidHz', length = 160): Array<number | null> {
  const end = duration(items);
  if (!end || items.length < 2) return [];
  const sorted = [...items].sort((a, b) => a.t0 - b.t0);
  return Array.from({ length }, (_, index) => {
    const t = length <= 1 ? 0 : (index / (length - 1)) * end;
    let item = sorted.find((candidate) => t >= candidate.t0 && t <= candidate.t1) ?? null;
    if (!item) item = sorted.reduce((best, candidate) => Math.abs(((candidate.t0 + candidate.t1) / 2) - t) < Math.abs(((best.t0 + best.t1) / 2) - t) ? candidate : best, sorted[0]);
    const value = item[key];
    if (value === null || !Number.isFinite(value)) return null;
    return key === 'rms' ? 20 * Math.log10(Math.max(1e-9, value)) : value;
  });
}

function paired(a: Array<number | null>, b: Array<number | null>) {
  const out: Array<[number, number]> = [];
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const x = a[index]; const y = b[index];
    if (typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)) out.push([x, y]);
  }
  return out;
}

function pearson(a: Array<number | null>, b: Array<number | null>): number | null {
  const pairs = paired(a, b);
  if (pairs.length < 4) return null;
  const meanA = pairs.reduce((sum, item) => sum + item[0], 0) / pairs.length;
  const meanB = pairs.reduce((sum, item) => sum + item[1], 0) / pairs.length;
  let numerator = 0; let da = 0; let db = 0;
  for (const [x, y] of pairs) {
    const ax = x - meanA; const by = y - meanB;
    numerator += ax * by; da += ax * ax; db += by * by;
  }
  const denominator = Math.sqrt(da * db);
  return denominator > 0 ? Number((numerator / denominator).toFixed(5)) : null;
}

function solveLinear(matrix: number[][], vector: number[]) {
  const n = vector.length;
  const aug = matrix.map((row, index) => [...row, vector[index]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-10) return null;
    const divisor = aug[col][col];
    for (let j = col; j <= n; j += 1) aug[col][j] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= n; j += 1) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map((row) => row[n]);
}

function ridgeRegression(predictors: number[][], target: number[], lambda = 0.04) {
  if (predictors.length < 8 || !predictors[0]?.length || predictors.length !== target.length) return null;
  const p = predictors[0].length + 1;
  const xtx = Array.from({ length: p }, () => Array(p).fill(0));
  const xty = Array(p).fill(0);
  for (let row = 0; row < predictors.length; row += 1) {
    const x = [1, ...predictors[row]];
    for (let i = 0; i < p; i += 1) {
      xty[i] += x[i] * target[row];
      for (let j = 0; j < p; j += 1) xtx[i][j] += x[i] * x[j];
    }
  }
  for (let index = 1; index < p; index += 1) xtx[index][index] += lambda;
  const beta = solveLinear(xtx, xty);
  if (!beta) return null;
  const predicted = predictors.map((row) => beta[0] + row.reduce((sum, value, index) => sum + value * beta[index + 1], 0));
  const mean = target.reduce((sum, value) => sum + value, 0) / target.length;
  const ssTotal = target.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0);
  const ssResidual = target.reduce((sum, value, index) => sum + Math.pow(value - predicted[index], 2), 0);
  return { intercept: beta[0], coefficients: beta.slice(1), rSquared: ssTotal > 0 ? clamp01(1 - ssResidual / ssTotal) : 0 };
}

function routeTest(target: AudioObject, sources: AudioObject[]) {
  const ySeries = interpolateSeries(target.segments, 'rms');
  const xSeries = sources.map((source) => interpolateSeries(source.segments, 'rms'));
  const rowCount = Math.min(ySeries.length, ...xSeries.map((series) => series.length));
  const predictors: number[][] = [];
  const targetValues: number[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    const y = ySeries[row];
    const values = xSeries.map((series) => series[row]);
    if (typeof y !== 'number' || values.some((value) => typeof value !== 'number')) continue;
    predictors.push(values as number[]); targetValues.push(y);
  }
  return ridgeRegression(predictors, targetValues);
}

function metric(object: AudioObject, ...keys: string[]) {
  for (const key of keys) {
    const value = object.metrics.get(key);
    if (typeof value === 'number') return value;
  }
  return null;
}

function delta(after: number | null, before: number | null) {
  return after === null || before === null ? null : Number((after - before).toFixed(4));
}

function stateContrast(pre: AudioObject, post: AudioObject) {
  const macro = pearson(interpolateSeries(pre.segments, 'rms'), interpolateSeries(post.segments, 'rms'));
  const centroid = pearson(interpolateSeries(pre.segments, 'centroidHz'), interpolateSeries(post.segments, 'centroidHz'));
  const keys = [
    ['integratedLufs', ['lufs_integrated', 'integrated_lufs']],
    ['loudnessRangeLu', ['loudness_range_lu']],
    ['truePeakDbtp', ['true_peak_dbtp']],
    ['samplePeakDbfs', ['sample_peak_dbfs', 'peak_dbfs']],
    ['dynamicRangeDb', ['dynamic_range_db']],
    ['stereoWidth', ['stereo_width']],
    ['spectralCentroidHz', ['spectral_centroid_hz']],
  ] as const;
  const metrics = Object.fromEntries(keys.map(([label, aliases]) => {
    const before = metric(pre, ...aliases); const after = metric(post, ...aliases);
    return [label, { before, after, delta: delta(after, before) }];
  }));
  const bandCount = Math.min(pre.bands.length, post.bands.length);
  const spectralBandDelta = Array.from({ length: bandCount }, (_, index) => ({ index, before: pre.bands[index], after: post.bands[index], delta: Number((post.bands[index] - pre.bands[index]).toFixed(6)) }));
  return { preObjectId: pre.id, postObjectId: post.id, macroDynamicCorrelation: macro, spectralTrajectoryCorrelation: centroid, metrics, spectralBandDelta };
}

export async function analyzeStudioSessionRelations(input: { sessionId: string; ownerId: string; activeObjectId?: string | null }): Promise<StudioSessionRelationalAnalysis> {
  const db = createServiceSupabaseClient();
  const warnings: string[] = [];
  const objectsResult = await db.from('studio_objects').select('id,title,mime_type,metadata,created_at,updated_at').eq('session_id', input.sessionId).eq('owner_id', input.ownerId).order('created_at', { ascending: true }).limit(120);
  if (objectsResult.error) throw new Error(`studio_relational_objects:${objectsResult.error.message}`);
  const objectRows = (objectsResult.data ?? []).map(record);
  const objectIds = objectRows.map((row) => text(row.id)).filter((value): value is string => Boolean(value));
  const [audioResult, featureResult] = objectIds.length ? await Promise.all([
    db.from('studio_audio_features').select('*').in('object_id', objectIds).eq('owner_id', input.ownerId).order('created_at', { ascending: false }).limit(500),
    db.from('studio_object_features').select('object_id,feature_key,numeric_value,text_value,created_at').in('object_id', objectIds).eq('owner_id', input.ownerId).order('created_at', { ascending: false }).limit(5000),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (audioResult.error) warnings.push(`audio_features_unavailable:${audioResult.error.message}`);
  if (featureResult.error) warnings.push(`object_features_unavailable:${featureResult.error.message}`);

  const latestAudio = new Map<string, Row>();
  for (const item of audioResult.data ?? []) {
    const row = record(item); const id = text(row.object_id);
    if (id && !latestAudio.has(id)) latestAudio.set(id, row);
  }
  const metricMaps = new Map<string, Map<string, number | string>>();
  for (const item of featureResult.data ?? []) {
    const row = record(item); const id = text(row.object_id); const key = text(row.feature_key);
    if (!id || !key) continue;
    const map = metricMaps.get(id) ?? new Map<string, number | string>();
    if (!map.has(key)) {
      const value = numeric(row.numeric_value) ?? text(row.text_value);
      if (value !== null) map.set(key, value);
    }
    metricMaps.set(id, map);
  }

  const audioObjects: AudioObject[] = objectRows.map((row) => {
    const id = text(row.id) ?? ''; const title = text(row.title) ?? id;
    const audio = latestAudio.get(id);
    return { id, title, role: roleFromTitle(title), createdAt: text(row.created_at), segments: segments(audio?.energy_segments), bands: numbers(audio?.frequency_bands), metrics: metricMaps.get(id) ?? new Map() };
  }).filter((item) => item.id && item.segments.length >= 2);

  const pairwise: StudioSessionRelationalAnalysis['pairwise'] = [];
  for (let a = 0; a < audioObjects.length; a += 1) for (let b = a + 1; b < audioObjects.length; b += 1) {
    const left = audioObjects[a]; const right = audioObjects[b];
    const da = duration(left.segments); const dbb = duration(right.segments);
    pairwise.push({
      a: left.id, b: right.id,
      rmsEnvelopeCorrelation: pearson(interpolateSeries(left.segments, 'rms'), interpolateSeries(right.segments, 'rms')),
      centroidCorrelation: pearson(interpolateSeries(left.segments, 'centroidHz'), interpolateSeries(right.segments, 'centroidHz')),
      durationDeltaSeconds: da === null || dbb === null ? null : Number(Math.abs(da - dbb).toFixed(4)),
    });
  }

  const latestRole = (role: string) => [...audioObjects].reverse().find((item) => item.role === role) ?? null;
  const routeSpecs = [
    { target: 'FX', sources: ['REVERB', 'DELAY'] },
    { target: 'PARALLEL', sources: ['BASS', 'GTR', 'INST', 'VOX'] },
    { target: 'PREMASTER', sources: ['BASS', 'GTR', 'INST', 'VOX', 'FX', 'PARALLEL'] },
  ];
  const routeTests: StudioSessionRelationalAnalysis['routeTests'] = [];
  const findings: StudioRelationalFinding[] = [];
  for (const spec of routeSpecs) {
    const target = latestRole(spec.target); const sourcesFound = spec.sources.map(latestRole).filter((item): item is AudioObject => Boolean(item));
    if (!target || sourcesFound.length < Math.min(2, spec.sources.length)) continue;
    const model = routeTest(target, sourcesFound);
    const limitations = ['ENVELOPE_RELATION_PROXY_NOT_SAMPLE_ACCURATE_SUMMING', 'LABELS_FORM_HYPOTHESIS_SIGNAL_MUST_SUPPORT_RELATION'];
    routeTests.push({ targetRole: spec.target, targetObjectId: target.id, sourceRoles: sourcesFound.map((item) => item.role ?? 'UNKNOWN'), sourceObjectIds: sourcesFound.map((item) => item.id), rSquared: model ? Number(model.rSquared.toFixed(5)) : null, coefficients: model ? model.coefficients.map((value) => Number(value.toFixed(5))) : [], intercept: model ? Number(model.intercept.toFixed(5)) : null, limitations });
    if (model) findings.push({ id: `route:${spec.target.toLowerCase()}`, kind: 'ROUTE_TEST', statement: `La trayectoria RMS persistida de ${spec.target} es explicada por el conjunto declarado de fuentes con R²=${model.rSquared.toFixed(3)} dentro del modelo de envolvente.`, confidence: Number(model.rSquared.toFixed(4)), epistemicClass: 'DERIVED', evidenceObjectIds: [target.id, ...sourcesFound.map((item) => item.id)], payload: { targetRole: spec.target, sourceRoles: sourcesFound.map((item) => item.role), rSquared: model.rSquared, coefficients: model.coefficients }, limitations });
  }

  const pre = latestRole('PREMASTER'); const master = latestRole('MASTER');
  const contrast = pre && master && pre.id !== master.id ? stateContrast(pre, master) : null;
  if (contrast) findings.push({ id: 'contrast:premaster-master', kind: 'STATE_CONTRAST', statement: 'Existe evidencia suficiente para contrastar el estado PREMASTER declarado contra el MASTER declarado sin asumir que sus etiquetas prueban la función.', confidence: 0.9, epistemicClass: 'DERIVED', evidenceObjectIds: [pre!.id, master!.id], payload: contrast, limitations: ['ROLE_ASSIGNMENT_FROM_FILENAME_IS_DECLARED_CONTEXT_NOT_SIGNAL_FACT'] });

  const strongPairs = pairwise.filter((item) => typeof item.rmsEnvelopeCorrelation === 'number' && Math.abs(item.rmsEnvelopeCorrelation) >= 0.9).sort((a, b) => Math.abs(b.rmsEnvelopeCorrelation ?? 0) - Math.abs(a.rmsEnvelopeCorrelation ?? 0)).slice(0, 12);
  strongPairs.forEach((item, index) => findings.push({ id: `pair:${index}:${item.a}:${item.b}`, kind: 'PAIR_CORRELATION', statement: `Dos objetos comparten una trayectoria RMS fuertemente correlacionada (${item.rmsEnvelopeCorrelation}).`, confidence: Math.abs(item.rmsEnvelopeCorrelation ?? 0), epistemicClass: 'DERIVED', evidenceObjectIds: [item.a, item.b], payload: item, limitations: ['CORRELATION_DOES_NOT_PROVE_CAUSATION_OR_ROUTING'] }));

  if (!audioObjects.length) warnings.push('NO_MULTI_OBJECT_AUDIO_EVIDENCE');
  if (audioObjects.length === 1) warnings.push('RELATIONAL_ANALYSIS_REQUIRES_AT_LEAST_TWO_AUDIO_OBJECTS');

  return {
    engine: 'studio_audio_relational_v1', sessionId: input.sessionId, generatedAt: new Date().toISOString(), objectCount: objectRows.length, audioObjectCount: audioObjects.length,
    roleAssignments: audioObjects.map((item) => ({ objectId: item.id, title: item.title, declaredRole: item.role })), pairwise: pairwise.slice(0, 120), routeTests, stateContrast: contrast, findings: findings.slice(0, 40), warnings,
  };
}
