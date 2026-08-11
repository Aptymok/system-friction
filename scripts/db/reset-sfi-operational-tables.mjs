import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, deleteAllRowsByKnownColumns, countTable, nowStamp } from './sfi-db-client.mjs';
import { OPERATIONAL_RESET_LAYERS, OPERATIONAL_DELETE_ORDER, PROTECTED_TABLES } from './sfi-operational-reset-inventory.mjs';

const confirm = process.env.SFI_DB_RESET_CONFIRM;
const resetMode = process.env.SFI_DB_RESET_MODE;
if (confirm !== 'RESET_SFI_OPERATIONAL' || resetMode !== 'CLEAN_RUNTIME_AFTER_VERIFIED_PROOF') {
  console.error(JSON.stringify({
    ok: false,
    blocked: true,
    reason: 'Operational clean-start reset is intentionally disabled by default. It is allowed only after an export, cleanup plan and successful full-cycle proof have been reviewed.',
    required: [
      'SFI_DB_RESET_CONFIRM=RESET_SFI_OPERATIONAL',
      'SFI_DB_RESET_MODE=CLEAN_RUNTIME_AFTER_VERIFIED_PROOF',
    ],
    preserves: PROTECTED_TABLES,
  }, null, 2));
  process.exit(1);
}

let latest = '';
try { latest = (await readFile(path.join('data', 'supabase-export', 'LATEST_EXPORT.txt'), 'utf8')).trim(); } catch {}
if (!latest) {
  console.error(JSON.stringify({ ok: false, blocked: true, reason: 'No local export found. Run npm run db:export first.' }, null, 2));
  process.exit(1);
}

let cleanupPlans = [];
try { cleanupPlans = (await readdir(path.join('docs', 'db'))).filter((name) => name.startsWith('SFI_CLEANUP_PLAN_') && name.endsWith('.json')); } catch {}
if (!cleanupPlans.length) {
  console.error(JSON.stringify({ ok: false, blocked: true, reason: 'No cleanup classification report found. Run npm run db:cleanup:plan first.' }, null, 2));
  process.exit(1);
}

let proofReports = [];
try { proofReports = (await readdir(path.join('docs', 'db'))).filter((name) => name.startsWith('SFI_FULL_CYCLE_PROOF_') && name.endsWith('.json')); } catch {}
if (!proofReports.length && process.env.SFI_DB_RESET_VERIFIED_PROOF !== 'YES') {
  console.error(JSON.stringify({
    ok:false,
    blocked:true,
    reason:'No exported full-cycle proof receipt was found. Export the production PASS receipt first, or set SFI_DB_RESET_VERIFIED_PROOF=YES only after independently reviewing that persisted receipt.',
  },null,2));
  process.exit(1);
}

const supabase = createAdminClient();
const stamp = nowStamp();
await mkdir(path.join('docs', 'db'), { recursive: true });

const result = {
  ok: true,
  reset_at: new Date().toISOString(),
  mode:'CLEAN_RUNTIME_AFTER_VERIFIED_PROOF',
  latest_export: latest,
  cleanup_plan: cleanupPlans.sort().at(-1),
  proof_receipt: proofReports.sort().at(-1) ?? 'externally-reviewed-production-proof',
  protected_tables:PROTECTED_TABLES,
  expected_operational_tables:OPERATIONAL_DELETE_ORDER.length,
  layers:[],
  tables:[],
};

for (const layer of OPERATIONAL_RESET_LAYERS) {
  const layerResult={id:layer.id,reason:layer.reason,tables:[]};
  for (const table of layer.tables) {
    const before=await countTable(supabase,table);
    if (!before.exists) {
      const skipped={table,ok:true,state:'SKIPPED_NOT_PRESENT',before:null,deleted:false,error:before.error,error_classification:before.error_classification};
      layerResult.tables.push(skipped);result.tables.push(skipped);continue;
    }
    const deleted=await deleteAllRowsByKnownColumns(supabase,table);
    const after=deleted.ok?await countTable(supabase,table):{count:null,error:null};
    const clean=deleted.ok&&(after.count??0)===0;
    if(!clean)result.ok=false;
    const row={table,ok:clean,state:clean?'CLEARED':'FAILED',before:before.count,after:after.count,deleted:deleted.ok,method:deleted.method??null,errors:deleted.errors??[],after_error:after.error??null};
    layerResult.tables.push(row);result.tables.push(row);
  }
  result.layers.push(layerResult);
}

const protectedChecks=[];
for(const table of PROTECTED_TABLES){
  const check=await countTable(supabase,table);
  protectedChecks.push({table,exists:check.exists,count:check.count,error:check.error});
}
result.protected_checks=protectedChecks;

const reportPath=path.join('docs','db',`SFI_RESET_REPORT_${stamp}.json`);
await writeFile(reportPath, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify({...result,report:reportPath}, null, 2));
if (!result.ok) process.exitCode = 1;