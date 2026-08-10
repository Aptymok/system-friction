import { SFI_METHODS } from './sfi-methods.mjs';
import { sampleDeterministic, seededRandom, sha256 } from './utils.mjs';

function direction(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 'MISSING';
  const scale = Math.max(1, Math.abs(a));
  const delta = (b - a) / scale;
  if (Math.abs(delta) <= 0.01) return 'STABLE';
  return delta > 0 ? 'UP' : 'DOWN';
}

function history(index, country, indicator, year, depth = 4) {
  const out = [];
  for (let y = year - depth + 1; y <= year; y += 1) {
    const row = index.byKey.get(`${country}|${indicator}|${y}`);
    if (row) out.push({ year: y, value: row.value });
  }
  return out;
}

function makeCatalog(index, row, year, rnd) {
  const same = index.byCountryYear.get(`${row.country.iso3}|${year}`) || [];
  const candidates = same.filter((x) => x.indicator.code !== row.indicator.code);
  const picked = sampleDeterministic(candidates, 6, `${row.country.iso3}:${row.indicator.code}:${year}:${rnd()}`);
  return picked.map((x) => ({
    evidenceId: `E:${x.country.iso3}:${x.indicator.code}:${year}`,
    label: x.indicator.label,
    domain: x.indicator.domain,
    value: x.value,
    year,
    source: x.source,
  }));
}

export function forgeProblems({ records, index, year, count = 5000, seed = 'SFI_CL' }) {
  const rnd = seededRandom(`${seed}:${year}`);
  const currentRows = records.filter((r) => r.year === year && index.byKey.has(`${r.country.iso3}|${r.indicator.code}|${year + 1}`));
  if (!currentRows.length) return [];
  const base = [];
  const methodEvery = Math.max(2, Math.floor(1 / 0.08));
  for (let i = 0; i < count * 2 && base.length < count; i += 1) {
    const row = currentRows[Math.floor(rnd() * currentRows.length)];
    const next = index.byKey.get(`${row.country.iso3}|${row.indicator.code}|${year + 1}`);
    const hist = history(index, row.country.iso3, row.indicator.code, year, 4);
    if (!next || hist.length < 2) continue;
    const typeRoll = rnd();
    let type = 'FORECAST_DIRECTION';
    if (typeRoll > 0.72 && typeRoll <= 0.86) type = 'EVIDENCE_DISCIPLINE';
    else if (typeRoll > 0.86 && typeRoll <= 0.94) type = 'RIVAL_HYPOTHESIS';
    else if (typeRoll > 0.94) type = 'SFI_AUXILIARY';
    if (base.length % methodEvery === 0) type = 'SFI_AUXILIARY';
    const method = type === 'SFI_AUXILIARY' ? SFI_METHODS[Math.floor(rnd() * SFI_METHODS.length)] : null;
    const evidenceCatalog = makeCatalog(index, row, year, rnd);
    const problemId = `P:${year}:${String(base.length + 1).padStart(5, '0')}:${row.country.iso3}:${row.indicator.code}`;
    base.push({
      problemId, year, targetYear: year + 1, type,
      geography: { iso3: row.country.iso3, alias: `G-${sha256(row.country.iso3).slice(0, 6)}`, name: row.country.name },
      indicator: row.indicator,
      history: hist,
      currentValue: row.value,
      evidenceCatalog,
      requiredMethod: method ? { id: method.id, status: method.status, purpose: method.purpose, operations: method.operations } : null,
      hiddenOutcome: { value: next.value, direction: direction(row.value, next.value) },
      admissibleThrough: year,
      strictVintageEligible: false,
    });
  }
  return base;
}

export function publicProblem(problem, { shadow = false, revealCatalogValues = true } = {}) {
  return {
    problemId: problem.problemId,
    year: problem.year,
    targetYear: problem.targetYear,
    type: problem.type,
    geography: shadow ? { alias: problem.geography.alias } : { iso3: problem.geography.iso3, name: problem.geography.name },
    indicator: shadow ? { code: `I-${sha256(problem.indicator.code).slice(0, 8)}`, domain: problem.indicator.domain } : problem.indicator,
    history: problem.history,
    currentValue: problem.currentValue,
    evidenceCatalog: problem.evidenceCatalog.map((e) => revealCatalogValues ? e : ({ evidenceId: e.evidenceId, label: shadow ? `AUX-${sha256(e.label).slice(0, 6)}` : e.label, domain: e.domain, year: e.year, source: e.source })),
    requiredMethod: problem.requiredMethod,
    admissibleThrough: problem.admissibleThrough,
    temporalBoundary: `No evidence after ${problem.year} is admissible. You are evaluated against ${problem.targetYear} only after the answer is sealed.`,
  };
}

export function enrichWithEvidence(problem, requested = []) {
  const allowed = new Set(requested.slice(0, 4));
  return problem.evidenceCatalog.filter((e) => allowed.has(e.evidenceId));
}
