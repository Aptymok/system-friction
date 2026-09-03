import assert from 'node:assert/strict';
import test from 'node:test';
import { assessUniversalClosure } from './universalClosure';

function historyWithReturn(outcome: Record<string, unknown>) {
  return {
    cycleId: 'ce563b2a-3715-49ce-8806-1cc051f6ad71',
    events: [],
    cognitiveRuns: [],
    structuredResults: [],
    returnContrasts: [],
    closures: [],
    returns: [
      {
        event_id: 'return-event-1',
        event_name: 'SFI_UNIVERSAL_RETURN_RECORDED',
        payload: { outcome },
      },
    ],
  };
}

test('closure preserves disposition fields from latest persisted RETURN when close request omits closure body', () => {
  const assessment = assessUniversalClosure({
    history: historyWithReturn({
      conclusion: 'La evidencia ya permite un cierre descriptivo delimitado.',
      limitations: ['No existe todavía observación longitudinal posterior a la intervención.'],
      missingEvidence: ['Validación longitudinal 30/60/90 días.'],
    }),
  });

  assert.equal(assessment.envelope.conclusion, 'La evidencia ya permite un cierre descriptivo delimitado.');
  assert.deepEqual(assessment.envelope.limitations, ['No existe todavía observación longitudinal posterior a la intervención.']);
  assert.deepEqual(assessment.envelope.missingEvidence, ['Validación longitudinal 30/60/90 días.']);
  assert.equal(assessment.missing.includes('LIMITATIONS_OR_MISSING_EVIDENCE'), false);
  assert.equal(assessment.missing.includes('CONCLUSION_OR_PRIMARY_HYPOTHESIS'), false);
  assert.equal(assessment.ready, true);
});

test('explicit close request has precedence over persisted RETURN disposition', () => {
  const assessment = assessUniversalClosure({
    history: historyWithReturn({
      conclusion: 'RETURN conclusion',
      limitations: ['RETURN limitation'],
      missingEvidence: ['RETURN missing evidence'],
    }),
    requested: {
      conclusion: 'Explicit conclusion',
      limitations: ['Explicit limitation'],
      missingEvidence: ['Explicit missing evidence'],
    },
  });

  assert.equal(assessment.envelope.conclusion, 'Explicit conclusion');
  assert.deepEqual(assessment.envelope.limitations, ['Explicit limitation']);
  assert.deepEqual(assessment.envelope.missingEvidence, ['Explicit missing evidence']);
});

test('closure still reports missing disposition when neither request nor RETURN contains it', () => {
  const assessment = assessUniversalClosure({
    history: historyWithReturn({}),
  });

  assert.equal(assessment.envelope.conclusion, null);
  assert.deepEqual(assessment.envelope.limitations, []);
  assert.deepEqual(assessment.envelope.missingEvidence, []);
  assert.equal(assessment.missing.includes('LIMITATIONS_OR_MISSING_EVIDENCE'), true);
  assert.equal(assessment.ready, false);
});
