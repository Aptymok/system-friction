import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, nowStamp, safeJsonParse } from './sfi-db-client.mjs';

const supabase = createAdminClient();
const stamp = nowStamp();
await mkdir(path.join('docs', 'db'), { recursive: true });

async function readText(file) {
  try { return await readFile(file, 'utf8'); } catch { return ''; }
}

async function insertBestEffort(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().limit(1);
  if (error) return { table, ok: false, error: error.message, attempted: row };
  return { table, ok: true, inserted: data?.[0] ?? null };
}

function eventFromFile(file, raw, type) {
  return {
    scope: 'system',
    visibility: 'root',
    event_type: type,
    title: `Canonical SFI source: ${file}`,
    summary: raw.slice(0, 600) || 'Canonical source exists but was empty.',
    payload: { source_ref: file, length: raw.length, seeded_from: 'seed-sfi-canonical-history' },
    created_at: new Date().toISOString(),
  };
}

const canonicalFiles = [
  'data/amv-learning.jsonl',
  'data/logbook-visible.jsonl',
  'data/sfi-operational-events.json',
  'docs/QA_RUNTIME_REPORT.md',
  'docs/QA_SFI_CONVERGENCE_REPORT.md',
  'docs/QA_SFI_MINIMAL_PIPELINE_REPORT.md',
  'docs/qa/SFI_CLOSED_LOOP_QA.md',
  'docs/qa/SFI_OPERATIONAL_CLOSURE_QA.md',
  'docs/SFI_PIPELINE_MINIMAL_PATCH.md',
  'docs/OPERATIONAL_PATCH_P01.md',
  'docs/OPERATIONAL_PATCH_P02.md',
  'docs/OPERATIONAL_PATCH_P03.md',
  'docs/OPERATIONAL_PATCH_P04.md',
  'docs/OPERATIONAL_PATCH_P05.md',
  'docs/OPERATIONAL_PATCH_P06.md',
  'docs/OPERATIONAL_PATCH_P07.md'
];

const report = { ok: true, seeded_at: new Date().toISOString(), inserted: [], failed: [], missing_files: [] };

for (const file of canonicalFiles) {
  const raw = await readText(file);
  if (!raw) { report.missing_files.push(file); continue; }
  const row = eventFromFile(file, raw, 'canonical_history_source');
  for (const table of ['logbook_visible', 'epistemic_events']) {
    const inserted = await insertBestEffort(table, row);
    if (inserted.ok) report.inserted.push({ file, table });
    else report.failed.push({ file, table, error: inserted.error });
  }
}

const operationalRaw = await readText('data/sfi-operational-events.json');
const operational = safeJsonParse(operationalRaw, []);
const events = Array.isArray(operational) ? operational : Array.isArray(operational?.events) ? operational.events : [];
for (const event of events.slice(0, 500)) {
  const row = {
    scope: event.scope || 'system',
    visibility: event.visibility || 'root',
    event_type: event.event_type || event.type || 'operational_event',
    title: event.title || 'SFI operational event',
    summary: event.summary || event.text || 'Operational event imported from canonical local data.',
    payload: { ...event, source_ref: 'data/sfi-operational-events.json', seeded_from: 'seed-sfi-canonical-history' },
    created_at: event.created_at || event.observed_at || new Date().toISOString(),
  };
  const inserted = await insertBestEffort('logbook_visible', row);
  if (inserted.ok) report.inserted.push({ file: 'data/sfi-operational-events.json', table: 'logbook_visible', event: row.event_type });
  else report.failed.push({ file: 'data/sfi-operational-events.json', table: 'logbook_visible', error: inserted.error });
}

if (report.failed.length) report.ok = false;
await writeFile(path.join('docs', 'db', `SFI_SEED_REPORT_${stamp}.json`), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;