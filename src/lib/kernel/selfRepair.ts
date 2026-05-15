import { reportViolation } from "./selfHealing";

export function selfRepair(violations: any[]) {
  for (const v of violations) {
    if (!v.usesKernel) {
      reportViolation({
        type: "MISSING_HANDLE_EVENT",
        file: v.file,
      });
    }

    if (v.hasDirectDb) {
      reportViolation({
        type: "DIRECT_SIDE_EFFECT_DETECTED",
        file: v.file,
      });
    }
  }
}