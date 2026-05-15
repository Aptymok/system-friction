export type SystemState = {
  node: any;
  metrics: any;
  logs: any[];
  actions: any[];
  memory: any[];
  snapshots: any[];
  telemetry: any;
  phase: string;
  divergence: number;
  lastSync: number;
};

let GLOBAL_STATE: SystemState;

export function getState(): SystemState {
  return GLOBAL_STATE;
}

export function setState(partial: Partial<SystemState>) {
  GLOBAL_STATE = {
    ...GLOBAL_STATE,
    ...partial,
    lastSync: Date.now(),
  };
}