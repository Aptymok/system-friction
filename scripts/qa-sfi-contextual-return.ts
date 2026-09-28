import assert from 'node:assert/strict';
import { assessContextEquivalence, evaluateContextualReturn } from '../src/lib/field/contextualReturnContract';

const context=[{key:'channel',value:'email',state:'OBSERVED' as const,evidenceRefs:['e:1']}];
const base={
  objectRef:'case:1', expected:'response within window', context, invariants:[],
  window:{opensAt:'2026-09-01T00:00:00Z',closesAt:'2026-09-02T00:00:00Z',observationChannel:'email',occurrenceCondition:'reply received',absenceCondition:'no reply received',detectabilityCondition:'mailbox observed and operational'},
  observedOccurrence:false, observation:'No reply observed', observedAt:'2026-09-03T00:00:00Z', evidenceRefs:['e:mailbox-check'],
};
assert.equal(evaluateContextualReturn(base).classification,'ABSENCE_OBSERVED');
assert.equal(evaluateContextualReturn({...base,observedAt:'2026-09-01T12:00:00Z'}).classification,'UNRESOLVED_WINDOW_OPEN');
assert.equal(evaluateContextualReturn({...base,window:{...base.window,detectabilityCondition:''}}).classification,'UNRESOLVED_DETECTABILITY');
assert.equal(evaluateContextualReturn({...base,evidenceRefs:[]}).classification,'UNRESOLVED_EVIDENCE');
assert.equal(assessContextEquivalence(context,[...context]),'ESTABLISHED');
assert.equal(assessContextEquivalence(context,[{...context[0],value:'phone'}]),'NOT_ESTABLISHED');
assert.equal(assessContextEquivalence(context,[{...context[0],state:'UNKNOWN'}]),'UNKNOWN');
console.log('PASS · absence can be RETURN only under closed, observable, evidenced conditions; context equivalence remains explicit.');
