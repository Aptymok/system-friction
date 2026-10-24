/**
 * Timeline CASE, PROJECT and ATTRACTOR read-only release checks.
 * Static contract test: data confidentiality and source semantics are asserted,
 * with runtime/tenant-bound smoke validation still required after deployment.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const text = (path) => readFileSync(path, 'utf8');
const page = text('src/app/timeline/page.tsx');
const component = text('src/components/sfi/OperationalTimeline.tsx');
const project = text('src/lib/mihm/timelineCaseProjectReadModel.ts');
const attractor = text('src/lib/mihm/timelineAttractorReadModel.ts');
const history = text('src/lib/mihm/timelineCaseHistory.ts');
const workbench = text('src/components/sfi/RealityChainWorkbench.tsx');
assert.match(page, /readTimelineCaseProjectState\(user\.id\)/);
assert.match(page, /readTimelineInstitutionalAttractors\(\{ id: user\.id, email: user\.email \}\)/);
assert.match(page, /\.\.\.caseProject\.items, \.\.\.attractorHistory\.items/);
for (const lane of ["'CASE'", "'PROJECT'", "'ATTRACTOR'"]) {
  assert.ok(component.includes(lane), 'lane missing: ' + lane);
}
assert.match(project, /listOperationalTenants\(userId\)/);
assert.match(project, /\.in\('tenant_id', ids\)/);
assert.match(project, /\.is\('deleted_at', null\)/);
assert.match(project, /readContinuityInteractiveCaseIndex\(userId\)/);
assert.match(project, /NEON_CONTINUITY/);
assert.match(project, /RECOVERY_READ_NON_CERTIFIED_MIRROR/);
assert.match(project, /caseRows\.length >= 250 \|\| projectRows\.length >= 120/);
assert.match(project, /Case Platform sfi_cases\.updated_at/);
for (const source of [
  'sfi_case_objects','sfi_case_audit_events','sfi_case_action_proposals',
  'sfi_case_action_decisions','sfi_case_reports',
]) assert.ok(project.includes("db.from('" + source + "')"), 'missing persisted historical source: '+source);
assert.equal((project.match(/\.in\('tenant_id', ids\)\.in\('case_id', caseIds\)/g)??[]).length,5,
  'every Case Platform history query must scope by authorized tenant AND case');
assert.match(project, /projectTimelineCaseHistory\(/);
assert.match(project, /CANONICAL_CASE_HISTORY_PARTIAL_OR_UNAVAILABLE/);
assert.match(project, /CASE_HISTORY_NOT_AVAILABLE_ON_THIS_READ_PLANE/);
assert.match(history, /authorizedCaseIds\.has/);
assert.match(history, /authorizedTenantIds\.has/);
assert.match(history, /Current status at query time/);
assert.match(history, /not a persisted report/);
assert.match(history, /No AUTHORITY clock from proposal state alone/);
assert.match(workbench, /get\('objectId'\)/);
assert.match(workbench, /caseData\.objects\.some\(o=>o\.id===requestedObject\)/);
assert.match(project, /not measured outcomes/);
assert.match(attractor, /hasActiveInstitutionalAccountGrant\(actor\)/);
assert.match(attractor, /INSTITUTIONAL_GRANT_REQUIRED/);
assert.match(attractor, /sfi_attractor_trajectory_snapshots/);
assert.match(attractor, /evidence_coverage/);
assert.match(attractor, /Coverage UNKNOWN/);
assert.match(attractor, /not realized institutional authority or a verified RETURN/);
assert.equal(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/.test(project + attractor + history), false,
  'timeline source adapters must be read-only');
console.log('PASS MIHM-T AUTHORIZED SOURCED LANES: case, project, attractor, bounded provider reads, clocks and grant checks');
