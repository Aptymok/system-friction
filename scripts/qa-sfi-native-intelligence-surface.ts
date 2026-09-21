import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const continuity = read('src/lib/continuity/runtime.ts');
const neon = read('src/lib/continuity/neonHeartbeatStore.ts');
const route = read('src/app/api/root/friccionauta/route.ts');
const panel = read('src/components/sfi/SfiFriccionautaPanel.tsx');
const root = read('src/components/sfi/SfiRootWorkspace.tsx');

assert.match(neon, /readNeonContinuityObservation/, 'native_intelligence_requires_neon_continuity_observation');
for (const table of [
  'sfi_continuity_state',
  'sfi_continuity_runs',
  'sfi_capability_health_checks',
  'sfi_institutional_incidents',
  'sfi_founder_decision_queue',
  'sfi_continuity_reports',
]) assert.ok(neon.includes(table), `neon_continuity_projection_missing:${table}`);

assert.match(continuity, /readNeonContinuityObservation/, 'continuity_dashboard_must_compare_primary_and_continuity_planes');
assert.match(continuity, /planeComparison/, 'continuity_dashboard_must_expose_plane_comparison');
assert.match(continuity, /PRIMARY_CANONICAL_CONTINUITY_STATE_SELECTED/, 'primary_continuity_authority_rule_missing');
assert.match(continuity, /AUTHORIZED_CONTINUITY_PLANE_SELECTED_BECAUSE_PRIMARY_IS_UNAVAILABLE_DEGRADED_OR_OLDER/, 'authorized_neon_continuity_fallback_rule_missing');
assert.match(continuity, /divergenceObserved/, 'continuity_divergence_must_be_observable');
assert.doesNotMatch(continuity, /newest.*global.*authority/i, 'freshness_must_not_become_global_authority_rule');

assert.match(route, /readContinuityDashboard/, 'friccionauta_must_receive_continuity_context');
assert.match(route, /planeComparison/, 'friccionauta_must_receive_dual_plane_comparison');
assert.match(route, /Never equate newest timestamp with global authority/, 'friccionauta_must_preserve_owner_semantics');
assert.match(route, /You may NOT execute endpoints, approve, publish, mutate canon/, 'friccionauta_must_remain_non_executing');
assert.match(route, /epistemicClass:'INFERRED'/, 'saved_finding_must_remain_inferred');
assert.match(route, /does not make the finding verified or canonical/, 'saved_finding_must_not_promote_canon');
assert.doesNotMatch(route, /executeManualCognitiveAgent|createActionProposal|approveActionProposal|canonicalPromotionAllowed:\s*true/, 'friccionauta_must_not_create_silent_execution_or_canon_path');

assert.match(panel, /\/api\/root\/friccionauta/, 'native_panel_must_reuse_existing_friccionauta_route');
assert.match(panel, /NO CANON · NO PUBLICATION · NO SILENT EXECUTION/, 'native_panel_boundary_must_be_visible');
assert.match(panel, /CONSERVAR COMO HALLAZGO INFERIDO/, 'founder_may_preserve_inference_without_canon_promotion');
assert.match(root, /SfiFriccionautaPanel/, 'friccionauta_must_be_mounted_in_root_workspace');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-NATIVE-INTELLIGENCE-SURFACE-R1',
  observation: 'SUPABASE_PRIMARY_PLUS_AUTHORIZED_NEON_CONTINUITY_COMPARISON',
  conversation: 'FRICCIONAUTA_EXISTING_OWNER',
  authorityExpansion: false,
  silentExecution: false,
  canonicalPromotion: false,
}));
