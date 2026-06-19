import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, nowStamp, countTable, readAllRows } from './sfi-db-client.mjs';
import { SFI_OPERATIONAL_TABLES } from './sfi-db-tables.mjs';

const supabase = createAdminClient();
const stamp = nowStamp();
const outDir = path.join('data', 'supabase-export', stamp);
await mkdir(outDir, { recursive: true });

const manifest = { ok: true, exported_at: new Date().toISOString(), outDir, tables: [] };

for (const table of SFI_OPERATIONAL_TABLES) {
  const inventory = await countTable(supabase, table);
  if (!inventory.exists) {
    manifest.tables.push({ table, exists: false, count: null, exported: false, error: inventory.error });
    continue;
  }
  const result = await readAllRows(supabase, table);
  if (!result.ok) {
    manifest.ok = false;
    manifest.tables.push({ table, exists: true, count: inventory.count, exported: false, error: result.error });
    continue;
  }
  await writeFile(path.join(outDir, `${table}.json`), JSON.stringify(result.rows, null, 2), 'utf8');
  manifest.tables.push({ table, exists: true, count: result.rows.length, exported: true, file: `${table}.json` });
}

await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
await writeFile(path.join('data', 'supabase-export', 'LATEST_EXPORT.txt'), outDir, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
if (!manifest.ok) process.exitCode = 1;