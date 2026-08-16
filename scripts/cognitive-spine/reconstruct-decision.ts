import { reconstructCognitiveSpineDecisionPath } from '../../src/lib/institution/cognitiveSpineProvenanceReconstruction';

const runId = process.argv[2]?.trim();
if (!runId) {
  console.error('Usage: node --import tsx scripts/cognitive-spine/reconstruct-decision.ts <institutional-run-id>');
  process.exit(2);
}

try {
  const reconstruction = await reconstructCognitiveSpineDecisionPath(runId);
  console.log(JSON.stringify(reconstruction, null, 2));
  if (reconstruction.assessment.status === 'FAIL') process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
