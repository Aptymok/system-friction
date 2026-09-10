import type { SfiLibraryCanonicalAdmission, SfiLibraryManifest } from './types';

export const SFI_LIBRARY_BASE_PATH = '/library';

const SFI_DT_001_CANONICAL_ADMISSION: SfiLibraryCanonicalAdmission = Object.freeze({
  contract: 'SFI-LIBRARY-CANONICAL-ADMISSION-1.0',
  objectType: 'PUBLICATION',
  slug: 'sfi-dt-001-longitudinal-observation-framework',
  state: 'REVIEW_REQUIRED',
  publicationState: 'DRAFT',
  staticAvailabilityState: 'PUBLICLY_ACCESSIBLE_NOT_CANONICALLY_PUBLISHED',
  version: '1.0',
  language: 'es',
  authors: Object.freeze([]),
  rightsState: 'UNKNOWN',
  license: null,
  evidenceIdentityState: 'UNKNOWN',
  declaredPublicationLabel: 'PROPOSED · ACTIVE / Official Technical Proposal',
  firstObservedAt: '2026-06-29T15:45:09Z',
  firstObservedRef: 'https://github.com/Aptymok/system-friction/commit/9c782ad85e3c185372d6a91ecb59374d4bf80386',
  lastObservedAt: '2026-08-01T11:50:08Z',
  lastObservedRef: 'https://github.com/Aptymok/system-friction/commit/ee3a6d23b026b7ac894e77f496a2a5c8e9491fde',
  sourceRefs: Object.freeze([
    'https://github.com/Aptymok/system-friction/blob/8669bc326f4124bc269445aa9104e9c2a839ff7f/public/library/SFI-DT-001_Longitudinal_Observation_Framework.html',
    'https://github.com/Aptymok/system-friction/blob/8669bc326f4124bc269445aa9104e9c2a839ff7f/public/library/README.md',
    'https://github.com/Aptymok/system-friction/blob/8669bc326f4124bc269445aa9104e9c2a839ff7f/public/library/manifest.json',
    'https://github.com/Aptymok/system-friction/blob/8669bc326f4124bc269445aa9104e9c2a839ff7f/public/library/pdf/SFI-DT-001_Longitudinal_Observation_Framework.pdf',
    'https://github.com/Aptymok/system-friction/commit/9c782ad85e3c185372d6a91ecb59374d4bf80386',
    'https://github.com/Aptymok/system-friction/commit/ee3a6d23b026b7ac894e77f496a2a5c8e9491fde',
  ]),
  limitations: Object.freeze([
    'Library status published_static means only that the static file is publicly reachable; it is not canonical publication approval.',
    'The source calls itself an official publication while simultaneously declaring PROPOSED · ACTIVE and Official Technical Proposal; canonical admission remains REVIEW_REQUIRED.',
    'The HTML declares lang="es" while substantial body content is English; language metadata requires editorial review before publication approval.',
    'No human work author, work-specific license, DOI, ORCID or ROR identifier is admitted by this metadata.',
    'firstObservedAt is the first repository commit observed to add the document; it is not an inferred authoring timestamp.',
  ]),
});

export const SFI_LIBRARY_MANIFEST: SfiLibraryManifest = {
  packageName: 'SFI Foundational Editorial Package',
  version: '1.0',
  createdAt: '2026-06-28T21:59:20.715630+00:00',
  basePath: SFI_LIBRARY_BASE_PATH,
  documents: [
    Object.freeze({
      id: 'SFI-DT-001',
      title: 'Longitudinal Observation Framework',
      function: 'Public technical constitution for observation, minimal perturbation, evidence states, Atlas architecture and prediction-before-intervention rules.',
      audience: ['public', 'technical', 'operator', 'root'],
      status: 'published_static',
      kind: 'html',
      publicPath: '/library/SFI-DT-001_Longitudinal_Observation_Framework.html',
      staticFilePath: 'public/library/SFI-DT-001_Longitudinal_Observation_Framework.html',
      canonicalAdmission: SFI_DT_001_CANONICAL_ADMISSION,
    }),
    {
      id: 'SFI-WB-001',
      title: 'Operator Workbook',
      function: 'Operator instrument for literal phrases, silences, contradictions, bodily shifts, hypothesis sheets, perturbation sheets and return windows.',
      audience: ['operator', 'root'],
      status: 'published_static',
      kind: 'html',
      publicPath: '/library/SFI-WB-001_Operator_Workbook.html',
      staticFilePath: 'public/library/SFI-WB-001_Operator_Workbook.html',
    },
    {
      id: 'SFI-WB-002',
      title: 'Participant Workbook',
      function: 'Participant-facing 72-hour workbook for repeated signals, marks and reflections without technical interpretation by default.',
      audience: ['participant', 'public'],
      status: 'published_static',
      kind: 'html',
      publicPath: '/library/SFI-WB-002_Participant_Workbook.html',
      staticFilePath: 'public/library/SFI-WB-002_Participant_Workbook.html',
    },
    {
      id: 'SFI-ATLAS-SCHEMA',
      title: 'Atlas Schema',
      function: 'Reference schema for prediction entries and evidence states used by future longitudinal memory.',
      audience: ['technical', 'operator', 'root'],
      status: 'reference_static',
      kind: 'json',
      publicPath: '/library/sfi-atlas-schema.json',
      staticFilePath: 'public/library/sfi-atlas-schema.json',
    },
    {
      id: 'SFI-PREDICTION-REGISTRY',
      title: 'Prediction Registry Reference',
      function: 'Reference implementation for timestamped prediction registration before perturbation.',
      audience: ['technical', 'operator', 'root'],
      status: 'reference_static',
      kind: 'python',
      publicPath: '/library/sfi_prediction_registry.py',
      staticFilePath: 'public/library/sfi_prediction_registry.py',
    },
    {
      id: 'SFI-LIBRARY-README',
      title: 'Package README',
      function: 'Package inventory and handling notes for the static editorial library.',
      audience: ['public', 'technical'],
      status: 'reference_static',
      kind: 'markdown',
      publicPath: '/library/README.md',
      staticFilePath: 'public/library/README.md',
    },
    {
      id: 'SFI-PHENOTYPE-REGISTRY',
      title: 'Phenotype Registry',
      function: 'Static hypothesis-support registry for friction phenotypes. It is not identity, blame, pathology or diagnosis tooling.',
      audience: ['technical', 'operator', 'root'],
      status: 'phase_01_registry',
      kind: 'registry',
      publicPath: '/library/phenotypes',
      staticFilePath: null,
    },
  ],
  operationalBoundary: {
    library: 'Library formalizes the method.',
    field: 'Field captures signal.',
    worldVector: 'World Vector contextualizes observation.',
    predictionRegistry: 'Prediction Registry preserves timestamped hypotheses and outcomes.',
    atlas: 'Atlas accumulates longitudinal memory after evidence matures.',
    agents: 'Agents verify, compare and propose without approving, publishing, mutating protocols or acting as ROOT.',
    root: 'ROOT decides what becomes action, archive, Atlas entry, publication or protocol refinement.',
  },
};

export function getSfiLibraryManifest() {
  return SFI_LIBRARY_MANIFEST;
}

export function getSfiLibraryDocuments() {
  return SFI_LIBRARY_MANIFEST.documents;
}
