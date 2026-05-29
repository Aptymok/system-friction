import { documentaryEvidence } from '@/observatory/publicSurface/content';
import { asRecord, asStringArray, clamp01, stringValue, type FieldDocumentCatalogItem } from './fieldMatrixBuilder';

function visibility(value: unknown): FieldDocumentCatalogItem['visibility'] {
  if (value === 'licensed' || value === 'acp' || value === 'private') return value;
  return 'public';
}

export function buildDocumentCatalog(input?: {
  logbookKnowledge?: unknown[];
  epistemicEvents?: unknown[];
}): FieldDocumentCatalogItem[] {
  const staticDocuments = documentaryEvidence.map((item): FieldDocumentCatalogItem => ({
    documentId: item.evidenceId,
    title: item.title,
    source: item.source,
    status: item.status,
    visibility: visibility(item.visibility),
    linkedNodes: item.nodes,
    linkedPatterns: [],
    attractors: item.attractors,
    evidenceWeight: clamp01(item.evidenceWeight, 0.5),
    confidence: clamp01(item.confidence, 0.5),
    interpretationLimit: item.interpretationLimit,
  }));

  const knowledgeDocuments = (input?.logbookKnowledge || []).map((row, index): FieldDocumentCatalogItem => {
    const record = asRecord(row);
    const payload = asRecord(record.payload);
    return {
      documentId: stringValue(record.knowledge_key, record.id, `knowledge-${index}`) ?? `knowledge-${index}`,
      title: stringValue(record.knowledge_key, payload.title, payload.label, 'Knowledge artifact') ?? 'Knowledge artifact',
      source: 'logbook_knowledge',
      status: record.verified === true ? 'verified' : 'reviewed',
      visibility: visibility(payload.visibility),
      linkedNodes: asStringArray(payload.linkedNodes || payload.nodes),
      linkedPatterns: [stringValue(record.pattern_type)].filter((item): item is string => Boolean(item)),
      attractors: asStringArray(payload.attractors),
      evidenceWeight: clamp01(payload.evidenceWeight, 0.5),
      confidence: clamp01(record.confidence, 0.5),
      interpretationLimit: stringValue(payload.interpretationLimit, 'Pattern evidence; not standalone validation.') ?? 'Pattern evidence; not standalone validation.',
    };
  });

  const byId = new Map<string, FieldDocumentCatalogItem>();
  for (const document of [...staticDocuments, ...knowledgeDocuments]) {
    byId.set(document.documentId, document);
  }
  return [...byId.values()].sort((a, b) => b.evidenceWeight - a.evidenceWeight || a.title.localeCompare(b.title));
}
