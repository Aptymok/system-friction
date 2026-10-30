/**
 * Read-only MIHM Foundation P1 source-metrology replay.
 * No API fetch, historical source republication, migration, Phi or RETURN.
 * node --import tsx scripts/research/mihm-foundation-p1-metrology.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assessMihmManhattanSourceMetrology, type MihmManhattanP1Archive } from '../../src/lib/mihm/foundationSourceMetrology';

const input='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const receiptPath='docs/research/evidence/MIHM-FOUNDATION-P1-SOURCE-METROLOGY-2026-10-30.json';
const receipt=JSON.parse(readFileSync(receiptPath,'utf8'));
const bytes=readFileSync(input);
const sha=createHash('sha256').update(bytes).digest('hex');
assert.equal(sha,receipt.sourceArchiveSHA256,'Frozen archive SHA changed — P1 assessment requires re-review');
const archive=JSON.parse(bytes.toString('utf8')) as MihmManhattanP1Archive;
const result=assessMihmManhattanSourceMetrology(archive);
assert.equal(result.contract,'SFI-MIHM-FOUNDATION-P1-SOURCE-METROLOGY-0.1');
assert.equal(result.status,'DOCUMENTARY_STRUCTURE_VALID_WITH_VINTAGE_BLOCKED',result.reasons.join(';'));
assert.deepEqual(result.reasons,[]);
assert.equal(result.sourceCount,3);
assert.equal(result.measurements,1460);
assert.equal(result.recordedDays,365);
assert.equal(result.nestedVehicleEntryConstraint.status,'PASS');
assert.equal(result.sourceReleaseTimeline.originalSourceVintagesAttested,false);
assert.equal(result.sourceReleaseTimeline.sourceCaptureRunCreatedAt,'2026-10-25T13:10:13Z');
assert.equal(result.sourceValuesIndependentlyRecomputed,false);
assert.equal(result.historicalForecastAsOfVerified,false);
assert.equal(result.causalPropagationValidated,false);
assert.equal(result.homeostasisEstablished,false);
assert.equal(result.canonicalPhiCalculated,false);
assert.equal(result.productionPromotionAllowed,false);

const surface={
  contract:result.contract,status:result.status,
  recordedDays:result.recordedDays,measurements:result.measurements,
  sourceCount:result.sourceCount,
  sources:result.sources.map(s=>({
    id:s.id,publisher:s.publisher,sourceUpdateCadence:s.sourceUpdateCadence,
    eventClock:s.eventClock,queryValidated:s.queryValidated,
    aggregateCount:s.aggregateCount,sourceResponseSha256:s.sourceResponseSha256,
    originalResponseBytesPreserved:s.originalResponseBytesPreserved,
    sourceResponseHashRecomputedFromOriginalBytes:s.sourceResponseHashRecomputedFromOriginalBytes,
    asOfEachHistoricTarget:s.asOfEachHistoricTarget,eligibleForProspectiveCalibration:s.eligibleForProspectiveCalibration
  })),
  dimensions:result.dimensions.map(d=>({
    dimension:d.dimension,sourceId:d.sourceId,unit:d.unit,geography:d.geography,
    measuredDays:d.measuredDays,zeroDays:d.zeroDays,min:d.min,max:d.max,
    denominatorVerifiedFromRawRows:d.denominatorVerifiedFromRawRows
  })),
  nestedVehicleEntryConstraint:result.nestedVehicleEntryConstraint,
  sourceReleaseTimeline:result.sourceReleaseTimeline,
  sourceValuesIndependentlyRecomputed:result.sourceValuesIndependentlyRecomputed,
  historicalForecastAsOfVerified:result.historicalForecastAsOfVerified,
  canonicalPhiCalculated:result.canonicalPhiCalculated,
  causalPropagationValidated:result.causalPropagationValidated,
  homeostasisEstablished:result.homeostasisEstablished,
  productionPromotionAllowed:result.productionPromotionAllowed
};
assert.deepEqual(surface,receipt.audit,'Receipt differs from re-executed documentary audit');

const historicalP0=JSON.parse(readFileSync('docs/research/evidence/MIHM-FOUNDATION-T0-CALIBRATION-2026-10-29.json','utf8'));
assert.equal(historicalP0.sourceArchiveSHA256,sha,'P0 historical cohort must remain unchanged');
assert.equal(historicalP0.productionPromotionAllowed,false);

console.log(JSON.stringify({ok:true,status:result.status,sourceArchiveSHA256:sha,
  originalReleaseVintages:'NOT_VERIFIED',
  sourceResponseHashesReplayedFromProviderBytes:false,
  measurements:result.measurements,sourceCount:result.sourceCount,
  nestedVehicleEntryConstraint:result.nestedVehicleEntryConstraint.status,
  productionPromotionAllowed:false,dimensions:surface.dimensions},null,2));
