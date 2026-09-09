import { chmod, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.CONNECTION_STRING;
const statePath = process.env.SFI_PRODUCTION_INSTRUMENT_STATE || '/tmp/sfi-production-instruments.json';
const mode = process.argv[2];
if (!databaseUrl) throw new Error('SFI_INSTRUMENT_GENESIS_DATABASE_REQUIRED');
if (!['export','verify','restore'].includes(mode || '')) throw new Error('Usage: preserve-production-instrument-bank.ts <export|verify|restore>');

function pgEnvironment(rawUrl: string) {
  const url = new URL(rawUrl);
  return { ...process.env, PGHOST:url.hostname, PGPORT:url.port || '5432', PGUSER:decodeURIComponent(url.username), PGPASSWORD:decodeURIComponent(url.password), PGDATABASE:decodeURIComponent(url.pathname.replace(/^\//,'')), PGSSLMODE:process.env.PGSSLMODE || 'require' };
}
function runPsql(sql: string) {
  const result = spawnSync('psql', ['--no-psqlrc','--set','ON_ERROR_STOP=1','--tuples-only','--no-align','--command',sql], { env:pgEnvironment(databaseUrl!), encoding:'utf8', stdio:['ignore','pipe','pipe'], maxBuffer:16*1024*1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`psql failed: ${String(result.stderr || result.stdout).trim()}`);
  return String(result.stdout || '').trim();
}
function q(value: unknown) { return `'${String(value ?? '').replaceAll("'", "''")}'`; }

type Instrument = Record<string, unknown> & { id:string; owner_id:string; name:string; engine:string; package_ref:string|null; package_hash:string|null; license:string|null; rights_status:string; rights_evidence_ref:string|null; source_reference_id:string|null; current_execution_rights_state:string; quality_state:string };
type State = { contract:'SFI-PRODUCTION-INSTRUMENT-GENESIS-1.0'; exported_at:string; instruments:Instrument[] };

async function loadState(): Promise<State> {
  const parsed = JSON.parse(await readFile(statePath,'utf8')) as State;
  if (parsed.contract !== 'SFI-PRODUCTION-INSTRUMENT-GENESIS-1.0' || !Array.isArray(parsed.instruments)) throw new Error('SFI_PRODUCTION_INSTRUMENT_STATE_INVALID');
  const ids = new Set<string>();
  for (const instrument of parsed.instruments) {
    if (!instrument.id || ids.has(instrument.id)) throw new Error('SFI_PRODUCTION_INSTRUMENT_ID_INVALID');
    ids.add(instrument.id);
    if (instrument.quality_state !== 'PRODUCTION' || instrument.current_execution_rights_state !== 'ELIGIBLE') throw new Error(`SFI_PRODUCTION_INSTRUMENT_NOT_ELIGIBLE:${instrument.id}`);
    if (instrument.engine !== 'SFZ' || !instrument.package_ref || !instrument.package_hash || !instrument.license || !instrument.rights_evidence_ref) throw new Error(`SFI_PRODUCTION_INSTRUMENT_CONFIG_INCOMPLETE:${instrument.id}`);
    if (instrument.source_reference_id !== null) throw new Error(`SFI_PRODUCTION_INSTRUMENT_SOURCE_DEPENDENCY_NOT_RESEEDED:${instrument.id}`);
  }
  return parsed;
}

if (mode === 'export') {
  const raw = runPsql(`with sovereign as (select user_id from public.profiles where role in ('root','system') and coalesce((module_access->>'full_access')::boolean,false)=true) select coalesce(json_agg(row_to_json(i) order by i.id),'[]'::json)::text from public.sfi_instruments i join sovereign s on s.user_id=i.owner_id where i.quality_state='PRODUCTION' and i.current_execution_rights_state='ELIGIBLE';`);
  const instruments = JSON.parse(raw || '[]') as Instrument[];
  if (!instruments.length) throw new Error('SFI_PRODUCTION_INSTRUMENT_BANK_EMPTY_PRE_RESET');
  const state: State = { contract:'SFI-PRODUCTION-INSTRUMENT-GENESIS-1.0', exported_at:new Date().toISOString(), instruments };
  await writeFile(statePath, `${JSON.stringify(state)}\n`, { encoding:'utf8', mode:0o600 });
  await chmod(statePath,0o600);
  console.log(JSON.stringify({ ok:true, contract:state.contract, productionEligibleInstruments:instruments.length, packageHashes:instruments.map((item)=>item.package_hash) }));
}

if (mode === 'verify') {
  const state = await loadState();
  console.log(JSON.stringify({ ok:true, contract:state.contract, productionEligibleInstruments:state.instruments.length, rightsEvidenceComplete:true, rawAudioPersisted:false }));
}

if (mode === 'restore') {
  const state = await loadState();
  const founderId = runPsql(`select user_id::text from public.profiles where role in ('root','system') and coalesce((module_access->>'full_access')::boolean,false)=true limit 1;`);
  if (!founderId) throw new Error('SFI_PRODUCTION_INSTRUMENT_FOUNDER_MISSING');
  for (const instrument of state.instruments) {
    if (instrument.owner_id !== founderId) throw new Error(`SFI_PRODUCTION_INSTRUMENT_OWNER_DRIFT:${instrument.id}`);
  }
  const payload = JSON.stringify(state.instruments);
  runPsql(`begin; insert into public.sfi_instruments select * from json_populate_recordset(null::public.sfi_instruments, ${q(payload)}::json); commit;`);
  const observedRaw = runPsql(`select coalesce(json_agg(json_build_object('id',id,'owner_id',owner_id,'engine',engine,'package_hash',package_hash,'license',license,'rights_status',rights_status,'rights_evidence_ref',rights_evidence_ref,'quality_state',quality_state,'execution',current_execution_rights_state) order by id),'[]'::json)::text from public.sfi_instruments;`);
  const observed = JSON.parse(observedRaw || '[]') as Array<Record<string,unknown>>;
  if (observed.length !== state.instruments.length) throw new Error(`SFI_PRODUCTION_INSTRUMENT_COUNT_MISMATCH:${observed.length}:${state.instruments.length}`);
  for (const expected of state.instruments) {
    const actual = observed.find((item)=>item.id===expected.id);
    if (!actual || actual.owner_id!==founderId || actual.engine!=='SFZ' || actual.package_hash!==expected.package_hash || actual.license!==expected.license || actual.rights_status!==expected.rights_status || actual.rights_evidence_ref!==expected.rights_evidence_ref || actual.quality_state!=='PRODUCTION' || actual.execution!=='ELIGIBLE') throw new Error(`SFI_PRODUCTION_INSTRUMENT_RESTORE_MISMATCH:${expected.id}`);
  }
  console.log(JSON.stringify({ ok:true, contract:state.contract, productionEligibleInstrumentsRestored:observed.length, authorityExpansion:false, renderHistoryRestored:false }));
}
