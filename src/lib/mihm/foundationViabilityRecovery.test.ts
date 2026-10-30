import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assessMihmFoundationProxyRecovery, MIHM_P3_OBSERVATION_POLICY } from './foundationViabilityRecovery';
import type { MihmManhattanP1Archive } from './foundationSourceMetrology';
import type { MihmP3NwsArchive } from './foundationViabilityRecovery';

const raw=readFileSync('docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json');
const sourceSHA256=createHash('sha256').update(raw).digest('hex');
const source=JSON.parse(raw.toString('utf8')) as MihmManhattanP1Archive;
const nws=JSON.parse(readFileSync(
  'docs/research/evidence/MIHM-MANHATTAN-FOUR-NWS-EVENT-CONTRAST-2026-10-25.json','utf8'
)) as MihmP3NwsArchive;
const run=(a=structuredClone(source),w=structuredClone(nws))=>
  assessMihmFoundationProxyRecovery(a,w,sourceSHA256);
const episode=(id:string,corridor=20)=>run().events.find(x=>x.eventId.includes(id)&&x.corridorPct===corridor);

test('P3 exposes three fixed illustrative bands on four named NWS events with no homeostasis promotion',()=>{
  const r=run();
  assert.equal(r.status,'RETROSPECTIVE_PROXY_ONLY__VIABILITY_NOT_ADMITTED',r.blockers.join(','));
  assert.equal(r.events.length,12);
  assert.equal(r.fourEpisodesEvaluated,4);
  assert.deepEqual(r.policy.corridors,[0.10,0.20,0.30]);
  assert.equal(r.policy.stableConsecutiveDays,2);
  assert.equal(r.policy.frozenReferenceDaysBeforeAnchor,56);
  assert.equal(r.sourceArchiveSHA256,sourceSHA256);
  assert.equal(r.eligibleNormativeConstraints,0);
  assert.equal(r.eligibleIndependentOutcomeLabels,0);
  assert.equal(r.homeostasisEstablished,false);
  assert.equal(r.returnVerified,false);
  assert.equal(r.scientificCalibrationEstablished,false);
  assert.equal(r.productionPromotionAllowed,false);
  assert(r.blockers.includes('NO_PREDECLARED_NORMATIVE_OPERATIONAL_VIABILITY_CONSTRAINT'));
  assert(r.blockers.includes('UNVERIFIED_PROVIDER_SOURCE_VINTAGES_AT_HISTORIC_T0'));
  for(const e of r.events){
    assert.equal(e.daily.length,15);
    assert.equal(e.daily[0].day,e.anchor);
    assert.equal(e.daily[0].metrics.length,3);
    assert.equal(e.observedPerturbationDocumentedByNws,true);
    assert.equal(e.providerEventTimeVintageAtHistoricT0Verified,false);
    assert.equal(e.institutionalReturnCertified,false);
    assert.equal(e.causalImpactIdentified,false);
    assert.equal(e.operationalRecoveryCertified,false);
    assert.equal(e.threeSeriesAnyDeparture.departureDays>=e.conventionalTrafficOnly.departureDays,true);
    assert(e.daily.every(d=>d.metrics.every(m=>Number.isFinite(m.reference)&&m.reference>0)));
  }
  assert.equal(MIHM_P3_OBSERVATION_POLICY.noNormativeViabilityConstraintAvailable,true);
});
test('P3 does not confuse a traffic-only re-entry with whole-system recovery',()=>{
  const jan=episode('01_25');
  const feb=episode('02_22');
  assert(jan&&feb);
  assert.equal(jan.conventionalTrafficOnly.firstTwoDayReentryAt,'2026-01-28');
  assert.equal(jan.threeSeriesAnyDeparture.firstTwoDayReentryAt,'2026-02-05');
  assert.equal(jan.conventionalTrafficOnly.daysFromFirstDepartureToReentry,3);
  assert.equal(jan.threeSeriesAnyDeparture.daysFromFirstDepartureToReentry,11);
  assert.equal(feb.conventionalTrafficOnly.firstTwoDayReentryAt,'2026-02-25');
  assert.equal(feb.threeSeriesAnyDeparture.firstTwoDayReentryAt,'2026-02-26');
  assert.equal(feb.conventionalTrafficOnly.daysFromFirstDepartureToReentry,3);
  assert.equal(feb.threeSeriesAnyDeparture.daysFromFirstDepartureToReentry,4);
  assert.equal(jan.corridorPct,20);
});
test('P3 treats remote May NWS weather as a spatial negative control',()=>{
  const may=episode('05_20');
  assert(may);
  assert.equal(may.spatialRelevance,'OUTSIDE_CORE_AREA_NEGATIVE_CONTROL');
  assert.equal(may.conventionalTrafficOnly.status,'NO_ONSET_DEPARTURE');
  assert.equal(may.threeSeriesAnyDeparture.status,'NO_ONSET_DEPARTURE');
  assert.equal(may.firstThreeDaysWithTrafficSignal,0);
  assert.equal(may.firstThreeDaysWithAnySignal,0);
  assert.equal(may.institutionalReturnCertified,false);
});
test('P3 freezes every reference before the perturbation, without post-event baseline contamination',()=>{
  const a=run(),updated=structuredClone(source);
  // Alter an actual day AFTER the January anchor but within its observation
  // horizon; pre-event reference for every evaluated future weekday is fixed.
  const jan=updated.rows.find(x=>x.day==='2026-01-27');
  assert(jan);jan.cbdEntries+=1000;
  const b=run(updated);
  assert.equal(b.status,'RETROSPECTIVE_PROXY_ONLY__VIABILITY_NOT_ADMITTED');
  const baseline=a.events.find(x=>x.eventId.includes('01_25')&&x.corridorPct===20);
  const modified=b.events.find(x=>x.eventId.includes('01_25')&&x.corridorPct===20);
  assert(baseline&&modified);
  assert.deepEqual(baseline.daily.map(d=>d.metrics.map(m=>m.reference)),
    modified.daily.map(d=>d.metrics.map(m=>m.reference)));
  const original=baseline.daily.find(x=>x.day==='2026-01-27');
  const changed=modified.daily.find(x=>x.day==='2026-01-27');
  assert(original&&changed);
  assert.notEqual(original.metrics[0].actual,changed.metrics[0].actual);
  assert.equal(original.metrics[0].reference,changed.metrics[0].reference);
});
test('P3 distinguishes measured zero from missing; no silent completion on invalid sources',()=>{
  const cases=[
    (a:MihmManhattanP1Archive)=>{a.rows[55].fdnyCount=null as unknown as number},
    (a:MihmManhattanP1Archive)=>{a.rows[56].day=a.rows[55].day},
    (a:MihmManhattanP1Archive)=>{a.dataAsOfOriginalDates='VERIFIED'},
    (a:MihmManhattanP1Archive)=>{a.rows[130].crzEntries=a.rows[130].cbdEntries+1},
    (a:MihmManhattanP1Archive)=>{a.sourceReads[0].sourceResponseSha256='fake'},
  ];
  for(const mutate of cases){
    const a=structuredClone(source);mutate(a);
    const out=run(a);
    assert.equal(out.status,'ABSTAINED_P1_OR_EVENT_INTEGRITY');
    assert.equal(out.events.length,0);
    assert.equal(out.homeostasisEstablished,false);
    assert.equal(out.productionPromotionAllowed,false);
  }
  const zero=structuredClone(source);
  zero.rows[55].fdnyCount=0;
  // A real zero passes the source metrology, unlike a missing measurement;
  // P3 may abstain only if the baseline for a given weekday becomes zero.
  const actual=run(zero);
  assert.equal(actual.status,'RETROSPECTIVE_PROXY_ONLY__VIABILITY_NOT_ADMITTED');
});
test('P3 refuses invented NWS perturbations, swapped geography, rebranded cause and source digests',()=>{
  const mutations=[
    (w:MihmP3NwsArchive)=>{w.events[3].class='MAJOR_MANHATTAN_FLOOD'},
    (w:MihmP3NwsArchive)=>{w.events[2].anchor='2026-02-21'},
    (w:MihmP3NwsArchive)=>{w.events[0].institutionalReturnConfirmed=true},
    (w:MihmP3NwsArchive)=>{w.eventSelectionIsIndependentOfFullYearData=true},
    (w:MihmP3NwsArchive)=>{w.historicAsOfT0Availability='VERIFIED'},
    (w:MihmP3NwsArchive)=>{w.sourceResponseFingerprints[1].sha256='f'.repeat(64)},
  ];
  for(const mutate of mutations){
    const w=structuredClone(nws);mutate(w);
    const r=run(structuredClone(source),w);
    assert.equal(r.status,'ABSTAINED_P1_OR_EVENT_INTEGRITY');
    assert.equal(r.events.length,0);
  }
  const forged=assessMihmFoundationProxyRecovery(source,nws,'f'.repeat(64));
  assert.equal(forged.status,'ABSTAINED_P1_OR_EVENT_INTEGRITY');
});
test('P3 is deterministic and labels unobserved institutional viability as unproved, not zero',()=>{
  assert.deepEqual(run(),run());
  assert.equal(episode('01_25')?.class,'MAJOR_MANHATTAN_SNOW');
  assert.equal(episode('02_06')?.class,'COLD_LIGHT_MANHATTAN_SNOW');
  assert.equal(episode('02_22')?.class,'MAJOR_SNOW_WITH_TRAVEL_RESTRICTION');
});
