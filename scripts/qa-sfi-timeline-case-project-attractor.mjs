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
assert.match(project, /not measured outcomes/);
assert.match(attractor, /hasActiveInstitutionalAccountGrant\(actor\)/);
assert.match(attractor, /INSTITUTIONAL_GRANT_REQUIRED/);
assert.match(attractor, /sfi_attractor_trajectory_snapshots/);
assert.match(attractor, /evidence_coverage/);
assert.match(attractor, /Coverage UNKNOWN/);
assert.match(attractor, /not realized institutional authority or a verified RETURN/);
assert.equal(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/.test(project + attractor), false,
  'timeline source adapters must be read-only');
console.log('PASS MIHM-T AUTHORIZED SOURCED LANES: case, project, attractor, bounded provider reads, clocks and grant checks');
