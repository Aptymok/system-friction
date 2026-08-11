import { WORLD_BANK_INDICATORS, START_YEAR, END_YEAR } from './config.mjs';
import { ensureDir, sleep, writeJson, readJson } from './utils.mjs';
import path from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';

const WB = 'https://api.worldbank.org/v2';

async function fetchJson(url, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'SFI-CL-Cognitive-Olympics/2026.08' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) { last = error; await sleep(500 * (i + 1)); }
  }
  throw last;
}

async function countryCatalog() {
  const payload = await fetchJson(`${WB}/country?format=json&per_page=400`);
  const rows = Array.isArray(payload?.[1]) ? payload[1] : [];
  return new Map(rows.filter((r) => r?.region?.value && r.region.value !== 'Aggregates').map((r) => [r.id, {
    iso3: r.id, iso2: r.iso2Code, name: r.name, region: r.region.value, income: r.incomeLevel?.value || null,
  }]));
}

export async function prepareWorldBankDataset({ outDir, startYear = START_YEAR - 3, endYear = END_YEAR } = {}) {
  if (!outDir) throw new Error('outDir required');
  await ensureDir(outDir);
  const countries = await countryCatalog();
  const records = [];
  const failures = [];
  for (const [code, label, domain] of WORLD_BANK_INDICATORS) {
    try {
      const payload = await fetchJson(`${WB}/country/all/indicator/${encodeURIComponent(code)}?format=json&date=${startYear}:${endYear}&per_page=20000`);
      const rows = Array.isArray(payload?.[1]) ? payload[1] : [];
      for (const row of rows) {
        const country = countries.get(row?.countryiso3code);
        const year = Number(row?.date);
        const value = row?.value == null ? null : Number(row.value);
        if (!country || !Number.isFinite(year) || !Number.isFinite(value)) continue;
        records.push({
          source: 'WORLD_BANK_API', sourceUrl: `${WB}/country/all/indicator/${code}`,
          country, indicator: { code, label, domain }, year, value,
          referenceTime: `${year}-12-31T00:00:00.000Z`, releaseTime: null,
          acquiredAt: new Date().toISOString(),
          temporalIntegrity: 'REFERENCE_ONLY',
          temporalNote: 'World Bank current historical series does not prove the exact revision vintage available at the simulated cutoff. Track A only.',
        });
      }
    } catch (error) { failures.push({ code, error: String(error?.message || error) }); }
  }
  const manifest = {
    datasetVersion: `wb-${new Date().toISOString()}`,
    startYear, endYear, indicatorsRequested: WORLD_BANK_INDICATORS.length,
    records: records.length, countries: new Set(records.map((r) => r.country.iso3)).size,
    failures, strictReplayEligible: false,
    boundary: 'Historical replay dataset. Do not describe as strict no-lookahead vintage data unless release/revision vintages are added.',
  };
  await writeJson(path.join(outDir, 'manifest.json'), manifest);
  await writeFile(path.join(outDir, 'world-bank.jsonl'), records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return manifest;
}

export async function loadDataset(outDir) {
  const text = await readFile(path.join(outDir, 'world-bank.jsonl'), 'utf8');
  const records = text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  let manifest = null;
  try { manifest = await readJson(path.join(outDir, 'manifest.json')); } catch {}
  return { records, manifest };
}

export function indexDataset(records) {
  const byKey = new Map();
  const byCountryYear = new Map();
  for (const r of records) {
    byKey.set(`${r.country.iso3}|${r.indicator.code}|${r.year}`, r);
    const cy = `${r.country.iso3}|${r.year}`;
    if (!byCountryYear.has(cy)) byCountryYear.set(cy, []);
    byCountryYear.get(cy).push(r);
  }
  return { byKey, byCountryYear };
}
