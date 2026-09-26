import docs from '../../../../data/sfi/sf_docs_frontmatter.json';

export const DOCUMENTARY_CATALOG_CONTRACT = Object.freeze({
  surfaceState: 'PUBLIC_SURFACE_RETIRED_TO_PUBLICATIONS',
  source: 'data/sfi/sf_docs_frontmatter.json',
  surfaceLabel: 'LIBRARY · DOCUMENTARY CORPUS',
  catalogLabel: 'CANONICAL DOCUMENTARY CATALOG',
  compactBodyBoundary: 'The canonical compact corpus preserves metadata and declared documentary relations; full bodies are not assumed to be materialized.',
  fullBodyReaderBoundary: 'FULL DOCUMENT BODY READER = NOT MATERIALIZED',
  storageCreatesEvidence: false,
  publicRoute: '/publications',
} as const);

export const DOCUMENTARY_CATALOG_CORPUS = docs;
