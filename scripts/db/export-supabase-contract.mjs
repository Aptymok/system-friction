import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function parseEnv(raw) {
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = process.env[key] || value;
  }
}

try {
  parseEnv(await readFile('.env.local', 'utf8'));
} catch {
  // CI can provide env directly.
}

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.CONNECTION_STRING;
if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL, DIRECT_URL or CONNECTION_STRING');
}

const { default: postgres } = await import('postgres').catch((error) => {
  throw new Error(`Missing postgres package. Run: npm install --no-save --package-lock=false postgres. ${error.message}`);
});

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: 'require',
  idle_timeout: 5,
  connect_timeout: 20,
});

const columnsQuery = sql`
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position
`;

const foreignKeysQuery = sql`
select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name
`;

const viewsQuery = sql`
select schemaname, viewname, definition
from pg_views
where schemaname = 'public'
order by viewname
`;

const [columns, foreignKeys, views] = await Promise.all([columnsQuery, foreignKeysQuery, viewsQuery]);
await sql.end();

const outDir = path.join('docs', 'ops');
await mkdir(outDir, { recursive: true });

function table(rows, headers) {
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];
  for (const row of rows) {
    lines.push(`| ${headers.map((header) => String(row[header] ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|')).join(' | ')} |`);
  }
  return lines.join('\n');
}

const byTable = new Map();
for (const column of columns) {
  const list = byTable.get(column.table_name) ?? [];
  list.push(column);
  byTable.set(column.table_name, list);
}

const lines = [
  '# Supabase Operational Contract - 2026-06-19',
  '',
  `Generated at: ${new Date().toISOString()}`,
  '',
  'Source queries: information_schema.columns, information_schema.table_constraints/key_column_usage/constraint_column_usage, pg_views.',
  '',
  '## Tables and Columns',
  '',
];

for (const [name, rows] of byTable) {
  lines.push(`### ${name}`, '');
  lines.push(table(rows, ['ordinal_position', 'column_name', 'data_type', 'is_nullable', 'column_default']));
  lines.push('');
}

lines.push('## Foreign Keys', '');
lines.push(table(foreignKeys, ['table_name', 'column_name', 'foreign_table_name', 'foreign_column_name', 'constraint_name']));
lines.push('');
lines.push('## Views', '');
for (const view of views) {
  lines.push(`### ${view.viewname}`, '');
  lines.push('```sql');
  lines.push(view.definition);
  lines.push('```');
  lines.push('');
}

await writeFile(path.join(outDir, 'SUPABASE_OPERATIONAL_CONTRACT_2026-06-19.md'), `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  file: path.join(outDir, 'SUPABASE_OPERATIONAL_CONTRACT_2026-06-19.md'),
  tables: byTable.size,
  columns: columns.length,
  foreignKeys: foreignKeys.length,
  views: views.length,
}, null, 2));
