import { appendFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const raw = process.env.DATABASE_URL;
const githubEnv = process.env.GITHUB_ENV;
const region = process.env.SFI_SUPABASE_REGION || 'us-west-1';

if (!raw) throw new Error('SFI_RESET_DATABASE_URL_REQUIRED');
if (!githubEnv) throw new Error('SFI_RESET_GITHUB_ENV_REQUIRED');

function testConnection(url) {
  const result = spawnSync(
    'psql',
    ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--dbname', url, '--tuples-only', '--no-align', '--command', 'select 1;'],
    { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'], timeout: 15_000 },
  );
  return { ok: !result.error && result.status === 0, detail: String(result.stderr || '').trim() };
}

const input = new URL(raw);
if (!/^postgres(?:ql)?:$/.test(input.protocol)) throw new Error('SFI_RESET_DATABASE_URL_PROTOCOL_INVALID');

const direct = input.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
const isPooler = /\.pooler\.supabase\.com$/i.test(input.hostname);
const candidates = [];

if (direct) {
  const projectRef = direct[1];
  for (const shard of [0, 1]) {
    const candidate = new URL(input.toString());
    candidate.hostname = `aws-${shard}-${region}.pooler.supabase.com`;
    candidate.port = '5432';
    candidate.username = `postgres.${projectRef}`;
    candidate.searchParams.set('sslmode', 'require');
    candidates.push(candidate);
  }
} else if (isPooler) {
  const candidate = new URL(input.toString());
  candidate.port = '5432';
  candidate.searchParams.set('sslmode', 'require');
  candidates.push(candidate);
} else {
  throw new Error(`SFI_RESET_DATABASE_HOST_NOT_APPROVED:${input.hostname}`);
}

let selected = null;
const failures = [];
for (const candidate of candidates) {
  const tested = testConnection(candidate.toString());
  if (tested.ok) {
    selected = candidate;
    break;
  }
  failures.push(`${candidate.hostname}:${tested.detail.replaceAll(raw, '[REDACTED]').slice(0, 240)}`);
}

if (!selected) throw new Error(`SFI_RESET_IPV4_SESSION_POOLER_UNREACHABLE:${failures.join(' | ')}`);

const resolved = selected.toString();
console.log(`::add-mask::${resolved}`);
await appendFile(githubEnv, `DATABASE_URL=${resolved}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-RESET-DATABASE-ROUTING-1.0',
  connectionMode: 'SUPAVISOR_SESSION_IPV4',
  host: selected.hostname,
  port: selected.port,
  sslmode: selected.searchParams.get('sslmode'),
  secretLogged: false,
}));
