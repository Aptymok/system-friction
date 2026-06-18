import fs from 'node:fs';
import path from 'node:path';

const host = process.env.SFI_QA_HOST || 'http://localhost:3000';
const routes = [
  '/api/scorefriction/state',
  '/api/mihm/state',
  '/api/sfi/contrast',
  '/api/sfi/proposals',
  '/api/sfi/material',
  '/api/publisher/draft',
  '/api/atlas/memory',
  '/api/sfi/run',
  '/sfi-console',
];

async function fetchRoute(route) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${host}${route}`, { signal: controller.signal });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : await response.text();
    return { route, ok: response.ok, status: response.status, body };
  } catch (error) {
    return { route, ok: false, status: null, error: error instanceof Error ? error.message : 'fetch_failed' };
  } finally {
    clearTimeout(timeout);
  }
}

function hasDeep(value, predicate) {
  if (predicate(value)) return true;
  if (Array.isArray(value)) return value.some((item) => hasDeep(item, predicate));
  if (value && typeof value === 'object') return Object.values(value).some((item) => hasDeep(item, predicate));
  return false;
}

function classify(result) {
  if (!result.ok) return 'BLOCKED';
  if (result.route === '/sfi-console') return 'OK';
  const body = result.body;
  if (hasDeep(body, (value) => typeof value === 'string' && /missing|degraded|unavailable|fallback/i.test(value))) return 'DEGRADED';
  return 'OK';
}

const results = [];
for (const route of routes) {
  const result = await fetchRoute(route);
  results.push({ ...result, classification: classify(result) });
}

const report = {
  generated_at: new Date().toISOString(),
  host,
  results,
  summary: {
    ok: results.filter((item) => item.classification === 'OK').length,
    degraded: results.filter((item) => item.classification === 'DEGRADED').length,
    blocked: results.filter((item) => item.classification === 'BLOCKED').length,
  },
};

fs.mkdirSync(path.join(process.cwd(), 'docs'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'docs', 'QA_SFI_MINIMAL_PIPELINE_REPORT.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(process.cwd(), 'docs', 'QA_SFI_MINIMAL_PIPELINE_REPORT.md'), [
  '# QA SFI Minimal Pipeline Report',
  '',
  `Generated: ${report.generated_at}`,
  `Host: ${host}`,
  '',
  '| Route | Status | Classification |',
  '|---|---:|---|',
  ...results.map((item) => `| ${item.route} | ${item.status ?? 'ERR'} | ${item.classification} |`),
  '',
  '## Summary',
  '',
  `- OK: ${report.summary.ok}`,
  `- DEGRADED: ${report.summary.degraded}`,
  `- BLOCKED: ${report.summary.blocked}`,
].join('\n'));

console.log(JSON.stringify(report, null, 2));
if (report.summary.blocked > 0) process.exitCode = 1;
