import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessMihmManhattanSourceMetrology, type MihmManhattanP1Archive } from './foundationSourceMetrology';

const original: MihmManhattanP1Archive=JSON.parse(readFileSync(
  'docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json','utf8'
));
const clone=()=>structuredClone(original);
const audit=(a:MihmManhattanP1Archive=clone())=>assessMihmManhattanSourceMetrology(a);

test('P1 checks the original archive without creating fictional historical source releases',()=>{
  const result=audit();
  assert.equal(result.status,'DOCUMENTARY_STRUCTURE_VALID_WITH_VINTAGE_BLOCKED',result.reasons.join(','));
  assert.equal(result.sourceCount,3);
  assert.equal(result.recordedDays,365);
  assert.equal(result.measurements,1460);
  assert.equal(result.sources.length,3);
  assert(result.sources.every(s=>s.queryValidated));
  assert(result.sources.every(s=>s.originalHistoricalPublicationAvailableAt==='NOT_VERIFIED'));
  assert(result.sources.every(s=>s.sourceResponseHashRecomputedFromOriginalBytes===false));
  assert(result.sources.every(s=>s.eligibleForProspectiveCalibration===false));
  assert.equal(result.sourceReleaseTimeline.originalSourceVintagesAttested,false);
  assert.equal(result.sourceReleaseTimeline.sourceCaptureRunCreatedAt,'2026-10-25T13:10:13Z');
  assert.equal(result.sourceReleaseTimeline.calendarBucketTimezoneIndependentlyEstablished,false);
  assert.equal(result.nestedVehicleEntryConstraint.status,'PASS');
  assert.equal(result.productionPromotionAllowed,false);
  assert.equal(result.canonicalPhiCalculated,false);
  assert.equal(result.homeostasisEstablished,false);
  assert.equal(result.causalPropagationValidated,false);
});
test('P1 preserves the event definition, provider update cadence, units and geography',()=>{
  const result=audit();
  assert.deepEqual(result.sources.map(s=>s.sourceUpdateCadence),['DAILY','ANNUALLY','DAILY']);
  assert.deepEqual(result.dimensions.map(d=>d.measuredDays),[365,365,365,365]);
  assert.deepEqual(result.dimensions.map(d=>d.zeroDays),[0,0,0,0]);
  assert.deepEqual(result.dimensions.map(d=>d.min),[1124,341,72721,64681]);
  assert.deepEqual(result.dimensions.map(d=>d.max),[3275,887,621682,557587]);
  assert.equal(result.dimensions[1].unit,'fire_incident_dispatch_rows/day');
  assert.equal(result.dimensions[2].unit,'estimated_vehicle_entries/day');
  assert.notEqual(result.dimensions[1].unit,result.dimensions[2].unit);
  assert.notEqual(result.dimensions[0].geography,result.dimensions[2].geography);
  assert.equal(result.dimensions[3].geography,'nested CRZ toll zone');
});
test('P1 does not convert empty observations into measured zero',()=>{
  const v=clone();v.rows[20].fdnyCount=null as unknown as number;
  assert.equal(audit(v).status,'ABSTAINED_ARCHIVE_INCONSISTENT');
  assert(audit(v).reasons.some(s=>s.includes('MISSING_OR_NONINTEGER_MEASUREMENT')));
  const zero=clone();zero.rows[20].fdnyCount=0;
  const z=audit(zero);
  assert.equal(z.status,'DOCUMENTARY_STRUCTURE_VALID_WITH_VINTAGE_BLOCKED');
  assert.equal(z.dimensions[1].zeroDays,1);
});
test('P1 rejects duplicate dates, calendar gaps, insufficient series and unsupported source vintages',()=>{
  const d=clone();d.rows[11].day=d.rows[10].day;
  assert.equal(audit(d).status,'ABSTAINED_ARCHIVE_INCONSISTENT');
  const gap=clone();gap.rows.splice(9,1);
  assert.equal(audit(gap).status,'ABSTAINED_ARCHIVE_INCONSISTENT');
  const feb=clone();feb.rows[20].day='2026-02-30';
  assert.equal(audit(feb).status,'ABSTAINED_ARCHIVE_INCONSISTENT');
  const promo=clone();promo.dataAsOfOriginalDates='VERIFIED';
  const result=audit(promo);
  assert.equal(result.status,'ABSTAINED_ARCHIVE_INCONSISTENT');
  assert(result.reasons.includes('HISTORICAL_SOURCE_VINTAGE_PROMOTION_UNSUPPORTED'));
});
test('P1 refuses source query substitution, ID duplication, group omission and fabricated fingerprints',()=>{
  const cases=[
    (a:MihmManhattanP1Archive)=>{a.sourceReads[0].queryUrl+='&$limit=1000';},
    (a:MihmManhattanP1Archive)=>{a.sourceReads[1].source='NYC311';},
    (a:MihmManhattanP1Archive)=>{a.sourceReads[2].queryUrl=a.sourceReads[2].queryUrl.replace('CBD+Entries','Subway');},
    (a:MihmManhattanP1Archive)=>{a.sourceReads[0].sourceResponseSha256='fake';},
    (a:MihmManhattanP1Archive)=>{a.sourceReads[1].missing=['2026-01-01'];},
    (a:MihmManhattanP1Archive)=>{a.sourceReads[1].observed=10;},
  ];
  for(const mutate of cases){const x=clone();mutate(x);
    assert.equal(audit(x).status,'ABSTAINED_ARCHIVE_INCONSISTENT',JSON.stringify(x.sourceReads));
  }
});
test('P1 cannot sum nested entries or convert different geographic supports into one denominator',()=>{
  const v=clone();v.rows[42].crzEntries=v.rows[42].cbdEntries+1;
  const res=audit(v);
  assert.equal(res.status,'ABSTAINED_ARCHIVE_INCONSISTENT');
  assert.deepEqual(res.nestedVehicleEntryConstraint.outOfOrderDays,[v.rows[42].day]);
  assert(res.reasons.includes('CRZ_OUTSIDE_CBD_SUBSET'));
  const geo=clone();geo.sourceAreaUnits.fdnyCount='CBD road entrance zone';
  assert.equal(audit(geo).status,'ABSTAINED_ARCHIVE_INCONSISTENT');
});
test('P1 rejects implausible source collection lineage while keeping provider metadata non-authoritative',()=>{
  const bad=clone();bad.provenance!.githubAction='https://example.com/actions/runs/40196382569';
  assert.equal(audit(bad).status,'ABSTAINED_ARCHIVE_INCONSISTENT');
  assert(audit(bad).reasons.includes('SOURCE_COLLECTION_LINEAGE_MISSING'));
  // A same-ID URL on a different host must not count as original source evidence.
  // The stronger origin check is asserted in the lineage regression below.
});
