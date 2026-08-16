import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const reader = read('src/lib/root/cognitiveSpineStatus.ts');
const route = read('src/app/api/root/cognitive-spine/status/route.ts');
const bar = read('src/components/root/cognitive-spine/CognitiveSpineStatusBar.tsx');
const layout = read('src/app/root/layout.tsx');

assert.ok(reader.includes('ROOT_GOVERNANCE_CONTEXT_PROFILE'), 'root_ct_status_profile_missing');
assert.ok(reader.includes('consume: false'), 'root_ct_status_must_not_consume_context');
assert.ok(reader.includes('internalRefsExposed: false'), 'root_ct_status_internal_ref_boundary_missing');
assert.ok(reader.includes('sources: state.derivedState.sourceCount'), 'root_ct_status_source_count_missing');
assert.ok(reader.includes('evidence: state.evidenceRefs.length'), 'root_ct_status_evidence_count_missing');
assert.ok(reader.includes('verificationDebt: state.verificationDebt.absolute'), 'root_ct_status_verification_debt_missing');
assert.equal(reader.includes('evidenceRefs: state.evidenceRefs'), false, 'root_ct_status_exposes_evidence_refs');
assert.equal(reader.includes('memoryRefs: state.memoryRefs'), false, 'root_ct_status_exposes_memory_refs');
assert.equal(reader.includes('decisionRefs: state.decisionRefs'), false, 'root_ct_status_exposes_decision_refs');
assert.equal(reader.includes(".insert("), false, 'root_ct_status_writes_state');
assert.equal(reader.includes(".update("), false, 'root_ct_status_mutates_state');
assert.ok(reader.includes('available: false as const'), 'root_ct_status_unavailability_fallback_missing');

assert.ok(route.includes("requireRootViewer('root.cognitive-spine.status')"), 'root_ct_status_endpoint_not_root_gated');
assert.ok(route.includes("'Cache-Control': 'no-store'"), 'root_ct_status_endpoint_cache_boundary_missing');

assert.ok(bar.includes("fetch('/api/root/cognitive-spine/status'"), 'root_ct_status_bar_endpoint_missing');
assert.ok(bar.includes('CT STATE'), 'root_ct_status_bar_label_missing');
assert.ok(bar.includes('CT AVAILABLE ≠ CT CONSUMED'), 'root_ct_status_bar_consumption_boundary_missing');
assert.ok(bar.includes('ROOT remains operational'), 'root_ct_status_bar_nonmiddleware_fallback_missing');
assert.equal(bar.includes('setInterval'), false, 'root_ct_status_bar_unbounded_polling_introduced');

assert.ok(layout.includes('<CognitiveSpineStatusBar />'), 'root_layout_missing_persistent_ct_status');
assert.ok(layout.indexOf('<CognitiveSpineStatusBar />') > layout.indexOf("<RoleGate allowedRoles={['root']}>"), 'root_ct_status_rendered_outside_role_gate');

console.log(JSON.stringify({
  ok: true,
  statusContract: 'SFI-ROOT-CT-STATUS-1.0',
  rootOnly: true,
  consumesCt: false,
  canonicalWrite: false,
  internalRefsExposed: false,
  automaticPolling: false,
  rootDependsOnCtAvailability: false,
  persistentRootStatusBar: true,
}, null, 2));
