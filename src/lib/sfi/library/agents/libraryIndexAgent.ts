import { getSfiLibraryDocuments } from '../manifest';
import type { SfiLibraryIndexAgentResult } from '../types';

export function runLibraryIndexAgent(): SfiLibraryIndexAgentResult {
  const documents = getSfiLibraryDocuments();
  const blocked = documents.length === 0 ? ['library_manifest_empty'] : [];

  return {
    agent: 'libraryIndexAgent',
    mode: 'passive_deterministic',
    ok: blocked.length === 0,
    documents,
    publicPaths: documents.map((document) => document.publicPath),
    blocked,
  };
}
