import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessCognitiveActivity } from './cognitiveActivityDiagnosis';

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
