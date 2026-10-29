import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTINUITY_CAPABILITIES, SAFE_ABSENCE_RULES } from './contracts';

test('continuity capability identifiers are unique', () => {
  const ids = CONTINUITY_CAPABILITIES.map((capability) => capability.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('founder absence blocks reserved authority', () => {
  assert.equal(SAFE_ABSENCE_RULES.mayPublish, false);
  assert.equal(SAFE_ABSENCE_RULES.mayChangeCanon, false);
  assert.equal(SAFE_ABSENCE_RULES.mayChangeFormula, false);
  assert.equal(SAFE_ABSENCE_RULES.mayGrantRootAccess, false);
  assert.equal(SAFE_ABSENCE_RULES.mayExecuteIrreversibleExternalAction, false);
});

test('all A3 capabilities are blocked in founder absence', () => {
  for (const capability of CONTINUITY_CAPABILITIES.filter((item) => item.autonomyLevel === 'A3')) {
    assert.equal(capability.allowedInFounderAbsence, false, capability.id);
  }
});

test('critical observational capabilities remain available', () => {
  const required = ['world_vector', 'scorefriction', 'mihm', 'evidence'];
  for (const id of required) {
    const capability = CONTINUITY_CAPABILITIES.find((item) => item.id === id);
    assert.ok(capability, id);
    assert.equal(capability.allowedInFounderAbsence, true, id);
  }
});

import * as trialContracts from './contracts';
const cycle='33bf9ac2-41ad-408f-bd75-b879ae6b442f';
const trial=()=>JSON.stringify({cycleId:cycle,startsAt:'2026-10-29T04:17:00Z',expiresAt:'2026-10-29T07:17:00Z'});
function schedule(raw:string|undefined,at='2026-10-29T04:30:00Z'):any {
  const parse=(trialContracts as any).readContinuityTrialSchedule;
  assert.equal(typeof parse,'function','bounded trial admission is missing');
  return parse(raw,Date.parse(at));
}
test('no trial configuration grants no new scheduled authority',()=>{
  assert.equal(schedule(undefined).state,'DISABLED');
});
test('a trial admits exactly three successive hourly slots and then expires',()=>{
  assert.equal(schedule(trial(),'2026-10-29T04:17:00Z').slot,0);
  assert.equal(schedule(trial(),'2026-10-29T05:17:00Z').slot,1);
  assert.equal(schedule(trial(),'2026-10-29T06:17:00Z').slot,2);
  assert.equal(schedule(trial(),'2026-10-29T07:17:00Z').state,'EXPIRED');
  assert.equal(schedule(trial(),'2026-10-29T04:16:59Z').state,'NOT_STARTED');
});
test('invalid, extended, noncanonical-calendar or unscoped trial grants fail closed',()=>{
  for(const raw of ['{}','bad',JSON.stringify({cycleId:cycle,startsAt:'2026-10-29T04:17:00Z',expiresAt:'2026-10-29T08:17:00Z'}),
    JSON.stringify({cycleId:'*',startsAt:'2026-10-29T04:17:00Z',expiresAt:'2026-10-29T07:17:00Z'}),
    JSON.stringify({cycleId:cycle,startsAt:'2026-02-30T04:17:00Z',expiresAt:'2026-02-30T07:17:00Z'}),
    JSON.stringify({cycleId:cycle,startsAt:'2026-10-29T04:17:00',expiresAt:'2026-10-29T07:17:00'}),
    JSON.stringify({cycleId:cycle,startsAt:'2026-10-29T04:17:00Z',expiresAt:'2026-10-29T07:17:00Z',allCases:true})
  ])assert.equal(schedule(raw).state,'INVALID',raw);
});
test('equivalent instants and cycle casing produce identical reservation identity',()=>{
  const a=schedule(trial());
  const b=schedule(JSON.stringify({cycleId:cycle.toUpperCase(),startsAt:'2026-10-29T06:17:00+02:00',expiresAt:'2026-10-29T09:17:00+02:00'}));
  assert.equal(a.cycleId,b.cycleId);
  assert.equal(a.startsAt,b.startsAt);
  assert.equal(a.slot,b.slot);
});
