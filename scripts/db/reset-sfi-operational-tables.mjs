import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, deleteAllRowsByKnownColumns, nowStamp } from './sfi-db-client.mjs';
import { DELETE_ORDER } from './sfi-db-tables.mjs';

const confirm = process.env.SFI_DB_RESET_CONFIRM;
const legacyOverride = process.env.SFI_ALLOW_LEGACY_WHOLE_TABLE_RESET;
if (confirm !== 'RESET_SFI_OPERATIONAL' || legacyOverride !== 'YES_I_HAVE_REVIEWED_THE_PURGE_PLAN') {
  console.error(JSON.stringify({
    ok: false,
    blocked: true,
    reason: 'Legacy whole-table reset is dangerous and disabled by default. Use db:cleanup:plan first; prefer a row-level purge plan. This command may remove provenance and historical measurements.',
    required: [
      'SFI_DB_RESET_CONFIRM=RESET_SFI_OPERATIONAL',
      'SFI_ALLOW_LEGACY_WHOLE_TABLE_RESET=YES_I_HAVE_REVIEWED_THE_PURGE_PLAN',
    ],
  }, null, 2));
  process.exit(1);
}

let latest = '';
try { latest = (await readFile(path.join('data', 'supabase-export', 'LATEST_EXPORT.txt'), 'utf8')).trim(); } catch {}
if (!latest) {
  console.error(JSON.stringify({ ok: false, blocked: true, reason: 'No local export found. Run npm run db:export first.' }, null, 2));
  process.exit(1);
}

let cleanupPlans = [];
try { cleanupPlans = (await readdir(path.join('docs', 'db'))).filter((name) => name.startsWith('SFI_CLEANUP_PLAN_') && name.endsWith('.json')); } catch {}
if (!cleanupPlans.length) {
  console.error(JSON.stringify({ ok: false, blocked: true, reason: 'No cleanup classification report found. Run npm run db:cleanup:plan first.' }, null, 2));
  process.exit(1);
}

const supabase = createAdminClient();
const stamp = nowStamp();
await mkdir(path.join('docs', 'db'), { recursive: true });

const result = { ok: true, reset_at: new Date().toISOString(), latest_export: latest, cleanup_plan: cleanupPlans.sort().at(-1), tables: [] };
for (const table of DELETE_ORDER) {
  const deleted = await deleteAllRowsByKnownColumns(supabase, table);
  if (!deleted.ok) result.ok = false;
  result.tables.push({ table, ...deleted });
}

await writeFile(path.join('docs', 'db', `SFI_RESET_REPORT_${stamp}.json`), JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
