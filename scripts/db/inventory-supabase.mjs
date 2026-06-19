import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, countTable, nowStamp } from './sfi-db-client.mjs';
import { SFI_OPERATIONAL_TABLES, SFI_RESET_TABLES } from './sfi-db-tables.mjs';

const supabase = createAdminClient();
const stamp = nowStamp();
await mkdir(path.join('docs', 'db'), { recursive: true });

const rows = [];
for (const table of SFI_OPERATIONAL_TABLES) rows.push(await countTable(supabase, table));

const inventory = {
  ok: true,
  created_at: new Date().toISOString(),
  reset_scope: SFI_RESET_TABLES,
  tables: rows,
  missing: rows.filter((item) => !item.exists).map((item) => item.table),
  present: rows.filter((item) => item.exists).map((item) => ({ table: item.table, count: item.count })),
  note: 'auth.users is not touched. profiles is inventoried but not reset by default.'
};

const md = [
  '# SFI Supabase Inventory',
  '',
  `Created: ${inventory.created_at}`,
  '',
  '## Present tables',
  ...inventory.present.map((item) => `- ${item.table}: ${item.count}`),
  '',
  '## Missing tables',
  ...(inventory.missing.length ? inventory.missing.map((item) => `- ${item}`) : ['- none']),
  '',
  '## Reset scope',
  ...SFI_RESET_TABLES.map((item) => `- ${item}`),
  '',
  'auth.users is never reset by these scripts.'
].join('\n');

await writeFile(path.join('docs', 'db', `SFI_SUPABASE_INVENTORY_${stamp}.json`), JSON.stringify(inventory, null, 2), 'utf8');
await writeFile(path.join('docs', 'db', 'SFI_SUPABASE_INVENTORY.md'), md, 'utf8');
console.log(JSON.stringify(inventory, null, 2));