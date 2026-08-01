export interface KernelEvidence {

  id: string;

  source: string;

  confidence: number;

  payload: unknown;

}

export interface KernelHypothesis {

  id: string;

  statement: string;

  confidence: number;

}

export interface KernelPrediction {

  id: string;

  description: string;

  confidence: number;

}

export interface KernelRisk {

  id: string;

  description: string;

  severity: number;

}

export interface KernelOpportunity {

  id: string;

  description: string;

  score: number;

}

export interface KernelSimulation {

  simulator: string;

  output: unknown;

}

export interface KernelContext {

  cycleId: string;

  logbookId: string;

  phenomenonId?: string;

  taskId?: string;

  currentEvent: string;

  evidence: KernelEvidence[];

  hypotheses: KernelHypothesis[];

  contradictions: KernelEvidence[];

  simulations: KernelSimulation[];

  predictions: KernelPrediction[];

  risks: KernelRisk[];

  opportunities: KernelOpportunity[];

  metadata: {

  cognitivePlan?: {

    executionOrder?: string[];

  };

  [key: string]: unknown;

};

} 