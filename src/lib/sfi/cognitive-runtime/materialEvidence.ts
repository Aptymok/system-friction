import type { KernelContext, KernelEvidence } from './kernelContext';

type Row = Record<string, unknown>;

const MATERIAL_CLASSES = new Set(['OBSERVED', 'DERIVED', 'CANONICAL', 'IMPORTED', 'EXTRACTED']);
const MAX_SCAN_NODES = 2_500;
const MAX_MATERIAL_EVIDENCE = 250;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function confidence(value: unknown, fallback = 0.8) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed)) : fallback;
}

function normalizeClass(value: unknown) {
  const candidate = text(value)?.replace(/[\s-]+/g, '_').toUpperCase() ?? null;
  if (!candidate) return null;
  if (candidate === 'OBSERVATION') return 'OBSERVED';
  if (candidate === 'DERIVATION') return 'DERIVED';
  return candidate;
}

function epistemicClass(value: Row) {
  const payload = row(value.payload);
  return normalizeClass(
    value.epistemicClass
      ?? value.epistemic_class
      ?? payload.epistemicClass
      ?? payload.epistemic_class,
  );
}

function evidenceIdentity(value: Row, parentId: string, ordinal: number) {
  return text(value.event_id)
    ?? text(value.eventId)
    ?? text(value.evidence_id)
    ?? text(value.evidenceId)
    ?? text(value.id)
    ?? `${parentId}:material:${ordinal}`;
}

function evidencePayload(value: Row, klass: string, parent: KernelEvidence) {
  const nestedPayload = row(value.payload);
  const body = Object.keys(nestedPayload).length ? nestedPayload : value;
  return {
    ...body,
    epistemicClass: klass,
    originalEpistemicClass: epistemicClass(value),
    materialEvidenceResolution: {
      resolvedFromEvidenceId: parent.id,
      resolvedFromSource: parent.source,
      eventName: text(value.event_name) ?? text(value.eventName),
      logbookId: text(value.logbook_id) ?? text(value.logbookId),
      boundary: 'REUSED_EXISTING_MATERIAL_EVIDENCE_WITHOUT_READMISSION_OR_DUPLICATION',
    },
  };
}

function pushMaterial(
  output: KernelEvidence[],
  seen: Set<string>,
  parent: KernelEvidence,
  value: Row,
  ordinal: number,
) {
  const klass = epistemicClass(value);
  if (!klass || !MATERIAL_CLASSES.has(klass)) return;
  const id = evidenceIdentity(value, parent.id, ordinal);
  if (seen.has(id)) return;
  seen.add(id);
  output.push({
    id,
    source: text(value.event_name) ?? text(value.eventName) ?? text(value.source) ?? parent.source,
    confidence: confidence(value.confidence, parent.confidence),
    payload: evidencePayload(value, klass, parent),
  });
}

function scanNestedMaterial(parent: KernelEvidence, output: KernelEvidence[], seen: Set<string>) {
  const queue: unknown[] = [parent.payload];
  const visited = new Set<object>();
  let scanned = 0;
  let ordinal = 0;

  while (queue.length && scanned < MAX_SCAN_NODES && output.length < MAX_MATERIAL_EVIDENCE) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;
    if (visited.has(current as object)) continue;
    visited.add(current as object);
    scanned += 1;

    if (Array.isArray(current)) {
      for (const item of current.slice(0, 500)) queue.push(item);
      continue;
    }

    const candidate = current as Row;
    pushMaterial(output, seen, parent, candidate, ordinal++);

    for (const [key, nested] of Object.entries(candidate)) {
      if (key === 'materialEvidenceResolution') continue;
      if (nested && typeof nested === 'object') queue.push(nested);
    }
  }
}

export function isMaterialEpistemicClass(value: unknown) {
  const normalized = normalizeClass(value);
  return normalized ? MATERIAL_CLASSES.has(normalized) : false;
}

export function materialEvidenceView(context: KernelContext) {
  const output: KernelEvidence[] = [];
  const seen = new Set<string>();
  const direct = context.evidence ?? [];

  for (const item of direct) {
    const payload = row(item.payload);
    const klass = normalizeClass(payload.epistemicClass ?? payload.epistemic_class);
    if (klass && MATERIAL_CLASSES.has(klass)) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        output.push({
          ...item,
          payload: {
            ...payload,
            epistemicClass: klass,
          },
        });
      }
      continue;
    }
    scanNestedMaterial(item, output, seen);
  }

  return output.slice(0, MAX_MATERIAL_EVIDENCE);
}

export function materialEvidenceCoverage(context: KernelContext) {
  const material = materialEvidenceView(context);
  return {
    directContextEvidence: context.evidence.length,
    resolvedMaterialEvidence: material.length,
    reusedEvidenceRefs: material.map((item) => item.id).slice(0, 50),
    rule: 'Existing persisted OBSERVED/DERIVED/CANONICAL/IMPORTED/EXTRACTED material is resolved from selected targets and evidence references before an agent concludes that evidence is missing.',
  };
}
