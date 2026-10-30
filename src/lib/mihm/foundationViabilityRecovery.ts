/**
 * MIHM Foundation P3 — auditable viability/recovery OBSERVATION, not
 * proof of homeostasis. Reuses MIHM P1 source metrology and an existing
 * NWS historical-event dossier; does not fetch, write or promote anything.
 *
 * The illustrative +/-20% corridor is a POST-HOC sensitivity assumption,
 * NOT a declared operational viability threshold.
 */
import {
  assessMihmManhattanSourceMetrology,
  type MihmManhattanP1Archive,
} from './foundationSourceMetrology';

export const MIHM_P3_CONTRACT='SFI-MIHM-FOUNDATION-P3-PROXY-RECOVERY-0.1' as const;
export type MihmP3Metric='cbdEntries'|'service311'|'fdnyCount';
export type MihmP3NwsArchive={
  contract:string;inputSHA256:string; evidenceState:string;
  historicAsOfT0Availability:string;
  eventSelectionIsIndependentOfFullYearData:boolean;
  sourceResponseFingerprints:Array<{source:string;sha256:string}>;
  events:Array<{
    id:string;anchor:string;class:string;weatherSource:string;
    apparentProxyReturnDay?:string|null;
    institutionalReturnConfirmed?:boolean;
    actualCrossSystemPropagationIdentified?:boolean;
  }>;
};

export const MIHM_P3_OBSERVATION_POLICY={
  method:'SAME_WEEKDAY_PRE_EVENT_MEDIAN_56D' as const,
  // Sensitivity choices were made after the entire historical archive was
  // already reviewed. They are not precommitted operational constraints.
  corridors:[0.10,0.20,0.30] as const,
  primaryIllustrativeCorridor:0.20 as const,
  stableConsecutiveDays:2 as const,
  eventOnsetWindowDays:3 as const,
  followUpDays:14 as const,
  frozenReferenceDaysBeforeAnchor:56 as const,
  minReferenceSamplesPerWeekday:8 as const,
  flagsAreObservationalProxiesNotLossLabels:true as const,
  sourceVintageAtHistoricalT0:'NOT_VERIFIED' as const,
  noNormativeViabilityConstraintAvailable:true as const,
};

type NWSDefinition={
  id:string;anchor:string;class:string;weatherSource:string;
  spatialRelevance:'MANHATTAN_WEATHER_EVENT'|'OUTSIDE_CORE_AREA_NEGATIVE_CONTROL';
};
const events:ReadonlyArray<NWSDefinition>=[
  {id:'NWS_2026_01_25_MAJOR_SNOW',anchor:'2026-01-25',
    class:'MAJOR_MANHATTAN_SNOW',weatherSource:'https://www.weather.gov/okx/20260125_26',
    spatialRelevance:'MANHATTAN_WEATHER_EVENT'},
  {id:'NWS_2026_02_06_COLD_LIGHT_CITY_SNOW',anchor:'2026-02-06',
    class:'COLD_LIGHT_MANHATTAN_SNOW',weatherSource:'https://www.weather.gov/okx/20260206_08',
    spatialRelevance:'MANHATTAN_WEATHER_EVENT'},
  {id:'NWS_2026_02_22_BLIZZARD_RESTRICTION',anchor:'2026-02-22',
    class:'MAJOR_SNOW_WITH_TRAVEL_RESTRICTION',weatherSource:'https://www.weather.gov/okx/20260222_23',
    spatialRelevance:'MANHATTAN_WEATHER_EVENT'},
  {id:'NWS_2026_05_20_FLASH_FLOOD_SPATIAL_CHALLENGE',anchor:'2026-05-20',
    class:'NYC_METRO_FLOOD_PREDOMINANTLY_QUEENS_BROOKLYN',
    weatherSource:'https://www.weather.gov/okx/20260520',
    spatialRelevance:'OUTSIDE_CORE_AREA_NEGATIVE_CONTROL'},
];
const measures:ReadonlyArray<{key:MihmP3Metric;unit:string;boundary:string}>=[
  {key:'cbdEntries',unit:'estimated_vehicle_entries/day',boundary:'CBD road entrance zone'},
  {key:'service311',unit:'service_request_records/day',boundary:'Manhattan borough'},
  {key:'fdnyCount',unit:'fire_incident_dispatch_rows/day',boundary:'Manhattan borough'},
];
const dateMs=(d:string)=>Date.parse(d+'T12:00:00Z');
const dow=(d:string)=>new Date(dateMs(d)).getUTCDay();
const fixed=(v:number)=>Number(v.toFixed(6));
const median=(values:number[])=>{
  if(values.length!==8||values.some(x=>!Number.isSafeInteger(x)||x<0))throw Error('P3_INVALID_REFERENCE');
  const sorted=[...values].sort((a,b)=>a-b);
  return (sorted[3]+sorted[4])/2;
};
export type MihmP3MetricDay={
  source:MihmP3Metric;unit:string;boundary:string;
  reference:number;actual:number;deviationPct:number;
  outsideCorridor:boolean;
};
export type MihmP3Day={
  day:string;offset:number;metrics:MihmP3MetricDay[];
  conventionalTrafficOnlyDeparture:boolean;
  multinodeAnyDeparture:boolean;
};
export type MihmP3Episode={
  eventId:string;anchor:string;class:string;weatherSource:string;
  spatialRelevance:NWSDefinition['spatialRelevance'];
  corridorPct:number;
  conventionalTrafficOnly:{
    departureAt:string|null;firstTwoDayReentryAt:string|null;
    daysFromFirstDepartureToReentry:number|null;
    rebreachAfterReentry:boolean|null;
    departureDays:number;
    status:'NO_ONSET_DEPARTURE'|'TWO_DAY_PROXY_REENTRY'|'NO_TWO_DAY_REENTRY_WITHIN_HORIZON';
  };
  threeSeriesAnyDeparture:{
    departureAt:string|null;firstTwoDayReentryAt:string|null;
    daysFromFirstDepartureToReentry:number|null;
    rebreachAfterReentry:boolean|null;departureDays:number;
    status:'NO_ONSET_DEPARTURE'|'TWO_DAY_PROXY_REENTRY'|'NO_TWO_DAY_REENTRY_WITHIN_HORIZON';
  };
  firstThreeDaysWithTrafficSignal:number;
  firstThreeDaysWithAnySignal:number;
  daily:MihmP3Day[];
  observedPerturbationDocumentedByNws:true;
  providerEventTimeVintageAtHistoricT0Verified:false;
  causalImpactIdentified:false;
  operationalRecoveryCertified:false;
  institutionalReturnCertified:false;
};
export type MihmP3Result={
  contract:typeof MIHM_P3_CONTRACT;
  status:'RETROSPECTIVE_PROXY_ONLY__VIABILITY_NOT_ADMITTED'|'ABSTAINED_P1_OR_EVENT_INTEGRITY';
  blockers:string[];
  policy:typeof MIHM_P3_OBSERVATION_POLICY;
  sourceArchiveSHA256:string;
  events:MihmP3Episode[];
  fourEpisodesEvaluated:number;
  eligibleNormativeConstraints:number;
  eligibleIndependentOutcomeLabels:number;
  primaryInterpretation:'ILLUSTRATIVE_CORRIDOR_NOT_VIABILITY_THRESHOLD';
  independentProviderSourceVintagesVerified:false;
  historicalEventsIndependentlyPreregistered:false;
  historicalAuditIndependent:false;
  causalPropagationEstablished:false;
  canonicalPhiCalculated:false;
  homeostasisEstablished:false;
  returnVerified:false;
  scientificCalibrationEstablished:false;
  productionPromotionAllowed:false;
};
const classify=(rows:MihmP3Day[],flag:'conventionalTrafficOnlyDeparture'|'multinodeAnyDeparture')=>{
  const triggered=rows.findIndex(x=>x.offset<MIHM_P3_OBSERVATION_POLICY.eventOnsetWindowDays&&x[flag]);
  const departureDays=rows.filter(x=>x[flag]).length;
  if(triggered<0)return {
    departureAt:null,firstTwoDayReentryAt:null,daysFromFirstDepartureToReentry:null,
    rebreachAfterReentry:null,departureDays,status:'NO_ONSET_DEPARTURE' as const,
  };
  const first=rows.findIndex((x,i)=>i>triggered && i<rows.length-1 &&
    !x[flag]&&!rows[i+1][flag]);
  if(first<0)return {
    departureAt:rows[triggered].day,firstTwoDayReentryAt:null,
    daysFromFirstDepartureToReentry:null,rebreachAfterReentry:null,departureDays,
    status:'NO_TWO_DAY_REENTRY_WITHIN_HORIZON' as const,
  };
  return {
    departureAt:rows[triggered].day,
    firstTwoDayReentryAt:rows[first].day,
    daysFromFirstDepartureToReentry:first-triggered,
    rebreachAfterReentry:rows.slice(first+2).some(x=>x[flag]),
    departureDays,
    status:'TWO_DAY_PROXY_REENTRY' as const,
  };
};
const base=(sourceArchiveSHA256:string):MihmP3Result=>({
  contract:MIHM_P3_CONTRACT,
  status:'ABSTAINED_P1_OR_EVENT_INTEGRITY',blockers:[],policy:MIHM_P3_OBSERVATION_POLICY,
  sourceArchiveSHA256,events:[],fourEpisodesEvaluated:0,
  eligibleNormativeConstraints:0,eligibleIndependentOutcomeLabels:0,
  primaryInterpretation:'ILLUSTRATIVE_CORRIDOR_NOT_VIABILITY_THRESHOLD',
  independentProviderSourceVintagesVerified:false,
  historicalEventsIndependentlyPreregistered:false,historicalAuditIndependent:false,
  causalPropagationEstablished:false,canonicalPhiCalculated:false,
  homeostasisEstablished:false,returnVerified:false,
  scientificCalibrationEstablished:false,productionPromotionAllowed:false,
});
export function assessMihmFoundationProxyRecovery(
  archive:MihmManhattanP1Archive,
  weather:MihmP3NwsArchive,
  sourceArchiveSHA256:string,
):MihmP3Result {
  const output=base(sourceArchiveSHA256);
  const p1=assessMihmManhattanSourceMetrology(archive);
  const blockers=[...p1.reasons];
  if(p1.status!=='DOCUMENTARY_STRUCTURE_VALID_WITH_VINTAGE_BLOCKED')blockers.push('P1_SOURCE_METROLOGY_NOT_ADMITTED');
  if(!/^[a-f0-9]{64}$/.test(sourceArchiveSHA256)||
      weather?.inputSHA256!==sourceArchiveSHA256)blockers.push('NWS_ARCHIVE_SOURCE_DIGEST_NOT_MATCHED');
  if(weather?.contract!=='MIHM-MANHATTAN-NWS-EVENT-CONTRAST-0.1'||
    weather.evidenceState!=='EXPLORATORY_POST_HOC_FULL_YEAR_ALREADY_CONSULTED'||
    weather.eventSelectionIsIndependentOfFullYearData!==false||
    weather.historicAsOfT0Availability!=='NOT_VERIFIED')
    blockers.push('INDEPENDENT_HISTORICAL_EVENT_SELECTION_CLAIM_UNSUPPORTED');
  if(!Array.isArray(weather?.events)||weather.events.length!==events.length ||
    weather.events.some((e,i)=>e.id!==events[i].id||e.anchor!==events[i].anchor||
      e.class!==events[i].class||e.weatherSource!==events[i].weatherSource||
      e.institutionalReturnConfirmed!==false||
      e.actualCrossSystemPropagationIdentified!==false))
    blockers.push('OFFICIAL_EVENT_DEFINITION_OR_EVIDENCE_CHANGED');
  const historical=weather?.sourceResponseFingerprints;
  if(!Array.isArray(historical)||historical.length!==3||
    historical.some(x=>archive.sourceReads.find(y=>y.source===x.source)?.sourceResponseSha256!==x.sha256))
    blockers.push('NWS_SOURCE_FINGERPRINTS_DIFFER_FROM_P1_ARCHIVE');
  if(blockers.length)return {...output,blockers:[...new Set(blockers)]};
  const rows=archive.rows;
  try {
    const readings:MihmP3Episode[]=[];
    for(const definition of events){
      const index=rows.findIndex(x=>x.day===definition.anchor);
      if(index<56||index+14>=rows.length)throw Error('P3_HISTORICAL_EVENT_WINDOW_INCOMPLETE');
      const prior=rows.slice(index-56,index);
      // Baselines are frozen at the event anchor. For every future weekday,
      // select the eight matching weekdays within the 56 *preevent* days.
      const refs=Array.from({length:7},(_,weekday)=>
        measures.map(m=>{
          const history=prior.filter(x=>dow(x.day)===weekday).map(x=>x[m.key]);
          const v=median(history);
          if(v<=0)throw Error('P3_ZERO_REFERENCE_NOT_INTERPRETABLE');
          return v;
        }));
      for(const corridor of MIHM_P3_OBSERVATION_POLICY.corridors){
        const daily:MihmP3Day[]=[];
        for(let d=0;d<=MIHM_P3_OBSERVATION_POLICY.followUpDays;d++){
          const row=rows[index+d],weekday=dow(row.day);
          const metricDays=measures.map((m,mi)=>{
            const ref=refs[weekday][mi],actual=row[m.key];
            const deviation=(actual/ref)-1;
            return {source:m.key,unit:m.unit,boundary:m.boundary,
              reference:ref,actual,deviationPct:fixed(100*deviation),
              outsideCorridor:Math.abs(deviation)>corridor};
          });
          daily.push({day:row.day,offset:d,metrics:metricDays,
            conventionalTrafficOnlyDeparture:metricDays[0].outsideCorridor,
            multinodeAnyDeparture:metricDays.some(x=>x.outsideCorridor)});
        }
        const first3=daily.slice(0,3);
        readings.push({
          eventId:definition.id,anchor:definition.anchor,class:definition.class,
          weatherSource:definition.weatherSource,spatialRelevance:definition.spatialRelevance,
          corridorPct:Math.round(100*corridor),
          conventionalTrafficOnly:classify(daily,'conventionalTrafficOnlyDeparture'),
          threeSeriesAnyDeparture:classify(daily,'multinodeAnyDeparture'),
          firstThreeDaysWithTrafficSignal:first3.filter(x=>x.conventionalTrafficOnlyDeparture).length,
          firstThreeDaysWithAnySignal:first3.filter(x=>x.multinodeAnyDeparture).length,
          daily,
          observedPerturbationDocumentedByNws:true,
          providerEventTimeVintageAtHistoricT0Verified:false,
          causalImpactIdentified:false,operationalRecoveryCertified:false,institutionalReturnCertified:false,
        });
      }
    }
    return {...output,status:'RETROSPECTIVE_PROXY_ONLY__VIABILITY_NOT_ADMITTED',
      blockers:[
        'NO_PREDECLARED_NORMATIVE_OPERATIONAL_VIABILITY_CONSTRAINT',
        'NO_INDEPENDENT_OPERATIONAL_RECOVERY_OUTCOME',
        'UNVERIFIED_PROVIDER_SOURCE_VINTAGES_AT_HISTORIC_T0',
        'BAND_WIDTH_AND_EVENT_WINDOWS_CHOSEN_AFTER_HISTORICAL_INSPECTION',
        'NWS_MAY_EVENT_GEOGRAPHICALLY_REMOTE_FROM_MANHATTAN',
        'FDNY_INCIDENT_COUNT_NOT_VALIDATED_INSTITUTIONAL_CAPACITY',
      ],
      events:readings,fourEpisodesEvaluated:events.length};
  } catch {
    return {...output,blockers:['P3_NONFINITE_OR_INCOMPLETE_PROXY_WINDOW']};
  }
}
