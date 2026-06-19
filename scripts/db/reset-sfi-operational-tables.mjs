import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, deleteAllRowsByKnownColumns, nowStamp } from './sfi-db-client.mjs';
import { DELETE_ORDER } from './sfi-db-tables.mjs';

const confirm = process.env.SFI_DB_RESET_CONFIRM;
if (confirm !== 'RESET_SFI_OPERATIONAL') {
  console.error(JSON.stringify({
    ok: false,
    blocked: true,
    reason: 'Refusing destructive reset. Set SFI_DB_RESET_CONFIRM=RESET_SFI_OPERATIONAL only after export/inventory.',
    command: '$env:SFI_DB_RESET_CONFIRM="RESET_SFI_OPERATIONAL"; npm run db:reset:sfi'
  }, null, 2));
  process.exit(1);
}

let latest = '';
try { latest = (await readFile(path.join('data', 'supabase-export', 'LATEST_EXPORT.txt'), 'utf8')).trim(); } catch {}
if (!latest) {
  console.error(JSON.stringify({ ok: false, blocked: true, reason: 'No local export found. Run npm run db:export first.' }, null, 2));
  process.exit(1);
}

const supabase = createAdminClient();
const stamp = nowStamp();
await mkdir(path.join('docs', 'db'), { recursive: true });

const result = { ok: true, reset_at: new Date().toISOString(), latest_export: latest, tables: [] };

for (const table of DELETE_ORDER) {
  const deleted = await deleteAllRowsByKnownColumns(supabase, table);
  if (!deleted.ok) result.ok = false;
  result.tables.push({ table, ...deleted });
}

await writeFile(path.join('docs', 'db', `SFI_RESET_REPORT_${stamp}.json`), JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;