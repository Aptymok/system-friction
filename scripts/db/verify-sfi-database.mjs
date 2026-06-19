import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, countTable, nowStamp } from './sfi-db-client.mjs';

const supabase = createAdminClient();
const stamp = nowStamp();
await mkdir(path.join('docs', 'db'), { recursive: true });

const required = ['logbook_visible', 'epistemic_events'];
const recommended = ['worldspect_snapshots', 'scorefriction_evidence', 'scorefriction_observations', 'graph_nodes', 'graph_edges', 'amv_learning'];
const tables = [];
for (const table of [...required, ...recommended]) tables.push(await countTable(supabase, table));

const failures = [];
for (const item of tables.filter((item) => required.includes(item.table))) {
  if (!item.exists) failures.push(`${item.table}_missing`);
  else if ((item.count ?? 0) < 1) failures.push(`${item.table}_empty`);
}

const report = {
  ok: failures.length === 0,
  verified_at: new Date().toISOString(),
  failures,
  tables,
  note: 'This verifies DB rehydration presence. App-level QA still must run after npm run dev.'
};

await writeFile(path.join('docs', 'db', `SFI_DB_VERIFY_${stamp}.json`), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;