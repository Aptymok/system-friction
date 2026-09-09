import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyDbEvidenceReceipt } from './verify-db-evidence-snapshot.mjs';
import {
  SFI_CANONICAL_RESET_CONTRACT,
  PRESERVE_DATA_TABLES,
  RESEED_MINIMAL_TABLES,
  PURGE_DATA_TABLES,
  CLASSIFIED_PUBLIC_TABLES,
  auditPublicTableClassification,
} from './sfi-canonical-reset-classification.mjs';

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.CONNECTION_STRING;
const confirm = process.env.SFI_DB_RESET_CONFIRM;
const resetMode = process.env.SFI_DB_RESET_MODE;
const snapshotReceiptPath = process.env.SFI_DB_SNAPSHOT_RECEIPT;
const externalArtifactId = process.env.SFI_DB_EXTERNAL_ARTIFACT_ID;
const externalArtifactDigest = process.env.SFI_DB_EXTERNAL_ARTIFACT_DIGEST;
const externalArtifactUrl = process.env.SFI_DB_EXTERNAL_ARTIFACT_URL || null;

if (confirm !== 'RESET_SFI_CANONICAL' || resetMode !== 'EVIDENCE_FIRST_CANONICAL_RESET') {
  console.error(JSON.stringify({
    ok: false,
    blocked: true,
    contract: SFI_CANONICAL_RESET_CONTRACT,
    reason: 'Canonical reset is disabled by default. It requires the founder-authorized evidence-first reset mode.',
    required: [
      'SFI_DB_RESET_CONFIRM=RESET_SFI_CANONICAL',
      'SFI_DB_RESET_MODE=EVIDENCE_FIRST_CANONICAL_RESET',
      'SFI_DB_SNAPSHOT_RECEIPT=<verified V2 receipt>',
      'SFI_DB_EXTERNAL_ARTIFACT_ID=<already uploaded external proof artifact>',
      'SFI_DB_EXTERNAL_ARTIFACT_DIGEST=<artifact digest>',
      'DATABASE_URL|DIRECT_URL|CONNECTION_STRING=<same PostgreSQL database>',
    ],
    preservesLegacyDataOnly: PRESERVE_DATA_TABLES,
    reseedsMinimalInfrastructure: RESEED_MINIMAL_TABLES,
  }, null, 2));
  process.exit(1);
}
if (!databaseUrl) throw new Error('Canonical reset requires a direct PostgreSQL connection.');
if (!snapshotReceiptPath) throw new Error('Canonical reset requires SFI_DB_SNAPSHOT_RECEIPT.');
if (!externalArtifactId || !externalArtifactId.trim()) throw new Error('Canonical reset is blocked until the proof snapshot has been uploaded outside the database (missing SFI_DB_EXTERNAL_ARTIFACT_ID).');
if (!externalArtifactDigest || !externalArtifactDigest.trim()) throw new Error('Canonical reset is blocked until the external proof artifact has a digest (missing SFI_DB_EXTERNAL_ARTIFACT_DIGEST).');

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

function runPsql(sql, { capture = true } = {}) {
  const result = spawnSync('psql', [
    '--no-psqlrc',
    '--set', 'ON_ERROR_STOP=1',
    '--set', 'VERBOSITY=terse',
    '--tuples-only',
    '--no-align',
    '--command', sql,
  ], {
    env: pgEnvironment(databaseUrl),
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
    throw new Error(`psql failed with exit code ${result.status}${detail ? `: ${detail}` : ''}`);
  }
  return String(result.stdout || '').trim();
}

function runLocal(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${String(result.stderr || '').trim()}`);
  return String(result.stdout || '').trim();
}

function sqlLiteral(value) {
  if (value === null || typeof value === 'undefined') return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}
function ident(value) {
  const text = String(value);
  if (!/^[a-z_][a-z0-9_]*$/.test(text)) throw new Error(`Unsafe SQL identifier: ${text}`);
  return `"${text}"`;
}
function sortedUnique(values) {
  return [...new Set(values.map(String))].sort();
}
function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
function jsonObjectFromPairs(output) {
  const result = {};
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const split = line.indexOf('|');
    if (split < 0) continue;
    result[line.slice(0, split)] = Number(line.slice(split + 1));
  }
  return result;
}

const snapshot = await verifyDbEvidenceReceipt(snapshotReceiptPath, {
  maxAgeMinutes: Number(process.env.SFI_DB_SNAPSHOT_MAX_AGE_MINUTES || 180),
  requireResetClassification: true,
});

const direct = new URL(databaseUrl);
const directHost = direct.hostname.toLowerCase().replace(/\.$/, '');
const directDatabase = decodeURIComponent(direct.pathname.replace(/^\//, ''));
if (directHost !== String(snapshot.database_host || '').toLowerCase().replace(/\.$/, '') || directDatabase !== snapshot.database_name) {
  throw new Error('Snapshot target mismatch: receipt database does not match the configured reset database.');
}

const liveTableOutput = runPsql("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname;");
const liveTables = sortedUnique(liveTableOutput.split(/\r?\n/).map((item) => item.trim()).filter(Boolean));
const snapshotTables = sortedUnique(snapshot.public_tables ?? []);
const liveClassification = auditPublicTableClassification(liveTables);
if (liveClassification.unclassified.length) {
  throw new Error(`Reset blocked: unclassified live public table(s): ${liveClassification.unclassified.join(', ')}`);
}
if (!arraysEqual(liveTables, snapshotTables)) {
  const added = liveTables.filter((table) => !snapshotTables.includes(table));
  const removed = snapshotTables.filter((table) => !liveTables.includes(table));
  throw new Error(`Reset blocked: public schema drift since snapshot. Added=[${added.join(', ')}] Removed=[${removed.join(', ')}]`);
}
if (!arraysEqual(sortedUnique(CLASSIFIED_PUBLIC_TABLES), liveTables)) {
  throw new Error('Reset blocked: classification contract is not exhaustive for the exact live public schema.');
}

const preserveCounts = snapshot.preserve_exact_counts ?? {};
for (const table of PRESERVE_DATA_TABLES) {
  const expected = Number(preserveCounts[table]);
  if (!Number.isSafeInteger(expected) || expected < 0) throw new Error(`Snapshot lacks a valid preserve count for ${table}`);
}

const founderCandidates = Number(runPsql(`
  select count(*)::text
  from public.profiles p
  join auth.users u on u.id=p.user_id
  where p.role in ('root','system')
    and coalesce((p.module_access->>'full_access')::boolean,false)=true;
`));
if (founderCandidates !== 1) {
  throw new Error(`Reset blocked: expected exactly one current sovereign founder profile, observed ${founderCandidates}.`);
}

const currentFounderOauthCount = Number(runPsql(`
  with founder as (
    select p.user_id from public.profiles p
    where p.role in ('root','system') and coalesce((p.module_access->>'full_access')::boolean,false)=true
  )
  select count(*)::text from public.sfi_oauth_clients c join founder f on f.user_id=c.created_by where c.status='ACTIVE';
`));
if (!Number.isSafeInteger(currentFounderOauthCount) || currentFounderOauthCount < 0) throw new Error('Could not inventory active founder OAuth clients.');

const preservedSetSql = PRESERVE_DATA_TABLES.map(sqlLiteral).join(',');
const allExpectedValues = liveTables.map((table) => `(${sqlLiteral(table)})`).join(',');
const nonPreserveTables = [...PURGE_DATA_TABLES, ...RESEED_MINIMAL_TABLES];
const truncateList = nonPreserveTables.map((table) => `public.${ident(table)}`).join(',\n  ');
const purgeWithoutGenesis = PURGE_DATA_TABLES.filter((table) => table !== 'root_audit_events');
const purgeArraySql = `ARRAY[${purgeWithoutGenesis.map(sqlLiteral).join(',')}]::text[]`;
const preserveExpectedChecks = PRESERVE_DATA_TABLES.map((table) => `
  select count(*) into observed_count from public.${ident(table)};
  if observed_count <> ${Number(preserveCounts[table])} then
    raise exception 'Preserved table ${table} changed from snapshot count ${Number(preserveCounts[table])} to %', observed_count;
  end if;`).join('\n');

const snapshotSha = snapshot.zip_sha256;
const snapshotCreatedAt = snapshot.created_at;
const snapshotGit = snapshot.git_commit;
const resetGit = process.env.GITHUB_SHA || runLocal('git', ['rev-parse', 'HEAD']);
const resetAt = new Date().toISOString();

const transactionSql = `
begin;
select pg_advisory_xact_lock(hashtext('SFI_CANONICAL_RESET_V1'));

create temp table sfi_expected_public_tables(table_name text primary key) on commit drop;
insert into sfi_expected_public_tables(table_name) values ${allExpectedValues};

do $$
begin
  if exists (
    select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
    except select table_name from sfi_expected_public_tables
  ) or exists (
    select table_name from sfi_expected_public_tables
    except select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
  ) then raise exception 'Public schema drift detected inside reset transaction'; end if;
  if exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name and tc.table_schema=kcu.table_schema
    join information_schema.constraint_column_usage ccu on ccu.constraint_name=tc.constraint_name and ccu.table_schema=tc.table_schema
    where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public'
      and tc.table_name in (${preservedSetSql}) and ccu.table_name not in (${preservedSetSql})
  ) then raise exception 'A preserved World table depends on a table scheduled for reset'; end if;
end $$;

lock table ${PRESERVE_DATA_TABLES.map((table) => `public.${ident(table)}`).join(', ')} in share mode;

create temp table sfi_reset_founder on commit drop as
select u.id as user_id,u.email,
       coalesce(nullif(u.raw_user_meta_data->>'full_name',''), nullif(u.raw_user_meta_data->>'name',''), split_part(u.email,'@',1), 'Founder') as alias
from auth.users u join public.profiles p on p.user_id=u.id
where p.role in ('root','system') and coalesce((p.module_access->>'full_access')::boolean,false)=true;

do $$ begin if (select count(*) from sfi_reset_founder) <> 1 then raise exception 'Sovereign founder identity became ambiguous inside reset transaction'; end if; end $$;

create temp table sfi_reset_oauth_clients on commit drop as
select c.* from public.sfi_oauth_clients c join sfi_reset_founder f on f.user_id=c.created_by where c.status='ACTIVE';

${PRESERVE_DATA_TABLES.map((table) => `-- ${table} intentionally NOT truncated`).join('\n')}
truncate table
  ${truncateList}
restart identity;

insert into public.profiles(user_id,email,alias,role,subscription_tier,module_access,last_seen_at,created_at,updated_at)
select user_id,email,alias,'root','founder',jsonb_build_object(
    'root',true,'root_observe',true,'full_access',true,
    'observatory',true,'field',true,'studio',true,'world_field',true,
    'planner',true,'simulator',true,'social',true,
    'executor',false,'root_execution',false,
    'governance_write',true,'sovereign_actions',true,'canonical_promotion',true,
    'display_title','Founder — System Friction Institute','genesis_contract','${SFI_CANONICAL_RESET_CONTRACT}'
  ), now(), now(), now()
from sfi_reset_founder;

create temp table sfi_genesis_account(id uuid primary key) on commit drop;
with inserted as (
  insert into public.accounts(slug,name,status,metadata)
  values ('system-friction-institute','System Friction Institute','active',jsonb_build_object('genesis',true,'reset_contract','${SFI_CANONICAL_RESET_CONTRACT}')) returning id
)
insert into sfi_genesis_account select id from inserted;
insert into public.account_members(account_id,user_id,role)
select a.id,f.user_id,'root' from sfi_genesis_account a cross join sfi_reset_founder f;
insert into public.account_balance(account_id,balance,reserved) select id,0,0 from sfi_genesis_account;

create temp table sfi_genesis_tenant(id uuid primary key) on commit drop;
with inserted as (
  insert into public.sfi_tenants(tenant_key,name,tenant_type,status,created_by,metadata)
  select 'personal:'||user_id::text, coalesce(email,'Personal SFI Workspace'), 'PERSONAL','ACTIVE',user_id,
    jsonb_build_object('genesis',true,'provisionedBy','SFI_CANONICAL_RESET') from sfi_reset_founder returning id
)
insert into sfi_genesis_tenant select id from inserted;
insert into public.sfi_tenant_members(tenant_id,user_id,role,status)
select t.id,f.user_id,'OWNER','ACTIVE' from sfi_genesis_tenant t cross join sfi_reset_founder f
on conflict (tenant_id,user_id) do update set role='OWNER',status='ACTIVE',updated_at=now();

insert into public.sfi_oauth_clients(
  id,client_id,client_secret_hash,name,created_by,redirect_uris,allowed_scopes,audience,status,metadata,last_used_at,created_at,updated_at
)
select id,client_id,client_secret_hash,name,created_by,redirect_uris,allowed_scopes,audience,'ACTIVE',
  jsonb_build_object('genesis',true,'reseededBy','SFI_CANONICAL_RESET','configurationIdentityPreserved',true),null,now(),now()
from sfi_reset_oauth_clients;

insert into public.root_audit_events(actor_id,action,target,payload,created_at)
select user_id,'SFI_CANONICAL_RESET_GENESIS','database',jsonb_build_object(
  'contract','${SFI_CANONICAL_RESET_CONTRACT}','epoch','POST_RESET_GENESIS_1',
  'snapshot_sha256',${sqlLiteral(snapshotSha)},'snapshot_created_at',${sqlLiteral(snapshotCreatedAt)},
  'snapshot_git_commit',${sqlLiteral(snapshotGit)},'external_artifact_id',${sqlLiteral(externalArtifactId)},
  'external_artifact_digest',${sqlLiteral(externalArtifactDigest)},'external_artifact_url',${sqlLiteral(externalArtifactUrl)},
  'reset_git_commit',${sqlLiteral(resetGit)},'reset_started_at',${sqlLiteral(resetAt)},
  'preserved_legacy_data',jsonb_build_array(${PRESERVE_DATA_TABLES.map(sqlLiteral).join(',')}),
  'legacy_data_discarded_by_default',true,'learning_imported',false,'canonical_history_imported',false
),now() from sfi_reset_founder;

do $$
declare observed_count bigint; table_name text;
begin
${preserveExpectedChecks}
  foreach table_name in array ${purgeArraySql} loop
    execute format('select count(*) from public.%I',table_name) into observed_count;
    if observed_count <> 0 then raise exception 'Purge table % is not empty after canonical reset: %',table_name,observed_count; end if;
  end loop;
  select count(*) into observed_count from public.root_audit_events where action='SFI_CANONICAL_RESET_GENESIS';
  if observed_count <> 1 then raise exception 'Expected exactly one post-reset genesis audit event, found %',observed_count; end if;
  select count(*) into observed_count from public.profiles;
  if observed_count <> 1 then raise exception 'Expected exactly one genesis profile, found %',observed_count; end if;
  select count(*) into observed_count from public.sfi_tenants;
  if observed_count <> 1 then raise exception 'Expected exactly one genesis tenant, found %',observed_count; end if;
  select count(*) into observed_count from public.sfi_tenant_members;
  if observed_count <> 1 then raise exception 'Expected exactly one genesis tenant membership, found %',observed_count; end if;
  select count(*) into observed_count from public.accounts;
  if observed_count <> 1 then raise exception 'Expected exactly one genesis account, found %',observed_count; end if;
  select count(*) into observed_count from public.account_members;
  if observed_count <> 1 then raise exception 'Expected exactly one genesis account membership, found %',observed_count; end if;
  select count(*) into observed_count from public.account_balance;
  if observed_count <> 1 then raise exception 'Expected exactly one genesis account balance, found %',observed_count; end if;
  select count(*) into observed_count from public.sfi_oauth_clients;
  if observed_count <> ${currentFounderOauthCount} then raise exception 'OAuth genesis count mismatch: expected ${currentFounderOauthCount}, found %',observed_count; end if;
end $$;
commit;
`;

runPsql(transactionSql, { capture: true });

const postPreserveCounts = jsonObjectFromPairs(runPsql(PRESERVE_DATA_TABLES.map((table) => `select ${sqlLiteral(table)}||'|'||count(*)::text from public.${ident(table)};`).join('\n')));
const postInfrastructureCounts = jsonObjectFromPairs(runPsql([
  "select 'profiles|'||count(*)::text from public.profiles;",
  "select 'sfi_tenants|'||count(*)::text from public.sfi_tenants;",
  "select 'sfi_tenant_members|'||count(*)::text from public.sfi_tenant_members;",
  "select 'sfi_oauth_clients|'||count(*)::text from public.sfi_oauth_clients;",
  "select 'accounts|'||count(*)::text from public.accounts;",
  "select 'account_members|'||count(*)::text from public.account_members;",
  "select 'account_balance|'||count(*)::text from public.account_balance;",
  "select 'root_audit_events|'||count(*)::text from public.root_audit_events;",
].join('\n')));

const report = {
  ok: PRESERVE_DATA_TABLES.every((table) => postPreserveCounts[table] === Number(preserveCounts[table])),
  contract: SFI_CANONICAL_RESET_CONTRACT,
  reset_at: new Date().toISOString(),
  snapshot: {
    receipt: snapshot.receipt, sha256: snapshot.zip_sha256, created_at: snapshot.created_at,
    git_commit: snapshot.git_commit, classification_verified: snapshot.reset_classification_verified,
    external_artifact_id: externalArtifactId, external_artifact_digest: externalArtifactDigest, external_artifact_url: externalArtifactUrl,
  },
  classification: {
    public_table_count: liveTables.length, preserve_data: PRESERVE_DATA_TABLES,
    reseed_minimal: RESEED_MINIMAL_TABLES, purge_data_count: PURGE_DATA_TABLES.length,
    unclassified: liveClassification.unclassified,
  },
  preserved_counts_before: preserveCounts,
  preserved_counts_after: postPreserveCounts,
  genesis_infrastructure_counts: postInfrastructureCounts,
  founder_oauth_clients_reseeded: currentFounderOauthCount,
  invariants: [
    'EXTERNAL_PROOF_UPLOADED_BEFORE_RESET','NO_DEPENDENCY_PROPAGATION','LIVE_SCHEMA_EQUALS_SNAPSHOT','UNCLASSIFIED_ZERO',
    'WORLD_COUNTS_UNCHANGED','LEGACY_LEARNING_NOT_IMPORTED','LEGACY_CANONICAL_HISTORY_NOT_IMPORTED','ONE_POST_RESET_GENESIS_EVENT',
  ],
};

await mkdir(path.join('docs','db'), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const reportPath = path.join('docs','db',`SFI_CANONICAL_RESET_REPORT_${stamp}.json`);
await writeFile(reportPath, `${JSON.stringify(report,null,2)}\n`, 'utf8');
console.log(JSON.stringify({ ...report, report: reportPath }, null, 2));
if (!report.ok) process.exitCode = 1;
