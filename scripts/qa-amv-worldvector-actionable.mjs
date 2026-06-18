const base = process.env.SFI_BASE_URL || 'http://127.0.0.1:3000';

async function json(path, options) {
  const res = await fetch(`${base}${path}`, options);
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text) }; }
  catch { return { status: res.status, body: text }; }
}

const failures = [];
const world = await json('/api/worldspect/operational-state');
if (world.status !== 200 || world.body?.ok !== true) failures.push('worldspect_operational_state_failed');
if (!world.body?.source_mix || world.body.source_mix.sourceCoverage < 0.8) failures.push('worldspect_source_mix_missing_or_low');
if (!Array.isArray(world.body?.source_health) || !world.body.source_health.some((item) => Array.isArray(item.source_details))) failures.push('source_details_not_readable');

const cycle = await json('/api/scorefriction/operational-cycle?case_id=qa-actionable&scope=culture');
const state = cycle.body?.state ?? cycle.body;
const action = state?.minimal_action;
if (!action?.recommended_action) failures.push('action_missing_recommended_action');
if (!action?.verification_window) failures.push('action_missing_verification_window');
if (!action?.success_condition) failures.push('action_missing_success_condition');
if (!action?.failure_condition) failures.push('action_missing_failure_condition');
if (!Array.isArray(action?.evidence_required) || action.evidence_required.length < 2) failures.push('action_missing_evidence_required');

const post = await json('/api/scorefriction/operational-cycle', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    case_id: 'qa-upload-contrast',
    objective: 'QA objeto vs vector cultural',
    scope: 'culture',
    analysis_modes: ['MIHM', 'PSI', 'WSV', 'SCOREFRICTION', 'AMV'],
    evaluated_object: { type: 'text', text: 'senal cultural recurrente para contraste' },
    run_contrast: true,
  }),
});
const postState = post.body?.state ?? post.body;
if (post.status !== 200 || !postState?.contrast) failures.push('contrast_post_missing_result');
if (!postState?.minimal_action?.recommended_surface) failures.push('contrast_missing_surface');

console.log(JSON.stringify({
  ok: failures.length === 0,
  failures,
  sourceCoverage: world.body?.source_mix?.sourceCoverage,
  selectedAction: action,
  contrastAction: postState?.minimal_action,
}, null, 2));
process.exit(failures.length ? 1 : 0);