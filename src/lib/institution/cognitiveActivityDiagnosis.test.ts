import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessCognitiveActivity, COGNITIVE_DIAGNOSTIC_WINDOW_MS } from './cognitiveActivityDiagnosis';

const base = {
  generatedAt:'2026-10-21T14:00:00.000Z',
  agents:[{status:'gated'},{status:'gated'},{status:'gated'}],
  contract:{executorAgents:3},
  eventGraph:{
    status:'operational',
    warnings:[] as string[],
    recentEvents:[{
      eventId:'verified-event-001',
      eventName:'SFI_UNIVERSAL_RETURN_CONTRASTED',
      occurredAt:'2026-10-21T13:30:00.000Z',
    }],
  },
};
test('three registered executors with no recent receipts and fresh institutional work are eligible for diagnosis',()=>{
  const r=assessCognitiveActivity(base);
  assert.equal(r.state,'DIAGNOSTIC_ELIGIBLE');
  assert.equal(r.signals.length,1);
  assert.equal(r.inactivityMeansDenial,false);
});
test('registered but idle agents without current actionable input are not artificially activated',()=>{
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents:[]}});
  assert.equal(r.state,'NO_RECENT_DIAGNOSTIC_INPUT');
});
test('a recent successful execution suppresses collective inactivity diagnosis',()=>{
  const r=assessCognitiveActivity({...base,agents:[{status:'operational'},{status:'gated'},{status:'gated'}]});
  assert.equal(r.state,'NO_COLLECTIVE_INACTIVITY');
});
test('missing or degraded capacity is not mislabeled as collective inactivity',()=>{
  const r=assessCognitiveActivity({...base,agents:[{status:'missing'},{status:'gated'},{status:'gated'}],contract:{executorAgents:2}});
  assert.equal(r.state,'NO_COLLECTIVE_INACTIVITY');
});
test('failed provenance read fails closed instead of diagnosing a denial',()=>{
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,warnings:['READ_FAILED']}});
  assert.equal(r.state,'EVENT_READ_UNAVAILABLE');
  assert.equal(r.signals.length,0);
});
test('old and future-dated signals are not eligible',()=>{
  const future={eventId:'future',eventName:'SFI_TASK_CREATED',occurredAt:'2026-10-22T00:00:00.000Z'};
  const old={eventId:'old',eventName:'SFI_TASK_CREATED',occurredAt:'2026-10-18T00:00:00.000Z'};
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents:[old,future]}});
  assert.equal(r.state,'NO_RECENT_DIAGNOSTIC_INPUT');
});
test('unrelated external task assignment cannot claim cognitive demand',()=>{
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents:[{
    eventId:'external',eventName:'execution.router.assigned_external',occurredAt:'2026-10-21T13:30:00.000Z',
  }]}});
  assert.equal(r.state,'NO_RECENT_DIAGNOSTIC_INPUT');
});
test('missing event identity does not make an admissible signal',()=>{
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents:[{
    eventId:'',eventName:'SFI_TASK_CREATED',occurredAt:'2026-10-21T13:30:00.000Z',
  }]}});
  assert.equal(r.state,'NO_RECENT_DIAGNOSTIC_INPUT');
});

test('unknown event graph status cannot admit a diagnostic',()=>{
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,status:'unknown'}});
  assert.equal(r.state,'EVENT_READ_UNAVAILABLE');
});
test('degraded event graph status cannot admit a diagnostic',()=>{
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,status:'degraded'}});
  assert.equal(r.state,'EVENT_READ_UNAVAILABLE');
});
test('missing event graph collection fails closed',()=>{
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents:undefined as never}});
  assert.equal(r.state,'EVENT_READ_UNAVAILABLE');
});
test('malformed warning collection fails closed',()=>{
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,warnings:undefined as never}});
  assert.equal(r.state,'EVENT_READ_UNAVAILABLE');
});
test('blank whitespace event identity is never an admissible receipt',()=>{
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents:[{
    eventId:'   ',eventName:'SFI_TASK_CREATED',occurredAt:'2026-10-21T13:30:00.000Z'
  }]}});
  assert.equal(r.state,'NO_RECENT_DIAGNOSTIC_INPUT');
});
test('malformed event timestamp is never an admissible receipt',()=>{
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents:[{
    eventId:'event-1',eventName:'SFI_TASK_CREATED',occurredAt:'not-a-date'
  }]}});
  assert.equal(r.state,'NO_RECENT_DIAGNOSTIC_INPUT');
});
test('duplicate event identities do not inflate diagnostic evidence',()=>{
  const repeated={eventId:'event-1',eventName:'SFI_TASK_CREATED',occurredAt:'2026-10-21T13:30:00.000Z'};
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents:[repeated,repeated,repeated]}});
  assert.equal(r.state,'DIAGNOSTIC_ELIGIBLE');
  assert.equal(r.signals.length,1);
});
test('admitted evidence is ordered by most recent occurrence rather than input order',()=>{
  const older={eventId:'older',eventName:'SFI_TASK_CREATED',occurredAt:'2026-10-21T12:00:00.000Z'};
  const newer={eventId:'newer',eventName:'SFI_TASK_CREATED',occurredAt:'2026-10-21T13:00:00.000Z'};
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents:[older,newer]}});
  assert.deepEqual(r.signals.map(s=>s.eventId),['newer','older']);
});
test('only twelve newest unique signals survive the bounded evidence window',()=>{
  const recentEvents=Array.from({length:20},(_,i)=>({
    eventId:'event-'+i,eventName:'SFI_TASK_CREATED',
    occurredAt:new Date(Date.parse(base.generatedAt)-i*60_000).toISOString(),
  })).reverse();
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents}});
  assert.equal(r.signals.length,12);
  assert.equal(r.signals[0].eventId,'event-0');
  assert.equal(r.signals[11].eventId,'event-11');
});
test('receipts at the exact 24-hour boundary count, earlier receipts do not',()=>{
  const at=new Date(Date.parse(base.generatedAt)-COGNITIVE_DIAGNOSTIC_WINDOW_MS).toISOString();
  const before=new Date(Date.parse(at)-1).toISOString();
  const r=assessCognitiveActivity({...base,eventGraph:{...base.eventGraph,recentEvents:[
    {eventId:'outside',eventName:'SFI_TASK_CREATED',occurredAt:before},
    {eventId:'boundary',eventName:'SFI_TASK_CREATED',occurredAt:at},
  ]}});
  assert.deepEqual(r.signals.map(s=>s.eventId),['boundary']);
});
