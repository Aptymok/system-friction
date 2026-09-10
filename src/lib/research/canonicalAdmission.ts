import { SFI_PUBLIC_PROFILE } from '../public/institutionProfile';
import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  canonicalObjectKey,
  canonicalUrlFor,
  type SfiCanonicalObjectRecord,
  type SfiCanonicalObjectType,
} from '../discovery/canonicalObjectRegistry';

export const SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT = 'SFI-RESEARCH-CANONICAL-ADMISSION-1.0' as const;

export type SfiResearchAdmissionObjectType = Extract<SfiCanonicalObjectType, 'REPORT' | 'PAPER' | 'PUBLICATION'>;

export interface SfiObservedResearchAsset {
  sourceId: string;
  objectType: SfiResearchAdmissionObjectType;
  slug: string;
  title: string;
  summary: string;
  bodyRef: string | null;
  version: string;
  language: string;
  authors: string[];
  sourceRefs: string[];
  declaredPublicationLabel: string;
  createdAt: string;
  updatedAt: string;
  license: string | null;
  limitations: string[];
}

export interface SfiResearchCanonicalAdmissionCandidate {
  contract: typeof SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT;
  source: SfiObservedResearchAsset;
  candidate: SfiCanonicalObjectRecord;
  admission: {
    state: 'REVIEW_REQUIRED';
    automaticAdmission: false;
    automaticPublication: false;
    authority: 'SFI-00';
    rule: string;
  };
}

function firstSource(input: SfiObservedResearchAsset): string {
  if (input.sourceRefs.length === 0) throw new Error(`research_admission_source_required:${input.sourceId}`);
  return input.sourceRefs[0]!;
}

export function canonicalReviewCandidateForObservedResearchAsset(
  input: SfiObservedResearchAsset,
): SfiResearchCanonicalAdmissionCandidate {
  const sourceRef = firstSource(input);
  const missing: SfiCanonicalObjectRecord['missing'] = [
    {
      field: 'publication_approval',
      reason: `Observed source status is "${input.declaredPublicationLabel}"; no canonical PUBLISHED approval receipt is admitted by this candidate.`,
      sourceRef,
    },
  ];

  if (input.authors.length === 0) {
    missing.push({
      field: 'authors',
      reason: 'No human author identity is stated in the observed source material; institutional identity is not substituted for a person.',
      sourceRef,
    });
  }
  if (!input.license) {
    missing.push({
      field: 'license',
      reason: 'No work-specific license or rights grant is stated in the observed source material.',
      sourceRef,
    });
  }

  const candidate: SfiCanonicalObjectRecord = {
    contract: SFI_CANONICAL_OBJECT_CONTRACT,
    id: input.sourceId,
    objectKey: canonicalObjectKey(input.objectType, input.slug),
    objectType: input.objectType,
    slug: input.slug,
    canonicalUrl: canonicalUrlFor(input.objectType, input.slug),
    title: input.title,
    summary: input.summary,
    bodyRef: input.bodyRef,
    epistemicState: 'DECLARED',
    version: input.version,
    language: input.language,
    authors: [...input.authors],
    methods: [],
    relatedObjects: [],
    sourceRefs: [...input.sourceRefs],
    publicState: 'REVIEW_REQUIRED',
    license: input.license,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    entity: {
      entityId: SFI_PUBLIC_PROFILE.institution.entityId,
      relation: 'MAINTAINED_BY',
    },
    publication: {
      state: 'DRAFT',
      explicit: true,
    },
    eligibility: {
      privacyClass: 'PUBLIC',
      publicEligible: false,
      securityEligible: true,
    },
    rights: {
      state: input.license ? 'OPEN' : 'UNKNOWN',
    },
    evidenceIdentity: {
      state: 'UNKNOWN',
      refs: [],
    },
    limitations: [...input.limitations],
    missing,
  };

  return {
    contract: SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT,
    source: {
      ...input,
      authors: [...input.authors],
      sourceRefs: [...input.sourceRefs],
      limitations: [...input.limitations],
    },
    candidate,
    admission: {
      state: 'REVIEW_REQUIRED',
      automaticAdmission: false,
      automaticPublication: false,
      authority: 'SFI-00',
      rule: 'Observed public availability is not canonical publication approval. Admission requires explicit review of authorship, rights, evidence identity and publication state.',
    },
  };
}

const SFI_DT_001_SOURCE_REF = 'https://github.com/Aptymok/system-friction/blob/8669bc326f4124bc269445aa9104e9c2a839ff7f/public/library/SFI-DT-001_Longitudinal_Observation_Framework.html';

export const SFI_DT_001_OBSERVED_RESEARCH_ASSET: SfiObservedResearchAsset = Object.freeze({
  sourceId: 'SFI-DT-001',
  objectType: 'PUBLICATION',
  slug: 'sfi-dt-001-longitudinal-observation-framework',
  title: 'Longitudinal Observation Framework · Volume I · MOP-H ΩB',
  summary: 'Official technical proposal for friction phenotyping, minimal perturbation, longitudinal prediction and atlas construction.',
  bodyRef: '/library/SFI-DT-001_Longitudinal_Observation_Framework.html',
  version: '1.0',
  language: 'es',
  authors: [],
  sourceRefs: [
    SFI_DT_001_SOURCE_REF,
    'https://github.com/Aptymok/system-friction/blob/8669bc326f4124bc269445aa9104e9c2a839ff7f/public/library/README.md',
    'https://github.com/Aptymok/system-friction/blob/8669bc326f4124bc269445aa9104e9c2a839ff7f/public/library/manifest.json',
    'https://github.com/Aptymok/system-friction/blob/8669bc326f4124bc269445aa9104e9c2a839ff7f/public/library/pdf/SFI-DT-001_Longitudinal_Observation_Framework.pdf',
    'https://github.com/Aptymok/system-friction/commit/ee3a6d23b026b7ac894e77f496a2a5c8e9491fde',
  ],
  declaredPublicationLabel: 'PROPOSED · ACTIVE / Official Technical Proposal',
  createdAt: '2026-06-28T21:59:20.715630+00:00',
  updatedAt: '2026-08-01T11:50:08Z',
  license: null,
  limitations: [
    'The source calls itself an official publication while simultaneously declaring PROPOSED · ACTIVE and Official Technical Proposal; this candidate therefore does not normalize the work to PUBLISHED.',
    'The HTML declares lang="es" while substantial body content is English; language metadata requires editorial review before publication approval.',
    'No DOI, ORCID or ROR identifier is admitted by this candidate.',
  ],
});

export const SFI_DT_001_CANONICAL_ADMISSION_CANDIDATE = Object.freeze(
  canonicalReviewCandidateForObservedResearchAsset(SFI_DT_001_OBSERVED_RESEARCH_ASSET),
);

export const SFI_RESEARCH_CANONICAL_ADMISSION_CANDIDATES: readonly SfiResearchCanonicalAdmissionCandidate[] = Object.freeze([
  SFI_DT_001_CANONICAL_ADMISSION_CANDIDATE,
]);
