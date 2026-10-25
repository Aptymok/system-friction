import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {interpretPilotLightEconomics, observedBytes} from './pilotLightEconomicsPolicy';

test('measures ratios only from actual storage reads, never monetary cost or quota',()=>{
  const o=interpretPilotLightEconomics({
    neon:{dbBytes:200_000_000,journalBytes:100_000_000,observationTableBytes:20_000_000,mode:'CONTINUITY'},
    primaryOutbox:{pending:52,conflicts:0},
  });
  assert.equal(o.neonStorage.journalShare,0.5);
  assert.equal(o.neonStorage.databaseBytes,200_000_000);
  assert.equal(o.primaryOutbox?.pending,52);
  assert.equal(o.financialCostUSD,null);
  assert.equal(o.remainingQuotaStatus,'NOT_OBSERVED_NO_PROVIDER_QUOTA_FEED');
  assert.equal(o.activeReplicationPolicy,'UNCHANGED');
  assert.equal(o.economicPolicy,'PILOT_LIGHT_CANDIDATE_OBSERVE_ONLY');
  assert.equal(o.classification.action,'REVIEW_ONLY_NO_AUTOMATED_EXCLUSIONS');
});

test('fail closed on unavailable providers instead of manufacturing zero consumption',()=>{
  const o=interpretPilotLightEconomics({
    neon:null,primaryOutbox:null,neonError:'unavailable',primaryError:'unavailable',
  });
  assert.equal(o.neonStorage.databaseBytes,null);
  assert.equal(o.neonStorage.journalShare,null);
  assert.equal(o.primaryOutbox,null);
  assert.equal(o.neonMode,'UNKNOWN');
  assert.equal(o.neonReadStatus,'READ_UNAVAILABLE');
  assert.equal(o.primaryOutboxStatus,'READ_UNAVAILABLE');
  assert.equal(o.financialCostStatus,'NOT_OBSERVED_NO_BILLING_API');
  assert.equal(observedBytes(undefined),null);
  assert.equal(observedBytes('NaN'),null);
  assert.equal(observedBytes(-1),null);
  assert.equal(observedBytes('0'),0);
});

test('observation is requested on demand and cannot be a scheduler or mutation',()=>{
  const root=readFileSync('src/app/api/root/continuity/route.ts','utf8');
  const worker=readFileSync('src/lib/persistence/pilotLightEconomics.ts','utf8');
  const ui=readFileSync('src/components/sfi/SfiRootWorkspace.tsx','utf8');
  assert.match(root,/requireRootActor\('continuity\.state\.read'\)/);
  assert.match(root,/searchParams\.get\('economics'\) === '1'/);
  assert.match(root,/readPilotLightEconomicObservation\(\)/);
  assert.match(ui,/data-sfi-pilot-light-economics/);
  assert.match(ui,/\/api\/root\/continuity\?economics=1/);
  assert.match(worker,/pg_database_size\(current_database\(\)\)/);
  assert.match(worker,/readPrimaryOutboxStatus\(\)/);
  assert.doesNotMatch(worker,/flushPrimaryMirror\(|attemptBoundedDataPlaneReconciliation\(|\.delete\(|\.insert\(|\.update\(/);
  for(const path of [
    'src/app/api/cron/continuity-heartbeat/route.ts',
    '.github/workflows/sfi-continuity-hourly.yml',
  ]){
    const text=readFileSync(path,'utf8');
    assert.doesNotMatch(text,/readPilotLightEconomicObservation|economics=1/);
  }
});
