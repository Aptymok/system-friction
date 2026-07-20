import 'server-only';

import {
  promotePhenomenonCandidate,
  type PhenomenonCandidateInput,
} from '@/lib/phenomena/phenomenon-engine';

import type { PpoiIndices } from '@/lib/ppoi/calibration';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value)
    ? (value as Row)
    : {};
}

function numberValue(
  value: unknown,
  fallback = 0,
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function stringValue(
  value: unknown,
  fallback = '',
) {
  return typeof value === 'string' &&
    value.trim()
    ? value.trim()
    : fallback;
}

function normalizeIndex(
  value: number,
) {
  return Math.max(
    0,
    Math.min(
      5,
      value,
    ),
  );
}

function buildEvidenceIds(
  count: number,
) {
  return Array.from(
    {
      length: count,
    },
    (_, index) =>
      `ppoi-evidence-${index + 1}`,
  );
}

export type PpoiPhenomenonBridgeInput = {
  phenomenon: unknown;

  indices: PpoiIndices;

  composite: number;

  evidenceCount: number;

  attractorKeys?: string[];

  ejectorKeys?: string[];
};

export function buildPpoiPhenomenonCandidate(
  input: PpoiPhenomenonBridgeInput,
): PhenomenonCandidateInput {
  const phenomenon =
    record(
      input.phenomenon,
    );

  const indices =
    input.indices;

  const firstSeen =
    stringValue(
      phenomenon.opened_at,
      new Date()
        .toISOString(),
    );

  const lastSeen =
    stringValue(
      phenomenon.last_evidence_at,
      firstSeen,
    );

  const candidate:
    PhenomenonCandidateInput =
    {
      module:
        'ppoi',

      label:
        stringValue(
          phenomenon.name,
          'PPOI phenomenon',
        ),

      evidenceIds:
        buildEvidenceIds(
          input.evidenceCount,
        ),

      attractorKeys:
        [
          `composite:${input.composite.toFixed(3)}`,
          `direction:${stringValue(
            phenomenon.current_direction,
            'UNKNOWN',
          )}`,
          ...(input.attractorKeys ?? []),
        ],

      ejectorKeys:
        [
          ...(input.ejectorKeys ?? []),
        ],

      firstSeen,

      lastSeen,

      density:
        Math.min(
          1,
          input.evidenceCount / 10,
        ),

      trust:
        Math.min(
          1,
          (
            normalizeIndex(
              indices.IE,
            ) +
            normalizeIndex(
              indices.ES,
            )
          ) /
            10,
        ),

      persistence:
        Math.min(
          1,
          normalizeIndex(
            indices.PT,
          ) /
            5,
        ),

      velocity:
        Math.min(
          1,
          normalizeIndex(
            indices.RC,
          ) /
            5,
        ),
    };

  return candidate;
}

export async function bridgePpoiToPhenomenon(
  input: PpoiPhenomenonBridgeInput,
) {
  const candidate =
    buildPpoiPhenomenonCandidate(
      input,
    );

  return promotePhenomenonCandidate(
    candidate,
  );
}

export function buildPhenomenonProjection(
  input: PpoiPhenomenonBridgeInput,
) {
  const phenomenon =
    record(
      input.phenomenon,
    );

  return {
    id:
      phenomenon.id ?? null,

    label:
      stringValue(
        phenomenon.name,
        'PPOI phenomenon',
      ),

    module:
      'ppoi',

    composite:
      input.composite,

    evidenceCount:
      input.evidenceCount,

    indices:
      input.indices,

    temporal: {
      firstSeen:
        stringValue(
          phenomenon.opened_at,
          null as unknown as string,
        ),

      lastSeen:
        stringValue(
          phenomenon.last_evidence_at,
          null as unknown as string,
        ),
    },

    state:
      stringValue(
        phenomenon.status,
        'ACTIVE',
      ),

    direction:
      stringValue(
        phenomenon.current_direction,
        'UNKNOWN',
      ),
  };
}