/**
 * SFI MIHM Foundation — Manhattan multiplex source admission.
 * One physical area, different observation systems, no fabricated common grain.
 * Offline: node scripts/research/mihm-manhattan-multiplex-preflight.mjs --self-test
 * Opt-in bounded metadata reads:
 *   node scripts/research/mihm-manhattan-multiplex-preflight.mjs --inspect
 * No case, no production write, no raw personal/incident/station row retrieval.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const SOURCES=Object.freeze([
  {id:'NYC311',agency:'NYC 311',dataset:'erm2-nwe9',origin:'https://data.cityofnewyork.us',
    required:['created_date','borough','complaint_type','unique_key'],
    temporal:'created_date',spatial:'borough',measure:'number of service requests',
    grain:'individual request, aggregate by day and borough',
    interpretation:'reporting activity, NOT independently verified physical incident'},
  {id:'FDNY',agency:'FDNY',dataset:'8m42-w767',origin:'https://data.cityofnewyork.us',
    required:['incident_datetime','incident_borough','incident_response_seconds_qy','valid_incident_rspns_time_indc'],
    temporal:'incident_datetime',spatial:'incident_borough',
    measure:'dispatch count and eligible first-unit response seconds',
    grain:'dispatch event, aggregate by day and borough',
    interpretation:'dispatch activity and selectively eligible response time, NOT failure of infrastructure'},
  {id:'MTA',agency:'Metropolitan Transportation Authority',dataset:'5wq4-mkjj',origin:'https://data.ny.gov',
    required:['transit_timestamp','borough','transit_mode','station_complex_id','ridership'],
    temporal:'transit_timestamp',spatial:'borough',
    measure:'estimated subway entries',grain:'hour and fare type at station complex',
    interpretation:'estimated fare-based entries, not trips or actual disruptions'},
  {id:'DOT',agency:'NYC Department of Transportation',dataset:'6a2s-2t65',origin:'https://data.cityofnewyork.us',
    required:['link_name','borough','median_calculation_timestamp','median_speed_fps'],
    temporal:'median_calculation_timestamp',spatial:'borough',
    measure:'median speed by link at calculation timestamp (feet per second)',
    grain:'road link / calculation timestamp, borough provided by DOT',
    interpretation:'observed link speeds; provider borough labels and road-link sampling must be quality checked before inference'},
  {id:'FDNY_NYFIRS_ARCHIVE',agency:'FDNY',dataset:'tm6d-hbzd',origin:'https://data.cityofnewyork.us',
    required:['incident_date_time','units_onscene','total_incident_duration'],
    temporal:'incident_date_time',spatial:null,
    measure:'units recorded as on-scene for incident',
    grain:'post-response incident reporting, NOT contemporaneous capacity',
    interpretation:'historical source last updated 2025-10-10; INELIGIBLE until 2026 overlap proven',
    predeclaredStatus:'ARCHIVE_NOT_ADMITTED'},
]);

const DOI='MIHM-MANHATTAN-MULTIPLEX-0.1';
function summarize(spec,metadata){
  const actual=new Map((metadata.columns??[]).map(c=>[c.fieldName,{
    apiField:c.fieldName,type:c.dataTypeName,label:c.name}]));
  const missing=spec.required.filter(n=>!actual.has(n));
  const trafficCandidates=[...actual.values()].filter(c=>/speed|travel|timestamp|date|borough|link|street|segment|reader|route|location/i.test(c.apiField));
  const sourceUpdate=metadata.rowsUpdatedAt??null;
  const result={
    contract:DOI,source:spec.id,datasetId:spec.dataset,api:spec.origin+'/resource/'+spec.dataset+'.json',
    agency:spec.agency,sourceLastUpdateUnix:sourceUpdate,
    sourceMetadataLastModifiedUnix:metadata.viewLastModified??null,
    schemaFields:actual.size,expectedGrain:spec.grain,measure:spec.measure,
    interpretation:spec.interpretation,
    temporalField:spec.temporal,spatialField:spec.spatial,
    requiredMissing:missing,trafficCandidateFields:spec.id==='DOT'?trafficCandidates:[],
    observationBoundaries:{area:'MANHATTAN_BOROUGH',clock:'America/New_York',
      eventRange:['2025-07-01','2026-09-30'],originalAsOfPublication:'UNKNOWN'},
  };
  if(spec.predeclaredStatus)result.admission=spec.predeclaredStatus;
  else if(missing.length)result.admission='SCHEMA_UNVERIFIED';
  else if(!spec.temporal||!spec.spatial)result.admission='SPATIAL_TEMPORAL_CROSSWALK_REQUIRED';
  else if(spec.id==='DOT')result.admission='SOURCE_BOROUGH_FIELD_REQUIRES_VALUE_AND_LINK_AUDIT';
  else result.admission='SCHEMA_READY_SOURCE_ROWS_NOT_FETCHED';
  result.dataCoverage='NOT_VERIFIED';
  result.asOfTimeReconstruction='NOT_VERIFIED';
  return result;
}
function gate(result){
  if(result.admission==='ARCHIVE_NOT_ADMITTED')return {action:'EXCLUDE_FROM_2026_STUDY',reason:'Historical coverage and event-time resource semantics not demonstrated'};
  if(result.admission==='SCHEMA_UNVERIFIED')return {action:'ABSTAIN',reason:'Required source fields absent'};
  if(result.admission==='SPATIAL_TEMPORAL_CROSSWALK_REQUIRED')return {action:'VERIFY_CROSSWALK_FIRST',reason:'No adequate spatial and temporal field declaration'};
  if(result.admission==='SOURCE_BOROUGH_FIELD_REQUIRES_VALUE_AND_LINK_AUDIT')return {action:'VERIFY_BOROUGH_VALUES_LINK_COVERAGE_AND_SAMPLING',reason:'DOT supplies borough, link_name and median_speed_fps; verify actual values, missing days and sampling before admission'};
  return {action:'VERIFY_COVERAGE_AND_VINTAGE',reason:'Schema alone does not establish full period coverage, latency or T0 knowledge'};
}
function admittedGraph(edges,nodes){
  // Any directed edge must be declared and separately supported; correlation is not a typed causal relation.
  const have=new Set(nodes.map(n=>n.source));
  for(const edge of edges)if(!have.has(edge.from)||!have.has(edge.to)||!edge.evidenceRef||
      !edge.temporalLagDays||edge.temporalLagDays<1||!edge.mechanism){
    throw Error('UNSUPPORTED_CROSS_SOURCE_RELATION');
  }
  return edges;
}
async function fetchJsonBounded(url,budget=1700000){
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw Error('SCHEMA_HTTP_'+response.status);
  const hinted=Number(response.headers.get('content-length')??'0');
  if(hinted>budget)throw Error('SCHEMA_BYTES_ANNOUNCED_OVER_BUDGET');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>budget)throw Error('SCHEMA_BYTES_OVER_BUDGET');
  return {json:JSON.parse(bytes.toString('utf8')),
    sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
}
async function inspect(){
  const output=[];
  // Sequential reads, no more than 5 metadata endpoints and no event/person raw rows.
  for(const spec of SOURCES){
    try{
      const url=spec.origin+'/api/views/'+spec.dataset+'.json';
      const got=await fetchJsonBounded(url);
      const result=summarize(spec,got.json);
      output.push({...result,metadataUrl:url,metadataSha256:got.sha256,
        metadataBytes:got.bytes,gate:gate(result)});
    }catch(e){
      output.push({contract:DOI,source:spec.id,datasetId:spec.dataset,
        admission:'INDETERMINATE',error:String(e),dataCoverage:'NOT_VERIFIED'});
    }
  }
  output.push({contract:DOI,source:'NOAA_CENTRAL_PARK',provider:'NOAA NCEI',
    station:'GHCND:USW00094728',
    reference:'https://www.ncdc.noaa.gov/cdo-web/datasets/GHCND/stations/GHCND%3AUSW00094728/detail',
    requestedMeasures:['daily precipitation','daily temperature'],
    admission:'STATION_REFERENCE_ONLY',
    gate:{action:'VALIDATE_OBSERVATION_AND_PUBLICATION_TIMESTAMPS',
      reason:'Station site is not an actual verified day-by-day dataset extract'},
    dataCoverage:'NOT_VERIFIED',originalAsOfPublication:'UNKNOWN'});
  console.log(JSON.stringify({contract:DOI,executed:'READ_ONLY_SOURCE_METADATA',sourceCount:output.length,
    geography:'Manhattan borough, not Manhattan borough plus silently unrelated segments',
    scientificStatus:'FEASIBILITY_NOT_EMPIRICAL_MIHM_VALIDATION',
    sources:output},null,2));
}
function test(){
  const m={rowsUpdatedAt:1750000000,columns:[
    {fieldName:'created_date',dataTypeName:'calendar_date'},
    {fieldName:'borough',dataTypeName:'text'},
    {fieldName:'complaint_type',dataTypeName:'text'},
    {fieldName:'unique_key',dataTypeName:'text'}]};
  const a=summarize(SOURCES[0],m);
  assert.equal(a.admission,'SCHEMA_READY_SOURCE_ROWS_NOT_FETCHED');
  assert.equal(gate(a).action,'VERIFY_COVERAGE_AND_VINTAGE');
  assert.equal(a.dataCoverage,'NOT_VERIFIED');
  const removed=summarize(SOURCES[0],{...m,columns:m.columns.slice(1)});
  assert.equal(removed.admission,'SCHEMA_UNVERIFIED');
  assert.equal(gate(removed).action,'ABSTAIN');
  const link=summarize(SOURCES[3],{columns:[
    {fieldName:'median_speed_fps',dataTypeName:'number'},
    {fieldName:'link_name',dataTypeName:'text'},
    {fieldName:'borough',dataTypeName:'text'},
    {fieldName:'median_calculation_timestamp',dataTypeName:'calendar_date'}]});
  assert.equal(link.admission,'SOURCE_BOROUGH_FIELD_REQUIRES_VALUE_AND_LINK_AUDIT');
  assert.equal(gate(link).action,'VERIFY_BOROUGH_VALUES_LINK_COVERAGE_AND_SAMPLING');
  const archive=summarize(SOURCES[4],{columns:SOURCES[4].required.map(fieldName=>({fieldName}))});
  assert.equal(gate(archive).action,'EXCLUDE_FROM_2026_STUDY');
  assert.throws(()=>admittedGraph([{from:'MTA',to:'FDNY',temporalLagDays:1,mechanism:'',evidenceRef:'source:1'}],
    [{source:'MTA'},{source:'FDNY'}]),/UNSUPPORTED/);
  assert.deepEqual(admittedGraph([],[]),[]);
  console.log(JSON.stringify({status:'SYNTHETIC_PREFLIGHT_PASS',sourceCount:SOURCES.length,
    realDataIngested:false,claimsOfCausalEdges:false}));
}
const args=process.argv.slice(2);
if(args.includes('--self-test'))test();
else if(args.includes('--inspect'))await inspect();
else throw Error('Use --self-test or --inspect; external schema reads require explicit opt-in.');
