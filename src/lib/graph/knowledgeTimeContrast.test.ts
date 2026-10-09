import test from 'node:test';
import assert from 'node:assert/strict';
import { projectKnowledgeTimeContrast } from './knowledgeTimeContrast';

const base = {
  attributes: {} as Record<string, unknown>,
  epistemicState: 'OBSERVED',
  captureTime: '2026-10-06T10:00:00Z',
  nodeUpdatedAt: '2026-10-09T12:00:00Z',
  sourceVersion: '1',
  provenance: 'Institutional ledger',
  lineage: ['source:1'],
};

test('no historical information cannot be fabricated from a current node', () => {
  const out = projectKnowledgeTimeContrast(base);
  assert.equal(out.then.provenance, 'NOT_OBSERVED');
  assert.equal(out.then.knownAt, null);
  assert.equal(out.now.knownAt, null);
  assert.equal(out.now.observedAt, '2026-10-06T10:00:00.000Z');
  assert.equal(out.now.recordUpdatedAt, '2026-10-09T12:00:00.000Z');
  assert.equal(out.comparison, 'INSUFFICIENT_TEMPORAL_EVIDENCE');
});

test('a real epoch carries state and date, not an invented historical claim', () => {
  const out = projectKnowledgeTimeContrast({
    ...base,
    fieldHistory: {
      epochCount: 2, firstObservedAt:'2026-10-01T08:00:00Z',
      lastObservedAt:'2026-10-08T09:00:00Z', persistedHistory:true,
      recentEpochs:[
        { eventId:'epoch:2', occurredAt:'2026-10-08T09:00:00Z', state:'OBSERVED', previousState:'UNKNOWN', censoring:'NONE'},
        { eventId:'epoch:1', occurredAt:'2026-10-01T08:00:00Z', state:'UNKNOWN', previousState:null, censoring:'UNKNOWN'},
      ],
    },
  });
  assert.equal(out.then.knownAt,'2026-10-01T08:00:00.000Z');
  assert.equal(out.then.statement,null);
  assert.equal(out.then.state,'UNKNOWN');
  assert.equal(out.then.sourceRef,'epoch:1');
  assert.equal(out.now.knownAt,'2026-10-08T09:00:00.000Z');
  assert.equal(out.comparison,'CHANGED');
});

test('cutoff chooses the correct historical epoch and does not rewrite history', () => {
  const history={
    epochCount:3,firstObservedAt:'2026-01-01T00:00:00Z',lastObservedAt:'2026-03-01T00:00:00Z',
    persistedHistory:true,
    recentEpochs:[
      {eventId:'a',occurredAt:'2026-01-01T00:00:00Z',state:'UNKNOWN',previousState:null,censoring:'NONE'},
      {eventId:'b',occurredAt:'2026-02-01T00:00:00Z',state:'INFERRED',previousState:'UNKNOWN',censoring:'NONE'},
      {eventId:'c',occurredAt:'2026-03-01T00:00:00Z',state:'OBSERVED',previousState:'INFERRED',censoring:'NONE'},
    ],
  };
  const out=projectKnowledgeTimeContrast({...base,fieldHistory:history,selectedCutoff:'2026-02-01T00:00:00Z'});
  assert.equal(out.then.sourceRef,'b');
  assert.equal(out.then.state,'INFERRED');
  assert.equal(out.now.knownAt,'2026-03-01T00:00:00.000Z');
  assert.equal(out.comparison,'CHANGED');
});

test('an explicit prior knowledge claim keeps knowledge date separate from effective date', () => {
  const out=projectKnowledgeTimeContrast({
    ...base,
    attributes:{
      knownThen:{
        state:'INFERRED',claim:'Initial risk was assessed as low.',
        knownAt:'2026-09-01T12:00:00Z',effectiveAt:'2026-08-30T00:00:00Z',
        sourceRef:'case:old',
      },
      statement:'Subsequent sources challenge the earlier assessment.',
      knowledgeKnownAt:'2026-10-08T12:00:00Z',
      effectiveAt:'2026-09-30T00:00:00Z',
    },
  });
  assert.equal(out.then.knownAt,'2026-09-01T12:00:00.000Z');
  assert.equal(out.then.eventAt,'2026-08-30T00:00:00.000Z');
  assert.equal(out.then.statement,'Initial risk was assessed as low.');
  assert.equal(out.now.knownAt,'2026-10-08T12:00:00.000Z');
  assert.equal(out.now.eventAt,'2026-09-30T00:00:00.000Z');
  assert.equal(out.comparison,'CHANGED');
});

test('only one epoch cannot establish then versus now', () => {
  const out=projectKnowledgeTimeContrast({...base,fieldHistory:{
    epochCount:1,firstObservedAt:'2026-10-08T09:00:00Z',lastObservedAt:'2026-10-08T09:00:00Z',
    persistedHistory:true,recentEpochs:[{eventId:'one',occurredAt:'2026-10-08T09:00:00Z',state:'OBSERVED',previousState:null,censoring:'NONE'}],
  }});
  assert.equal(out.then.provenance,'NOT_OBSERVED');
  assert.equal(out.now.knownAt,'2026-10-08T09:00:00.000Z');
  assert.equal(out.comparison,'INSUFFICIENT_TEMPORAL_EVIDENCE');
});

test('bounded timeline discloses missing older epoch records', () => {
  const out=projectKnowledgeTimeContrast({...base,fieldHistory:{
    epochCount:24,firstObservedAt:'2026-01-01T00:00:00Z',lastObservedAt:'2026-10-08T00:00:00Z',
    persistedHistory:true,recentEpochs:[
      {eventId:'recent-a',occurredAt:'2026-10-07T00:00:00Z',state:'UNKNOWN',previousState:null,censoring:'NONE'},
      {eventId:'recent-b',occurredAt:'2026-10-08T00:00:00Z',state:'OBSERVED',previousState:'UNKNOWN',censoring:'NONE'},
    ],
  }});
  assert.equal(out.historySampleBounded,true);
  assert.equal(out.totalPersistedEpochs,24);
});

test('updatedAt never substitutes for the date knowledge became available', () => {
  const out=projectKnowledgeTimeContrast({...base,attributes:{effectiveAt:'2024-02-20T00:00:00Z'}});
  assert.equal(out.now.knownAt,null);
  assert.equal(out.now.eventAt,'2024-02-20T00:00:00.000Z');
  assert.equal(out.now.recordUpdatedAt,'2026-10-09T12:00:00.000Z');
});

test('operational epoch state does not masquerade as an epistemic transition',()=>{
  const out=projectKnowledgeTimeContrast({
    ...base,
    fieldHistory:{
      epochCount:2,firstObservedAt:'2026-10-07T00:00:00Z',lastObservedAt:'2026-10-08T00:00:00Z',
      persistedHistory:true,recentEpochs:[
        {eventId:'operational:1',occurredAt:'2026-10-07T00:00:00Z',state:'ACTIVE',previousState:'OPEN',censoring:'NONE'},
        {eventId:'epistemic:2',occurredAt:'2026-10-08T00:00:00Z',state:'OBSERVED',previousState:'ACTIVE',censoring:'NONE'},
      ],
    },
  });
  assert.equal(out.then.stateMeaning,'RECORDED_OBJECT_STATE');
  assert.equal(out.comparison,'INSUFFICIENT_TEMPORAL_EVIDENCE');
});
