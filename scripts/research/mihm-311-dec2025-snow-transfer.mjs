/**
 * MIHM Foundation: Dec 26-27 2025 NWS moderate Manhattan snowfall,
 * transfer challenge to a fixed January/February 311 category hypothesis.
 * Hypothesis and comparator dates FROZEN in the Foundation program BEFORE
 * this new category-source read. This is NOT prospective, blinded, causal,
 * an independent full-year sample, or canonical MIHM validation.
 * --self-test : no network, deterministic synthetic + source guards
 * --collect   : exactly one bounded official aggregate read, 0 retries
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const API='https://data.cityofnewyork.us/resource/erm2-nwe9.json';
const ARCHIVE='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const WINDOW={start:'2025-12-12T00:00:00',end:'2025-12-28T00:00:00'};
const ONSET='2025-12-26',NEXT='2025-12-27';
const ONSET_PRIOR=['2025-12-12','2025-12-19'];
const NEXT_PRIOR=['2025-12-13','2025-12-20'];
const REQUIRED=[...new Set([...ONSET_PRIOR,...NEXT_PRIOR,ONSET,NEXT])].sort();
const GROUPS=['HEAT_OR_HOT_WATER','NOISE','WINTER_OR_STREET_ACCESS','OTHER'];
const weekday=d=>new Date(d+'T12:00:00Z').getUTCDay();
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const round=n=>Math.round(n*1000)/1000;
function classify(category){
  if(/heat|hot.water|boiler/i.test(category))return 'HEAT_OR_HOT_WATER';
  if(/noise/i.test(category))return 'NOISE';
  if(/snow|ice|plow|street.condition|sidewalk|blocked.driveway|parking/i.test(category))
    return 'WINTER_OR_STREET_ACCESS';
  return 'OTHER';
}
function sourceUrl(){
  const u=new URL(API);
  for(const [k,v] of Object.entries({
    '$select':'date_trunc_ymd(created_date) as day,complaint_type,count(*) as n',
    '$where':"created_date >= '"+WINDOW.start+"' AND created_date < '"+WINDOW.end+
      "' AND borough = 'MANHATTAN'",
    '$group':'day,complaint_type',
    '$order':'day ASC,complaint_type ASC',
    '$limit':'4000'
  }))u.searchParams.set(k,v);
  return u.toString();
}
function parse(raw){
  assert(Array.isArray(raw)&&raw.length<4000,'SOURCE_TRUNCATED_OR_OVER_BUDGET');
  const all=new Map();
  for(const r of raw){
    const day=String(r.day??'').slice(0,10),
      category=r.complaint_type===null?'[UNCLASSIFIED]':String(r.complaint_type??'').trim(),
      n=Number(r.n);
    if(day<'2025-12-12'||day>'2025-12-27')throw Error('DATE_OUTSIDE_DECLARED_WINDOW');
    if(!category||!Number.isSafeInteger(n)||n<=0)throw Error('BAD_CATEGORY_AGGREGATE');
    if(!all.has(day))all.set(day,new Map());
    if(all.get(day).has(category))throw Error('DUPLICATE_DATE_CATEGORY');
    all.get(day).set(category,n);
  }
  const missing=REQUIRED.filter(d=>!all.has(d));
  if(missing.length)throw Error('REQUIRED_DAY_MISSING '+missing.join(','));
  return {totalAggregateRows:raw.length,totalObservedDates:all.size,
    required:Object.fromEntries(REQUIRED.map(d=>[d,Object.fromEntries(all.get(d))]))};
}
function summarize(categories,yearly){
  for(const s of [ONSET,NEXT]){
    for(const old of s===ONSET?ONSET_PRIOR:NEXT_PRIOR){
      assert(old<s&&weekday(old)===weekday(s),'BASELINE_WEEKDAY_VIOLATION');
    }
  }
  const archive=new Map(yearly.rows.map(r=>[r.day,r.service311]));
  const revised=[];
  const perDate=Object.fromEntries(REQUIRED.map(date=>{
    const vals=categories[date];
    if(!vals)throw Error('MISSING_SELECTED_DATE '+date);
    const total=Object.values(vals).reduce((a,b)=>a+b,0);
    for(const v of Object.values(vals))assert(Number.isSafeInteger(v)&&v>0,'BROKEN_CATEGORY');
    const archived=archive.get(date);
    assert(Number.isSafeInteger(archived)&&archived>0,'ANNUAL_311_NOT_AVAILABLE');
    if(total!==archived)revised.push({date,archived311:archived,newSourceSum:total,diff:total-archived});
    const group=Object.fromEntries(GROUPS.map(g=>[g,Object.entries(vals).filter(([cat])=>
      classify(cat)===g).reduce((n,[,c])=>n+c,0)]));
    const snowOrIce=vals['Snow or Ice']??0;
    return [date,{date,total,group,snowOrIce,nonHeating:total-group.HEAT_OR_HOT_WATER}];
  }));
  function contrast(date,baselines){
    const r=perDate[date],rows=baselines.map(d=>perDate[d]),prior=rows.at(-1);
    const metrics={
      total:r.total,nonHeating:r.nonHeating,snowOrIce:r.snowOrIce,
      heat:r.group.HEAT_OR_HOT_WATER,noise:r.group.NOISE,
      winter:r.group.WINTER_OR_STREET_ACCESS,other:r.group.OTHER
    };
    const b=k=>mean(rows.map(x=>(
      k==='heat'?x.group.HEAT_OR_HOT_WATER:
      k==='noise'?x.group.NOISE:
      k==='winter'?x.group.WINTER_OR_STREET_ACCESS:
      k==='other'?x.group.OTHER:x[k]
    )));
    const delta=Object.fromEntries(Object.entries(metrics).map(([k,v])=>[k,{
      observed:v,baselineMean:round(b(k)),change:round(v-b(k)),
      pct:b(k)>0?round(100*(v/b(k)-1)):null
    }]));
    assert(Math.abs(GROUPS.reduce((n,g)=>n+delta[
      {HEAT_OR_HOT_WATER:'heat',NOISE:'noise',
       WINTER_OR_STREET_ACCESS:'winter',OTHER:'other'}[g]
    ].change,0)-delta.total.change)<1e-6,'CATEGORY_GROUP_SUM_NOT_EQUAL_TOTAL');
    assert(Math.abs(delta.heat.change+delta.nonHeating.change-delta.total.change)<1e-6,
      'NONHEATING_DECOMPOSITION_INVALID');
    assert(r.nonHeating===r.total-r.group.HEAT_OR_HOT_WATER);
    // A baseline carries one provider count per day: prior is *not* metadata vintage.
    assert(prior.date===baselines.at(-1));
    return {date,baselines,values:delta};
  }
  const onset=contrast(ONSET,ONSET_PRIOR),following=contrast(NEXT,NEXT_PRIOR),
    oneWeekOnset=contrast(ONSET,[ONSET_PRIOR.at(-1)]),
    oneWeekFollowing=contrast(NEXT,[NEXT_PRIOR.at(-1)]);
  const nonHeatDrop=onset.values.nonHeating.change<0,
    nextSnowRise=following.values.snowOrIce.change>0,
    sensitivity={
      onsetNonHeatingStable:(onset.values.nonHeating.change<0)===(oneWeekOnset.values.nonHeating.change<0),
      nextDaySnowOrIceStable:(following.values.snowOrIce.change>0)===(oneWeekFollowing.values.snowOrIce.change>0)
    };
  const sourceRevision= revised.length!==0;
  return {
    contract:'MIHM-311-DEC2025-NWS-CHANNEL-TRANSFER-0.1',
    event:{
      onset:ONSET,following:NEXT,
      NWS:'https://www.weather.gov/okx/20251226_27',
      snowfallCentralParkInches:4.3,
      snowBegan:'evening of 2025-12-26',
      moderation:'Moderate snow, not same severe snowfall dose as January/February cases'
    },
    independentStatus:'NEW_CATEGORY_OUTCOMES_NOT_YET_INSPECTED_BEFORE_HYPOTHESIS_FREEZE_BUT_YEARLY_TOTALS_PREVIOUSLY_VIEWED',
    comparison:'Two prior same weekdays primary, one prior same weekday sensitivity',
    predeterminedOutcomes:{
      A:'Dec26 non-heating request count below Dec12/19 reference',
      B:'Dec27 exact Snow or Ice count above Dec13/20 reference'
    },
    sourceRevisionVersusArchivedTotals:revised,
    sourceReconciledToPreviouslyArchivedAnnual311:!sourceRevision,
    categories:perDate,
    primary:{onset,following},
    sensitivity:{onset:oneWeekOnset,following:oneWeekFollowing,...sensitivity},
    hypothesis:{A_nonHeatingDecline:nonHeatDrop,B_nextDaySnowIncrease:nextSnowRise,
      replicationPrimaryPass:!sourceRevision&&nonHeatDrop&&nextSnowRise,
      signRobustTo1Versus2WeekBaseline:sensitivity.onsetNonHeatingStable&&sensitivity.nextDaySnowOrIceStable,
      verdict:sourceRevision?'ABSTAIN_SOURCE_REVISION':
        nonHeatDrop&&nextSnowRise?'BOTH_PREDECLARED_SIGNS_OBSERVED':
        'AT_LEAST_ONE_PREDECLARED_SIGN_FAILED'},
    uncertainties:['Dec26 Christmas holiday week confounding',
      'Snow onset only evening Dec26; day1 counts depend on source reporting conventions',
      'Dec13-14 was itself a winter storm, contaminating baseline exposure',
      'Public data vintage at original event T0 not reconstructed',
      'Two previous examples chosen after full-year source inspection',
      'Provider requests do not directly measure physical weather damage',
      'No causal mechanism or unique MIHM predictive skill established'],
    canonicalMihmValidated:false,causalityIdentified:false,prospectivePredictionIssued:false
  };
}
function test(){
  assert.equal(REQUIRED.length,6);
  assert.equal(classify('Noise - Street/Sidewalk'),'NOISE');
  assert.equal(classify('HEAT/HOT WATER'),'HEAT_OR_HOT_WATER');
  assert.equal(classify('Snow or Ice'),'WINTER_OR_STREET_ACCESS');
  const year={rows:REQUIRED.map(d=>({day:d,service311:100}))},categories={};
  for(const d of REQUIRED)categories[d]={'HEAT/HOT WATER':20,'Noise - Residential':20,
    'Snow or Ice':5,Other:55};
  // Two separate signs, preserving source total by changes in OTHER.
  categories[ONSET]={'HEAT/HOT WATER':40,'Noise - Residential':20,'Snow or Ice':5,Other:35};
  categories[NEXT]={'HEAT/HOT WATER':20,'Noise - Residential':10,'Snow or Ice':25,Other:45};
  const got=summarize(categories,year);
  assert.equal(got.hypothesis.replicationPrimaryPass,true);
  assert.equal(got.hypothesis.signRobustTo1Versus2WeekBaseline,true);
  assert.equal(got.sourceRevisionVersusArchivedTotals.length,0);
  const changed=structuredClone(categories);
  changed[NEXT]['Snow or Ice']=1;
  changed[NEXT].Other=69;
  assert.equal(summarize(changed,year).hypothesis.B_nextDaySnowIncrease,false);
  const drift=structuredClone(categories);drift[ONSET].Other+=1;
  assert.equal(summarize(drift,year).hypothesis.verdict,'ABSTAIN_SOURCE_REVISION');
  const broken=structuredClone(categories);delete broken[NEXT];
  assert.throws(()=>summarize(broken,year),/MISSING_SELECTED_DATE/);
  const rows=REQUIRED.map(day=>({day,complaint_type:'Snow or Ice',n:'3'}));
  assert.equal(Object.keys(parse(rows).required).length,6);
  assert.throws(()=>parse([...rows,rows[0]]),/DUPLICATE_DATE_CATEGORY/);
  assert.throws(()=>parse([{day:'2026-01-25',complaint_type:'Snow or Ice',n:'3'}]),/DATE_OUTSIDE/);
  // Archive-specific checks execute WITHOUT repeating the official API read.
  const stored=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-311-DEC2025-SNOW-TRANSFER-OBSERVED.json','utf8'));
  const official=JSON.parse(readFileSync(ARCHIVE,'utf8'));
  const byDay=new Map(official.rows.map(r=>[r.day,r.service311]));
  assert.equal(stored.contract,'MIHM-311-DEC2025-NWS-CHANNEL-TRANSFER-0.1');
  assert.equal(stored.sourceObservedDays,16);
  assert.equal(stored.sourceAggregateRows,1442);
  assert(/^[a-f0-9]{64}$/.test(stored.rawResponseSHA256));
  assert.equal(stored.provenance.researchFrozenBeforeSourceReadCommit,
    '89c1c59fb1f162da516ce8ba2ecc248962b3763b');
  assert.deepEqual(stored.sourceRevisionVersusArchivedTotals,[]);
  assert.deepEqual(Object.keys(stored.categories).sort(),REQUIRED);
  for(const day of REQUIRED){
    const r=stored.categories[day];
    assert.equal(r.total,byDay.get(day),'Official category sum must match saved 311 year');
    assert.equal(r.total,Object.values(r.group).reduce((a,b)=>a+b,0));
    assert.equal(r.nonHeating,r.total-r.group.HEAT_OR_HOT_WATER);
    assert(r.snowOrIce>=0&&r.snowOrIce<=r.group.WINTER_OR_STREET_ACCESS);
  }
  assert.equal(stored.primary.onset.values.nonHeating.change,-670.5);
  assert.equal(stored.primary.following.values.snowOrIce.change,43.5);
  assert.equal(stored.hypothesis.verdict,'BOTH_PREDECLARED_SIGNS_OBSERVED');
  assert.equal(stored.hypothesis.signRobustTo1Versus2WeekBaseline,true);
  assert.equal(stored.provenance.unobservedPerDayCategoryVectorsNotRestored,true);
  const holiday=JSON.parse(readFileSync(
    'docs/research/evidence/MIHM-DEC2025-HOLIDAY-NEGATIVE-CONTROL.json','utf8'));
  assert.equal(holiday.contract,'MIHM-DEC2025-HOLIDAY-NEGATIVE-CONTROL-0.1');
  assert.equal(holiday.dates.length,4);
  assert.equal(holiday.categoryControls.christmasDayCategoryVectorAvailable,false);
  assert.equal(holiday.holidayNegativeControl.eventSpecificityOfAggregateCoupling,
    'NOT_IDENTIFIED');
  for(const caseDay of holiday.dates){
    const now=official.rows.find(r=>r.day===caseDay.day);
    assert(now,'Holiday/control day observed');
    for(const key of ['service311','fdnyCount','cbdEntries','crzEntries']){
      const b=caseDay.referenceSameWeekdays.map(d=>{
        const rr=official.rows.find(r=>r.day===d);
        assert(rr,'Holiday comparator day observed');
        return rr[key];
      });
      const rec=caseDay.indicators[key];
      assert.equal(rec.observed,now[key]);
      const mean2=(b[0]+b[1])/2;
      assert.equal(rec.twoWeekReferenceMean,mean2);
      assert.equal(rec.twoWeekDeviationPct,round(100*(now[key]/mean2-1)));
      assert.equal(rec.oneWeekDeviationPct,round(100*(now[key]/b[1]-1)));
    }
  }
  assert.equal(holiday.dates[1].observedCentralParkSnowInches,0);
  assert(holiday.dates[1].indicators.service311.twoWeekDeviationPct<
    holiday.dates[2].indicators.service311.twoWeekDeviationPct,
    'Christmas itself causes larger 311 drop than post-Christmas storm onset');
  assert(holiday.dates[1].indicators.cbdEntries.twoWeekDeviationPct<
    holiday.dates[2].indicators.cbdEntries.twoWeekDeviationPct,
    'Non-snow Christmas traffic can fall more than a storm day');

  console.log(JSON.stringify({status:'DEC2025_SNOW_CATEGORY_TRANSFER_QA_PASS',
    categoryProvenanceTested:false,newExternalSourceRead:false,
    oneAndTwoWeekReferenceTested:true,sourceRevisionAbstention:true}));
}
async function collect(){
  const u=sourceUrl();
  const resp=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(45000)});
  if(!resp.ok)throw Error('SOURCE_HTTP_'+resp.status);
  const hinted=Number(resp.headers.get('content-length')??'0');
  if(hinted>800000)throw Error('RESPONSE_ANNOUNCED_OVER_BUDGET');
  const bytes=Buffer.from(await resp.arrayBuffer());
  if(bytes.length>800000)throw Error('RESPONSE_OVER_BUDGET');
  const a=parse(JSON.parse(bytes.toString('utf8')));
  const old=JSON.parse(readFileSync(ARCHIVE,'utf8'));
  const result=summarize(a.required,old);
  console.log(JSON.stringify({
    execution:'READ_ONLY_SINGLE_OFFICIAL_CATEGORY_AGGREGATE',
    source:'https://data.cityofnewyork.us/d/erm2-nwe9',
    sourceQueryUrl:u,
    rawResponseSHA256:createHash('sha256').update(bytes).digest('hex'),
    rawResponseBytes:bytes.length,sourceAggregateRows:a.totalAggregateRows,
    sourceObservedDays:a.totalObservedDates,
    ...result
  },null,2));
}
if(process.argv.includes('--self-test'))test();
else if(process.argv.includes('--collect'))await collect();
else throw Error('Use explicit --self-test or --collect, no automatic background source reads');
