import { SFI_PUBLIC_PROFILE } from '../public/institutionProfile';
import { getSfiLibraryDocuments, type SfiLibraryDocument } from '../sfi/library';
import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  canonicalObjectKey,
  canonicalUrlFor,
  type SfiCanonicalObjectRecord,
} from '../discovery/canonicalObjectRegistry';

export const SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT = 'SFI-RESEARCH-CANONICAL-ADMISSION-1.1' as const;

export interface SfiResearchCanonicalAdmissionCandidate {
  readonly contract: typeof SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT;
  readonly owner: {
    readonly owner: 'SFI_LIBRARY_MANIFEST';
    readonly documentId: string;
    readonly publicPath: string;
    readonly staticStatus: string;
    readonly canonicalAdmissionContract: 'SFI-LIBRARY-CANONICAL-ADMISSION-1.0';
  };
  readonly candidate: SfiCanonicalObjectRecord;
  readonly admission: {
    readonly state: 'REVIEW_REQUIRED';
    readonly automaticAdmission: false;
    readonly automaticPublication: false;
    readonly authority: 'SFI-00';
    readonly rule: string;
  };
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return Object.freeze(value);
}

function sourceFor(document: SfiLibraryDocument): string {
  const first = document.canonicalAdmission?.sourceRefs[0];
  if (!first) throw new Error(`research_admission_source_required:${document.id}`);
  return first;
}

export function canonicalReviewCandidateForLibraryDocument(
  document: SfiLibraryDocument,
): SfiResearchCanonicalAdmissionCandidate {
  const admissionMetadata = document.canonicalAdmission;
  if (!admissionMetadata) throw new Error(`library_document_not_admission_candidate:${document.id}`);

  const sourceRef = sourceFor(document);
  const missing: SfiCanonicalObjectRecord['missing'] = [
    {
      field: 'publication_approval',
      reason: `Library canonical-admission state is ${admissionMetadata.state}/${admissionMetadata.publicationState}; no canonical PUBLISHED approval receipt exists.`,
      sourceRef,
    },
  ];

  if (admissionMetadata.authors.length === 0) {
    missing.push({
      field: 'authors',
      reason: 'No human work author identity is stated in the observed source material; institution or repository author identity is not substituted.',
      sourceRef,
    });
  }
  if (!admissionMetadata.license) {
    missing.push({
      field: 'license',
      reason: 'No work-specific license or rights grant is stated in the observed source material.',
      sourceRef,
    });
  }

  const candidate: SfiCanonicalObjectRecord = {
    contract: SFI_CANONICAL_OBJECT_CONTRACT,
    id: document.id,
    objectKey: canonicalObjectKey(admissionMetadata.objectType, admissionMetadata.slug),
    objectType: admissionMetadata.objectType,
    slug: admissionMetadata.slug,
    canonicalUrl: canonicalUrlFor(admissionMetadata.objectType, admissionMetadata.slug),
    title: document.title,
    summary: document.function,
    bodyRef: document.publicPath,
    epistemicState: 'DECLARED',
    version: admissionMetadata.version,
    language: admissionMetadata.language,
    authors: [...admissionMetadata.authors],
    methods: [],
    relatedObjects: [],
    sourceRefs: [...admissionMetadata.sourceRefs],
    publicState: admissionMetadata.state,
    license: admissionMetadata.license,
    createdAt: admissionMetadata.firstObservedAt,
    updatedAt: admissionMetadata.lastObservedAt,
    entity: {
      entityId: SFI_PUBLIC_PROFILE.institution.entityId,
      relation: 'MAINTAINED_BY',
    },
    publication: {
      state: admissionMetadata.publicationState,
      explicit: true,
    },
    eligibility: {
      privacyClass: 'PUBLIC',
      publicEligible: false,
      securityEligible: true,
    },
    rights: {
      state: admissionMetadata.rightsState,
    },
    evidenceIdentity: {
      state: admissionMetadata.evidenceIdentityState,
      refs: [],
    },
    limitations: [...admissionMetadata.limitations],
    missing,
  };

  return deepFreeze({
    contract: SFI_RESEARCH_CANONICAL_ADMISSION_CONTRACT,
    owner: {
      owner: 'SFI_LIBRARY_MANIFEST',
      documentId: document.id,
      publicPath: document.publicPath,
      staticStatus: document.status,
      canonicalAdmissionContract: admissionMetadata.contract,
    },
    candidate,
    admission: {
      state: 'REVIEW_REQUIRED',
      automaticAdmission: false,
      automaticPublication: false,
      authority: 'SFI-00',
      rule: 'Static public availability is not canonical publication approval. Admission is derived from the Library owner and remains review-gated until authorship, rights, evidence identity and publication approval are observed.',
    },
  });
}

export function researchCanonicalAdmissionCandidates(): readonly SfiResearchCanonicalAdmissionCandidate[] {
  const candidates = getSfiLibraryDocuments()
    .filter((document) => Boolean(document.canonicalAdmission))
    .map((document) => canonicalReviewCandidateForLibraryDocument(document));
  return deepFreeze(candidates);
}

export function sfiDt001CanonicalAdmissionCandidate(): SfiResearchCanonicalAdmissionCandidate {
  const document = getSfiLibraryDocuments().find((entry) => entry.id === 'SFI-DT-001');
  if (!document) throw new Error('sfi_dt_001_library_owner_missing');
  return canonicalReviewCandidateForLibraryDocument(document);
}
