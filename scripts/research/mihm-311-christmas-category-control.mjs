/**
 * 2025-12-24/25 Christmas non-snow CATEGORY negative control.
 * Source and date/outcome selections frozen in MIHM Foundation research
 * program before source read. Historical test; no causal or canonical claims.
 *
 * --self-test : offline source guards, no requests.
 * --collect   : ONE bounded official NYC311 aggregate read, 0 retries.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const API='https://data.cityofnewyork.us/resource/erm2-nwe9.json';
const PANEL='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const STORM='docs/research/evidence/MIHM-311-DEC2025-SNOW-TRANSFER-OBSERVED.json';
const DAYS=['2025-12-10','2025-12-11','2025-12-17','2025-12-18','2025-12-24','2025-12-25'];
const CONTROLS=[
  {date:'2025-12-24',baseline:['2025-12-10','2025-12-17'],oneWeek:'2025-12-17',snowInches:0},
  {date:'2025-12-25',baseline:['2025-12-11','2025-12-18'],oneWeek:'2025-12-18',snowInches:0}
];
const GROUPS=['HEAT_OR_HOT_WATER','NOISE','WINTER_OR_STREET_ACCESS','OTHER'];
const mean=x=>x.reduce((s,n)=>s+n,0)/x.length;
const round=n=>Math.round(n*1000)/1000;
const wd=d=>new Date(d+'T12:00:00Z').getUTCDay();
function sourceUrl(){
  const twoDayStarts=['2025-12-10','2025-12-17','2025-12-24'];
  const ranges=twoDayStarts.map(d=>{
    const next=new Date(Date.parse(d+'T12:00:00Z')+2*86400000).toISOString().slice(0,10);
    return "(created_date >= '"+d+"T00:00:00' AND created_date < '"+next+"T00:00:00')";
  });
  const u=new URL(API);
  for(const [k,v] of Object.entries({
    '$select':'date_trunc_ymd(created_date) as day,complaint_type,count(*) as n',
    '$where':"borough = 'MANHATTAN' AND ("+ranges.join(' OR ')+")",
    '$group':'day,complaint_type','$order':'day ASC,complaint_type ASC',
    '$limit':'1200'
  }))u.searchParams.set(k,v);
  return u.toString();
}
function group(cat){
  if(/heat|hot.water|boiler/i.test(cat))return 'HEAT_OR_HOT_WATER';
  if(/noise/i.test(cat))return 'NOISE';
  if(/snow|ice|plow|street.condition|sidewalk|blocked.driveway|parking/i.test(cat))
    return 'WINTER_OR_STREET_ACCESS';
  return 'OTHER';
}
function parse(rows){
  assert(Array.isArray(rows)&&rows.length>0&&rows.length<1200,'TRUNCATED_OR_EMPTY_AGGREGATE');
  const d=new Map();
  for(const item of rows){
    const day=String(item.day??'').slice(0,10),cat=item.complaint_type===null?
      '[UNCLASSIFIED]':String(item.complaint_type??'').trim(),n=Number(item.n);
    if(!DAYS.includes(day))throw Error('UNAUTHORIZED_DAY');
    if(!cat||!Number.isSafeInteger(n)||n<=0)throw Error('INVALID_CATEGORY_RECORD');
    if(!d.has(day))d.set(day,new Map());
    if(d.get(day).has(cat))throw Error('DUPLICATE_CATEGORY_DAY');
    d.get(day).set(cat,n);
  }
  if(DAYS.some(day=>!d.has(day)))throw Error('REQUIRED_DAY_NOT_OBSERVED');
  return Object.fromEntries(DAYS.map(day=>[day,Object.fromEntries(d.get(day))]));
}
function analyze(categories,panel,storm){
  assert.equal(panel.contract,'MIHM-MANHATTAN-365D-RETROSPECTIVE-EVIDENCE-0.1');
  assert.equal(storm.contract,'MIHM-311-DEC2025-NWS-CHANNEL-TRANSFER-0.1');
  assert(storm.hypothesis.replicationPrimaryPass===true);
  assert(DAYS.every(d=>categories[d]&&Object.keys(categories[d]).length>0),'MISSING_SELECTED_DAY');
  const annual=new Map(panel.rows.map(x=>[x.day,x.service311]));
  const revisions=[];
  const byDate=Object.fromEntries(DAYS.map(day=>{
    const values=categories[day];
    for(const [cat,n] of Object.entries(values))
      assert(cat&&Number.isSafeInteger(n)&&n>0,'INVALID_CATEGORY_VALUE');
    const total=Object.values(values).reduce((a,b)=>a+b,0);
    if(total!==annual.get(day))revisions.push({day,archivedDailyTotal:annual.get(day),
      currentComplaintTypeSum:total});
    const byGroup=Object.fromEntries(GROUPS.map(g=>[g,Object.entries(values)
      .filter(([name])=>group(name)===g).reduce((acc,[,n])=>acc+n,0)]));
    const snow=values['Snow or Ice']??0;
    assert(snow<=byGroup.WINTER_OR_STREET_ACCESS,'SNOW_COUNT_PARTITION');
    return [day,{date:day,total,byGroup,snowOrIce:snow,
      nonHeating:total-byGroup.HEAT_OR_HOT_WATER,
      categoryCount:Object.keys(values).length}];
  }));
  const computed=CONTROLS.map(c=>{
    assert(c.baseline.every(d=>d<c.date&&wd(d)===wd(c.date)),
      'CONTROL_BASELINE_LEAK_OR_WEEKDAY_MISMATCH');
    const now=byDate[c.date],refs=c.baseline.map(d=>byDate[d]);
    const valuesOf=x=>({total:x.total,nonHeating:x.nonHeating,snowOrIce:x.snowOrIce,
      heat:x.byGroup.HEAT_OR_HOT_WATER,noise:x.byGroup.NOISE,
      winter:x.byGroup.WINTER_OR_STREET_ACCESS,other:x.byGroup.OTHER});
    const nowValues=valuesOf(now),baseline=Object.fromEntries(Object.keys(nowValues)
      .map(k=>[k,mean(refs.map(r=>valuesOf(r)[k]))]));
    const one=valuesOf(byDate[c.oneWeek]);
    const change=Object.fromEntries(Object.keys(nowValues).map(k=>[k,{
      actual:nowValues[k],priorTwoWeekMean:round(baseline[k]),
      difference:round(nowValues[k]-baseline[k]),
      pct:baseline[k]>0?round(100*(nowValues[k]/baseline[k]-1)):null,
      priorOneWeek:one[k],
      oneWeekDifference:nowValues[k]-one[k]}]));
    return {date:c.date,referenceDates:c.baseline,noSnowInCentralParkInches:c.snowInches,
      change,groupTotals:now.byGroup,actualSnowOrIce:now.snowOrIce};
  });
  const christmas=computed.find(x=>x.date==='2025-12-25');
  const stormOnsetPct=storm.primary.onset.values.nonHeating.pct;
  const H1=christmas.change.nonHeating.difference<0;
  const H2=christmas.actualSnowOrIce<storm.categories['2025-12-27'].snowOrIce&&
    christmas.change.snowOrIce.difference<=0;
  const H3=christmas.change.nonHeating.pct<=stormOnsetPct;
  return {
    contract:'MIHM-311-CHRISTMAS-CATEGORY-NOSNOW-FALSIFICATION-0.1',
    status:revisions.length?'ABSTAIN_SOURCE_REVISION':'OBSERVED_HOLIDAY_CATEGORY_NEGATIVE_CONTROL',
    basis:'Protocol frozen prior to this category read; full annual daily totals and snowstorm day categories previously inspected',
    source:{
      official311:'https://data.cityofnewyork.us/d/erm2-nwe9',
      oneTimeGroupBy:'Manhattan created_date local daily / complaint_type',
      originalPublicationAtT0:'NOT_VERIFIED',
      priorFrozenSnowReceipt:STORM,
      yearIndependentTotal:PANEL
    },
    categoryClassifier:'Frozen regex classifier identical to prior Dec 26/27 transfer',
    sourceRevisionVsAnnual:revisions,
    dates:byDate,negativeControls:computed,
    comparatorStorm:{
      date:'2025-12-26',observedNonHeating:storm.categories['2025-12-26'].nonHeating,
      percentageChangeVsPriorFridays:stormOnsetPct,
      followingSnowOrIceOnDec27:storm.categories['2025-12-27'].snowOrIce
    },
    hypotheses:{
      H1_holidayNonheatingDeclinesWithoutSnow:H1,
      H2_snowChannelDoesNotSpikeOnChristmas:H2,
      H3_holidayNonheatingDeclineAtLeastAsStrongAsStormOnset:H3,
      reliableConclusion:revisions.length?'ABSTAIN_SOURCE_REVISION':
        H1?'NO_SNOW_HOLIDAY_ALSO_SUPPRESSES_NONHEATING_311':'HOLIDAY_SUPPRESSION_NOT_OBSERVED',
      allPredeclaredOutcomesReported:true
    },
    limitations:[
      'This is not a natural experiment isolating holiday from snow; adjacent calendar days may carry delayed requests',
      'Previous 311 totals and December storm category outcomes were already seen',
      'Original source publication vintage at each event was not available',
      'Zero exact Snow or Ice category is admissible only with full-day category reconciliation',
      'Baseline is only two prior same weekdays; low counts are not stable percentage-change estimands',
      'Observed requests reflect reporting and classification, not physical disruption',
      'No canonical MIHM, governance causation, prospective skill or controlled RETURN has been demonstrated'
    ],
    noProductionActions:true,
    canonicalMIHMValidated:false
  };
}
function selfTest(){
  assert(sourceUrl().includes('2025-12-24'));
  assert(DAYS.every(d=>sourceUrl().includes(d)||['2025-12-11','2025-12-18','2025-12-25'].includes(d)));
  assert(group('HEAT/HOT WATER')==='HEAT_OR_HOT_WATER');
  assert(group('Snow or Ice')==='WINTER_OR_STREET_ACCESS');
  const annual=JSON.parse(readFileSync(PANEL,'utf8'));
  const storm=JSON.parse(readFileSync(STORM,'utf8'));
  const categories=Object.fromEntries(DAYS.map(day=>[day,
    {'HEAT/HOT WATER':100,'Noise - Residential':100,'Snow or Ice':1,
      OTHER:annual.rows.find(r=>r.day===day).service311-201}]));
  const x=analyze(categories,annual,storm);
  assert.equal(x.status,'OBSERVED_HOLIDAY_CATEGORY_NEGATIVE_CONTROL');
  assert.equal(x.negativeControls.length,2);
  assert(x.negativeControls.every(c=>c.referenceDates.length===2));
  assert.deepEqual(x.sourceRevisionVsAnnual,[]);
  assert.throws(()=>parse([{day:'2025-12-26',complaint_type:'Snow or Ice',n:'1'}]),/UNAUTHORIZED_DAY/);
  const drift=structuredClone(categories);drift['2025-12-25'].OTHER+=2;
  assert.equal(analyze(drift,annual,storm).status,'ABSTAIN_SOURCE_REVISION');
  const broken=structuredClone(categories);delete broken['2025-12-25'];
  assert.throws(()=>analyze(broken,annual,storm),/MISSING_SELECTED_DAY/);
  const duplicate=DAYS.map(day=>({day,complaint_type:'Snow or Ice',n:'1'}));
  assert.throws(()=>parse([...duplicate,duplicate[0]]),/DUPLICATE/);
  assert.equal(Object.keys(parse(duplicate)).length,6);
  // Verify the official research receipt without issuing a new public request.
  const evidence=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-311-CHRISTMAS-CATEGORY-NOSNOW-2025.json','utf8'));
  assert.equal(evidence.contract,'MIHM-311-CHRISTMAS-CATEGORY-NOSNOW-FALSIFICATION-0.1');
  assert.equal(evidence.status,'OBSERVED_HOLIDAY_CATEGORY_NEGATIVE_CONTROL');
  assert.equal(evidence.sourceAggregateRows,554);
  assert(/^[a-f0-9]{64}$/.test(evidence.responseSHA256));
  assert.equal(evidence.provenance.preSourceCommit,
    'f4de8e3a91a958f31914e5bcc99c7bac8ac867ed');
  assert.deepEqual(evidence.sourceRevisionVsAnnual,[]);
  assert.deepEqual(Object.keys(evidence.dates).sort(),DAYS);
  for(const day of DAYS){
    const val=evidence.dates[day];
    assert.equal(val.total,annual.rows.find(r=>r.day===day).service311,
      'Archived category sum must reconcile to earlier 365-day data');
    assert.equal(val.total,Object.values(val.byGroup).reduce((a,b)=>a+b,0));
    assert.equal(val.total,val.nonHeating+val.byGroup.HEAT_OR_HOT_WATER);
    assert(val.snowOrIce>=0&&val.snowOrIce<=val.byGroup.WINTER_OR_STREET_ACCESS);
  }
  const result=evidence.negativeControls.find(x=>x.date==='2025-12-25');
  assert.equal(result.change.nonHeating.actual,839);
  assert.equal(result.change.nonHeating.pct,-49.351);
  assert.equal(result.actualSnowOrIce,0);
  assert.equal(evidence.comparatorStorm.followingSnowOrIceOnDec27,44);
  assert(evidence.hypotheses.H1_holidayNonheatingDeclinesWithoutSnow);
  assert(evidence.hypotheses.H2_snowChannelDoesNotSpikeOnChristmas);
  assert(evidence.hypotheses.H3_holidayNonheatingDeclineAtLeastAsStrongAsStormOnset);
  assert.equal(evidence.disposition.causalityIdentified,false);
  console.log(JSON.stringify({status:'CHRISTMAS_311_CATEGORY_FALSIFICATION_OFFLINE_PASS',
    officialSourceRead:false,categoryHypothesisOutcomesIndependentOfFirstStorm:false}));
}
async function collect(){
  const u=sourceUrl();
  const response=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(40000)});
  if(!response.ok)throw Error('311_HTTP_'+response.status);
  const len=Number(response.headers.get('content-length')||0);
  if(len>200000)throw Error('RESPONSE_TOO_LARGE');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>200000)throw Error('RESPONSE_TOO_LARGE');
  const parsed=parse(JSON.parse(bytes.toString('utf8')));
  const result=analyze(parsed,JSON.parse(readFileSync(PANEL,'utf8')),
    JSON.parse(readFileSync(STORM,'utf8')));
  console.log(JSON.stringify({execution:'ONE_OFFICIAL_311_AGGREGATE_READ',
    responseSHA256:createHash('sha256').update(bytes).digest('hex'),
    responseBytes:bytes.length,sourceAggregateRows:Object.values(parsed)
      .reduce((n,v)=>n+Object.keys(v).length,0),
    sourceQueryUrl:u,...result},null,2));
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--collect'))await collect();
else throw Error('Use --self-test or --collect; no network side effects otherwise');
