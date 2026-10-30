import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const PATH='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const events=[
 {id:'JAN_HEAVY_SNOW',anchor:'2026-01-25'},
 {id:'FEB_COLD_LIGHT_SNOW',anchor:'2026-02-06'},
 {id:'FEB_BLIZZARD_BAN',anchor:'2026-02-22'},
 {id:'MAY_OUTER_BOROUGH_FLOOD',anchor:'2026-05-20'}
];
const windows=[28,42,56,70],DAY=86400000;
const utc=s=>Date.parse(s+'T12:00:00Z');
const dow=s=>new Date(utc(s)).getUTCDay();
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length%2?b[(b.length-1)/2]:(b[b.length/2-1]+b[b.length/2])/2};
function run(panel){
 assert.equal(panel.contract,'MIHM-MANHATTAN-365D-RETROSPECTIVE-EVIDENCE-0.1');
 assert.equal(panel.rows.length,365);
 const rows=panel.rows, output=[];
 for(const n of windows){
   const scores=[];
   for(const e of events){
     const idx=rows.findIndex(r=>r.day===e.anchor);
     assert(idx>=n&&idx+7<rows.length);
     const observations=[];
     for(let off=0;off<3;off++){
       const today=rows[idx+off],prior=rows.slice(idx+off-n,idx+off).filter(x=>dow(x.day)===dow(today.day));
       assert.equal(prior.length,n/7);
       const b={};
       for(const k of ['cbdEntries','fdnyCount','service311']){
         assert(Number.isSafeInteger(today[k])&&today[k]>0);
         b[k]=median(prior.map(r=>r[k]));
         assert(b[k]>0);
       }
       const cbdPct=100*(today.cbdEntries/b.cbdEntries-1),fdnyPct=100*(today.fdnyCount/b.fdnyCount-1);
       const score=Math.max(0,-cbdPct)*Math.max(0,fdnyPct);
       observations.push({day:today.day,cbdPct,fdnyPct,requestPct:100*(today.service311/b.service311-1),score});
     }
     const most=observations.reduce((a,b)=>b.score>a.score?b:a);
     scores.push({event:e.id,day:most.day,score:most.score,cbdPct:most.cbdPct,fdnyPct:most.fdnyPct,
       storm311Day0Pct:observations[0].requestPct,observations});
   }
   const by=Object.fromEntries(scores.map(x=>[x.event,x]));
   output.push({referenceDays:n,eventResults:scores,
     highSnowBothGreaterThanBothControls:
       Math.min(by.JAN_HEAVY_SNOW.score,by.FEB_BLIZZARD_BAN.score)>
       Math.max(by.FEB_COLD_LIGHT_SNOW.score,by.MAY_OUTER_BOROUGH_FLOOD.score)});
 }
 return {contract:'MIHM-FOUR-NWS-EVENT-BASELINE-SENSITIVITY-0.1',
   exploratory:true,independentHistoricalConfirmation:false,
   sourceVintageVerified:false,causalityInferred:false,
   originalEventDatesSelectedAfterPreviousPanelInspection:true,
   baselineMethod:'same-weekday median computed from strict previous n days',
   baselineDayChoices:windows,results:output};
}
function selfTest(){
 const source=JSON.parse(readFileSync(PATH,'utf8'));
 const a=run(source);
 assert.equal(a.results.length,4);
 assert(a.results.every(r=>r.eventResults.length===4));
 const bad=structuredClone(source);bad.rows.find(x=>x.day==='2026-02-23').fdnyCount=null;
 assert.throws(()=>run(bad));
 const f=a.results.find(r=>r.referenceDays===56).eventResults.find(x=>x.event==='FEB_BLIZZARD_BAN');
 assert(f.score>4200&&f.score<4220);
 console.log(JSON.stringify({status:'FOUR_NWS_BASELINE_SENSITIVITY_OFFLINE_PASS',
   robustForTheseBaselineChoices:a.results.every(r=>r.highSnowBothGreaterThanBothControls),
   noIndependentValidation:true}));
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--evaluate'))console.log(JSON.stringify(run(JSON.parse(readFileSync(PATH,'utf8'))),null,2));
else throw Error('Use --self-test or --evaluate');
