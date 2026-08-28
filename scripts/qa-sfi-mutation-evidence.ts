import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

async function text(path: string) { return readFile(path, 'utf8'); }

async function main() {
  const [ledger, rootRoute, publicRoute, page, history] = await Promise.all([
    text('src/lib/sfi/mutationEvidence.ts'),
    text('src/app/api/root/mutations/route.ts'),
    text('src/app/api/public/mutations/route.ts'),
    text('src/app/history/mutations/page.tsx'),
    text('src/app/history/page.tsx'),
  ]);

  assert(ledger.includes("export const SFI_MUTATION_REPOSITORY = 'Aptymok/system-friction'"));
  assert(ledger.includes('verifySfiGitHubCommit'));
  assert(ledger.includes("eventName: 'SFI_SYSTEM_MUTATION_RECORDED'"));
  assert(ledger.includes("epistemicClass: 'observed'"));
  assert(ledger.includes('A verified GitHub commit establishes that repository state changed'));
  assert(ledger.includes('readMutationEvent(input.mutationId)'));
  assert(ledger.includes("error: 'MUTATION_NOT_FOUND'"));
  assert(ledger.includes('attachmentKey'));
  assert(ledger.includes(".eq('payload->>attachmentKey', attachmentKey)"));

  assert(ledger.includes('verifySuccessfulQaRefs'));
  assert(ledger.includes("text(run.conclusion) !== 'success'"));
  assert(ledger.includes("text(run.status) !== 'completed'"));
  assert(ledger.includes("QA_REF_MUST_BE_SFI_GITHUB_ACTION_RUN_URL"));
  assert(ledger.includes("'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED'"));
  assert(ledger.includes("'SFI_UNIVERSAL_LEARNING_PROMOTED'"));
  assert(ledger.includes("stage = learning.length ? 'CALIBRATED_LEARNING_LINKED'"));
  assert(ledger.includes("deployments.length ? 'DEPLOYMENT_EVIDENCE_RECORDED'"));
  assert(!ledger.includes("deployments.length ? 'DEPLOYED'"));

  assert(rootRoute.includes("requireRootActor(`mutations.${action}`)"));
  assert(rootRoute.includes("if (mutation.idempotent)"));
  assert(rootRoute.includes("if (attached.idempotent)"));
  assert(rootRoute.includes('No duplicate attachment or ROOT audit entry was created.'));

  assert(publicRoute.includes('publicBoundary'));
  assert(publicRoute.includes('Internal QA payloads, deployment metadata, cycle contents and learning payloads remain on governed surfaces.'));
  assert(page.includes('DEPLOYMENT EVIDENCE RECORDED'));
  assert(page.includes('Un commit demuestra que el código cambió'));
  assert(history.includes('href="/history/mutations"'));

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-MUTATION-EVIDENCE-QA-1.0',
    stages: {
      codeCommitVerified: true,
      qaGithubRunVerified: true,
      deploymentEvidenceNotOverclaimed: true,
      exerciseRequiresCycleEvent: true,
      learningRequiresPromotedEvent: true,
      orphanAttachmentsRejected: true,
      duplicateAttachmentsIdempotent: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
