/**
 * MIHM P3 read-only archived NWS event and institutional viability proxy.
 * A proxy re-entry must never be promoted as an actual homeostasis/RETURN.
 * node --import tsx scripts/research/mihm-foundation-p3-viability-recovery.ts
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assessMihmFoundationProxyRecovery} from '../../src/lib/mihm/foundationViabilityRecovery';
import type {MihmManhattanP1Archive} from '../../src/lib/mihm/foundationSourceMetrology';
import type {MihmP3NwsArchive} from '../../src/lib/mihm/foundationViabilityRecovery';

const archiveFile='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const eventFile='docs/research/evidence/MIHM-MANHATTAN-FOUR-NWS-EVENT-CONTRAST-2026-10-25.json';
const source=readFileSync(archiveFile),eventSource=readFileSync(eventFile);
const sha256=createHash('sha256').update(source).digest('hex');
assert.equal(sha256,'41e384e3199ca8d6878b39cdca51425b82e01a4d5fec6121d6494d53c5ceacc5',
  'P3 archive changed; a new scientific review is required');
const weatherBlobSha1=createHash('sha1').update('blob '+eventSource.length+'\0').update(eventSource).digest('hex');
assert.equal(weatherBlobSha1,'e0d3ce098c6ccb261e25511369589b5d8788792e',
  'P3 NWS event history changed without scientific re-review');
const archive=JSON.parse(source.toString('utf8')) as MihmManhattanP1Archive;
const event=JSON.parse(eventSource.toString('utf8')) as MihmP3NwsArchive;
const r=assessMihmFoundationProxyRecovery(archive,event,sha256);
assert.equal(r.status,'RETROSPECTIVE_PROXY_ONLY__VIABILITY_NOT_ADMITTED',r.blockers.join(','));
assert.equal(r.events.length,12);
assert.equal(r.homeostasisEstablished,false);
assert.equal(r.returnVerified,false);
assert.equal(r.productionPromotionAllowed,false);
assert.equal(r.eligibleNormativeConstraints,0);
assert.equal(r.independentProviderSourceVintagesVerified,false);
const reading={
  contract:r.contract,
  status:r.status,
  sourceArchiveSHA256:sha256,
  nwsEvidenceGitBlobSha1:weatherBlobSha1,
  fourEpisodesEvaluated:r.fourEpisodesEvaluated,
  corridors:r.policy.corridors,
  stableConsecutiveDays:r.policy.stableConsecutiveDays,
  frozenReferenceDaysBeforeAnchor:r.policy.frozenReferenceDaysBeforeAnchor,
  primaryIllustrativeCorridor:r.policy.primaryIllustrativeCorridor,
  blockers:r.blockers,
  episodes:r.events.map(e=>({
    eventId:e.eventId,anchor:e.anchor,spatialRelevance:e.spatialRelevance,
    corridorPct:e.corridorPct,
    conventionalTrafficOnly:e.conventionalTrafficOnly,
    threeSeriesAnyDeparture:e.threeSeriesAnyDeparture,
    firstThreeDaysWithTrafficSignal:e.firstThreeDaysWithTrafficSignal,
    firstThreeDaysWithAnySignal:e.firstThreeDaysWithAnySignal,
    firstThreeDays:e.daily.slice(0,3).map(day=>({
      day:day.day,
      metrics:day.metrics.map(x=>({source:x.source,reference:x.reference,
        actual:x.actual,deviationPct:x.deviationPct,outsideCorridor:x.outsideCorridor})),
    })),
    providerEventTimeVintageAtHistoricT0Verified:e.providerEventTimeVintageAtHistoricT0Verified,
    causalImpactIdentified:e.causalImpactIdentified,
    operationalRecoveryCertified:e.operationalRecoveryCertified,
    institutionalReturnCertified:e.institutionalReturnCertified,
  })),
  eligibleNormativeConstraints:r.eligibleNormativeConstraints,
  eligibleIndependentOutcomeLabels:r.eligibleIndependentOutcomeLabels,
  independentProviderSourceVintagesVerified:r.independentProviderSourceVintagesVerified,
  historicalEventsIndependentlyPreregistered:r.historicalEventsIndependentlyPreregistered,
  historicalAuditIndependent:r.historicalAuditIndependent,
  causalPropagationEstablished:r.causalPropagationEstablished,
  canonicalPhiCalculated:r.canonicalPhiCalculated,
  homeostasisEstablished:r.homeostasisEstablished,
  scientificCalibrationEstablished:r.scientificCalibrationEstablished,
  returnVerified:r.returnVerified,
  productionPromotionAllowed:r.productionPromotionAllowed,
};
// Replay must reproduce every recorded first-window observation, proxy
// return and historical sensitivity result. No new source fetch or promotion.
const receipt=JSON.parse(readFileSync(
  'docs/research/evidence/MIHM-FOUNDATION-P3-VIABILITY-RECOVERY-2026-10-30.json',
  'utf8',
));
assert.equal(receipt.schema,'SFI-MIHM-FOUNDATION-P3-VIABILITY-RECOVERY-REPLAY-0.1');
assert.equal(receipt.classification,'HISTORICAL_SOURCE_BACKED__POSTHOC_PROXY_NOT_OP_VIABILITY');
assert.equal(receipt.originalDataAtEventTimeAvailabilityIndependentlyVerified,false);
assert.equal(receipt.normativeViabilityConstraintAdmitted,false);
assert.equal(receipt.recoveryCausalityEstablished,false);
assert.equal(receipt.institutionalReturnVerified,false);
assert.equal(receipt.scientificHomeostasisEstablished,false);
assert.equal(receipt.productionPromotionAllowed,false);
assert.deepEqual(reading,receipt.reading,'P3 archived result drift: repair lineage before any claim');
console.log(JSON.stringify({ok:true,receiptVerified:true,reading},null,2));
