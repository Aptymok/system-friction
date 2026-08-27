import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();

const assets = [
  {
    id: 'method-lab-desktop-v2',
    parts: [
      'assets/spatial-encoded/method-lab.desktop.avif.b64.00',
      'assets/spatial-encoded/method-lab.desktop.avif.b64.01',
      'assets/spatial-encoded/method-lab.desktop.avif.b64.02',
      'assets/spatial-encoded/method-lab.desktop.avif.b64.03',
      'assets/spatial-encoded/method-lab.desktop.avif.b64.04',
    ],
    output: 'public/method-lab/lab-desktop-v2.avif',
    bytes: 30861,
    gitSha: 'e46dbbc2ba6fefbb283fd9c97b4a466343e1bcea',
  },
  {
    id: 'method-lab-ambient',
    parts: [
      'assets/spatial-encoded/method-lab.ambient.mp4.b64.00',
      'assets/spatial-encoded/method-lab.ambient.mp4.b64.01',
      'assets/spatial-encoded/method-lab.ambient.mp4.b64.02',
    ],
    output: 'public/method-lab/lab-ambient.mp4',
    bytes: 6854,
    gitSha: '7750040ef37dad7e55311e7ed1ebd2298d9fd1bf',
  },
  {
    id: 'cognitive-spine-desktop-v2',
    parts: [
      'assets/spatial-encoded/cognitive-spine.desktop.avif.b64.00',
      'assets/spatial-encoded/cognitive-spine.desktop.avif.b64.01',
      'assets/spatial-encoded/cognitive-spine.desktop.avif.b64.02',
      'assets/spatial-encoded/cognitive-spine.desktop.avif.b64.03',
    ],
    output: 'public/cognitive-spine/park-desktop-v2.avif',
    bytes: 23407,
    gitSha: 'aea5ead5c48ba5265f8851a1940cd9d758c57c45',
  },
  {
    id: 'cognitive-spine-ambient',
    parts: [
      'assets/spatial-encoded/cognitive-spine.ambient.mp4.b64.00',
      'assets/spatial-encoded/cognitive-spine.ambient.mp4.b64.01',
      'assets/spatial-encoded/cognitive-spine.ambient.mp4.b64.02',
    ],
    output: 'public/cognitive-spine/park-ambient.mp4',
    bytes: 7080,
    gitSha: 'a3ac27e31566585ec11ad70ded754b9ffdaf7e0e',
  },
];

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

for (const asset of assets) {
  const encoded = asset.parts.map((part) => readFileSync(join(root, part), 'utf8').trim()).join('');
  const buffer = Buffer.from(encoded, 'base64');
  const actualSha = gitBlobSha(buffer);
  if (buffer.length !== asset.bytes) {
    throw new Error(`spatial_asset_size_mismatch:${asset.id}:${buffer.length}:${asset.bytes}`);
  }
  if (actualSha !== asset.gitSha) {
    throw new Error(`spatial_asset_sha_mismatch:${asset.id}:${actualSha}:${asset.gitSha}`);
  }
  const output = join(root, asset.output);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, buffer);
  process.stdout.write(`${JSON.stringify({ spatialAsset: asset.id, output: asset.output, bytes: buffer.length, gitSha: actualSha })}\n`);
}
