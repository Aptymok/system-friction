// src/experimental/kernel/metaFlow.ts
export type TickStep = {
  name: string;
  condition?: (ctx: any) => boolean;
  transform?: (ctx: any) => any;
};

const DEFAULT_FLOW: TickStep[] = [
  { name: "validate_metrics" },
  { name: "detect_anomalies" },
  { name: "execute_core" },
  { name: "record_outcome" },
];

export function resolveTickFlow(customFlow?: TickStep[]): TickStep[] {
  // Aquí puedes agregar lógica dinámica según métricas globales
  return customFlow || DEFAULT_FLOW;
}
