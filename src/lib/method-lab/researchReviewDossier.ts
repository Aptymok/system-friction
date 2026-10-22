/**
 * SFI Method Lab independent-review dossier, derived from the existing
 * canonical publication package and its deterministic P1/P2 QA. Not a
 * certificate, reviewer attestation, external validation or publication.
 * No private source rows, object summaries, evidence IDs or credentials.
 */
import type { MethodLabResearchObject } from './researchObjects';
import type { assessMethodLabResearchAssurance } from './researchAssurance';

export const SFI_RESEARCH_REVIEW_DOSSIER = 'SFI-RESEARCH-REVIEW-DOSSIER-1.0' as const;

type Assurance = ReturnType<typeof assessMethodLabResearchAssurance>;

function reviewTask(id: string, title: string, requiredEvidence: string) {
  return { id, title, requiredEvidence, status: 'NOT_REVIEWED' as const, reviewerAttestation: null };
}

/**
 * Exactly one restricted, read-only report bound to one version and package
 * digest. Passing all automated checks cannot turn into scientific approval:
 * a human/institutional reviewer must independently obtain evidence.
 */
export function buildMethodLabIndependentReviewDossier(
  object: MethodLabResearchObject,
  assessment: Assurance,
) {
  const eligiblePublicDerivative = object.publicationState === 'PUBLIC_DERIVATIVE_READY'
    && assessment.eligibleForGovernedReview
    && assessment.objectId === object.objectId
    && assessment.version === object.version;
  const tasks = [
    reviewTask('R01_SOURCE', 'Source identity and lawful access',
      'Independent read-only source inventory, custodian authority, provenance and permitted disclosure; no raw restricted data in public derivative.'),
    reviewTask('R02_METHOD', 'Method implementation and preregistration chronology',
      'Exact protocol version, variable definitions, temporal cutoff, controls, eligibility rule and record of post-hoc decisions.'),
    reviewTask('R03_LINEAGE', 'Finding-to-evidence lineage',
      'Independently trace each public finding to permitted source rows or aggregated evidence, with signed or verifiable source receipts.'),
    reviewTask('R04_REPRODUCTION', 'Independent reproduction',
      'Second operator reruns the declared computation using lawful access, documents environment and compares eligible denominators and outputs.'),
    reviewTask('R05_ADVERSARIAL', 'Rival explanations and negative cases',
      'Document at least one plausible rival, contrary example, missingness or measurement issue and its observed disposition.'),
    reviewTask('R06_SENSITIVITY', 'Sensitivity to exclusions and uncertainty',
      'Report denominator changes, invalid observations, assumptions, censoring, uncertainty and how material conclusions respond.'),
    reviewTask('R07_PRIVACY', 'Privacy and publication boundary',
      'Independent authorization of de-identification, retention, confidentiality, aggregation and publication of each derived output.'),
    reviewTask('R08_AUTHORITY', 'Separated institutional roles',
      'Distinct, identified producer, methodological reviewer and certifying authority; authenticated grants and dated conflict-of-interest declaration.'),
    reviewTask('R09_DATA_PLANE', 'Current integrity proof at decision time',
      'Fresh SFI_ROOT bilateral fingerprint, journal/outbox/conflict receipt and exact package digest as of the proposed decision.'),
    reviewTask('R10_CERTIFICATE', 'Scope-limited immutable certificate',
      'Approved certification charter, named issuer, verifiable signature, exact version/hash, expiry/revocation process and public status check.'),
    reviewTask('R11_RETURN', 'Independent external RETURN',
      'Observed external critique, reproduction, adoption or corrective outcome, without treating model-generated assertions as independent feedback.'),
  ];

  if (object.method === 'SFI_AUDIT') {
    tasks.splice(5,0,
      reviewTask('R06A_COHORT', 'Audit cohort and source record reconciliation',
        'Freeze eligible cohort identifiers without publishing private IDs; verify counts for source records, missingness, unresolved, resolved and temporally valid subcohorts.'),
      reviewTask('R06B_CLOCKS', 'Contract-specific temporal rules',
        'Reconstruct per-contract day-count conventions, calendar/business-day handling, timezone, ambiguous repair timestamps and right-censored outcomes.'),
      reviewTask('R06C_QUANTILES', 'Latency and batch pattern reproducibility',
        'Independently calculate median, P90 and dispersion with predeclared quantile convention and test clustering against a suitable baseline.'),
    );
  }
  const publicFindings = eligiblePublicDerivative
    ? object.publicFindings.map(f => ({
        id: f.id,
        title: f.title,
        epistemicState: f.state,
        reportedPublicSummary: f.summary,
        sourceAudit: 'NOT_INDEPENDENTLY_VERIFIED' as const,
        numericalReproduction: 'NOT_INDEPENDENTLY_REPRODUCED' as const,
        adversarialDisposition: 'PENDING' as const,
      }))
    : [];
  return {
    contract: SFI_RESEARCH_REVIEW_DOSSIER,
    kind: 'READ_ONLY_INDEPENDENT_REVIEW_REQUEST' as const,
    objectId: object.objectId,
    objectVersion: object.version,
    packageHash: assessment.packageHash,
    publicDerivativeEligible: eligiblePublicDerivative,
    automatedAssessment: {
      p1: assessment.p1StructuralStatus,
      p2: assessment.p2AdversarialStatus,
      means: 'Structural and deterministic checks only; not methodological peer review.',
    },
    publicCandidate: eligiblePublicDerivative ? {
      title: object.publicTitle,
      method: object.method,
      summary: object.publicSummary,
      publicLimitations: object.publicLimitations,
      reportedPublicMetrics: object.publicMetrics,
      returnState: object.returnState,
    } : null,
    findingsToReview: publicFindings,
    reviewTasks: tasks,
    responsibilities: {
      researcher: 'SOURCE_AND_METHOD_PRODUCER',
      methodologicalReviewer: 'DISTINCT_FROM_RESEARCHER_REQUIRED',
      certifyingIssuer: 'SEPARATE_VALID_SFI_INSTITUTIONAL_AUTHORITY_REQUIRED',
      externalIndependence: 'ONLY_AFTER_VERIFIED_THIRD_PARTY_REVIEW',
    },
    p0FreshIntegrityReceipt: 'NOT_ATTACHED_MUST_BE_CAPTURED_AT_APPROVAL' as const,
    independentReviewStatus: 'PENDING' as const,
    certificationStatus: 'NOT_CERTIFIED' as const,
    certificateId: null,
    signedAt: null,
    revocationStatus: 'NOT_APPLICABLE_NO_CERTIFICATE' as const,
    publicationStatus: 'NOT_PUBLISHED_BY_DOSSIER' as const,
    transportAuthorized: false,
    issuedCredentials: false,
    scope: 'Conformity with explicitly reviewed method and evidence only, if approved in a separate authorized workflow; never automatic claim of scientific truth.',
  };
}
