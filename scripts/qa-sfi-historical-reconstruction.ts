import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SFI_CLEAN_GENESIS_DATE,
  SFI_HISTORICAL_EVIDENCE,
  SFI_HISTORICAL_RECONSTRUCTION_SEED,
  SFI_RECONSTRUCTED_HISTORY_END,
  SFI_WORLD_DAY_ORIGIN,
} from './db/sfi-historical-reconstruction-manifest.mjs';
import { SFI_SOFTWARE_HISTORY } from './db/sfi-software-history-manifest.mjs';
import {
  HISTORICAL_PRESERVE_TABLES,
  OPERATIONAL_DELETE_ORDER,
  PROTECTED_TABLES,
} from './db/sfi-operational-reset-inventory.mjs';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const seed=read('scripts/db/seed-sfi-canonical-history.mjs');
const reconstruct=read('scripts/reconstruct-sfi-derived-history.ts');
const migration=read('supabase/migrations/20260812015000_create_sfi_world_day_ledger.sql');
const liveWorldDay=read('src/lib/time/sfiWorldDay.ts');
const continuityCron=read('src/app/api/cron/continuity-report/route.ts');

assert.equal(SFI_WORLD_DAY_ORIGIN,'2026-06-02');
assert.equal(SFI_RECONSTRUCTED_HISTORY_END,'2026-08-11');
assert.equal(SFI_CLEAN_GENESIS_DATE,'2026-08-12');
assert.equal(SFI_HISTORICAL_RECONSTRUCTION_SEED,'sfi_historical_reconstruction_2026_08_11_v1');

const msPerDay=86_400_000;
const dayCount=Math.floor((Date.parse(`${SFI_RECONSTRUCTED_HISTORY_END}T00:00:00Z`)-Date.parse(`${SFI_WORLD_DAY_ORIGIN}T00:00:00Z`))/msPerDay)+1;
const cleanGenesisDay=Math.floor((Date.parse(`${SFI_CLEAN_GENESIS_DATE}T00:00:00Z`)-Date.parse(`${SFI_WORLD_DAY_ORIGIN}T00:00:00Z`))/msPerDay)+1;
assert.equal(dayCount,71,'historical_world_day_span_must_be_71');
assert.equal(cleanGenesisDay,72,'clean_genesis_must_be_world_day_72');

assert.equal(SFI_HISTORICAL_EVIDENCE.length,50,'historical_manifest_must_contain_49_backfill_objects_plus_CFI001');
assert.equal(SFI_SOFTWARE_HISTORY.length,12,'software_history_must_contain_selected_merged_convergence_milestones');
const reconstructionEvidence=[...SFI_HISTORICAL_EVIDENCE,...SFI_SOFTWARE_HISTORY];
assert.equal(new Set(reconstructionEvidence.map((item)=>item.key)).size,reconstructionEvidence.length,'reconstruction_keys_must_be_unique');
for(const item of SFI_HISTORICAL_EVIDENCE){
  assert.equal(item.epistemicClass,'IMPORTED_PROVENANCE',`historical_item_not_provenance:${item.key}`);
  assert.ok(Number.isFinite(Date.parse(item.observedAt)),`historical_item_invalid_date:${item.key}`);
  assert.ok(item.claimBoundary.includes('burden of proof'),`historical_item_missing_claim_boundary:${item.key}`);
}
for(const item of SFI_SOFTWARE_HISTORY){
  assert.equal(item.epistemicClass,'IMPORTED_PROVENANCE',`software_item_not_provenance:${item.key}`);
  assert.equal(item.kind,'software_milestone');
  assert.ok(item.sourceUrl?.includes('github.com/Aptymok/system-friction/pull/'),`software_item_missing_pr_source:${item.key}`);
  assert.ok(item.claimBoundary.includes('does not by itself prove production execution'),`software_item_missing_runtime_boundary:${item.key}`);
}
const cfi=SFI_HISTORICAL_EVIDENCE.find((item)=>item.key==='sfi-cfi-001');
assert.ok(cfi,'cfi001_missing');
assert.equal(cfi?.observedAt,'2026-05-09T00:00:00Z');
const catalogDated=SFI_HISTORICAL_EVIDENCE.filter((item)=>item.dateBasis==='CATALOG_DATE');
assert.ok(catalogDated.length>0,'catalog_date_boundary_missing');

// Preserve source/provenance, not stale derived world interpretation.
const requiredHistory=['sfi_world_day_ledger','world_source_observations','worldspect_snapshots'];
for(const table of requiredHistory){
  assert.ok(HISTORICAL_PRESERVE_TABLES.includes(table),`historical_table_not_preserved:${table}`);
  assert.ok(PROTECTED_TABLES.includes(table),`historical_table_not_protected:${table}`);
  assert.ok(!OPERATIONAL_DELETE_ORDER.includes(table),`historical_table_still_purgeable:${table}`);
}
const derivedWorld=[
  'world_friction_readings','world_hypotheses','world_hypothesis_outcomes','world_learning_events',
  'world_vector_cycles','world_vector_observations','world_vector_reports','world_vector_alerts',
  'world_observatory_learning','world_observatory_events','kernel_cycles','root_observation_events','sfi_indicator_snapshots',
];
for(const table of derivedWorld){
  assert.ok(OPERATIONAL_DELETE_ORDER.includes(table),`derived_world_runtime_should_be_recomputed:${table}`);
  assert.ok(!HISTORICAL_PRESERVE_TABLES.includes(table),`derived_world_runtime_must_not_survive_by_default:${table}`);
}

assert.match(seed,/SFI_HISTORY_SEED_CONFIRM/);
assert.match(seed,/RECONSTRUCT_SFI_HISTORY/);
assert.match(seed,/SFI-HISTORICAL-RECONSTRUCTION-V1/);
assert.match(seed,/SFI_SOFTWARE_HISTORY/);
assert.match(seed,/TIME_COORDINATE_ONLY/);
assert.match(seed,/PROSPECTIVE_GENESIS/);
assert.match(seed,/LIVE_EMPTY/);
assert.match(seed,/epistemic_event_id:null/);
assert.doesNotMatch(seed,/\.from\(['"]epistemic_events['"]\)/,'seed_must_not_write_epistemic_events');
assert.doesNotMatch(seed,/\.from\(['"]logbook_visible['"]\)/,'seed_must_not_write_legacy_logbook');
assert.doesNotMatch(seed,/field_outcomes.*insert|field_returns.*insert|sfi_lab_analyses.*insert|sfi_cognitive_twin_decisions.*insert/s,'seed_must_not_fabricate_runtime_outcomes');

assert.match(reconstruct,/reconcilePersistedEvidenceGraph/);
assert.match(reconstruct,/syncSfiInstitutionalStateToCognitiveTwin/);
assert.match(reconstruct,/No Field return, Method Lab run, governance decision or external execution is created/);

assert.match(migration,/create table if not exists public\.sfi_world_day_ledger/);
assert.match(migration,/TIME_COORDINATE_ONLY/);
assert.match(migration,/EVIDENCE_ATTACHED/);
assert.match(migration,/PROSPECTIVE_GENESIS/);
assert.match(migration,/LIVE_EMPTY/);
assert.match(migration,/service_role/);
assert.match(migration,/absence of reconstructed evidence is not itself evidence of inactivity/);

// Day 73+ must advance through the existing continuity cron without manufacturing activity.
assert.match(liveWorldDay,/export const SFI_WORLD_DAY_ORIGIN = '2026-06-02'/);
assert.match(liveWorldDay,/export const SFI_CLEAN_GENESIS_DATE = '2026-08-12'/);
assert.match(liveWorldDay,/toISOString\(\)\.slice\(0,10\)/,'world_day_must_use_utc_date');
assert.match(liveWorldDay,/export async function ensureCurrentSfiWorldDay/);
assert.match(liveWorldDay,/reconstruction_status:'LIVE_EMPTY'/);
assert.match(liveWorldDay,/Calendar continuity only\. Creating a world-day does not assert that an observation, event or institutional action occurred/);
assert.match(continuityCron,/ensureCurrentSfiWorldDay/);
assert.ok(
  continuityCron.indexOf('await ensureCurrentSfiWorldDay()') < continuityCron.indexOf('await createDailyContinuityReport()'),
  'world_day_must_be_ensured_before_daily_continuity_report',
);
assert.match(continuityCron,/no additional Vercel cron invocation is introduced/);

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-HISTORICAL-RECONSTRUCTION-QA-1.3',
  reconstructedWorldDays:dayCount,
  cleanGenesisDay,
  historicalArtifactObjects:SFI_HISTORICAL_EVIDENCE.length,
  softwareMilestones:SFI_SOFTWARE_HISTORY.length,
  totalSeededProvenanceObjects:reconstructionEvidence.length,
  catalogDatedObjects:catalogDated.length,
  protectedHistoricalTables:requiredHistory.length,
  recomputedWorldTables:derivedWorld.length,
  invariants:[
    'only provenance-rich world history survives operational reset',
    'every SFI world-day has a coordinate from Day 1 through clean genesis',
    'empty historical dates do not fabricate inactivity or events',
    'historical artifacts and software merges enter as imported provenance only',
    'merged code does not become proof of runtime/scientific validity',
    'stale world interpretations are deleted and may be recomputed from surviving source history',
    'derived graph and Twin context are recomputed rather than copied as truth',
    'clean prospective genesis is World Day 72 / 2026-08-12 UTC',
    'World Day 73+ advances automatically on the existing continuity cron without asserting activity',
  ],
},null,2));
