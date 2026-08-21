import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildInstitutionalEntityGraph } from '../entityGraph';
import { buildEntityContext, collectEntityTimeline, resolveEntityTrajectory } from '../entityContext';
import { buildFrictionField } from '../frictionFieldEngine';
import { buildAttractorScorecard } from '../attractorManagement';
import { buildInstitutionalTomography } from '../tomography';

test('canonical convergence services produce a shared institutional graph and context', async () => {
  const graph = await buildInstitutionalEntityGraph({ entityId: 'case-001', entityType: 'PHENOMENON', label: 'Tensión de coordinación' });
  assert.ok(Array.isArray(graph.nodes));
  assert.ok(Array.isArray(graph.edges));

  const context = await buildEntityContext(graph, 'case-001');
  assert.ok(Array.isArray(context.entitySummary));
  assert.ok(Array.isArray(context.graphSnapshot.nodes));

  const timeline = collectEntityTimeline(context);
  assert.ok(Array.isArray(timeline));

  const trajectory = resolveEntityTrajectory(context);
  assert.ok(Array.isArray(trajectory));
});

test('friction, attractor and tomography layers expose evidence-bound institutional diagnostics', async () => {
  const field = await buildFrictionField();
  assert.ok(field.topFriction === null || Number.isFinite(field.topFriction));
  assert.ok(field.nodes.every((node) => Number.isFinite(node.value)));

  const scorecard = await buildAttractorScorecard();
  assert.equal(scorecard.knowledgeVelocity, null);
  assert.equal(scorecard.authorityScore, null);
  assert.equal(scorecard.memoryGrowth, null);
  assert.equal(scorecard.predictionAccuracy, null);
  assert.equal(scorecard.attractorDistance, null);
  assert.ok(scorecard.evidenceCoverage === null || Number.isFinite(scorecard.evidenceCoverage));

  const tomography = await buildInstitutionalTomography();
  assert.equal(typeof tomography.system, 'string');
  assert.ok(Array.isArray(tomography.sections));
});
