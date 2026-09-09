import { chmod, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { SFI_INSTITUTIONAL_MEMBERS } from '../../src/lib/system/access/institutionalMembers';

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.CONNECTION_STRING;
const statePath = process.env.SFI_INSTITUTIONAL_INTEGRATION_STATE || '/tmp/sfi-institutional-integrations.json';
const mode = process.argv[2];
if (!databaseUrl) throw new Error('SFI_INSTITUTIONAL_GENESIS_DATABASE_REQUIRED');
if (!['export','verify','restore'].includes(mode || '')) throw new Error('Usage: preserve-institutional-integrations.ts <export|verify|restore>');

function pgEnvironment(rawUrl: string) {
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
function runPsql(sql: string) {
  const result = spawnSync('psql', ['--no-psqlrc','--set','ON_ERROR_STOP=1','--tuples-only','--no-align','--command',sql], {
    env: pgEnvironment(databaseUrl!), encoding: 'utf8', stdio: ['ignore','pipe','pipe'], maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`psql failed: ${String(result.stderr || result.stdout).trim()}`);
  return String(result.stdout || '').trim();
}
function q(value: unknown) { return `'${String(value ?? '').replaceAll("'", "''")}'`; }
function arr(values: readonly string[]) { return `ARRAY[${values.map(q).join(',')}]::text[]`; }

type ClientState = { id:string; client_id:string; client_secret_hash:string; name:string; redirect_uris:string[]; audience:string; };
type MemberState = { user_id:string; email:string; clients:ClientState[] };
type State = { contract:'SFI-INSTITUTIONAL-GENESIS-INTEGRATIONS-1.0'; exported_at:string; members:MemberState[] };

const registryByEmail = new Map(SFI_INSTITUTIONAL_MEMBERS.map((member) => [member.email.toLowerCase(), member]));
const registryEmails = [...registryByEmail.keys()];

async function loadState(): Promise<State> {
  const parsed = JSON.parse(await readFile(statePath, 'utf8')) as State;
  if (parsed.contract !== 'SFI-INSTITUTIONAL-GENESIS-INTEGRATIONS-1.0' || !Array.isArray(parsed.members)) throw new Error('SFI_INSTITUTIONAL_GENESIS_STATE_INVALID');
  const seen = new Set<string>();
  for (const item of parsed.members) {
    const email = String(item.email || '').toLowerCase();
    const member = registryByEmail.get(email);
    if (!member) throw new Error(`SFI_INSTITUTIONAL_MEMBER_NO_LONGER_REGISTERED:${email}`);
    if (seen.has(email)) throw new Error(`SFI_INSTITUTIONAL_MEMBER_DUPLICATE:${email}`);
    seen.add(email);
    if (!item.user_id || !Array.isArray(item.clients)) throw new Error(`SFI_INSTITUTIONAL_MEMBER_STATE_INVALID:${email}`);
  }
  return parsed;
}

if (mode === 'export') {
  const members: MemberState[] = [];
  for (const email of registryEmails) {
    const raw = runPsql(`select json_build_object('user_id',u.id,'email',lower(u.email),'clients',coalesce((select json_agg(json_build_object('id',c.id,'client_id',c.client_id,'client_secret_hash',c.client_secret_hash,'name',c.name,'redirect_uris',c.redirect_uris,'audience',c.audience) order by c.id) from public.sfi_oauth_clients c where c.created_by=u.id and c.status='ACTIVE'),'[]'::json))::text from auth.users u where lower(u.email)=${q(email)} limit 1;`);
    if (!raw) throw new Error(`SFI_REGISTERED_INSTITUTIONAL_AUTH_USER_MISSING:${email}`);
    members.push(JSON.parse(raw));
  }
  const state: State = { contract:'SFI-INSTITUTIONAL-GENESIS-INTEGRATIONS-1.0', exported_at:new Date().toISOString(), members };
  await writeFile(statePath, `${JSON.stringify(state)}\n`, { encoding:'utf8', mode:0o600 });
  await chmod(statePath, 0o600);
  console.log(JSON.stringify({ ok:true, contract:state.contract, institutionalMembers:members.length, activeOauthClients:members.reduce((n,m)=>n+m.clients.length,0), secretMaterialLogged:false }));
}

if (mode === 'verify') {
  const state = await loadState();
  for (const item of state.members) {
    const member = registryByEmail.get(item.email.toLowerCase())!;
    if ((member.role as string) === 'root' || (member.role as string) === 'system') throw new Error('SFI_INSTITUTIONAL_GENESIS_SOVEREIGN_ROLE_FORBIDDEN');
    for (const client of item.clients) {
      if (!client.client_id || !client.client_secret_hash || !client.redirect_uris?.length) throw new Error(`SFI_INSTITUTIONAL_OAUTH_CONFIG_INCOMPLETE:${item.email}`);
    }
  }
  console.log(JSON.stringify({ ok:true, contract:state.contract, authorityExpansion:false, registeredMembersOnly:true }));
}

if (mode === 'restore') {
  const state = await loadState();
  const accountId = runPsql("select id::text from public.accounts where slug='system-friction-institute' limit 1;");
  const tenantId = runPsql("select id::text from public.sfi_tenants where tenant_key like 'personal:%' order by created_at limit 1;");
  if (!accountId || !tenantId) throw new Error('SFI_GENESIS_ACCOUNT_OR_TENANT_MISSING');

  const statements: string[] = ['begin;'];
  for (const item of state.members) {
    const member = registryByEmail.get(item.email.toLowerCase())!;
    const access = {
      display_title: member.title,
      observatory: member.modules.observatory,
      planner: member.modules.field,
      simulator: member.modules.studio,
      social: member.modules.worldField,
      field: member.modules.field,
      studio: member.modules.studio,
      world_field: member.modules.worldField,
      root: member.modules.root,
      root_observe: member.modules.root,
      full_access: false, executor: false, root_execution: false,
      governance_write: false, sovereign_actions: false, canonical_promotion: false,
      external_agent: true, external_role: member.external.role,
      external_scopes: member.external.scopes,
      external_oauth_role: member.external.role,
      external_oauth_scopes: member.external.scopes,
      external_studio_owner_scoped: true,
      genesis_contract: 'SFI-CANONICAL-RESET-CLASSIFICATION-1.1',
    };
    statements.push(`insert into public.profiles(user_id,email,alias,role,subscription_tier,module_access,last_seen_at,created_at,updated_at) values (${q(item.user_id)}::uuid,${q(member.email)},${q(member.displayName)},${q(member.role)},'enterprise',${q(JSON.stringify(access))}::jsonb,now(),now(),now()) on conflict (user_id) do update set email=excluded.email,alias=excluded.alias,role=excluded.role,subscription_tier=excluded.subscription_tier,module_access=excluded.module_access,last_seen_at=now(),updated_at=now();`);
    statements.push(`insert into public.account_members(account_id,user_id,role) values (${q(accountId)}::uuid,${q(item.user_id)}::uuid,${q(member.role)}) on conflict (account_id,user_id) do update set role=excluded.role;`);
    statements.push(`insert into public.sfi_tenant_members(tenant_id,user_id,role,status) values (${q(tenantId)}::uuid,${q(item.user_id)}::uuid,'OPERATOR','ACTIVE') on conflict (tenant_id,user_id) do update set role='OPERATOR',status='ACTIVE';`);
    for (const client of item.clients) {
      statements.push(`insert into public.sfi_oauth_clients(id,client_id,client_secret_hash,name,created_by,redirect_uris,allowed_scopes,audience,status,metadata,last_used_at,created_at,updated_at) values (${q(client.id)}::uuid,${q(client.client_id)},${q(client.client_secret_hash)},${q(client.name)},${q(item.user_id)}::uuid,${arr(client.redirect_uris || [])},${arr([...member.external.scopes])},${q(client.audience)},'ACTIVE',jsonb_build_object('genesis',true,'reseededBy','SFI_CANONICAL_RESET','institutionalRegistryBound',true),null,now(),now()) on conflict (id) do update set client_id=excluded.client_id,client_secret_hash=excluded.client_secret_hash,name=excluded.name,created_by=excluded.created_by,redirect_uris=excluded.redirect_uris,allowed_scopes=excluded.allowed_scopes,audience=excluded.audience,status='ACTIVE',metadata=excluded.metadata,last_used_at=null,updated_at=now();`);
    }
  }
  statements.push('commit;');
  runPsql(statements.join('\n'));

  const expectedProfiles = 1 + state.members.length;
  const observedProfiles = Number(runPsql('select count(*)::text from public.profiles;'));
  if (observedProfiles !== expectedProfiles) throw new Error(`SFI_GENESIS_PROFILE_COUNT_MISMATCH:${observedProfiles}:${expectedProfiles}`);
  for (const item of state.members) {
    const row = JSON.parse(runPsql(`select json_build_object('role',role,'full_access',coalesce((module_access->>'full_access')::boolean,false),'governance_write',coalesce((module_access->>'governance_write')::boolean,false),'sovereign_actions',coalesce((module_access->>'sovereign_actions')::boolean,false),'canonical_promotion',coalesce((module_access->>'canonical_promotion')::boolean,false),'account_role',(select role from public.account_members am where am.user_id=profiles.user_id limit 1),'tenant_role',(select role from public.sfi_tenant_members tm where tm.user_id=profiles.user_id limit 1),'oauth',(select count(*) from public.sfi_oauth_clients c where c.created_by=profiles.user_id and c.status='ACTIVE'))::text from public.profiles where user_id=${q(item.user_id)}::uuid;`));
    const member = registryByEmail.get(item.email.toLowerCase())!;
    if (row.role !== member.role || row.full_access || row.governance_write || row.sovereign_actions || row.canonical_promotion) throw new Error(`SFI_INSTITUTIONAL_AUTHORITY_EXPANDED:${item.email}`);
    if (row.account_role !== member.role || row.tenant_role !== 'OPERATOR') throw new Error(`SFI_INSTITUTIONAL_MEMBERSHIP_MISMATCH:${item.email}`);
    if (Number(row.oauth) !== item.clients.length) throw new Error(`SFI_INSTITUTIONAL_OAUTH_COUNT_MISMATCH:${item.email}`);
  }
  console.log(JSON.stringify({ ok:true, contract:state.contract, institutionalMembersRestored:state.members.length, authorityExpansion:false, historicalUsageRestored:false }));
}
