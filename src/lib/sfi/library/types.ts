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

/**
 * Optional canonical-admission metadata belongs to the Library document that owns
 * the static asset. `published_static` means only that the Library file is publicly
 * reachable; it never means the object has been admitted as a canonical PUBLISHED
 * research/publication object.
 */
export interface SfiLibraryCanonicalAdmission {
  readonly contract: 'SFI-LIBRARY-CANONICAL-ADMISSION-1.0';
  readonly objectType: 'REPORT' | 'PAPER' | 'PUBLICATION';
  readonly slug: string;
  readonly state: 'REVIEW_REQUIRED';
  readonly publicationState: 'DRAFT';
  readonly staticAvailabilityState: 'PUBLICLY_ACCESSIBLE_NOT_CANONICALLY_PUBLISHED';
  readonly version: string;
  readonly language: string;
  readonly authors: readonly string[];
  readonly rightsState: 'OPEN' | 'RESTRICTED' | 'UNKNOWN';
  readonly license: string | null;
  readonly evidenceIdentityState: 'VALID' | 'INVALID' | 'UNKNOWN';
  readonly declaredPublicationLabel: string;
  readonly firstObservedAt: string;
  readonly firstObservedRef: string;
  readonly lastObservedAt: string;
  readonly lastObservedRef: string;
  readonly sourceRefs: readonly string[];
  readonly limitations: readonly string[];
}

export interface SfiLibraryDocument {
  id: string;
  title: string;
  function: string;
  audience: SfiLibraryAudience[];
  status: SfiLibraryDocumentStatus;
  kind: SfiLibraryDocumentKind;
  publicPath: string;
  staticFilePath: string | null;
  canonicalAdmission?: SfiLibraryCanonicalAdmission;
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
