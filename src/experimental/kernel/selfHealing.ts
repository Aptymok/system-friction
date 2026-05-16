import fs from "fs";
import path from "path";

const VIOLATIONS_LOG = path.join(process.cwd(), "self-healing.log");

export function reportViolation(violation: any) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...violation,
  };

  fs.appendFileSync(VIOLATIONS_LOG, JSON.stringify(entry) + "\n");
}