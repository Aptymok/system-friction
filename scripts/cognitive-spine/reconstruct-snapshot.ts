import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { CognitiveStateProjectionInput } from '../../src/core/cognitive-spine/contracts/snapshot';
import {
  materializeCognitiveSnapshot,
  projectCognitiveState,
  semanticSnapshotHash,
} from '../../src/core/cognitive-spine/projector/cognitiveStateProjector';

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

async function main() {
  const inputPath = argumentValue('--input');
  if (!inputPath) {
    throw new Error('Usage: npm run sfi:ct:reconstruct -- --input <projection-input.json> [--snapshot-id <id>]');
  }

  const absolutePath = resolve(process.cwd(), inputPath);
  const raw = await readFile(absolutePath, 'utf8');
  const input = JSON.parse(raw) as CognitiveStateProjectionInput;
  const semanticPayload = projectCognitiveState(input);
  const snapshotHash = semanticSnapshotHash(semanticPayload);
  const snapshotId = argumentValue('--snapshot-id') ?? `CT-${snapshotHash.slice(0, 12)}`;
  const now = new Date().toISOString();
  const snapshot = materializeCognitiveSnapshot(input, {
    snapshotId,
    createdAt: now,
    runtimeMetadata: { runner: 'local-cli' },
  });

  process.stdout.write(`${JSON.stringify({
    status: 'PASS',
    input: absolutePath,
    snapshotId: snapshot.snapshotId,
    snapshotHash: snapshot.snapshotHash,
    sourceCutoff: snapshot.semanticPayload.sourceCutoff,
    projectorVersion: snapshot.semanticPayload.projectorVersion,
    policyVersion: snapshot.semanticPayload.policyVersion,
    projectionProfile: snapshot.semanticPayload.projectionProfile,
    sourceCount: snapshot.semanticPayload.derivedState.sourceCount,
    semanticPayload: snapshot.semanticPayload,
  }, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`SFI_COGNITIVE_SPINE_RECONSTRUCTION_FAILED:${message}\n`);
  process.exitCode = 1;
});
