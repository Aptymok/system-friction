import { createHash } from 'node:crypto';

export function sha256Buffer(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function buildAudioIdempotencyKey(objectId: string, checksumSha256: string, engineVersion: string) {
  return `studio-audio:${objectId}:${checksumSha256}:${engineVersion}`;
}
