import test from 'node:test';
import assert from 'node:assert/strict';
import { indexDataset } from './lib/dataset.mjs';
import { forgeProblems, publicProblem } from './lib/problem-forge.mjs';
import { statsEngine } from './lib/engines.mjs';
import { scoreAnswers } from './lib/scorer.mjs';
import { SFI_METHOD_BY_ID } from './lib/sfi-methods.mjs';
import { CONSTITUTIONS } from './lib/constitutions.mjs';

const indicators = [
  { code: 'X', label: 'X', domain: 'economy' },
  { code: 'Y', label: 'Y', domain: 'labor' },
  { code: 'Z', label: 'Z', domain: 'health' },
];
const records = [];
for (const iso3 of ['AAA', 'BBB']) for (const indicator of indicators) for (let year = 2008; year <= 2013; year += 1) records.push({ country: { iso3, name: iso3 }, indicator, year, value: year + indicator.code.charCodeAt(0) + (iso3 === 'BBB' ? 2 : 0), source: 'FIXTURE' });

test('forge is deterministic and hides outcomes', () => {
  const index = indexDataset(records);
  const a = forgeProblems({ records, index, year: 2010, count: 20, seed: 'x' });
  const b = forgeProblems({ records, index, year: 2010, count: 20, seed: 'x' });
  assert.deepEqual(a.map((x) => x.problemId), b.map((x) => x.problemId));
  const pub = publicProblem(a[0]);
  assert.equal('hiddenOutcome' in pub, false);
  assert.equal(JSON.stringify(pub).includes('2011'), true); // target year may be named, target value may not.
});

test('stats control can be scored', async () => {
  const index = indexDataset(records);
  const problems = forgeProblems({ records, index, year: 2010, count: 20, seed: 'y' });
  const engine = statsEngine();
  const answers = await engine.solve(problems.map((p) => publicProblem(p)));
  const { score } = scoreAnswers(problems, answers, { constitutionId: 'generic-control', engineId: engine.id, year: 2010 });
  assert.equal(score.problems, 20);
  assert.ok(score.accuracy >= 0 && score.accuracy <= 1);
  assert.equal(score.temporalIntegrity, 1);
});

test('book auxiliary statuses are preserved', () => {
  assert.equal(SFI_METHOD_BY_ID.MIHM_BASELINE.status, 'CANON');
  assert.equal(SFI_METHOD_BY_ID.WSV_CONTEXT.status, 'STABLE');
  assert.equal(SFI_METHOD_BY_ID.SFI_INFERENCE.status, 'IN_DEVELOPMENT');
  assert.equal(SFI_METHOD_BY_ID.MOPS_BASELINE.status, 'EXPERIMENTAL');
});

test('founder control and evolver are distinct', () => {
  assert.equal(CONSTITUTIONS['origin-core'].mutable, false);
  assert.equal(CONSTITUTIONS['sfi-evolver'].mutable, true);
  assert.equal(CONSTITUTIONS['generic-control'].sfiMode, 'NONE');
});
