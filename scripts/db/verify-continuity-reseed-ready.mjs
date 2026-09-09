import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.CONNECTION_STRING;
const mode = String(process.argv[2] || '').toLowerCase();
if (!databaseUrl) throw new Error('SFI_CONTINUITY_RESEED_DATABASE_REQUIRED');
if (!['pre', 'post'].includes(mode)) throw new Error('Usage: verify-continuity-reseed-ready.mjs <pre|post>');

function pgEnvironment(rawUrl) {
  const url = new URL(rawUrl);
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, '')),
    PGSSLMODE: process.env.PGSSLMODE || 'require',
  };
}

function runPsql(sql) {
  const result = spawnSync('psql', [
    '--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--tuples-only', '--no-align', '--command', sql,
  ], {
    env: pgEnvironment(databaseUrl),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`psql failed: ${String(result.stderr || result.stdout).trim()}`);
  return String(result.stdout || '').trim();
}

const readiness = JSON.parse(runPsql(`
select json_build_object(
  'table_exists', to_regclass('public.sfi_continuity_state') is not null,
  'function_exists', to_regprocedure('public.sfi_reseed_continuity_state_after_truncate()') is not null,
  'trigger_exists', exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='sfi_continuity_state'
      and t.tgname='sfi_continuity_state_reseed_after_truncate'
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  )
)::text;
`));

if (!readiness.table_exists || !readiness.function_exists || !readiness.trigger_exists) {
  throw new Error(`SFI_CONTINUITY_RESEED_NOT_READY:${JSON.stringify(readiness)}`);
}

if (mode === 'post') {
  const singleton = JSON.parse(runPsql(`
select json_build_object(
  'row_count', count(*),
  'institution_count', count(*) filter (where id='institution'),
  'institution_mode', max(mode) filter (where id='institution'),
  'founder_available', bool_and(founder_available) filter (where id='institution')
) from public.sfi_continuity_state;
`));
  if (Number(singleton.row_count) !== 1 || Number(singleton.institution_count) !== 1 || singleton.institution_mode !== 'NORMAL' || singleton.founder_available !== true) {
    throw new Error(`SFI_CONTINUITY_SINGLETON_POST_RESET_INVALID:${JSON.stringify(singleton)}`);
  }
  console.log(JSON.stringify({ ok:true, contract:'SFI-CONTINUITY-RESET-RESEED-RUNTIME-GATE-1.0', mode, readiness, singleton, authorityExpansion:false }));
} else {
  console.log(JSON.stringify({ ok:true, contract:'SFI-CONTINUITY-RESET-RESEED-RUNTIME-GATE-1.0', mode, readiness, destructiveResetAllowedByThisGate:true, authorityExpansion:false }));
}
