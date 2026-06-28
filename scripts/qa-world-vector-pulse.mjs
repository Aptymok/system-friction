#!/usr/bin/env node

const appUrl = process.env.VERCEL_APP_URL?.replace(/\/+$/, '');

function fail(reason, action = 'Inspect /api/worldspect/health and recent cron runs.') {
  console.error('WORLD_VECTOR_PULSE_QA_FAILED');
  console.error(`reason=${reason}`);
  console.error(`action=${action}`);
  process.exit(1);
}

function line(key, value) {
  if (Array.isArray(value)) return `${key}=${value.join('|')}`;
  if (value === null || typeof value === 'undefined') return `${key}=null`;
  return `${key}=${String(value)}`;
}

async function readJson(path) {
  const response = await fetch(`${appUrl}${path}`, {
    headers: process.env.WORLDSPECT_INGEST_SECRET
      ? { Authorization: `Bearer ${process.env.WORLDSPECT_INGEST_SECRET}` }
      : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    fail(`invalid_json:${path}`, 'Check endpoint response body and deployment logs.');
  }
  if (!response.ok) fail(`http_${response.status}:${path}`, JSON.stringify(json));
  return json;
}

function minutesSince(value) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.round((Date.now() - ts) / 60000));
}

if (!appUrl) fail('missing_env:VERCEL_APP_URL', 'Set VERCEL_APP_URL to the deployed application origin.');

const health = await readJson('/api/worldspect/health');
const trend = await readJson('/api/worldspect/trend?days=90&debug=1');
const real = await readJson('/api/worldspect/real');

if (health.status === 'failed') fail('health.status=failed', (health.warnings || []).join('|') || health.latest_error || 'Inspect health output.');
if (trend.ok !== true) fail('trend.ok_not_true', 'WorldSpect trend endpoint did not return ok=true.');
if (Number(trend.sample_count || 0) === 0) fail('trend.sample_count=0', 'Run cron and verify worldspect_snapshots persistence.');
if (trend.trend_quality === 'missing') fail('trend.trend_quality=missing', 'WorldSpect trend has no usable samples.');

const domains = Array.isArray(trend.domains) ? trend.domains : [];
if (domains.length && domains.every((domain) => Number(domain.sample_count || 0) === 0)) {
  fail('all_domains_sample_count=0', 'Inspect extraction ladder and persisted sources in trend debug output.');
}

const debug = trend.debug && typeof trend.debug === 'object' ? trend.debug : {};
const sampleCount = Number(trend.sample_count || 0);
const emptySnapshots = Number(debug.empty_snapshots || 0);
if (sampleCount > 0 && emptySnapshots > Math.max(3, sampleCount * 2)) {
  fail('debug.empty_snapshots_too_high', `empty_snapshots=${emptySnapshots};sample_count=${sampleCount}`);
}

const lastObserved = health.last_observed_at || trend.observed_to || real?.data?.ts || null;
const lastMinutes = health.minutes_since_last_measurement ?? minutesSince(lastObserved);
if (lastMinutes === null) fail('last_observed_at_unreadable', 'Health/trend/real did not expose a readable last observation time.');
if (lastMinutes > 1440) fail('last_observed_at_old', `minutes_since_last_measurement=${lastMinutes}`);

console.log('WORLD_VECTOR_PULSE_QA_OK');
console.log(line('health_status', health.status));
console.log(line('sample_count', trend.sample_count));
console.log(line('trend_quality', trend.trend_quality));
console.log(line('last_observed_at', lastObserved));
console.log(line('measurements_today', health.measurements_today));
console.log(line('warnings', health.warnings || []));
