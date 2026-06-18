const base = process.env.SFI_BASE_URL || 'http://127.0.0.1:3000';

async function getJson(path) {
  const response = await fetch(`${base}${path}`);
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { ok: false, parse_error: text.slice(0, 200) }; }
  return { status: response.status, json };
}

const failures = [];
const longitudinal = await getJson('/api/worldspect/longitudinal?limit=20');
const operational = await getJson('/api/worldspect/operational-state');
const trace = await getJson('/api/worldspect/evidence-trace');
const attractors = await getJson('/api/worldspect/attractors?limit=20');
const opportunities = await getJson('/api/worldspect/opportunities?limit=20');
const page = await fetch(`${base}/world-vector`).then((res) => res.text());

if (longitudinal.status !== 200) failures.push(`longitudinal_status_${longitudinal.status}`);
if (!longitudinal.json.ok && longitudinal.json.status !== 'history_unavailable') failures.push('longitudinal_not_ok');
if (!Array.isArray(longitudinal.json.timeline) && longitudinal.json.status !== 'history_unavailable') failures.push('timeline_missing');
if (!('regimeChanged' in longitudinal.json) && longitudinal.json.status !== 'history_unavailable') failures.push('regime_changed_missing');
if (!Array.isArray(longitudinal.json.vectorDeltas) && longitudinal.json.status !== 'history_unavailable') failures.push('vector_deltas_missing');
if (operational.status !== 200 || !operational.json.ok) failures.push('operational_state_not_ok');
if (!page.includes('Regime timeline + signal field')) failures.push('worldvector_new_shell_missing');
if (!page.includes('Object contrast')) failures.push('object_contrast_missing');
if (!page.includes('Emergent opportunities')) failures.push('opportunities_panel_missing');
if (!page.includes('Evidence Trace Explorer')) failures.push('evidence_trace_explorer_missing');
if (trace.status !== 200 || !trace.json.ok) failures.push('evidence_trace_not_ok');
if (attractors.status !== 200 || !Array.isArray(attractors.json.attractors)) failures.push('attractors_endpoint_invalid');
if (opportunities.status !== 200 || !Array.isArray(opportunities.json.opportunities)) failures.push('opportunities_endpoint_invalid');
if ((opportunities.json.opportunities || []).some((item) => !item.basis?.evidence_refs?.length)) failures.push('opportunity_without_evidence_refs');

console.log(JSON.stringify({
  ok: failures.length === 0,
  failures,
  longitudinal: {
    status: longitudinal.status,
    count: longitudinal.json.count,
    regimeChanged: longitudinal.json.regimeChanged,
    latestRegime: longitudinal.json.latest?.regime,
    dominant: longitudinal.json.latest?.dominant_attractor,
    topOpportunity: longitudinal.json.latest?.opportunities?.[0],
  },
  traceCoverage: trace.json.traceCoverage,
  attractors: attractors.json.attractors?.length ?? 0,
  opportunities: opportunities.json.opportunities?.length ?? 0,
  operational: {
    status: operational.status,
    sourceCoverage: operational.json.source_mix?.sourceCoverage ?? operational.json.snapshot?.sourceCoverage,
  },
}, null, 2));

if (failures.length) process.exit(1);
