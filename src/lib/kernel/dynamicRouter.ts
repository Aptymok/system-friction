const routingTable: Record<string, string> = {
  amv: "AMV",
  cron: "SCHEDULER",
  audit: "AUDIT",
  social: "EXECUTOR",
  default: "CORE",
};

export function resolveRoute(eventType: string, telemetry: any) {
  // ajuste dinámico
  if (telemetry?.errorRate > 0.5) {
    routingTable.social = "SAFE_EXECUTOR";
  }

  if (telemetry?.divergence > 0.8) {
    routingTable.amv = "REDUCED_AMV";
  }

  return routingTable[eventType] || routingTable.default;
}