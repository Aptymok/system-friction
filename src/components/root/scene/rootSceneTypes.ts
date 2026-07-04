export type RootSceneDataClass = 'real' | 'derived' | 'gated' | 'mixed';

export type RootSceneNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  value?: string | number;
  status?: string;
  kind?: string;
  source: string;
  meaning: string;
  dataClass: RootSceneDataClass;
};

export type RootSceneEdge = {
  id: string;
  from: string;
  to: string;
  weight: number;
  kind: string;
  source: string;
  meaning: string;
};

export type RootSceneRing = {
  id: string;
  radius: number;
  weight: number;
  label?: string;
  source: string;
  meaning: string;
};

export type RootSceneAnnotation = {
  id: string;
  label: string;
  x: number;
  y: number;
  source?: string;
  meaning?: string;
  dataClass?: RootSceneDataClass;
};

export type RootSceneReadout = {
  id: string;
  label: string;
  value: string | number;
  source: string;
  meaning: string;
  dataClass?: RootSceneDataClass;
};

export type RootSceneSector = {
  id: string;
  startAngle: number;
  endAngle: number;
  radius: number;
  weight: number;
  label?: string;
  source: string;
  meaning: string;
};

export type RootSceneModel = {
  title: string;
  subtitle: string;
  nodes: RootSceneNode[];
  edges: RootSceneEdge[];
  rings: RootSceneRing[];
  annotations: RootSceneAnnotation[];
  readouts: RootSceneReadout[];
  sectors?: RootSceneSector[];
};
