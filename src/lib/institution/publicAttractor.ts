import 'server-only';

import { readInstitutionalAttractor, SFI_ATTRACTOR_DIMENSIONS } from './institutionalAttractor';

type Row = Record<string, unknown>;
function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []; }
function numeric(value: unknown) { const parsed = typeof value === 'number' ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; }

export type PublicInstitutionalAttractorState = {
  status: 'DECLARED_AND_MEASURED' | 'DECLARED_AWAITING_EVIDENCE' | 'MISSING';
  label: string | null;
  desiredState: string | null;
  mechanism: string | null;
  normativePosition: string | null;
  claimBoundary: string | null;
  evidenceCoverage: number | null;
  supportedDimensions: string[];
  missingDimensions: string[];
  latestObservedAt: string | null;
  activePhenomena: number;
  dimensions: string[];
  warnings: string[];
};

export async function buildPublicInstitutionalAttractorState(): Promise<PublicInstitutionalAttractorState> {
  const state = await readInstitutionalAttractor();
  if (!state.attractor) {
    return {
      status: 'MISSING', label: null, desiredState: null, mechanism: null, normativePosition: null, claimBoundary: null,
      evidenceCoverage: null, supportedDimensions: [], missingDimensions: [...SFI_ATTRACTOR_DIMENSIONS], latestObservedAt: null,
      activePhenomena: 0, dimensions: [...SFI_ATTRACTOR_DIMENSIONS], warnings: state.warnings,
    };
  }
  const vector = record(state.attractor.vector);
  const trajectory = record(state.latestTrajectory);
  const evidenceCoverage = numeric(trajectory.evidence_coverage);
  return {
    status: evidenceCoverage === null ? 'DECLARED_AWAITING_EVIDENCE' : 'DECLARED_AND_MEASURED',
    label: text(state.attractor.label),
    desiredState: text(vector.desiredState),
    mechanism: text(vector.mechanism),
    normativePosition: text(vector.normativePosition),
    claimBoundary: text(vector.claimBoundary),
    evidenceCoverage,
    supportedDimensions: strings(trajectory.supported_dimensions),
    missingDimensions: strings(trajectory.missing_dimensions),
    latestObservedAt: text(trajectory.observed_at),
    activePhenomena: state.phenomenonTrajectory.length,
    dimensions: strings(vector.dimensions).length ? strings(vector.dimensions) : [...SFI_ATTRACTOR_DIMENSIONS],
    warnings: state.warnings,
  };
}
