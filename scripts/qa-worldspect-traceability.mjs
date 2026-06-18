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

if (trace.status !== 200) failures.push(`evidence trace status ${trace.status}`);
if (!body.ok) failures.push('evidence trace ok=false');
if (traces.length < 10) failures.push(`expected >= 10 vector traces, got ${traces.length}`);
if ((coverage.vectors_with_internal_evidence || 0) < 10) failures.push(`expected internal evidence for 10 vectors, got ${coverage.vectors_with_internal_evidence || 0}`);
if ((coverage.vectors_with_external_evidence || 0) < 10) failures.push(`expected external evidence for 10 vectors, got ${coverage.vectors_with_external_evidence || 0}`);
if ((coverage.complete_vectors || 0) < 10) failures.push(`expected all vectors trace-complete, got ${coverage.complete_vectors || 0}/10`);

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
  complete: traces.filter((trace) => trace.complete).map((trace) => trace.vector),
  missingInternal: body.missingInternal || [],
  missingExternal: body.missingExternal || [],
  rule: body.rule,
}, null, 2));

if (failures.length) process.exitCode = 1;