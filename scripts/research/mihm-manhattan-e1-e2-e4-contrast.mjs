import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='docs/research/evidence/';
const raw=readFileSync(base+'MIHM-MANHATTAN-365D-2025-10-2026-09.json');
const panel=JSON.parse(raw), rows=panel.rows;
const sha=createHash('sha256').update(raw).digest('hex');
const events=JSON.parse(readFileSync(base+'MIHM-MANHATTAN-FOUR-NWS-EVENT-CONTRAST-2026-10-25.json','utf8'));
assert.equal(events.inputSHA256,sha);
assert.equal(rows.length,365);
const keys=['service311','fdnyCount','cbdEntries','crzEntries'];
const holidays=new Set(['2025-10-13','2025-11-11','2025-11-27','2025-12-25','2026-01-01','2026-01-19','2026-02-16','2026-05-25','2026-06-19','2026-07-03','2026-07-04','2026-09-07']);
const weather=new Set(events.events.filter(x=>x.class==='MAJOR_MANHATTAN_SNOW').flatMap(x=>[x.anchor,x.observations?.[1]?.day].filter(Boolean)));
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const median=a=>{const b=[...a].sort((x,y)=>x-y);return (b[(b.length-1)>>1]+b[b.length>>1])/2};
const weekday=s=>new Date(s+'T12:00:00Z').getUTCDay();
const candidate=(idx,series,exclude)=>{
 const target=rows[idx],wd=weekday(target.day);
 return rows.slice(Math.max(0,idx-70),idx).filter(r=>weekday(r.day)===wd&&(!exclude||(!holidays.has(r.day)&&!weather.has(r.day)))).map(r=>r[series]);
};
const comparison=keys.map(series=>{
 let common=0,unfiltered=[],filtered=[],noHistory=0;
 for(let idx=70;idx<rows.length;idx++){
   const rawHistory=candidate(idx,series,false), clean=candidate(idx,series,true);
   if(rawHistory.length<4||clean.length<4){noHistory++;continue}
   const y=rows[idx][series]; common++;
   unfiltered.push(Math.abs(y-median(rawHistory)));
   filtered.push(Math.abs(y-median(clean)));
 }
 return {series,n:common,insufficientHistoryDays:noHistory,
  unfilteredMAE:mean(unfiltered),holidayWeatherExcludedMAE:mean(filtered),
  improvementMAE:mean(unfiltered)-mean(filtered),
  status:'POSTHOC_CALENDAR_BASELINE_SENSITIVITY_NOT_T0_FORECAST'};
});
const episodes=events.events.map(x=>{
 const idx=rows.findIndex(r=>r.day===x.anchor);
 const describe=series=>{
  const v=rows[idx][series],raw=candidate(idx,series,false),clean=candidate(idx,series,true);
  return {observed:v,rawSameWeekdayMedian:raw.length?median(raw):null,
   excludedHolidayWeatherMedian:clean.length?median(clean):null};
 };
 return {event:x.id,anchor:x.anchor,spatialRelevance:x.class,
   illustrative:{cbdEntries:describe('cbdEntries'),fdnyCount:describe('fdnyCount')},
   recoveryConclusion:'NOT_IDENTIFIED_FROM_HISTORICAL_BAND_CROSSINGS'};
});
const result={
 contract:'SFI-MIHM-MANHATTAN-E1-E2-E4-EXPLORATORY-PREFLIGHT-0.1',
 archiveSha256:sha,
 E1:{sourceQueriesRecorded:panel.sourceReads.map(s=>({source:s.source,queryUrl:s.queryUrl,
    archivedResponseFingerprint:s.sourceResponseSha256})),
   originalResponseBytesPreserved:false,refetchPerformed:false,
   providerVintageAtHistoricT0:'NOT_VERIFIED',
   requiredFollowup:'FETCH_AND_PERSIST_NEW_RAW_BYTES_WITH_CAPTURE_CLOCK_AND_LICENSE_BEFORE_DIFF'},
 E2:{holidayCalendar:'EXPLICIT_RESEARCH_CONTROL_NOT_OFFICIAL_COMPREHENSIVE_CALENDAR',
    weatherExclusion:'SELECTED_POSTHOC_NWS_EVENTS',method:'70_DAY_PRIOR_SAME_WEEKDAY_MEDIAN',
    minimumPriorObservations:4,comparisons:comparison,
    fullModelRetrainingPerformed:false,
    M2RetestedAgainstHolidayWeatherBaseline:false,
    status:'BASELINE_SENSITIVITY_ONLY'},
 E4:{events:episodes,holidayNullTestExecuted:false,
   forcingDurationIndependentlyEstablished:false,
   normativeViabilityConstraintEstablished:false,
   recoveryMechanismProven:false,
   status:'RECOVERY_IDENTIFICATION_BLOCKED'},
 conclusion:'EXPLORATORY_DIAGNOSTIC_ONLY__NOT_CAUSAL_OR_HOMEOSTASIS_OR_PROSPECTIVE_RETURN'
};
console.log(JSON.stringify(result,null,2));
