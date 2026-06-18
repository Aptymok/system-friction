const base = process.env.SFI_BASE_URL || 'http://127.0.0.1:3000';

async function json(path, init) {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: res.status, body };
}

const ingest = await json('/api/worldspect/ingest', { method: 'POST' }).catch((error) => ({ status: 0, body: { ok: false, error: String(error) } }));
const operational = await json('/api/worldspect/operational-state');
const trace = await json('/api/worldspect/evidence-trace');

const body = trace.body;
const traces = Array.isArray(body.traces) ? body.traces : [];
const coverage = body.traceCoverage || {};
const failures = [];

if (trace.status !== 200) failures.push(`evidence_trace_status_${trace.status}`);
if (!body.ok) failures.push('evidence_trace_ok_false');
if (traces.length < 10) failures.push(`expected_10_vector_traces_got_${traces.length}`);

for (const item of traces) {
  if (!item.state) failures.push(`trace_state_missing_${item.vector}`);
  if (!item.missing || typeof item.missing.world_external !== 'boolean') failures.push(`missing_levels_invalid_${item.vector}`);
  const worldEvidence = Array.isArray(item.world_external_evidence) ? item.world_external_evidence : [];
  const userEvidence = [
    ...(Array.isArray(item.user_internal_evidence) ? item.user_internal_evidence : []),
    ...(Array.isArray(item.case_internal_evidence) ? item.case_internal_evidence : []),
  ];
  if (item.can_claim_world_reading && worldEvidence.length === 0) failures.push(`world_claim_without_external_evidence_${item.vector}`);
  if (item.can_claim_user_reading && userEvidence.length === 0) failures.push(`user_claim_without_user_or_case_evidence_${item.vector}`);
  if (!item.can_claim_user_reading && item.state === 'user_calibrated') failures.push(`false_user_calibration_${item.vector}`);
  if (worldEvidence.length === 0 && item.state !== 'unobserved' && item.state !== 'trace_incomplete') failures.push(`missing_world_external_not_declared_${item.vector}`);
}

if ((coverage.world_observed_or_explicitly_unobserved || 0) < 10) failures.push('world_observed_or_unobserved_coverage_below_10');

console.log(JSON.stringify({
  ok: failures.length === 0,
  failures,
  ingest: {
    status: ingest.status,
    ok: ingest.body?.ok,
    writesPerformed: ingest.body?.writesPerformed,
    degraded_sources: ingest.body?.degraded_sources || ingest.body?.degradedSources || [],
  },
  operationalStatus: operational.body?.status,
  sourceCoverage: operational.body?.snapshot?.sourceCoverage ?? operational.body?.sourceCoverage,
  traceCoverage: coverage,
  states: traces.map((item) => ({ vector: item.vector, state: item.state, can_claim_world_reading: item.can_claim_world_reading, can_claim_user_reading: item.can_claim_user_reading })),
  missingWorldExternal: body.missingWorldExternal || [],
  missingSfiInternal: body.missingSfiInternal || [],
  rule: body.rule,
}, null, 2));

if (failures.length) process.exitCode = 1;
