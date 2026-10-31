import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='docs/research/evidence/';
const load=name=>JSON.parse(readFileSync(root+name,'utf8'));
const raw=readFileSync(root+'MIHM-MANHATTAN-365D-2025-10-2026-09.json');
const archive=JSON.parse(raw);
const digest=createHash('sha256').update(raw).digest('hex');
const p0=load('MIHM-FOUNDATION-T0-CALIBRATION-2026-10-29.json');
const p1=load('MIHM-FOUNDATION-P1-SOURCE-METROLOGY-2026-10-30.json');
const p2=load('MIHM-FOUNDATION-P2-LAGGED-DYNAMICS-2026-10-30.json');
const comparison=load('MIHM-MANHATTAN-365D-MODEL-CONTRAST-2026-10-25.json');
const p3=load('MIHM-FOUNDATION-P3-VIABILITY-RECOVERY-2026-10-30.json');
assert.equal(archive.scope.days,365);
assert.equal(archive.rows.length,365);
assert.equal(archive.sourceReads.length,3);
const expectedSha=[p0.sourceArchiveSHA256,p1.sourceArchiveSHA256,p2.sourceArchiveSHA256,comparison.sourceFixtureSHA256,p3.sourceArchiveSHA256];
assert(expectedSha.every(x=>x===digest),'All tests must reference exact unchanged annual archive bytes');
assert.equal(archive.dataAsOfOriginalDates,'NOT_VERIFIED');
assert.equal(p1.audit.status,'DOCUMENTARY_STRUCTURE_VALID_WITH_VINTAGE_BLOCKED');
assert.equal(p1.audit.measurements,1460);
assert.equal(p2.originalDataAtHistoricT0IndependentlyVerified,false);
assert.equal(p3.scientificHomeostasisEstablished,false);
assert.equal(p3.institutionalReturnVerified,false);
assert.equal(comparison.scientificDisposition.actualHistoricalPredictionIssued,false);
assert.equal(comparison.scientificDisposition.canonicalMihmValidated,false);
assert.equal(p0.empiricalHomeostasisEstablished,false);
const sourceIds=archive.sourceReads.map(s=>s.source).sort();
assert.deepEqual(sourceIds,['FDNY','MTA_CBD_CRZ','NYC311']);
const audit={
  contract:'SFI-MIHM-MANHATTAN-RECONCILIATION-CHECK-1.0',
  archiveSha256:digest,range:archive.scope,
  sourceIds,days:archive.rows.length,measurements:p1.audit.measurements,
  p0:'RETROSPECTIVE_DIAGNOSTIC',p1:p1.audit.status,
  p2:p2.summary.status,p3:p3.reading.status,comparison:comparison.status,
  prospectivePredictionVerified:false,causalMechanismVerified:false,
  scientificClosure:'NOT_ESTABLISHED',
  boundary:'DOCUMENTARY_BYTES_AND_CONSISTENCY_CHECK_NOT_CASE_PLATFORM_ADMISSION_OR_EMPIRICAL_RETURN'
};
console.log(JSON.stringify(audit,null,2));
