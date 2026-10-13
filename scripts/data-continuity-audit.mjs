#!/usr/bin/env node
// Read-only dual-plane audit. No row payloads, credentials or personal data leave this process.
import postgres from 'postgres';
import { writeFileSync, mkdirSync } from 'node:fs';
const primaryUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;
const standbyUrl = process.env.SFI_CONTINUITY_DATABASE_URL;
if (!primaryUrl || !standbyUrl) { console.error('Missing primary or continuity database URL'); process.exit(2); }
const primary = postgres(primaryUrl, { max: 1, connect_timeout: 8, prepare: false });
const standby = postgres(standbyUrl, { max: 1, connect_timeout: 8, prepare: false });
const tables = ['sfi_cases','sfi_cognitive_twin_runs','sfi_world_source_observations','sfi_continuity_runs','sfi_governance_proposals','sfi_discovery_runs','sfi_worldspect_snapshots'];
async function inventory(sql) {
  const rows = await sql`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`;
  return new Set(rows.map(r => r.table_name));
}
async function count(sql, table) {
  // table names are from the fixed allowlist above, never from user input.
  const rows = await sql`select count(*)::bigint as n from ${sql(table)}`;
  return Number(rows[0].n);
}
const report = { contract: 'SFI-DUAL-PLANE-AUDIT-1.0', observedAt: new Date().toISOString(), mode: 'READ_ONLY', primary: 'SUPABASE', contingency: 'NEON', tables: [], equalCounts: false, errors: [], limitations: ['Count equality does not prove row equivalence','No automatic failover or replay is performed'] };
try {
  const [a,b] = await Promise.all([inventory(primary), inventory(standby)]);
  for (const table of tables) {
    const entry = { table, primary: a.has(table) ? await count(primary,table) : null, contingency: b.has(table) ? await count(standby,table) : null };
    entry.equalCount = entry.primary !== null && entry.contingency !== null && entry.primary === entry.contingency;
    report.tables.push(entry);
  }
  report.equalCounts = report.tables.every(t => t.equalCount);
  report.status = report.equalCounts ? 'COUNTS_EQUAL_NOT_CERTIFIED' : 'DIVERGENCE_OR_MISSING_TABLE';
} catch (e) { report.status = 'AUDIT_FAILED'; report.errors.push(String(e?.message ?? e).slice(0,300)); process.exitCode = 1; }
finally {
  mkdirSync('artifacts',{recursive:true});
  writeFileSync('artifacts/sfi-dual-plane-audit.json', JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,observedAt:report.observedAt,tables:report.tables.length}));
  await Promise.allSettled([primary.end(),standby.end()]);
}
