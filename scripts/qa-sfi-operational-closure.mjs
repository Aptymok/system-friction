import { readFile } from 'node:fs/promises';

const base = process.env.SFI_BASE_URL || 'http://127.0.0.1:3000';

async function json(path, init) {
  const response = await fetch(`${base}${path}`, init);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: response.status, body };
}

const failures = [];

const trace = await json('/api/worldspect/evidence-trace');
const longitudinal = await json('/api/worldspect/longitudinal?limit=20');
const attractors = await json('/api/worldspect/attractors?limit=20');
const opportunities = await json('/api/worldspect/opportunities?limit=20');
const noObject = await json('/api/scorefriction/operational-cycle?case_id=QA-NO-OBJECT');
const audioObject = await json('/api/scorefriction/operational-cycle', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    case_id: 'QA-AUDIO-OBJECT',
    scope: 'culture',
    analysis_modes: ['MIHM', 'PSI', 'WSV', 'SCOREFRICTION', 'AMV'],
    evaluated_object: { type: 'audio/mpeg', url: 'qa-audio.mp3' },
    run_contrast: true,
  }),
});
const amv = await json('/api/scorefriction/amv/ask', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ case_id: 'QA-AMV', question: '¿Por qué dices eso?' }),
});
const rootPage = await fetch(`${base}/root`).then((res) => res.text());
const rootSource = await readFile('src/observatory/components/root/RootDashboardClient.tsx', 'utf8').catch(() => '');

const traces = Array.isArray(trace.body.traces) ? trace.body.traces : [];
if (trace.status !== 200 || !trace.body.ok) failures.push('trace_endpoint_failed');
if (traces.length < 10) failures.push('trace_vectors_below_10');
if (traces.some((item) => item.can_claim_user_reading && !(item.user_internal_evidence?.length || item.case_internal_evidence?.length))) failures.push('false_user_calibration');
if (longitudinal.status !== 200 || (!Array.isArray(longitudinal.body.timeline) && longitudinal.body.status !== 'history_unavailable')) failures.push('longitudinal_timeline_missing');
if (attractors.status !== 200 || !Array.isArray(attractors.body.attractors)) failures.push('attractors_invalid');
if ((attractors.body.attractors || []).some((item) => !item.evidence_basis?.length)) failures.push('attractor_without_evidence_basis');
if (opportunities.status !== 200 || !Array.isArray(opportunities.body.opportunities)) failures.push('opportunities_invalid');
if ((opportunities.body.opportunities || []).some((item) => !item.basis?.evidence_refs?.length)) failures.push('opportunity_without_evidence_refs');

const noObjectState = noObject.body.state || noObject.body;
if (noObjectState.object_presence !== 'missing') failures.push('no_object_presence_not_missing');
if (noObjectState.minimal_action) failures.push('minimal_action_present_without_object');
if (!String(noObjectState.formal_report?.markdown || '').includes('object_presence: missing')) failures.push('formal_report_missing_no_object_disclosure');
if (!String(noObjectState.formal_report?.markdown || '').includes('Claims blocked')) failures.push('formal_report_missing_blocked_claims');

const audioState = audioObject.body.state || audioObject.body;
if (audioState.object_type !== 'audio') failures.push('audio_object_type_not_detected');
if (audioState.mihm?.available !== false || !String(audioState.mihm?.reason || '').includes('analysis_unavailable')) failures.push('audio_mihm_not_unavailable');
if (!String(audioState.blocked_claims || '').includes('audio')) failures.push('audio_blocked_claim_missing');

if (amv.status !== 200 || !amv.body.answer) failures.push('amv_answer_missing');
if (!Array.isArray(amv.body.answer.evidence_used)) failures.push('amv_evidence_used_missing');
if (!Array.isArray(amv.body.answer.blocked_claims)) failures.push('amv_blocked_claims_missing');
if (!rootPage.includes('Operational organism') && !rootSource.includes('Operational organism')) failures.push('root_operational_layers_panel_missing');

console.log(JSON.stringify({
  ok: failures.length === 0,
  failures,
  traceCoverage: trace.body.traceCoverage,
  longitudinalCount: longitudinal.body.count,
  attractors: attractors.body.attractors?.length ?? 0,
  opportunities: opportunities.body.opportunities?.length ?? 0,
  noObject: {
    object_presence: noObjectState.object_presence,
    blocked_claims: noObjectState.blocked_claims,
  },
  audioObject: {
    object_type: audioState.object_type,
    mihm: audioState.mihm,
    blocked_claims: audioState.blocked_claims,
  },
  amv: amv.body.answer,
}, null, 2));

if (failures.length) process.exitCode = 1;
