export type CognitiveTwinCommunicationDisposition =
  | 'URGENT_SURFACE'
  | 'SURFACE'
  | 'REQUEST_EVIDENCE'
  | 'WITHHOLD'
  | 'ARCHIVE_ONLY';

export type CognitiveTwinMutationStatus = 'NOT_CONSIDERED' | 'PROPOSED' | 'EVALUATING' | 'ACCEPTED' | 'REJECTED';

export type CognitiveTwinSalience = {
  evidence: number;
  contradiction: number;
  novelty: number;
  temporal: number;
  worldChange: number;
  total: number;
};

export type CognitiveTwinDevelopmentalEvent = {
  schemaVersion: 'SFI-CT-DEVELOPMENTAL-EVENT-1.0';
  subjectId: string;
  lineageId: string;
  epochKey: string;
  trigger: 'DAILY_HEARTBEAT' | 'FOUNDER' | 'WORLD' | 'SYSTEM' | 'EXPERIMENT' | 'TOOL';
  observedContext: {
    evidenceCount: number | null;
    memoryCount: number | null;
    decisionCount: number | null;
    evaluationCount: number | null;
    recentRunCount: number | null;
  };
  salience: CognitiveTwinSalience;
  materialDevelopment: boolean;
  disposition: CognitiveTwinCommunicationDisposition;
  dispositionReason: string;
  selfReport: string;
  whatWouldChangeDecision: string[];
  mutation: {
    considered: boolean;
    status: CognitiveTwinMutationStatus;
    proposalId: string | null;
  };
  evidenceRefs: string[];
  parentEventHash: string | null;
  eventHash: string;
  rootVisibility: 'ALWAYS_VISIBLE';
  createdAt: string;
};

export type CognitiveTwinLineageHealth = {
  subjectId: string;
  lineageId: string;
  genesisPresent: boolean;
  chainIntegrity: 'PASS' | 'EMPTY' | 'BROKEN' | 'DEGRADED';
  eventCount: number;
  materialEventCount: number;
  lastEpochAt: string | null;
  headHash: string | null;
  lastDisposition: CognitiveTwinCommunicationDisposition | null;
  unresolvedMutationProposals: number;
  prospectiveValidation: 'NOT_YET_POSSIBLE' | 'AVAILABLE';
  individuationDemonstrated: false;
  limitations: string[];
};
