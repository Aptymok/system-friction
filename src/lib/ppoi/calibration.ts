import 'server-only';

export type PpoiEvidenceInput = {
  domain: string;
  source: string;
  generatesArtifact: boolean;
  artifactNote: string | null;
  contentText: string | null;
  observedAt: string;
};

export type PpoiIndices = {
  PT: number;
  PM: number;
  IE: number;
  RC: number;
  CG: number;
  ES: number;
  LT: number;
  IO: number;
};

export type PpoiCalibrationResult = {
  indices: PpoiIndices;
  composite: number;
  evidenceCount: number;
  spanDays: number;
  notes: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEIGHTS = { PT: 0.2, IE: 0.2, RC: 0.2, PM: 0.15, CG: 0.1, ES: 0.1, IO: 0.05 } as const;
const IO_KEYWORDS = ['theory', 'repository', 'protocol', 'experiment', 'community', 'language', 'model', 'algorithm'];
const STOPWORDS = new Set(['de', 'la', 'el', 'que', 'and', 'the', 'para', 'with', 'from', 'this', 'that', 'una', 'uno']);

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function daysBetween(a: number, b: number) {
  return Math.abs(a - b) / DAY_MS;
}

function normalizeToken(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tokenize(text: string | null): Set<string> {
  if (!text) return new Set();
  return new Set(
    normalizeToken(text)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3 && !STOPWORDS.has(token)),
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return null;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? null : intersection / union;
}

function calculatePT(sorted: PpoiEvidenceInput[], notes: string[]): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) {
    notes.push('PT=1: only one evidence item is registered.');
    return 1;
  }

  const first = new Date(sorted[0].observedAt).getTime();
  const last = new Date(sorted[sorted.length - 1].observedAt).getTime();
  const spanDays = daysBetween(first, last);
  const recencyDays = daysBetween(Date.now(), last);

  if (recencyDays > 365) {
    notes.push(`PT=1: no new evidence for ${Math.round(recencyDays)} days.`);
    return 1;
  }
  if (spanDays < 30) {
    notes.push(`PT=2: evidence is concentrated in ${Math.round(spanDays)} days.`);
    return 2;
  }
  if (spanDays < 180) {
    notes.push(`PT=3: evidence spans ${Math.round(spanDays)} days.`);
    return 3;
  }
  if (spanDays < 730) {
    notes.push(`PT=4: evidence spans ${Math.round(spanDays)} days.`);
    return 4;
  }
  notes.push(`PT=5: evidence spans ${(spanDays / 365).toFixed(1)} years.`);
  return 5;
}

function calculatePM(evidence: PpoiEvidenceInput[], notes: string[]): number {
  const domains = new Set(evidence.map((item) => normalizeToken(item.domain.trim())).filter(Boolean));
  const value = clamp(domains.size, 0, 5);
  notes.push(`PM=${value}: ${domains.size} distinct domain(s).`);
  return value;
}

function calculateIE(evidence: PpoiEvidenceInput[], notes: string[]): number {
  const sources = new Set(evidence.map((item) => normalizeToken(item.source.trim())).filter(Boolean));
  const value = clamp(sources.size, 0, 5);
  notes.push(`IE=${value}: ${sources.size} distinct source(s).`);
  return value;
}

function calculateRC(sorted: PpoiEvidenceInput[], notes: string[]): number {
  if (sorted.length < 2) return 0;
  const seenDomains = new Set<string>();
  let returns = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const domain = normalizeToken(sorted[index].domain.trim());
    if (index > 0) {
      const gapDays = daysBetween(
        new Date(sorted[index].observedAt).getTime(),
        new Date(sorted[index - 1].observedAt).getTime(),
      );
      if (gapDays > 60 && seenDomains.has(domain)) returns += 1;
    }
    seenDomains.add(domain);
  }

  const value = clamp(returns, 0, 5);
  notes.push(`RC=${value}: ${returns} return event(s) detected.`);
  return value;
}

function calculateCG(evidence: PpoiEvidenceInput[], notes: string[]): number {
  const count = evidence.filter((item) => item.generatesArtifact).length;
  const value = clamp(count, 0, 5);
  notes.push(`CG=${value}: ${count} artifact-generating evidence item(s).`);
  return value;
}

function calculateES(sorted: PpoiEvidenceInput[], notes: string[]): number {
  const withText = sorted
    .map((item) => tokenize(item.contentText ?? item.artifactNote))
    .filter((tokens) => tokens.size > 0);

  if (withText.length < 2) {
    notes.push('ES=2.5: not enough text evidence for lexical stability.');
    return 2.5;
  }

  const similarities: number[] = [];
  for (let index = 1; index < withText.length; index += 1) {
    const score = jaccard(withText[index - 1], withText[index]);
    if (score !== null) similarities.push(score);
  }

  if (similarities.length === 0) {
    notes.push('ES=2.5: lexical overlap could not be calculated.');
    return 2.5;
  }

  const average = similarities.reduce((sum, value) => sum + value, 0) / similarities.length;
  const value = clamp(Math.round(average * 50) / 10, 0, 5);
  notes.push(`ES=${value}: average lexical overlap ${(average * 100).toFixed(0)}%.`);
  return value;
}

function calculateLT(sorted: PpoiEvidenceInput[], notes: string[]): number {
  if (sorted.length < 2) return 0;
  const gaps: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    gaps.push(daysBetween(new Date(sorted[index].observedAt).getTime(), new Date(sorted[index - 1].observedAt).getTime()));
  }
  const averageGap = gaps.reduce((sum, value) => sum + value, 0) / gaps.length;
  const value = averageGap < 7 ? 0 : averageGap < 30 ? 1 : averageGap < 90 ? 2 : averageGap < 180 ? 3 : averageGap < 365 ? 4 : 5;
  notes.push(`LT=${value}: average evidence gap ${Math.round(averageGap)} days. LT is contextual and not part of the composite.`);
  return value;
}

function calculateIO(evidence: PpoiEvidenceInput[], notes: string[]): number {
  const matched = new Set<string>();
  for (const item of evidence) {
    if (!item.generatesArtifact) continue;
    const tokens = tokenize(item.artifactNote ?? item.contentText);
    for (const keyword of IO_KEYWORDS) if (tokens.has(keyword)) matched.add(keyword);
  }
  const value = clamp(matched.size, 0, 5);
  notes.push(`IO=${value}: structural keywords matched: ${[...matched].join(', ') || 'none'}.`);
  return value;
}

export function calculatePpoiIndices(evidence: PpoiEvidenceInput[]): PpoiCalibrationResult {
  const notes: string[] = [];
  const sorted = [...evidence].sort((left, right) => new Date(left.observedAt).getTime() - new Date(right.observedAt).getTime());

  const indices: PpoiIndices = {
    PT: calculatePT(sorted, notes),
    PM: calculatePM(sorted, notes),
    IE: calculateIE(sorted, notes),
    RC: calculateRC(sorted, notes),
    CG: calculateCG(sorted, notes),
    ES: calculateES(sorted, notes),
    LT: calculateLT(sorted, notes),
    IO: calculateIO(sorted, notes),
  };

  const composite = Number((
    indices.PT * WEIGHTS.PT +
    indices.IE * WEIGHTS.IE +
    indices.RC * WEIGHTS.RC +
    indices.PM * WEIGHTS.PM +
    indices.CG * WEIGHTS.CG +
    indices.ES * WEIGHTS.ES +
    indices.IO * WEIGHTS.IO
  ).toFixed(3));

  const spanDays = sorted.length >= 2
    ? daysBetween(new Date(sorted[0].observedAt).getTime(), new Date(sorted[sorted.length - 1].observedAt).getTime())
    : 0;

  return { indices, composite, evidenceCount: sorted.length, spanDays: Math.round(spanDays), notes };
}
