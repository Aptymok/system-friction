/**
 * MIHM Manhattan: audit official MTA daily road-traffic alternatives, March 2026.
 * Published dataset sayj-mze2 has date, mode, count. Do NOT relabel systemwide
 * Bridges & Tunnels volumes as Manhattan road speeds, and do NOT impute CBD
 * from the Subway mode. CBD/CRZ only if specifically named by provider.
 * --self-test offline; --probe bounded public read of <=500 aggregates.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const API='https://data.ny.gov/resource/sayj-mze2.json';
const DAYS=Array.from({length:31},(_,i)=>'2026-03-'+String(i+1).padStart(2,'0'));
function sourceUrl(){
  const u=new URL(API);
  for(const [k,v] of Object.entries({
    '$select':'date,mode,count',
    '$where':"date >= '2026-03-01T00:00:00' AND date < '2026-04-01T00:00:00'",
    '$order':'date ASC,mode ASC','$limit':'500'
  }))u.searchParams.set(k,v);
  return u.toString();
}
function classify(mode){
  if(/central business district|congestion relief zone|\bcbd\b|\bcrz\b/i.test(mode))
    return 'CBD_ZONE_TRAFFIC_CANDIDATE';
  if(/bridge|tunnel/i.test(mode))return 'MTA_BRIDGES_TUNNELS_SYSTEMWIDE_NOT_MANHATTAN';
  if(/subway|bus|rail|ride|ferry/i.test(mode))return 'NOT_ROAD_TRAFFIC';
  return 'UNKNOWN_REQUIRES_PROVIDER_SEMANTICS';
}
function inspect(raw){
  assert(Array.isArray(raw)&&raw.length<=500,'Unexpected unbounded source read');
  const modes=new Map();
  for(const row of raw){
    const day=String(row.date??'').slice(0,10),mode=String(row.mode??'').trim(),
      count=Number(row.count);
    if(!DAYS.includes(day))throw Error('OUTSIDE_DEVELOPMENT_MONTH');
    if(!mode||!Number.isFinite(count)||count<0)throw Error('INVALID_DAILY_MODE_COUNT');
    if(!modes.has(mode))modes.set(mode,new Map());
    if(modes.get(mode).has(day))throw Error('DUPLICATE_MODE_DAY');
    modes.get(mode).set(day,count);
  }
  const output=[...modes].map(([mode,byDate])=>({
    mode,semanticClass:classify(mode),days:byDate.size,
    missingDays:DAYS.filter(d=>!byDate.has(d)),
    marchDailyValues:classify(mode)==='CBD_ZONE_TRAFFIC_CANDIDATE'?
      Object.fromEntries(byDate):null,
    interpretability:classify(mode)==='CBD_ZONE_TRAFFIC_CANDIDATE'?
      'Zone-labelled traffic. Actual boundary/entries semantics require provider dictionary.' :
      'Not directly a Manhattan-local road-speed or CBD-vehicle measure.'
  }));
  return {
    source:'MTA Daily Ridership and Traffic sayj-mze2',
    sourceBoundary:'MTA systemwide with potential CBD-specific mode',
    declaredMonth:'2026-03',
    sourceSnapshotVintage:'NOT_VERIFIED_AS_OF_EACH_ORIGINAL_DAY',
    observedRows:raw.length,
    discoveredModes:output,
    CBDModeCandidates:output.filter(m=>m.semanticClass==='CBD_ZONE_TRAFFIC_CANDIDATE').length,
    readyForMIHMCausalPromotion:false,
    useAsDOTSpeed:false,
    scientificStatus:'READ_ONLY_SOURCE_CANDIDATE_AUDIT'
  };
}
function offline(){
  assert(sourceUrl().includes('2026-03-01'));
  const x=inspect([
    {date:'2026-03-01T00:00:00',mode:'Central Business District',count:'300000'},
    {date:'2026-03-01T00:00:00',mode:'Bridges and Tunnels',count:'200000'}]);
  assert.equal(x.CBDModeCandidates,1);
  assert.equal(x.discoveredModes[0].days,1);
  assert.equal(x.discoveredModes[1].semanticClass,'MTA_BRIDGES_TUNNELS_SYSTEMWIDE_NOT_MANHATTAN');
  assert.throws(()=>inspect([{date:'2026-07-01',mode:'CBD',count:'2'}]),/OUTSIDE_DEVELOPMENT/);
  assert.throws(()=>inspect([{date:'2026-03-01',mode:'CBD',count:'2'},
    {date:'2026-03-01',mode:'CBD',count:'3'}]),/DUPLICATE/);
  const panel=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-MANHATTAN-NESTED-TRAFFIC-MARCH-2026.json','utf8'));
  const earlier=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-MANHATTAN-PARTIAL-MARCH-2026.json','utf8'));
  assert.equal(panel.contract,'MIHM-MANHATTAN-HETEROGENEOUS-DAILY-2026-03-v1');
  assert.equal(panel.spatialCompatibility,
    'HETEROGENEOUS_NESTED_AREA_NOT_DIRECTLY_EQUIVALENT');
  assert.equal(panel.rows.length,31,'Complete archived daily panel');
  assert.deepEqual(panel.rows.map(r=>r.day),
    Array.from({length:31},(_,i)=>'2026-03-'+String(i+1).padStart(2,'0')));
  assert.equal(panel.sourceAsOfT0,'NOT_VERIFIED');
  for(let i=0;i<panel.rows.length;i++){
    const r=panel.rows[i],prev=earlier.rows[i];
    assert.equal(r.day,prev.day);
    assert.equal(r.service311,prev.service311);
    assert.equal(r.fdnyCount,prev.fdnyCount);
    assert(Number.isInteger(r.cbdEntries)&&r.cbdEntries>0);
    assert(Number.isInteger(r.crzEntries)&&r.crzEntries>0);
    assert(r.cbdEntries>=r.crzEntries,
      'CBD contains CRZ plus excluded roadways; protect nested semantics');
    assert.equal(r.estimatedExcludedRoadwayEntries,r.cbdEntries-r.crzEntries);
  }
  const mta=panel.agencySources.find(x=>x.source==='MTA');
  assert(/^[a-f0-9]{64}$/.test(mta.responseSha256));
  assert(panel.limitations.some(x=>x.includes('No out-of-time')));

  console.log(JSON.stringify({status:'MTA_CBD_ALTERNATIVE_OFFLINE_PASS',
    observedTrafficData:false,notManhattanSpeed:true}));
}
async function probe(){
  const url=sourceUrl();
  try{
    const resp=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{Accept:'application/json'}});
    if(!resp.ok)throw Error('HTTP_'+resp.status);
    if(Number(resp.headers.get('content-length')||'0')>150000)throw Error('OVER_BUDGET');
    const bytes=Buffer.from(await resp.arrayBuffer());
    if(bytes.length>150000)throw Error('OVER_BUDGET');
    const result=inspect(JSON.parse(bytes.toString('utf8')));
    console.log(JSON.stringify({...result,queryUrl:url,bytes:bytes.length,
      rawResponseSha256:createHash('sha256').update(bytes).digest('hex')},null,2));
  }catch(e){console.log(JSON.stringify({source:'MTA sayj-mze2',
      status:'INDETERMINATE',error:String(e),notAFailedMIHMHypothesis:true},null,2))}
}
if(process.argv.includes('--self-test'))offline();
else if(process.argv.includes('--probe'))await probe();
else throw Error('Use --self-test or explicit --probe');
