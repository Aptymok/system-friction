import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildInstitutionalEntityGraph } from '../entityGraph';
import { buildEntityContext, collectEntityTimeline, resolveEntityTrajectory } from '../entityContext';
import { buildFrictionField } from '../frictionFieldEngine';
import { buildAttractorScorecard } from '../attractorManagement';
import { buildInstitutionalTomography } from '../tomography';

test('canonical convergence services produce a shared institutional graph and context', async () => {
  const graph = await buildInstitutionalEntityGraph({
    entityId: 'case-001',
    entityType: 'PHENOMENON',
    label: 'Tensión de coordinación',
  });

  assert.ok(graph.nodes.length >= 0);
  assert.ok(graph.edges.length >= 0);

  const context = await buildEntityContext(graph, 'case-001');
  assert.ok(context.entitySummary.length > 0);
  assert.ok(context.graphSnapshot.nodes.length >= 0);

  const timeline = collectEntityTimeline(context);
  assert.ok(timeline.length >= 3);

  const trajectory = resolveEntityTrajectory(context);
  assert.ok(trajectory.length > 0);
});

test('friction, attractor and tomography layers expose institutional diagnostics', async () => {
  const field = await buildFrictionField({
    pressure: 0.72,
    coherence: 0.41,
    traceability: 0.58,
    adaptation: 0.39,
  });

  assert.ok(field.topFriction >= 0);
  assert.ok(field.nodes.length >= 3);

  const scorecard = await buildAttractorScorecard({
    knowledgeVelocity: 0.78,
    authorityScore: 0.66,
    memoryGrowth: 0.71,
    predictionAccuracy: 0.74,
    attractorDistance: 0.23,
  });

  assert.equal(scorecard.knowledgeVelocity, 0.78);
  assert.equal(scorecard.attractorDistance, 0.23);

  const tomography = await buildInstitutionalTomography({
    system: 'SFI',
    field: 'Coordinación',
    frictions: ['Escasez de evidencia', 'Desalineación de decisión'],
  });

  assert.equal(tomography.system, 'SFI');
  assert.ok(tomography.sections.length >= 4);
});
