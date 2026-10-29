/**
 * 311 request-type decomposition, 2 NWS snow episodes, Manhattan 2026.
 * Experimental design frozen in MIHM Foundation BEFORE THIS SOURCE READ.
 * Read only daily category counts; never source row IDs, persons or locations.
 * This is exploration of reporting composition, NOT a causal snow effect.
 *
 * --self-test : no external calls; tests leakage/missingness/decomposition.
 * --collect   : exactly 2 separate bounded official aggregate requests, no retries.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const API='https://data.cityofnewyork.us/resource/erm2-nwe9.json';
const YEAR='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const SAVED='docs/research/evidence/MIHM-311-JAN-FEB-SNOW-COMPOSITION-OBSERVED-2026.json';
const EVENTS=[
  {id:'JAN_SNOW',day:'2026-01-25',baseline:['2026-01-11','2026-01-18']},
  {id:'JAN_FOLLOWING',day:'2026-01-26',baseline:['2026-01-12','2026-01-19']},
  {id:'FEB_BLIZZARD',day:'2026-02-23',baseline:['2026-02-09','2026-02-16']},
  {id:'FEB_FOLLOWING',day:'2026-02-24',baseline:['2026-02-10','2026-02-17']}
];
const SOURCE_WINDOWS=[
  {name:'JAN',start:'2026-01-10T00:00:00',end:'2026-01-27T00:00:00'},
  {name:'FEB',start:'2026-02-08T00:00:00',end:'2026-02-25T00:00:00'}
];
const SELECTED=[...new Set(EVENTS.flatMap(e=>[e.day,...e.baseline]))].sort();
const weekday=d=>new Date(d+'T12:00:00Z').getUTCDay();
for(const e of EVENTS){
  assert.equal(e.baseline.length,2,'Two declared earlier weekday baselines');
  for(const prior of e.baseline){
    assert(prior<e.day,'Baseline dates must precede target');
    assert.equal(weekday(prior),weekday(e.day),'Reference same-day-of-week matching');
  }
}
// Post-extraction taxonomy collision repair: NOISE label always dominates
// the shared "Street/Sidewalk" substring. Recorded original grouping remains
// in SAVED. This is exploratory calibration, not independent confirmation.
const GROUPS=['HEAT_OR_HOT_WATER','NOISE','WINTER_OR_STREET_ACCESS','OTHER'];
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const round=n=>Math.round(n*1000)/1000;
function classify(category){
  if(/heat|hot.water|boiler/i.test(category))return 'HEAT_OR_HOT_WATER';
  if(/noise/i.test(category))return 'NOISE';
  if(/snow|ice|plow|street.condition|sidewalk|blocked.driveway|parking/i.test(category))
    return 'WINTER_OR_STREET_ACCESS';
  return 'OTHER';
}
function urlFor(w){
  const u=new URL(API);
  const props={
    '$select':'date_trunc_ymd(created_date) as day,complaint_type,count(*) as n',
    '$where':"created_date >= '"+w.start+"' AND created_date < '"+w.end+"' AND borough = 'MANHATTAN'",
    '$group':'day,complaint_type',
    '$order':'day ASC,complaint_type ASC',
    '$limit':'4000'
  };
  for(const [k,v] of Object.entries(props))u.searchParams.set(k,v);
  return u.toString();
}
function parse(w,rows){
  assert(Array.isArray(rows)&&rows.length<4000,'CATEGORICAL_ROWS_TRUNCATED_OR_UNBOUNDED');
  const stored=new Map(), allDates=new Map();
  for(const r of rows){
    const day=String(r.day??'').slice(0,10),
      name=r.complaint_type==null?'[UNCLASSIFIED]':String(r.complaint_type).trim(),
      n=Number(r.n);
    if(day<w.start.slice(0,10)||day>=w.end.slice(0,10))
      throw Error('SOURCE_DAY_OUTSIDE_DECLARED_QUERY');
    if(!name||!Number.isSafeInteger(n)||n<=0)throw Error('INVALID_AGGREGATE_CATEGORY');
    if(!allDates.has(day))allDates.set(day,new Map());
    const cat=allDates.get(day);
    if(cat.has(name))throw Error('DUPLICATE_CATEGORY_FOR_DAY');
    cat.set(name,n);
    if(SELECTED.includes(day))stored.set(day,cat);
  }
  const selectedInWindow=SELECTED.filter(d=>d>=w.start.slice(0,10)&&d<w.end.slice(0,10));
  for(const day of selectedInWindow)if(!stored.has(day))throw Error('SELECTED_DAY_MISSING '+day);
  return {window:w.name,allCategoryRows:rows.length,observedDays:allDates.size,
    selected:Object.fromEntries([...stored].map(([d,m])=>[d,Object.fromEntries(m)]))};
}
function summarize(parsed,official){
  const categoryByDay=new Map(Object.entries(parsed).map(([d,x])=>[d,x]));
  const archive=new Map(official.rows.map(r=>[r.day,r.service311]));
  if(SELECTED.length!==12)throw Error('Expected 12 distinct days');
  const daily=SELECTED.map(d=>{
    const obj=categoryByDay.get(d);
    if(!obj)throw Error('MISSING_SOURCE_COMPLAINT_DAY '+d);
    const n=Object.values(obj).reduce((s,x)=>s+x,0),base=archive.get(d);
    assert(Number.isFinite(base)&&base>0,'MISSING_YEARLY_TOTAL');
    return {day:d,categoryTypes:Object.keys(obj).length,totalCount:n,
      archiveTotal:base,sourceRevisionDelta:n-base,
      sourceRevisionPct:round(100*(n/base-1))};
  });
  const cases=EVENTS.map(e=>{
    const now=categoryByDay.get(e.day);
    const prior=e.baseline.map(d=>categoryByDay.get(d));
    const allNames=[...new Set([...(Object.keys(now)),...prior.flatMap(x=>Object.keys(x))])].sort();
    const delta=allNames.map(category=>{
      const current=now[category]||0,baselineMean=mean(prior.map(x=>x[category]||0));
      return {category,group:classify(category),current,baselineMean,
        difference:round(current-baselineMean)};
    });
    const priorTotals=prior.map(x=>Object.values(x).reduce((s,v)=>s+v,0));
    const totalCount=Object.values(now).reduce((s,v)=>s+v,0);
    const deltaTotal=totalCount-mean(priorTotals);
    assert(Math.abs(delta.reduce((a,b)=>a+b.difference,0)-deltaTotal)<0.00001,
      'ALL_CATEGORY_DELTAS_MUST_RECONCILE');
    const groups=Object.fromEntries(GROUPS.map(g=>[g,{
      current:delta.filter(v=>v.group===g).reduce((a,b)=>a+b.current,0),
      priorMean:round(delta.filter(v=>v.group===g).reduce((a,b)=>a+b.baselineMean,0)),
      delta:round(delta.filter(v=>v.group===g).reduce((a,b)=>a+b.difference,0))
    }]));
    assert(Math.abs(GROUPS.reduce((a,g)=>a+groups[g].delta,0)-deltaTotal)<0.00001,
      'UNMATCHED_GROUP_DECOMPOSITION');
    return {id:e.id,date:e.day,baselineDays:e.baseline,
      priorMean:round(mean(priorTotals)),observedTotal:totalCount,
      allCategoryDelta:round(deltaTotal),
      relativeToTwoEarlierSameWeekdaysPct:round(100*deltaTotal/mean(priorTotals)),
      coarseGroupContributions:groups,
      topPositiveDeltaCategories:delta.filter(v=>v.difference>0).sort((a,b)=>b.difference-a.difference).slice(0,10),
      topNegativeDeltaCategories:delta.filter(v=>v.difference<0).sort((a,b)=>a.difference-b.difference).slice(0,10),
      allCategoriesIncluded:true,categoryCount:allNames.length};
  });
  return {contract:'MIHM-311-COMPLAINT-MIX-TWO-SNOW-EPISODES-0.1',
    status:'RETROSPECTIVE_EXPLORATORY_NOT_PROSPECTIVE',
    comparison:'Each event and following day versus two earlier same weekdays',
    sourceBorough:'MANHATTAN',
    dateWindows:SOURCE_WINDOWS.map(({name,start,end})=>({name,start,end})),
    taxonomy:'311 provider complaint_type category; broad group labels are investigator proxies',
    archivedCitywideNotEqualToRequestChannel:true,
    initialHypothesis:'Snow-access requests might explain January/February 311 sign difference',
    allRequestedDaysComplete:true,sourceRevisionVsPreviouslySavedYear:daily,
    results:cases,
    alternativeExplanations:['Snow restrictions and agency closure alter ability to file requests',
      'Different weekday and time-of-day behavior',
      'Provider category changes and historical record revisions',
      'Building heat, noise, sanitation and routine requests differ between episodes',
      'Delayed reporting not equivalent to delayed damage'],
    causalPropagationEstablished:false,MIHMCanonicalValidated:false,
    eventSelectionIndependent:false,sourceOriginalPublicationVintageVerified:false,
    agencyReturnVerified:false};
}
async function source(w){
  const u=urlFor(w),resp=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(45000)});
  if(!resp.ok)throw Error('311_HTTP_'+resp.status);
  if(Number(resp.headers.get('content-length')??'0')>800000)throw Error('311_RESPONSE_BYTES_ANNOUNCED');
  const b=Buffer.from(await resp.arrayBuffer());
  if(b.length>800000)throw Error('311_RESPONSE_BYTES_OVER_BUDGET');
  return {observation:parse(w,JSON.parse(b.toString('utf8'))),
    readSha256:createHash('sha256').update(b).digest('hex'),
    responseBytes:b.length,queryUrl:u};
}
function test(){
  assert.equal(SELECTED.length,12);
  assert(classify('HEAT/HOT WATER')==='HEAT_OR_HOT_WATER');
  assert(classify('Street Condition')==='WINTER_OR_STREET_ACCESS');
  assert(classify('Noise - Residential')==='NOISE');
  assert(classify('Noise - Street/Sidewalk')==='NOISE',
    'Never count Noise - Street/Sidewalk as a snow/access request');
  assert(classify('Air Quality')==='OTHER');
  assert(urlFor(SOURCE_WINDOWS[0]).includes('2026-01-10'));
  const synthetic={};
  for(const d of SELECTED)synthetic[d]={'HEAT/HOT WATER':10,'Noise - Residential':20,
    'Snow or Ice':d==='2026-01-25'?13:1};
  const archived={rows:SELECTED.map(day=>({day,service311:31}))};
  const result=summarize(synthetic,archived);
  assert.equal(result.results.length,4);
  assert.equal(result.results[0].allCategoryDelta,12);
  assert.equal(result.results[0].coarseGroupContributions.WINTER_OR_STREET_ACCESS.delta,12);
  assert.throws(()=>parse(SOURCE_WINDOWS[0],[{day:'2026-02-23',complaint_type:'A',n:'1'}]),
    /SOURCE_DAY_OUTSIDE/);
  assert.throws(()=>parse(SOURCE_WINDOWS[0],[
    {day:'2026-01-25',complaint_type:'A',n:'1'},
    {day:'2026-01-25',complaint_type:'A',n:'1'}]),/DUPLICATE/);
  const incomplete=structuredClone(synthetic);delete incomplete['2026-02-24'];
  assert.throws(()=>summarize(incomplete,archived),/MISSING_SOURCE/);
  const saved=JSON.parse(readFileSync(SAVED,'utf8'));
  assert.equal(saved.interpretationStatus,'OBSERVED_CATEGORY_COMPOSITION');
  assert.equal(saved.failures.length,0);
  const annual=JSON.parse(readFileSync(YEAR,'utf8'));
  const repro=summarize(saved.observations,annual);
  assert(repro.sourceRevisionVsPreviouslySavedYear.every(x=>x.sourceRevisionDelta===0),
    'All daily 311 category totals must exactly match archived 365-day observations');
  assert(repro.results.length===4);
  assert.equal(saved.observations['2026-01-25']['HEAT/HOT WATER'],1274);
  assert.equal(saved.observations['2026-02-23']['Damaged Tree'],353);
  assert.equal(saved.observations['2026-02-24']['Snow or Ice'],868);
  const corrected=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-311-JAN-FEB-COMPOSITION-CORRECTED-2026.json','utf8'));
  assert.equal(corrected.results.length,4);
  for(let i=0;i<repro.results.length;i++){
    assert.equal(corrected.results[i].date,repro.results[i].date);
    assert.deepEqual(corrected.results[i].coarseGroupContributions,
      repro.results[i].coarseGroupContributions,
      'The archived category correction must reproduce without source re-query');
    assert.deepEqual(corrected.results[i].topPositiveDeltaCategories,
      repro.results[i].topPositiveDeltaCategories);
    assert.deepEqual(corrected.results[i].topNegativeDeltaCategories,
      repro.results[i].topNegativeDeltaCategories);
  }
  assert.equal(corrected.eventsSelectedBeforeInspectingAnnualOutcomes,false);
  const sensitivity=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-311-SNOW-BASELINE-SENSITIVITY-2026.json','utf8'));
  assert.equal(sensitivity.fourCases.length,4);
  for(const e of sensitivity.fourCases){
    const originalDay=saved.observations[e.day];
    const priorDay=saved.observations[e.oneWeekComparator];
    const currentTotal=Object.values(originalDay).reduce((n,v)=>n+v,0);
    const priorTotal=Object.values(priorDay).reduce((n,v)=>n+v,0);
    assert.equal(e.totalRequestCount,currentTotal);
    assert.equal(e.oneWeekReference,priorTotal);
    assert.equal(e.oneWeekDelta,currentTotal-priorTotal);
    const expected=repro.results.find(r=>r.date===e.day);
    assert.equal(e.twoWeekDelta,expected.allCategoryDelta);
    for(const category of e.issueCategoryRobustness){
      assert.equal(category.oneWeekDelta,
        (originalDay[category.name]||0)-(priorDay[category.name]||0));
    }
  }
  const feb=sensitivity.fourCases.find(e=>e.day==='2026-02-23');
  assert(feb.oneWeekDelta>0&&feb.twoWeekDelta<0,
    'Feb 23 311 total must be explicitly flagged as baseline-sign-unstable');
  const febSnow=feb.issueCategoryRobustness.find(x=>x.name==='Snow or Ice');
  const febTree=feb.issueCategoryRobustness.find(x=>x.name==='Damaged Tree');
  assert(febSnow.oneWeekDelta>0&&febSnow.twoWeekDelta>0);
  assert(febTree.oneWeekDelta===352&&febTree.twoWeekDelta===352);
  assert(repro.results.every(x=>Math.abs(Object.values(x.coarseGroupContributions)
    .reduce((n,v)=>n+v.delta,0)-x.allCategoryDelta)<0.00001),
    'Corrected category grouping must still reconcile across every category');
  console.log(JSON.stringify({status:'SYNTHETIC_COMPLAINT_MIX_VALIDATION_PASS',
    twoExternalSourceReadsInCollectModeOnly:true,noRaw311Cases:true,
    independentCausalConclusion:false}));
}
async function collect(){
  const reads=[],errors=[];
  for(const w of SOURCE_WINDOWS){
    try{reads.push(await source(w))}
    catch(e){errors.push({window:w.name,error:String(e)})}
  }
  const out={
    contract:'MIHM-311-CATEGORY-RAW-AGGREGATES-0.1',
    runKind:'TWO_SOURCE_READS_AGGREGATED_NO_PERSONAL_RECORDS',
    source:'https://data.cityofnewyork.us/d/erm2-nwe9',
    failures:errors,
    reads:reads.map(r=>({window:r.observation.window,rows:r.observation.allCategoryRows,
      days:r.observation.observedDays,sha256:r.readSha256,
      bytes:r.responseBytes,queryUrl:r.queryUrl})),
    observations:{},
    interpretationStatus:'INDETERMINATE'
  };
  if(errors.length===0&&reads.length===2){
    out.observations=Object.assign({},...reads.map(r=>r.observation.selected));
    try{
      const annual=JSON.parse(readFileSync(YEAR,'utf8'));
      out.analysis=summarize(out.observations,annual);
      const drift=out.analysis.sourceRevisionVsPreviouslySavedYear.filter(d=>Math.abs(d.sourceRevisionPct)>2);
      out.interpretationStatus=drift.length?'REVISION_OVER_2_PERCENT_ABSTAIN':'OBSERVED_CATEGORY_COMPOSITION';
      out.largeSourceRevisions=drift;
    }catch(e){out.interpretationStatus='INDETERMINATE';out.analysisError=String(e)}
  }
  console.log(JSON.stringify(out,null,2));
}
if(process.argv.includes('--self-test'))test();
else if(process.argv.includes('--collect'))await collect();
else if(process.argv.includes('--reanalyze')){
  const saved=JSON.parse(readFileSync(SAVED,'utf8'));
  if(saved.interpretationStatus!=='OBSERVED_CATEGORY_COMPOSITION')
    throw Error('Only fully admitted observations may be reanalyzed');
  const annual=JSON.parse(readFileSync(YEAR,'utf8'));
  console.log(JSON.stringify({
    contract:'MIHM-311-SNOW-COMPOSITION-GROUPING-V2-0.1',
    evidenceSource:SAVED,
    originalReadSha256:saved.reads.map(r=>({window:r.window,sha256:r.sha256})),
    change:'After source observation: Noise - Street/Sidewalk is NOISE, never snow/access',
    scientificStatus:'RETROSPECTIVE_POST_HOC_CATEGORY_NAME_CLASSIFIER_CORRECTION',
    noNewSourceReads:true,causalAttributionEstablished:false,
    ...summarize(saved.observations,annual)
  },null,2));
}else throw Error('Use --self-test, explicit --collect or offline --reanalyze');
