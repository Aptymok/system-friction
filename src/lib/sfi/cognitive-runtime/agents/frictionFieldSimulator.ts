import type { KernelContext, KernelSimulation } from '../kernelContext';
import { materialEvidenceCoverage, materialEvidenceView } from '../materialEvidence';

export interface FrictionCandidate {
  dimension: 'information' | 'coordination' | 'resource' | 'temporal';
  severity: number;
  confidence: number;
  basis: string;
  evidenceRefs: string[];
  limitation: string | null;
}

export interface FrictionFieldState {
  informationFriction: number;
  coordinationFriction: number;
  resourceFriction: number;
  temporalFriction: number;
  totalFrictionIndex: number;
  candidates: FrictionCandidate[];
}

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function flatten(value: unknown, path = '', depth = 0, out: Array<{ path: string; value: unknown }> = []) {
  if (depth > 7 || out.length > 900) return out;
  if (value === null || value === undefined) return out;
  if (typeof value !== 'object') {
    out.push({ path, value });
    return out;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < Math.min(value.length, 120); index += 1) {
      flatten(value[index], `${path}[${index}]`, depth + 1, out);
    }
    return out;
  }
  for (const [key, nested] of Object.entries(value as Row).slice(0, 160)) {
    flatten(nested, path ? `${path}.${key}` : key, depth + 1, out);
  }
  return out;
}

function normalizeRatio(value: number, path: string, rowCount: number | null) {
  if (!Number.isFinite(value) || value < 0) return null;
  const lower = path.toLowerCase();
  if (/ratio|rate|percent|percentage|share|proportion|fraction|pct/.test(lower)) {
    return Math.max(0, Math.min(1, value > 1 && value <= 100 ? value / 100 : value));
  }
  if (/count|rows|records|tickets|cases|items|occurrences|repet|recurr|negative|malformed|invalid|missing/.test(lower) && rowCount && rowCount > 0) {
    return Math.max(0, Math.min(1, value / rowCount));
  }
  return null;
}

function classifyPath(path: string): FrictionCandidate['dimension'] | null {
  const lower = path.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/negative|temporal|timestamp|interval|latenc|delay|retras|tiempo|fecha|creacion|inicio.*atencion|attend.*created|attention.*created|sla.*breach|out.*of.*order|reversed|precedence/.test(lower)) return 'temporal';
  if (/recurr|repeat|repet|duplicate|duplic|handoff|assignment|asignacion|actor|coord|queue|cola|category.*repeat|request.*repeat/.test(lower)) return 'coordination';
  if (/malformed|missing|null|schema|field|quality|unknown|undetermined|unresolved|inconsisten|invalid|dato|data.*quality/.test(lower)) return 'information';
  if (/backlog|capacity|resource|workload|throughput|volume.*pressure|presupuesto|capacidad|recurso|saturat|queue.*size/.test(lower)) return 'resource';
  return null;
}

function rowCountFrom(entries: Array<{ path: string; value: unknown }>) {
  const candidate = entries.find((entry) => /(^|\.)(rowcount|recordcount|totalrows|totalrecords|totaltickets|ticketcount)$/i.test(entry.path) && Number.isFinite(Number(entry.value)));
  return candidate ? Number(candidate.value) : null;
}

export function FrictionFieldSimulatorAgent(context: KernelContext): KernelContext {
  const evidence = materialEvidenceView(context);
  const coverage = materialEvidenceCoverage(context);
  const candidates: FrictionCandidate[] = [];

  for (const item of evidence) {
    const entries = flatten(item.payload);
    const rowCount = rowCountFrom(entries);
    for (const entry of entries) {
      if (typeof entry.value !== 'number' && !(typeof entry.value === 'string' && entry.value.trim() && Number.isFinite(Number(entry.value)))) continue;
      const numeric = Number(entry.value);
      const dimension = classifyPath(entry.path);
      if (!dimension) continue;
      const severity = normalizeRatio(numeric, entry.path, rowCount);
      if (severity === null) continue;
      candidates.push({
        dimension,
        severity,
        confidence: Math.max(0.2, Math.min(1, item.confidence)),
        basis: `${entry.path}=${numeric}${rowCount ? `; rowCount=${rowCount}` : ''}`,
        evidenceRefs: [item.id],
        limitation: null,
      });
    }
  }

  const dimensions: FrictionCandidate['dimension'][] = ['information', 'coordination', 'resource', 'temporal'];
  const strongest = (dimension: FrictionCandidate['dimension']) => candidates
    .filter((candidate) => candidate.dimension === dimension)
    .sort((a, b) => (b.severity * b.confidence) - (a.severity * a.confidence))
    .slice(0, 3);
  const dimensionValue = (dimension: FrictionCandidate['dimension']) => {
    const values = strongest(dimension);
    if (!values.length) return 0;
    const weight = values.reduce((sum, candidate) => sum + candidate.confidence, 0) || 1;
    return values.reduce((sum, candidate) => sum + candidate.severity * candidate.confidence, 0) / weight;
  };

  const state: FrictionFieldState = {
    informationFriction: dimensionValue('information'),
    coordinationFriction: dimensionValue('coordination'),
    resourceFriction: dimensionValue('resource'),
    temporalFriction: dimensionValue('temporal'),
    totalFrictionIndex: 0,
    candidates: [
      ...strongest('information'),
      ...strongest('coordination'),
      ...strongest('resource'),
      ...strongest('temporal'),
    ],
  };
  const valueByDimension: Record<FrictionCandidate['dimension'], number> = {
    information: state.informationFriction,
    coordination: state.coordinationFriction,
    resource: state.resourceFriction,
    temporal: state.temporalFriction,
  };
  const measuredDimensionNames = dimensions.filter((dimension) => strongest(dimension).length > 0);
  const unmeasuredDimensionNames = dimensions.filter((dimension) => !measuredDimensionNames.includes(dimension));
  const measuredDimensionValues = measuredDimensionNames.map((dimension) => valueByDimension[dimension]);
  state.totalFrictionIndex = measuredDimensionValues.length
    ? measuredDimensionValues.reduce((sum, value) => sum + value, 0) / measuredDimensionValues.length
    : 0;

  const evidenceRefs = [...new Set(state.candidates.flatMap((candidate) => candidate.evidenceRefs))];
  const simulation: KernelSimulation = {
    simulator: 'FrictionFieldSimulatorAgent',
    output: {
      ...state,
      epistemicClass: 'SIMULATED',
      assessmentClass: 'DERIVED_FRICTION_PROJECTION',
      evidenceRefs,
      measuredDimensions: measuredDimensionNames.length,
      measuredDimensionNames,
      unmeasuredDimensionNames,
      materialEvidenceResolved: evidence.length,
      interpretationBoundary: 'Friction scoring reuses persisted material evidence resolved from selected targets/references. The projection remains SIMULATED and does not itself prove causal attribution or authorize action.',
    },
  };
  context.simulations.push(simulation);
  context.metadata = {
    ...context.metadata,
    materialEvidenceResolution: coverage,
    frictionFieldSimulation: {
      executed: true,
      frictionIndex: state.totalFrictionIndex,
      candidates: state.candidates,
      evidenceRefs,
      materialEvidenceResolved: evidence.length,
      measuredDimensions: measuredDimensionNames.length,
      measuredDimensionNames,
      unmeasuredDimensionNames,
      epistemicClass: 'SIMULATED',
      assessmentClass: 'DERIVED_FRICTION_PROJECTION',
      claimBoundary: 'Friction projection is a SIMULATED assessment derived from persisted material evidence. Measured zeroes remain measurements, absent dimensions remain unmeasured, causal attribution requires rival-cause analysis, and action still requires governance.',
      executedAt: new Date().toISOString(),
    },
  };
  return context;
}
