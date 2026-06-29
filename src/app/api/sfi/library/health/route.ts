import { NextResponse } from 'next/server';
import { getSfiLibraryManifest } from '@/lib/sfi/library/manifest';
import { runDocumentIntegrityAgent, runLibraryIndexAgent } from '@/lib/sfi/library/agents';

export const dynamic = 'force-static';

export async function GET() {
  const manifest = getSfiLibraryManifest();
  const index = runLibraryIndexAgent();
  const integrity = runDocumentIntegrityAgent();
  const blocked = [...index.blocked, ...integrity.blocked];

  return NextResponse.json({
    ok: blocked.length === 0,
    package_name: manifest.packageName,
    version: manifest.version,
    documents_count: manifest.documents.length,
    missing_entries: integrity.missingEntries,
    agents: {
      libraryIndexAgent: {
        ok: index.ok,
        mode: index.mode,
        documents: index.documents.length,
      },
      documentIntegrityAgent: {
        ok: integrity.ok,
        mode: integrity.mode,
        checked: integrity.checked,
        items: integrity.items,
      },
    },
    blocked,
  });
}
