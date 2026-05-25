import type { FieldCommandMode } from '@/observatory/components/field/fieldOntology';
import type { FieldMode } from './patternModel';

export type FieldNodeVector = {
  nodeId: string;
  label: string;
  commandMode: FieldCommandMode;
  layer: 'sf' | 'module' | 'twin';
  cluster: string;
  variables: string[];
  patterns: string[];
  linkedSfNodes: string[];
  linkedComponents: string[];
  linkedEndpoints: string[];
  mihmVariables: string[];
  docRefs: string[];
  relationIds: string[];
  baseWeight: number;
  activation: number;
  frictionScore: number;
  traceScore: number;
  stabilityScore: number;
  activityScore: number;
};

export type FieldEdgeVector = {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  relation: string;
  baseWeight: number;
  finalWeight: number;
};

export type PatternVector = {
  patternId: string;
  palabra: string;
  activationTerms: string[];
  relatedNodes: string[];
  frictionLevel: number;
  action: string;
  isCore: boolean;
};

export type MihmVector = {
  IHG: number | null;
  NTI_obs: number | null;
  LDI_hours: number | null;
  PHI_SF: number | null;
  ICE: number | null;
  CRM: number | null;
  F: number | null;
};

export type DocumentTraceVector = {
  docRefs: string[];
  traceScore: number;
  originAvailable: boolean;
};

export type UserSignalVector = {
  rawCommand: string;
  normalizedCommand: string;
  fieldMode: FieldMode | string;
  activeNodeId: string | null;
  detectedIntent: string | null;
  evidencePresent: boolean;
  matchedTerms: string[];
  timestamp: string;
};

export type GraphVectorState = {
  nodeVectors: FieldNodeVector[];
  edgeVectors: FieldEdgeVector[];
  patternVectors: PatternVector[];
  mihmVector: MihmVector;
  traceVector: DocumentTraceVector;
  userSignal: UserSignalVector;
  primaryPatternId: string | null;
  secondaryPatternIds: string[];
  hiddenPatternIds: string[];
  activationScore: number;
  topActivatedNodeIds: string[];
  graphLayoutMode: 'field' | 'focused' | 'trace';
};
