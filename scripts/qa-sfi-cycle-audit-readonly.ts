import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const r=readFileSync('src/app/api/external/v1/root/operate/route.ts','utf8');
for (const value of [
  "operation === 'cycles_audit_bounded'",
  "ids.length>9",
  "new Set(ids).size!==ids.length",
  "readUniversalCycleHistory(cycleId)",
  "assessUniversalClosure({history:h,requested:{closureClass:'EMPIRICAL_CONTRAST'}})",
  "hasVerifiedLatestUniversalReturnCalibration(ev)",
  "getCurrentUniversalClosureRecommendation(ev)",
  "perAgentCapabilityGrantVerified:false",
  "materialExecutionAuthorityVerified:false",
  "executedAgents:0,createdCycles:0",
  "authorityExpanded:false,publicationExecuted:false",
]) assert(r.includes(value),'Cycle audit missing boundary: '+value);
const segment=r.slice(r.indexOf("if (operation === 'cycles_audit_bounded')"),r.indexOf("if (operation === 'sfi_state')"));
assert(!segment.includes('appendEpistemicEvent('));
assert(!segment.includes("runUniversalCognitiveCycle("));
assert(!segment.includes("recordUniversalReturn("));
assert(!segment.includes("closeUniversalCycle("));
console.log('PASS · read-only nine-cycle audit uses existing history and closure evaluators without executing or closing cycles');
