import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='docs/research/evidence/';
const bytes=readFileSync(base+'MIHM-MANHATTAN-365D-2025-10-2026-09.json');
const sha=createHash('sha256').update(bytes).digest('hex');
const get=n=>JSON.parse(readFileSync(base+n,'utf8'));
const archive=JSON.parse(bytes);
const p0=get('MIHM-FOUNDATION-T0-CALIBRATION-2026-10-29.json');
const p1=get('MIHM-FOUNDATION-P1-SOURCE-METROLOGY-2026-10-30.json');
const p2=get('MIHM-FOUNDATION-P2-LAGGED-DYNAMICS-2026-10-30.json');
const p3=get('MIHM-FOUNDATION-P3-VIABILITY-RECOVERY-2026-10-30.json');
const models=get('MIHM-MANHATTAN-365D-MODEL-CONTRAST-2026-10-25.json');
const sources=[p0.sourceArchiveSHA256,p1.sourceArchiveSHA256,p2.sourceArchiveSHA256,p3.sourceArchiveSHA256,models.sourceFixtureSHA256];
assert(sources.every(s=>s===sha),'P0-P3 and benchmark must share the same original dataset bytes');
assert.equal(archive.rows.length,365);
assert.equal(p1.audit.measurements,1460);
assert.equal(archive.dataAsOfOriginalDates,'NOT_VERIFIED');
assert.equal(p1.originalHistoricalReleaseVintagesVerified,false);
assert.equal(p2.originalDataAtHistoricT0IndependentlyVerified,false);
assert.equal(p3.institutionalReturnVerified,false);
assert.equal(p3.scientificHomeostasisEstablished,false);
assert.equal(models.scientificDisposition.canonicalMihmValidated,false);
assert.equal(models.scientificDisposition.actualHistoricalPredictionIssued,false);
const limits=[
  'ORIGINAL_HISTORICAL_SOURCE_VINTAGE_UNVERIFIED',
  'NO_VERIFIED_PROSPECTIVE_HOLDOUT',
  'NO_INDEPENDENT_OPERATIONAL_RETURN',
  'CAUSAL_AND_HOMEOSTASIS_CLAIMS_UNSUPPORTED',
  'NO_CASE_PLATFORM_EVIDENCE_ADMISSION_CONFIRMED_BY_OFFLINE_AUDIT'
];
const result={
  contract:'SFI-MIHM-MANHATTAN-P5-SCIENTIFIC-CLOSURE-0.1',
  epistemicClass:'DERIVED',
  scope:'RETROSPECTIVE_DOCUMENTARY_AUDIT',
  inputArchiveSha256:sha,
  measuredDays:365,aggregateMeasurements:1460,
  phaseCoverage:{P0:'REPRODUCIBLE_RETROSPECTIVE',P1:p1.audit.status,
    P2:p2.summary.status,P3:p3.reading.status,
    P4:'SCORER_IMPLEMENTED_PROSPECTIVE_VALIDATION_NOT_ESTABLISHED',
    P5:'PARTIAL_REVIEW_ONLY'},
  disposition:'PUBLICATION_CANDIDATE_WITH_EXPLICIT_LIMITATIONS',
  scientificValidation:'NOT_ESTABLISHED',
  prospectiveReturn:'NOT_OBSERVED',
  causalHomeostasis:'NOT_ESTABLISHED',
  scholarlyPackageReady:false,
  DOI:null,
  blockers:limits,
  allowedClaims:[
    'The archived dataset has 365 rows and four daily aggregate dimensions.',
    'The documented retrospective comparisons include negative controls and adverse results.',
    'The method preserves unknown historical source vintages and abstains from prospective causal claims.'
  ],
  forbiddenClaims:[
    'MIHM has been independently prospectively validated.',
    'Urban homeostasis or causal propagation was demonstrated.',
    'The historical experiments produced an observed intervention RETURN.'
  ],
  next:'Verify original source vintages; read live prediction/verification registries; compare academic and Berserker fairly; qualify evidence in Case Platform; then create a separately reviewed scholarly deposit.'
};
console.log(JSON.stringify(result,null,2));
