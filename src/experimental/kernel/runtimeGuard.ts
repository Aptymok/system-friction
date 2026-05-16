import { reportViolation } from "./selfHealing";

export function runtimeGuard(event: any, context: any) {
  const violations = [];

  // 1. eventos sin tipo
  if (!event?.type) {
    violations.push("MISSING_EVENT_TYPE");
  }

  // 2. payload sospechoso
  if (event?.payload && typeof event.payload !== "object") {
    violations.push("INVALID_PAYLOAD");
  }

  // 3. bypass detectado
  if (context?.directDbAccess) {
    violations.push("DIRECT_DB_BYPASS");
  }

  if (violations.length > 0) {
    reportViolation({
      type: "RUNTIME_VIOLATION",
      violations,
      event,
    });
  }

  return violations;
}