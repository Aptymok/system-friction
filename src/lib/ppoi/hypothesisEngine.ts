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

function n(value: number) {
  return clamp01(value / 5);
}

export function inferPpoiTrajectory(indices: PpoiIndices, composite: number): {
  direction: MihmTrajectoryDirection;
  rationale: string;
  rivalDirection: MihmTrajectoryDirection;
  rivalRationale: string;
  scores: DirectionScore[];
} {
  const { PT, PM, IE, RC, CG, ES, IO } = indices;
  const candidates: DirectionScore[] = [
    {
      direction: 'EXPANSION',
      score: (n(PM) + n(IE)) / 2,
      rationale: `PM=${PM} and IE=${IE}: the phenomenon appears across domains and sources.`,
    },
    {
      direction: 'DEEPENING',
      score: (n(PT) + (1 - n(PM))) / 2,
      rationale: `PT=${PT} with PM=${PM}: persistence is concentrated rather than dispersed.`,
    },
    {
      direction: 'FRAGMENTATION',
      score: ((1 - n(ES)) + n(PM)) / 2,
      rationale: `ES=${ES} with PM=${PM}: cross-domain presence lacks stable lexical overlap.`,
    },
    {
      direction: 'CONVERGENCE',
      score: (n(ES) + n(RC)) / 2,
      rationale: `ES=${ES} and RC=${RC}: recurring evidence keeps a recognizable form.`,
    },
    {
      direction: 'INSTITUTIONALIZATION',
      score: (n(IO) + n(CG) + n(ES)) / 3,
      rationale: `IO=${IO}, CG=${CG}, ES=${ES}: artifacts and stable language point toward structure.`,
    },
    {
      direction: 'DEGRADATION',
      score: ((1 - n(PT)) + (1 - clamp01(composite / 5))) / 2,
      rationale: `PT=${PT} and composite=${composite.toFixed(2)}: active structural presence is weak.`,
    },
    {
      direction: 'ABSTRACTION',
      score: (n(CG) + (1 - n(IO)) + n(ES)) / 3,
      rationale: `CG=${CG}, IO=${IO}, ES=${ES}: conceptual artifacts appear before organizational structure.`,
    },
    {
      direction: 'OPERATIONALIZATION',
      score: (n(CG) + n(IO) + (1 - n(ES))) / 3,
      rationale: `CG=${CG}, IO=${IO}, ES=${ES}: artifacts move toward tools while language still adapts.`,
    },
  ];

  const sorted = [...candidates].sort((left, right) => right.score - left.score);
  const [primary, rival] = sorted;

  return {
    direction: primary.direction,
    rationale: primary.rationale,
    rivalDirection: rival.direction,
    rivalRationale: rival.rationale,
    scores: sorted,
  };
}
