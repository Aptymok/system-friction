import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {compareIndependentWorldSpectClocks, type PlaneClockRead} from './independentPlaneClock';

const row=(at:string|null,receiptId='sfi-test-receipt'):PlaneClockRead=>({
  observedAt:at,receiptId:at?receiptId:null,readStatus:at?'OBSERVED':'EMPTY'
});

test('Neon newer is visible but never treated as a certified mirror or primary write',()=>{
  const result=compareIndependentWorldSpectClocks({
    primary:row('2026-10-24T20:23:06.889Z','primary-old'),
    neon:row('2026-10-25T07:30:25.683Z','neon-new'),
  });
  assert.equal(result.status,'NEON_NEWER');
  assert.ok((result.differenceMinutes??0)>600);
  assert.equal(result.requiresRecovery,false);
  assert.equal(result.mirrorCertified,false);
  assert.equal(result.action,'READ_ONLY_COMPARE_NO_SYNC_NO_AUTOMATED_FAILOVER');
});

test('same timestamp is not proof that databases contain identical observations',()=>{
  const at='2026-10-25T07:30:25.683Z';
  const result=compareIndependentWorldSpectClocks({
    primary:row(at,'primary-a'),
    neon:row(at,'neon-b'),
  });
  assert.equal(result.status,'SAME_OBSERVED_TIME_UNVERIFIED');
  assert.equal(result.mirrorCertified,false);
  assert.equal(result.differenceMinutes,0);
});

test('read failures remain unknown, not zero or a false primary-last result',()=>{
  const result=compareIndependentWorldSpectClocks({
    primary:{observedAt:null,receiptId:null,readStatus:'READ_UNAVAILABLE'},
    neon:row('2026-10-25T07:30:25.683Z'),
  });
  assert.equal(result.status,'INCOMPLETE_READ');
  assert.equal(result.differenceMinutes,null);
});

test('no observation in either provider remains explicit and reversible',()=>{
  const result=compareIndependentWorldSpectClocks({primary:row(null),neon:row(null)});
  assert.equal(result.status,'NO_OBSERVATIONS');
  assert.equal(result.requiresRecovery,false);
});

test('operator-only clock read is guarded by ROOT and not called from cron',()=>{
  const route=readFileSync('src/app/api/root/continuity/route.ts','utf8');
  const read=readFileSync('src/lib/worldspect/readIndependentPlaneClock.ts','utf8');
  const ui=readFileSync('src/components/sfi/SfiRootWorkspace.tsx','utf8');
  assert.match(route,/requireRootActor\('continuity\.state\.read'\)/);
  assert.match(route,/worldspect_planes'\) === '1'/);
  assert.match(route,/readIndependentWorldSpectPlaneClock\(\)/);
  assert.match(ui,/data-sfi-worldspect-provider-clocks/);
  assert.match(ui,/\/api\/root\/continuity\?worldspect_planes=1/);
  assert.match(read,/select\('id,observed_at'\)/);
  assert.match(read,/limit\(1\)\.maybeSingle\(\)/);
  assert.match(read,/order by observed_at desc[\s\S]*limit 1/);
  assert.doesNotMatch(read,/\.update\(|\.insert\(|\.delete\(|flushPrimaryMirror\(|recoverPrimaryDataPlane\(/);
  for(const path of [
    'src/app/api/cron/continuity-heartbeat/route.ts',
    'src/app/api/cron/worldspect/route.ts',
    '.github/workflows/sfi-continuity-hourly.yml',
  ]) assert.doesNotMatch(readFileSync(path,'utf8'),/readIndependentWorldSpectPlaneClock|worldspect_planes=1/);
});
