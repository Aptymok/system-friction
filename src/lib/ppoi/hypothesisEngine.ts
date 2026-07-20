import 'server-only';

import type { PpoiIndices } from '@/lib/ppoi/calibration';
import type { MihmTrajectoryDirection } from '@/lib/mihm/instrumentContract';

type DirectionScore = {
  direction: MihmTrajectoryDirection;
  score: number;
  rationale: string;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function normalize(value: number) {
  return clamp01(value / 5);
}

function weightedAverage(values: number[]) {
  if (!values.length) return 0;

  return (
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length
  );
}

export function inferPpoiTrajectory(
  indices: PpoiIndices,
  composite: number,
): {
  direction: MihmTrajectoryDirection;
  rationale: string;
  rivalDirection: MihmTrajectoryDirection;
  rivalRationale: string;
  scores: DirectionScore[];
} {
  const {
    PT,
    PM,
    IE,
    RC,
    CG,
    ES,
    IO,
    LT,
  } = indices;


  const candidates: DirectionScore[] = [

    {
      direction: 'EXPANSION',

      score:
        weightedAverage([
          normalize(PM),
          normalize(IE),
          normalize(RC),
        ]),

      rationale:
        `PM=${PM}, IE=${IE}, RC=${RC}: `
        + 'the phenomenon expands across domains, sources and returns.',
    },


    {
      direction: 'DEEPENING',

      score:
        weightedAverage([
          normalize(PT),
          normalize(ES),
          1 - normalize(PM),
        ]),

      rationale:
        `PT=${PT}, ES=${ES}, PM=${PM}: `
        + 'persistence concentrates into a stable internal structure.',
    },


    {
      direction: 'FRAGMENTATION',

      score:
        weightedAverage([
          1 - normalize(ES),
          normalize(PM),
          normalize(LT),
        ]),

      rationale:
        `ES=${ES}, PM=${PM}, LT=${LT}: `
        + 'the phenomenon disperses without semantic stabilization.',
    },


    {
      direction: 'CONVERGENCE',

      score:
        weightedAverage([
          normalize(ES),
          normalize(RC),
          normalize(PT),
        ]),

      rationale:
        `ES=${ES}, RC=${RC}, PT=${PT}: `
        + 'recurrence and similarity indicate convergence.',
    },


    {
      direction: 'INSTITUTIONALIZATION',

      score:
        weightedAverage([
          normalize(IO),
          normalize(CG),
          normalize(ES),
        ]),

      rationale:
        `IO=${IO}, CG=${CG}, ES=${ES}: `
        + 'artifacts and stable representations indicate institutional structure.',
    },


    {
      direction: 'DEGRADATION',

      score:
        weightedAverage([
          1 - normalize(PT),
          1 - clamp01(composite / 5),
          1 - normalize(RC),
        ]),

      rationale:
        `PT=${PT}, composite=${composite.toFixed(3)}, RC=${RC}: `
        + 'structural persistence is weakening.',
    },


    {
      direction: 'ABSTRACTION',

      score:
        weightedAverage([
          normalize(CG),
          1 - normalize(IO),
          normalize(ES),
        ]),

      rationale:
        `CG=${CG}, IO=${IO}, ES=${ES}: `
        + 'conceptual artifacts exist before operational consolidation.',
    },


    {
      direction: 'OPERATIONALIZATION',

      score:
        weightedAverage([
          normalize(CG),
          normalize(IO),
          1 - normalize(ES),
        ]),

      rationale:
        `CG=${CG}, IO=${IO}, ES=${ES}: `
        + 'artifacts are moving toward operational systems.',
    },

  ];


  const sorted =
    [...candidates]
      .sort(
        (a, b) =>
          b.score - a.score,
      );


  const primary =
    sorted[0];

  const rival =
    sorted[1];


  return {

    direction:
      primary.direction,

    rationale:
      primary.rationale,

    rivalDirection:
      rival.direction,

    rivalRationale:
      rival.rationale,

    scores:
      sorted,

  };
}