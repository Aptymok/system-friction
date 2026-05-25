import fs from "fs";
import path from "path";

const VIOLATIONS_LOG = path.join(process.cwd(), "self-healing.log");
const canWriteLocalRuntimeFile = () =>
  !process.env.VERCEL && process.env.NODE_ENV !== "production";

export function reportViolation(violation: any) {
  if (!canWriteLocalRuntimeFile()) return;

  const entry = {
    timestamp: new Date().toISOString(),
    ...violation,
  };

  fs.appendFileSync(VIOLATIONS_LOG, JSON.stringify(entry) + "\n");
}
