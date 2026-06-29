export type SfiLibraryDocumentKind = 'html' | 'json' | 'python' | 'markdown' | 'registry';

export type SfiLibraryAudience =
  | 'public'
  | 'technical'
  | 'operator'
  | 'participant'
  | 'root';

export type SfiLibraryDocumentStatus =
  | 'published_static'
  | 'reference_static'
  | 'phase_01_registry';

export interface SfiLibraryDocument {
  id: string;
  title: string;
  function: string;
  audience: SfiLibraryAudience[];
  status: SfiLibraryDocumentStatus;
  kind: SfiLibraryDocumentKind;
  publicPath: string;
  staticFilePath: string | null;
}

export interface SfiLibraryManifest {
  packageName: string;
  version: string;
  createdAt: string;
  basePath: string;
  documents: SfiLibraryDocument[];
  operationalBoundary: {
    library: string;
    field: string;
    worldVector: string;
    predictionRegistry: string;
    atlas: string;
    agents: string;
    root: string;
  };
}

export interface SfiLibraryIndexAgentResult {
  agent: 'libraryIndexAgent';
  mode: 'passive_deterministic';
  ok: boolean;
  documents: SfiLibraryDocument[];
  publicPaths: string[];
  blocked: string[];
}

export interface SfiDocumentIntegrityItem {
  id: string;
  expected: boolean;
  present: boolean;
  linked: boolean;
  publicPath: string | null;
  staticFilePath: string | null;
  blockers: string[];
}

export interface SfiDocumentIntegrityAgentResult {
  agent: 'documentIntegrityAgent';
  mode: 'passive_deterministic';
  ok: boolean;
  checked: number;
  items: SfiDocumentIntegrityItem[];
  missingEntries: string[];
  blocked: string[];
}
