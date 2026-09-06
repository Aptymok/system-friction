import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256Text, type SfiAudioCleanupReceipt } from './acousticPackageContract';

export type SfiEphemeralAudioWorkspace = {
  root: string;
  packageRoot: string;
  renderRoot: string;
  workspaceRefHash: `sha256:${string}`;
};

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function createEphemeralAudioWorkspace(baseDirectory = tmpdir()): Promise<SfiEphemeralAudioWorkspace> {
  const root = await mkdtemp(join(baseDirectory, 'sfi-audio-render-'));
  return {
    root,
    packageRoot: join(root, 'package'),
    renderRoot: join(root, 'render'),
    workspaceRefHash: sha256Text(root),
  };
}

export async function cleanupEphemeralAudioWorkspace(workspace: SfiEphemeralAudioWorkspace): Promise<SfiAudioCleanupReceipt> {
  const existedBeforeCleanup = await exists(workspace.root);
  let error: string | null = null;
  try {
    await rm(workspace.root, { recursive: true, force: true });
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }
  const existsAfterCleanup = await exists(workspace.root);
  return {
    state: error === null && !existsAfterCleanup ? 'CLEANED' : 'FAILED',
    workspaceRefHash: workspace.workspaceRefHash,
    existedBeforeCleanup,
    existsAfterCleanup,
    cleanedAt: new Date().toISOString(),
    error,
  };
}
