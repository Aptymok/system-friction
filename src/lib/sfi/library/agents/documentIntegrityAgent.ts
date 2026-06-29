import { getSfiLibraryDocuments } from '../manifest';
import type { SfiDocumentIntegrityAgentResult, SfiDocumentIntegrityItem } from '../types';

function documentBlockers(document: ReturnType<typeof getSfiLibraryDocuments>[number]) {
  const blockers = [
    document.id.trim().length === 0 ? 'missing_id' : null,
    document.title.trim().length === 0 ? 'missing_title' : null,
    document.function.trim().length === 0 ? 'missing_function' : null,
    document.audience.length === 0 ? 'missing_audience' : null,
    document.publicPath.trim().length === 0 ? 'missing_public_path' : null,
    document.kind !== 'registry' && !document.staticFilePath ? 'missing_static_file_path' : null,
  ];

  return blockers.filter((blocker): blocker is string => Boolean(blocker));
}

export function runDocumentIntegrityAgent(): SfiDocumentIntegrityAgentResult {
  const documents = getSfiLibraryDocuments();
  const items: SfiDocumentIntegrityItem[] = documents.map((document) => {
    const blockers = documentBlockers(document);

    return {
      id: document.id,
      expected: true,
      present: blockers.length === 0,
      linked: Boolean(document.publicPath),
      publicPath: document.publicPath || null,
      staticFilePath: document.staticFilePath,
      blockers,
    };
  });
  const missingEntries = items.filter((item) => !item.present || !item.linked).map((item) => item.id);
  const blocked = items.flatMap((item) => item.blockers.map((blocker) => `${item.id}:${blocker}`));

  return {
    agent: 'documentIntegrityAgent',
    mode: 'passive_deterministic',
    ok: blocked.length === 0,
    checked: items.length,
    items,
    missingEntries,
    blocked,
  };
}
