/**
 * SFI Research Assurance — deterministic, read-only gate for existing Method Lab
 * public derivatives. This assessment is NOT a certificate or external validation.
 * Owner: Method Lab; publication and institutional authority remain separate.
 */
import type { MethodLabResearchObject } from './researchObjects';

export const SFI_RESEARCH_ASSURANCE_CONTRACT = 'SFI-RESEARCH-ASSURANCE-REVIEW-1.0' as const;

type Finding = { code: string; status: 'PASS' | 'FAIL' | 'REVIEW'; explanation: string };

export function assessMethodLabResearchAssurance(
  object: MethodLabResearchObject,
  publicationPackage: { objectId: string; version: string; packageHash: string; files: { path: string; sha256: string }[]; manifest: { rawDataIncluded: boolean; promotionRequired: boolean } },
) {
  const checks: Finding[] = [];
  const add = (code: string, condition: boolean, explanation: string): void => {
    checks.push({ code, status: condition ? 'PASS' : 'FAIL', explanation });
  };

  // P1: independently inspect only the already-defined public derivative.
  add('P1_IDENTITY_VERSION', Boolean(object.objectId.trim() && object.version.trim() &&
    publicationPackage.objectId === object.objectId && publicationPackage.version === object.version),
    'Identity and version must agree with the immutable package target.');
  add('P1_PACKAGE_INTEGRITY', /^[a-f0-9]{64}$/.test(publicationPackage.packageHash) &&
    publicationPackage.files.length >= 7 &&
    new Set(publicationPackage.files.map(f => f.path)).size === publicationPackage.files.length &&
    publicationPackage.files.every(f => /^[a-f0-9]{64}$/.test(f.sha256)),
    'Content hashes and unique required files must be present; cryptographic recomputation is owned by the package builder.');
  add('P1_PUBLIC_BOUNDARY', publicationPackage.manifest.rawDataIncluded === false &&
    publicationPackage.manifest.promotionRequired === true &&
    object.publicationState === 'PUBLIC_DERIVATIVE_READY',
    'Only a governed public derivative can enter review; this does not authorize publishing.');
  add('P1_METHOD_SCOPE', Boolean(object.method.trim() && object.method !== 'UNSPECIFIED' &&
    object.objective.trim() && object.publicSummary.trim()),
    'Method, objective and public summary must be explicit.');
  add('P1_PUBLIC_EVIDENCE', object.evidenceRefs.length > 0 &&
    object.publicFindings.length > 0 &&
    object.publicFindings.every(f => f.id.trim() && f.summary.trim()),
    'At least one source reference and one inspectable public finding must be recorded; references are not independently authenticated here.');
  add('P1_LIMITATIONS', object.publicLimitations.length > 0 &&
    object.publicLimitations.every(s => s.trim().length > 0),
    'Explicit public limitations required to prevent silent overclaiming.');

  // P2: separate adversarial checks. These are deterministic falsification prompts,
  // not an independent or peer scientific review.
  add('P2_CONTRADICTION_EXPOSED', object.publicFindings.every(f =>
    ['OBSERVED', 'DERIVED', 'INFERRED', 'UNVERIFIED', 'CONTRADICTED'].includes(f.state)),
    'Every public finding must preserve its epistemic classification.');
  add('P2_NO_SIMULATION_AS_RETURN', !(object.epistemicState === 'NOT_TESTED' && object.returnState === 'VERIFIED'),
    'An untested study cannot claim a verified empirical RETURN.');
  add('P2_NO_INDEPENDENCE_INFERENCE', object.source !== 'EXTERNAL_AGENT' ||
    object.publicLimitations.length > 0,
    'External agent provenance does not constitute an independent scientific review.');

  const failed = checks.filter(x => x.status === 'FAIL').map(x => x.code);
  const reviewRequired = [
    'Source permissions and citation accuracy are not independently verified by this gate.',
    'Independent reproducer, separated methodological reviewer and institutional certifying authority have not signed this package.',
    'Data-plane integrity, storage attestation and public verification/revocation registry are not established by this preview.',
  ];
  return {
    contract: SFI_RESEARCH_ASSURANCE_CONTRACT,
    objectId: object.objectId,
    version: object.version,
    packageHash: publicationPackage.packageHash,
    assessmentKind: 'DETERMINISTIC_READ_ONLY_PREVIEW' as const,
    p1StructuralStatus: checks.filter(x => x.code.startsWith('P1_')).every(x => x.status === 'PASS') ? 'PASS' : 'FAIL',
    p2AdversarialStatus: checks.filter(x => x.code.startsWith('P2_')).every(x => x.status === 'PASS') ? 'PASS' : 'FAIL',
    checks,
    failed,
    p3CertificationStatus: 'NOT_CERTIFIED' as const,
    p4DelegatedAuthorityStatus: 'NOT_GRANTED' as const,
    p5PublicationStatus: 'NOT_PUBLISHED_BY_ASSESSMENT' as const,
    eligibleForGovernedReview: failed.length === 0,
    reviewRequired,
    authorityBoundary: 'No certificate issuance, self-review promotion, publication, external validation claim, DOI, credential change or canonical mutation.',
  };
}
