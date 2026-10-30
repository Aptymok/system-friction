/**
 * MIHM Foundation P0: replay archived documentary observations without
 * writing to Case Platform, promoting Phi, or implying T0 source availability.
 *
 * Run: node --import tsx scripts/research/mihm-foundation-calibration-t0.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { calibrateMihmHistoricalVariationEnvelope } from '../../packages/mihm-core/src/index';

const archivePath='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const receiptPath='docs/research/evidence/MIHM-FOUNDATION-T0-CALIBRATION-2026-10-29.json';
const bytes=readFileSync(archivePath);
const sha=createHash('sha256').update(bytes).digest('hex');
const archive=JSON.parse(bytes.toString('utf8'));
const receipt=JSON.parse(readFileSync(receiptPath,'utf8'));
assert.equal(archive.contract,'MIHM-MANHATTAN-365D-RETROSPECTIVE-EVIDENCE-0.1');
assert.equal(sha,receipt.sourceArchiveSHA256,'Historical source archive changed; stop and document new evidence revision');
assert.equal(archive.dataAsOfOriginalDates,'NOT_VERIFIED');
assert.equal(archive.rows.length,365);
assert.equal(archive.rows[0].day,'2025-10-01');
assert.equal(archive.rows.at(-1).day,'2026-09-30');

const mapping=[
  {metric:'service311',source:'NYC311',boundary:'Manhattan borough',unit:'requests/day'},
  {metric:'fdnyCount',source:'FDNY',boundary:'Manhattan borough',unit:'dispatches/day'},
  {metric:'cbdEntries',source:'MTA_CBD_CRZ',boundary:'NYC CBD vehicle entries',unit:'vehicle entries/day'},
  {metric:'crzEntries',source:'MTA_CBD_CRZ',boundary:'NYC CRZ nested toll zone',unit:'vehicle entries/day'},
];
const readings=mapping.map(({metric,source,boundary,unit})=>{
  const original=archive.sourceReads.find((item:{source:string})=>item.source===source);
  assert(original?.sourceResponseSha256,'Source provenance absent: '+source);
  const result=calibrateMihmHistoricalVariationEnvelope({
    boundary,nodeRef:source,dimensionRef:metric,unit,
    sourceResponseSha256:original.sourceResponseSha256,
    originalT0SourceAvailability:'NOT_VERIFIED',
    trainThrough:'2026-04-30',validationThrough:'2026-06-30',
    rows:archive.rows.map((x:Record<string,unknown>)=>({
      day:x.day as string,value:x[metric] as number,state:'MEASURED' as const,unit,
    })),
  });
  if(result.status!=='RETROSPECTIVE_DERIVED_ONLY')throw Error('Calibration abstained for '+metric+':'+result.reason);
  assert.equal(result.canonicalPhiCalculated,false);
  assert.equal(result.homeostasisEstablished,false);
  assert.equal(result.externallyValidated,false);
  assert.equal(result.productionPromotionAllowed,false);
  return {metric,source,unit,boundary,threshold:result.threshold,
    nTrain:result.nTrain,nValidation:result.nValidation,nHistoricalAudit:result.nHistoricalAudit,
    trainingExceedances:result.trainingExceedances,
    validationExceedances:result.validationExceedances,
    historicalAuditExceedances:result.historicalAuditExceedances};
});
assert.deepEqual(readings,receipt.readings,'Receipt drift: replay is not identical to stored outcome');
assert.equal(receipt.classification,'DERIVED_RETROSPECTIVE_DIAGNOSTIC_NO_EMPIRICAL_VALIDATION');
assert.equal(receipt.productionPromotionAllowed,false);
console.log(JSON.stringify({
  ok:true,study:receipt.study,archiveSHA256:sha,classification:receipt.classification,
  originalAsOfSourceAvailability:'NOT_VERIFIED',calibratedOperationalViability:false,
  independentlyVerifiedFuturePrediction:false,readings,
},null,2));
