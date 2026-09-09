import { spawnSync } from 'node:child_process';

export const SFI_CONTINUITY_RESEED_CONTRACT = 'SFI-CONTINUITY-STATE-SINGLETON-RESEED-1.0';
export const SFI_CONTINUITY_RESEED_GATE_CONTRACT = 'SFI-CONTINUITY-RESET-RESEED-RUNTIME-GATE-1.1';

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

function runPsql(databaseUrl, sql) {
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

export function verifyContinuityReseedReady(databaseUrl, mode) {
  if (!databaseUrl) throw new Error('SFI_CONTINUITY_RESEED_DATABASE_REQUIRED');
  if (!['pre', 'post'].includes(mode)) throw new Error('SFI_CONTINUITY_RESEED_MODE_INVALID');

  const readiness = JSON.parse(runPsql(databaseUrl, `
select json_build_object(
  'table_exists', to_regclass('public.sfi_continuity_state') is not null,
  'function_exists', to_regprocedure('public.sfi_reseed_continuity_state_after_truncate()') is not null,
  'function_contract_bound', coalesce((
    select position('${SFI_CONTINUITY_RESEED_CONTRACT}' in pg_get_functiondef(p.oid)) > 0
       and position('institution' in pg_get_functiondef(p.oid)) > 0
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='sfi_reseed_continuity_state_after_truncate' and p.pronargs=0
    limit 1
  ), false),
  'trigger_bound', coalesce((
    select pg_get_triggerdef(t.oid, true) ilike '%AFTER TRUNCATE ON sfi_continuity_state%'
       and t.tgfoid = to_regprocedure('public.sfi_reseed_continuity_state_after_truncate()')
       and t.tgenabled <> 'D'
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='sfi_continuity_state'
      and t.tgname='sfi_continuity_state_reseed_after_truncate'
      and not t.tgisinternal
    limit 1
  ), false)
)::text;
`));

  if (!readiness.table_exists || !readiness.function_exists || !readiness.function_contract_bound || !readiness.trigger_bound) {
    throw new Error(`SFI_CONTINUITY_RESEED_NOT_READY:${JSON.stringify(readiness)}`);
  }

  if (mode === 'post') {
    const singleton = JSON.parse(runPsql(databaseUrl, `
select json_build_object(
  'row_count', count(*),
  'institution_count', count(*) filter (where id='institution'),
  'institution_mode', max(mode) filter (where id='institution'),
  'founder_available', bool_and(founder_available) filter (where id='institution'),
  'contract', max(metadata->>'contract') filter (where id='institution'),
  'reseeded_by', max(metadata->>'reseededBy') filter (where id='institution')
) from public.sfi_continuity_state;
`));
    if (
      Number(singleton.row_count) !== 1
      || Number(singleton.institution_count) !== 1
      || singleton.institution_mode !== 'NORMAL'
      || singleton.founder_available !== true
      || singleton.contract !== SFI_CONTINUITY_RESEED_CONTRACT
      || singleton.reseeded_by !== 'SFI_CONTINUITY_STATE_TRUNCATE_TRIGGER'
    ) {
      throw new Error(`SFI_CONTINUITY_SINGLETON_POST_RESET_INVALID:${JSON.stringify(singleton)}`);
    }
    return { ok:true, contract:SFI_CONTINUITY_RESEED_GATE_CONTRACT, mode, readiness, singleton, authorityExpansion:false };
  }

  return {
    ok:true,
    contract:SFI_CONTINUITY_RESEED_GATE_CONTRACT,
    mode,
    readiness,
    destructiveResetAllowedByThisGate:true,
    authorityExpansion:false,
  };
}
