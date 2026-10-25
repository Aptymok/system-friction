import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import { assessWorldRepeatRetryGuard } from './hypothesisRetryGuard';

const receipt = (at:string,sourcePartialEventId='partial-a') => ({
  event_name:'external.world.hypothesis_resume.partial',
  occurred_at:at,
  payload:{sourcePartialEventId},
});
const provider = (lastSuccessAt:string|null=null)=>[{
  available:true,circuitOpen:false,state:'HEALTHY',canaryOk:lastSuccessAt!==null,lastSuccessAt,
}];
const input={
  sourcePartialEventId:'partial-a',
  latestObservationFetchedAt:'2026-10-24T12:00:00Z',
  retryReceipts:[
    receipt('2026-10-24T12:01:00Z'),
    receipt('2026-10-24T12:02:00Z'),
    receipt('2026-10-24T12:03:00Z'),
  ],
  providerStatuses:provider(),
};

test('same-source three failed receipts suspend automatic World inference',()=>{
  const x=assessWorldRepeatRetryGuard(input);
  assert.equal(x.suspended,true);
  assert.equal(x.status,'RETRY_SUSPENDED_UNCHANGED_OBSERVATIONS');
  assert.equal(x.previousFailureCount,3);
  assert.equal(x.writesPerformed,false);
  assert.equal(x.worldReturnVerified,false);
});

test('different partial cycle or unrelated event cannot count toward repeated retries',()=>{
  const x=assessWorldRepeatRetryGuard({...input,retryReceipts:[
    receipt('2026-10-24T12:01:00Z'),
    receipt('2026-10-24T12:02:00Z','partial-b'),
    {event_name:'external.world.hypothesis_resume.completed',
      occurred_at:'2026-10-24T12:03:00Z',payload:{sourcePartialEventId:'partial-a'}},
  ]});
  assert.equal(x.previousFailureCount,1);
  assert.equal(x.suspended,false);
});

test('a later independently fetched World observation reopens prospective work',()=>{
  const x=assessWorldRepeatRetryGuard({...input,
    latestObservationFetchedAt:'2026-10-24T12:04:00Z'});
  assert.equal(x.suspended,false);
  assert.equal(x.newObservationSinceLastFailure,true);
});

test('provider recovery needs a successful post-failure canary',()=>{
  const prior=assessWorldRepeatRetryGuard({...input,providerStatuses:provider('2026-10-24T12:02:00Z')});
  assert.equal(prior.suspended,true);
  const after=assessWorldRepeatRetryGuard({...input,providerStatuses:provider('2026-10-24T12:04:00Z')});
  assert.equal(after.suspended,false);
  assert.equal(after.providerRecovered,true);
});

test('both OAuth and scheduled World entrypoints enforce retry provenance before inference',()=>{
  const oauth=readFileSync('src/app/api/external/v1/world/route.ts','utf8');
  const cron=readFileSync('src/app/api/cron/world-observatory/route.ts','utf8');
  for(const source of [oauth,cron]){
    assert.match(source,/assessWorldRepeatRetryGuard\(/);
    assert.match(source,/RETRY_RECEIPT_READ_UNAVAILABLE/);
    assert.match(source,/HYPOTHESIS_RETRY_SUSPENDED_UNCHANGED_OBSERVATIONS/);
    assert.ok(source.indexOf('assessWorldRepeatRetryGuard(')<source.indexOf('const hypothesis=await runWorldHypothesisCycle()',source.indexOf('assessWorldRepeatRetryGuard(')),
      'provenance gate must run before costly hypothesis inference');
  }
});
