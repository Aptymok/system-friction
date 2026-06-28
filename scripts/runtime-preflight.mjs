import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/app/api/root/state/route.ts',
  'src/app/api/sfi/operational-state/route.ts',
  'src/app/api/amv/state/route.ts',
  'src/app/api/worldspect/state/route.ts',
  'src/app/api/worldspect/vector/route.ts',
  'src/app/api/sfi-engine/evaluate/route.ts',
  'src/app/api/amv/chat/route.ts',
  'src/app/api/scorefriction/evidence/ingest/route.ts',
  'src/app/api/moph/session/route.ts',
  'src/app/api/phenomena/route.ts',
  'src/app/api/system/health/route.ts',
  'src/lib/worldspect/source-registry.ts',
  'src/lib/worldspect/vector-aggregator.ts',
  'src/lib/worldspect/bootstrap.ts',
  'src/lib/sfi-engine/client.ts',
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(JSON.stringify({ ok: false, status: 'DEGRADED_BLOCKING', missing }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, status: 'ACTIVE', checked: required.length }, null, 2));

