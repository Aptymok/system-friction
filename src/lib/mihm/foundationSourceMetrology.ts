/**
 * MIHM Foundation P1 — strict documentary metrology of the existing Manhattan
 * 365-day historical archive. Does NOT fetch data, backdate source release
 * times, infer causality, compute canonical Phi, or mutate operational state.
 */
export const MIHM_FOUNDATION_P1_METROLOGY = 'SFI-MIHM-FOUNDATION-P1-SOURCE-METROLOGY-0.1' as const;

type SourceId = 'NYC311' | 'FDNY' | 'MTA_CBD_CRZ';
type Dimension = 'service311' | 'fdnyCount' | 'cbdEntries' | 'crzEntries';
type ArchivedSource = {
  source: string;
  observed: number;
  missing: unknown[];
  sourceResponseSha256: string;
  bytes: number;
  queryUrl: string;
};
type ArchivedDay = {day:string; service311:number; fdnyCount:number; cbdEntries:number; crzEntries:number};
export type MihmManhattanP1Archive = {
  contract:string;
  scope:{first:string;last:string;days:number};
  dataAsOfOriginalDates:string;
  scientificStatus:string;
  sourceReads:ArchivedSource[];
  sourceAreaUnits:Record<string,string>;
  geographyCompatibility:string;
  provenance?:{githubAction?:string;jobId?:number;collector?:string};
  rows:ArchivedDay[];
};

type SourceDescription = {
  id:SourceId; publisher:string; dataset:string;
  datasetUrl:string; endpoint:string; sourceUpdateCadence:'DAILY'|'ANNUALLY';
  eventClock:string; eventMeaning:string; measuredEntity:string;
  spatialBoundary:string;
  originalResponseBytesPreserved:false;
  originalHistoricalPublicationAvailableAt:'NOT_VERIFIED';
  epistemicStatus:'DOCUMENTED_PUBLISHER_METADATA__UNVERIFIED_HISTORICAL_VINTAGE';
};
const metadata: readonly SourceDescription[]=[
  {
    id:'NYC311',publisher:'NYC Office of Technology and Innovation / 311',
    dataset:'311 Service Requests from 2020 to Present',
    datasetUrl:'https://data.cityofnewyork.us/d/erm2-nwe9',
    endpoint:'https://data.cityofnewyork.us/resource/erm2-nwe9.json',
    sourceUpdateCadence:'DAILY',eventClock:'created_date',
    eventMeaning:'Floating timestamp of service-request creation; date_trunc_ymd calendar bucket, timezone not independently attested',
    measuredEntity:'Service-request record, not unique issue or resident',
    spatialBoundary:'Manhattan borough',originalResponseBytesPreserved:false,
    originalHistoricalPublicationAvailableAt:'NOT_VERIFIED',
    epistemicStatus:'DOCUMENTED_PUBLISHER_METADATA__UNVERIFIED_HISTORICAL_VINTAGE',
  },
  {
    id:'FDNY',publisher:'New York City Fire Department',
    dataset:'Fire Incident Dispatch Data',
    datasetUrl:'https://data.cityofnewyork.us/d/8m42-w767',
    endpoint:'https://data.cityofnewyork.us/resource/8m42-w767.json',
    sourceUpdateCadence:'ANNUALLY',eventClock:'incident_datetime',
    eventMeaning:'Floating timestamp of Starfire incident; date_trunc_ymd calendar bucket, timezone not independently attested',
    measuredEntity:'Fire-incident dispatch dataset row; independent uniqueness of incidents is not established by count(*)',
    spatialBoundary:'Manhattan incident borough',originalResponseBytesPreserved:false,
    originalHistoricalPublicationAvailableAt:'NOT_VERIFIED',
    epistemicStatus:'DOCUMENTED_PUBLISHER_METADATA__UNVERIFIED_HISTORICAL_VINTAGE',
  },
  {
    id:'MTA_CBD_CRZ',publisher:'Metropolitan Transportation Authority',
    dataset:'MTA Daily Ridership and Traffic: Beginning 2020',
    datasetUrl:'https://data.ny.gov/d/sayj-mze2',
    endpoint:'https://data.ny.gov/resource/sayj-mze2.json',
    sourceUpdateCadence:'DAILY',eventClock:'date',
    eventMeaning:'MTA calendar-date traffic estimate; provider source-vintage for historical day not archived',
    measuredEntity:'Estimated vehicle entries, not persons or subway riders',
    spatialBoundary:'CBD entry zone and nested CRZ (excludes exempt roadways)',
    originalResponseBytesPreserved:false,
    originalHistoricalPublicationAvailableAt:'NOT_VERIFIED',
    epistemicStatus:'DOCUMENTED_PUBLISHER_METADATA__UNVERIFIED_HISTORICAL_VINTAGE',
  },
];

const expectations:Record<SourceId,{count:number;where:string;select:string;order:string;group:string|null;limit:string}>={
  NYC311:{
    count:365,select:'date_trunc_ymd(created_date) as day,count(*) as n',
    where:"created_date >= '2025-10-01T00:00:00' AND created_date < '2026-10-01T00:00:00' AND borough = 'MANHATTAN'",
    order:'day ASC',group:'day',limit:'400'
  },
  FDNY:{
    count:365,select:'date_trunc_ymd(incident_datetime) as day,count(*) as n',
    where:"incident_datetime >= '2025-10-01T00:00:00' AND incident_datetime < '2026-10-01T00:00:00' AND incident_borough = 'MANHATTAN'",
    order:'day ASC',group:'day',limit:'400'
  },
  MTA_CBD_CRZ:{
    count:730,select:'date,mode,count',
    where:"date >= '2025-10-01T00:00:00' AND date < '2026-10-01T00:00:00' AND mode IN ('CBD Entries','CRZ Entries')",
    order:'date ASC,mode ASC',group:null,limit:'800'
  }
};
const dimensionProfiles:ReadonlyArray<{dimension:Dimension;sourceId:SourceId;unit:string;geography:string;meaning:string}>=[
  {dimension:'service311',sourceId:'NYC311',unit:'service_request_records/day',geography:'Manhattan borough',meaning:'Number of 311 service-request records, not persons or unique issues'},
  {dimension:'fdnyCount',sourceId:'FDNY',unit:'fire_incident_dispatch_rows/day',geography:'Manhattan borough',meaning:'Number of incident-dispatch source rows, not independently deduplicated incidents'},
  {dimension:'cbdEntries',sourceId:'MTA_CBD_CRZ',unit:'estimated_vehicle_entries/day',geography:'CBD road entrance zone',meaning:'CBD entries including vehicles using excluded roadways'},
  {dimension:'crzEntries',sourceId:'MTA_CBD_CRZ',unit:'estimated_vehicle_entries/day',geography:'nested CRZ toll zone',meaning:'CRZ entries after exclusion of vehicles remaining on exempt roadways'}
];

export type MihmP1MetrologyResult = {
  contract:typeof MIHM_FOUNDATION_P1_METROLOGY;
  status:'DOCUMENTARY_STRUCTURE_VALID_WITH_VINTAGE_BLOCKED'|'ABSTAINED_ARCHIVE_INCONSISTENT';
  reasons:string[];
  sourceCount:number;recordedDays:number;measurements:number;
  scope:{first:string;last:string;days:number};
  sources:Array<SourceDescription & {
    queryValidated:boolean;
    aggregateCount:number;
    sourceResponseSha256:string;
    sourceResponseHashRecomputedFromOriginalBytes:false;
    asOfEachHistoricTarget:'NOT_VERIFIED';
    eligibleForProspectiveCalibration:false;
  }>;
  dimensions:Array<{
    dimension:Dimension;sourceId:SourceId;unit:string;geography:string;meaning:string;
    min:number|null;max:number|null;measuredDays:number;zeroDays:number;
    denominatorVerifiedFromRawRows:false;
  }>;
  nestedVehicleEntryConstraint:{status:'PASS'|'FAILED'|'UNKNOWN';outOfOrderDays:string[];calculatedGapMeaning:string};
  sourceReleaseTimeline:{
    sourceCaptureRun:string|null;
    sourceCaptureRunCreatedAt:string|null;
    eventTimeIsPublicationTime:false;
    publisherUpdateCadenceIsVintageProof:false;
    calendarBucketTimezoneIndependentlyEstablished:false;
    originalSourceVintagesAttested:false;
  };
  causalPropagationValidated:false;
  canonicalPhiCalculated:false;homeostasisEstablished:false;
  sourceValuesIndependentlyRecomputed:false;
  historicalForecastAsOfVerified:false;
  readOnly:true;productionPromotionAllowed:false;
};

const dateMs=(date:unknown):number|null=>{
  if(typeof date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))return null;
  const value=Date.parse(date+'T12:00:00.000Z');
  return Number.isFinite(value)&&new Date(value).toISOString().slice(0,10)===date?value:null;
};
const sha256=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);
const validAggregate=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;

function validArchivedQuery(read:ArchivedSource,source:SourceDescription):boolean {
  try {
    const u=new URL(read.queryUrl);
    if(u.origin+u.pathname!==source.endpoint)return false;
    const p=u.searchParams, expected=expectations[source.id];
    const allowed=new Set(['$select','$where','$group','$order','$limit']);
    if([...p.keys()].some(k=>!allowed.has(k)) || new Set([...p.keys()]).size!==[...p.keys()].length)return false;
    const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
    return p.get('$select')===expected.select &&
      normalize(p.get('$where')??'')===normalize(expected.where) &&
      p.get('$group')===expected.group &&
      p.get('$order')===expected.order &&
      p.get('$limit')===expected.limit;
  } catch {return false;}
}

/**
 * Input is the frozen historical aggregate, not the original response bytes.
 * Publisher dataset descriptions are independently documented in the P1
 * protocol, not inferred from the archive itself.
 */
export function assessMihmManhattanSourceMetrology(archive:MihmManhattanP1Archive):MihmP1MetrologyResult {
  const reasons:string[]=[];
  const sourceReads=Array.isArray(archive?.sourceReads)?archive.sourceReads:[];
  const rows=Array.isArray(archive?.rows)?archive.rows:[];
  if(archive?.contract!=='MIHM-MANHATTAN-365D-RETROSPECTIVE-EVIDENCE-0.1')reasons.push('ARCHIVE_CONTRACT_MISMATCH');
  if(archive?.dataAsOfOriginalDates!=='NOT_VERIFIED')reasons.push('HISTORICAL_SOURCE_VINTAGE_PROMOTION_UNSUPPORTED');
  if(archive?.scientificStatus!=='RETROSPECTIVE_OBSERVED_NOT_PROSPECTIVE_PRE_REGISTERED')reasons.push('ARCHIVE_SCIENTIFIC_CLASSIFICATION_CHANGED');
  if(!archive?.scope||archive.scope.first!=='2025-10-01'||archive.scope.last!=='2026-09-30'||archive.scope.days!==365)reasons.push('COHORT_BOUNDARY_CHANGED');
  if(archive?.geographyCompatibility!=='HETEROGENEOUS_BOROUGH_VS_NESTED_CBD')reasons.push('GEOGRAPHIC_SUPPORT_CONFLATED');
  if(rows.length!==365)reasons.push('DAILY_ARCHIVE_ROW_COUNT_MISMATCH');
  if(sourceReads.length!==3 || new Set(sourceReads.map(r=>r?.source)).size!==3)reasons.push('SOURCE_COUNT_OR_IDENTITY_MISMATCH');
  const sources=metadata.map(source=>{
    const read=sourceReads.find(r=>r?.source===source.id);
    const e=expectations[source.id];
    const queryValidated=Boolean(read&&validArchivedQuery(read,source));
    if(!queryValidated)reasons.push('SOURCE_QUERY_NOT_REPRODUCIBLE:'+source.id);
    if(!read||read.observed!==e.count||!Array.isArray(read.missing)||read.missing.length!==0||
      !sha256(read.sourceResponseSha256)||!Number.isSafeInteger(read.bytes)||read.bytes<=0){
      reasons.push('SOURCE_RESPONSE_METADATA_INCOMPLETE:'+source.id);
    }
    return {...source,queryValidated,aggregateCount:read?.observed??0,
      sourceResponseSha256:read?.sourceResponseSha256??'',
      sourceResponseHashRecomputedFromOriginalBytes:false as const,
      asOfEachHistoricTarget:'NOT_VERIFIED' as const,eligibleForProspectiveCalibration:false as const};
  });
  const seen=new Set<string>();const violations:string[]=[];
  for(let i=0;i<rows.length;i++){
    const row=rows[i];const ms=dateMs(row?.day);
    if(ms===null || seen.has(row.day) ||
      (i===0&&row.day!=='2025-10-01') ||
      (i>0&&ms-(dateMs(rows[i-1]?.day)??NaN)!==86400000) ||
      (i===rows.length-1&&row.day!=='2026-09-30')){
      reasons.push('INCOMPLETE_DUPLICATE_OR_INVALID_CALENDAR');
      break;
    }
    seen.add(row.day);
    if(!dimensionProfiles.every(p=>validAggregate(row[p.dimension]))){
      reasons.push('MISSING_OR_NONINTEGER_MEASUREMENT:'+row.day);
      break;
    }
    if(row.crzEntries>row.cbdEntries)violations.push(row.day);
  }
  if(violations.length)reasons.push('CRZ_OUTSIDE_CBD_SUBSET');
  const dimensions=dimensionProfiles.map(profile=>{
    const sourceFieldArea=archive?.sourceAreaUnits?.[profile.dimension];
    if(sourceFieldArea!==profile.geography)reasons.push('DIMENSION_GEOGRAPHY_MISMATCH:'+profile.dimension);
    const values=rows.map(r=>r?.[profile.dimension]).filter(validAggregate);
    return {...profile,min:values.length?Math.min(...values):null,
      max:values.length?Math.max(...values):null,
      measuredDays:values.length,zeroDays:values.filter(x=>x===0).length,
      denominatorVerifiedFromRawRows:false as const};
  });
  if(typeof archive?.provenance?.githubAction!=='string'||
    archive.provenance.githubAction!=='https://github.com/Aptymok/system-friction/actions/runs/40196382569' ||
    archive.provenance.collector!=='scripts/research/mihm-manhattan-365d-source.mjs'){
    reasons.push('SOURCE_COLLECTION_LINEAGE_MISSING');
  }
  return {
    contract:MIHM_FOUNDATION_P1_METROLOGY,
    status:reasons.length?'ABSTAINED_ARCHIVE_INCONSISTENT':'DOCUMENTARY_STRUCTURE_VALID_WITH_VINTAGE_BLOCKED',
    reasons,sourceCount:sourceReads.length,recordedDays:rows.length,measurements:rows.length*4,
    scope:archive?.scope??{first:'',last:'',days:0},sources,dimensions,
    nestedVehicleEntryConstraint:{
      status:violations.length?'FAILED':rows.length===365&&reasons.every(r=>!r.startsWith('MISSING_OR_NONINTEGER_MEASUREMENT'))?'PASS':'UNKNOWN',
      outOfOrderDays:violations,
      calculatedGapMeaning:'CBD minus CRZ counts entries remaining on excluded roadways, not missing trips or system loss',
    },
    sourceReleaseTimeline:{
      sourceCaptureRun:archive?.provenance?.githubAction??null,
      sourceCaptureRunCreatedAt:'2026-10-25T13:10:13Z',
      eventTimeIsPublicationTime:false,
      publisherUpdateCadenceIsVintageProof:false,
      calendarBucketTimezoneIndependentlyEstablished:false,
      originalSourceVintagesAttested:false,
    },
    causalPropagationValidated:false,canonicalPhiCalculated:false,homeostasisEstablished:false,
    sourceValuesIndependentlyRecomputed:false,historicalForecastAsOfVerified:false,
    readOnly:true,productionPromotionAllowed:false
  };
}
