/**
 * Studio release sequencing: explicit narrative order plus optional acoustic
 * heuristic alternatives. Never asserts optimal market timing without observed
 * audience outcomes and independent calendar evidence.
 *
 * Industry operational references:
 * https://musicbiz.org/news/new-music-fridays-music-industry-faq/
 * https://support.spotify.com/us/artists/article/pitching-music-and-videos-to-playlist-editors/
 */
import type { CampaignEvidenceInput } from './localNarrativeCampaignPlanner';

export type ReleaseSequenceItem={
  id:string;title:string;narrative:string|null;
  originalOrder:number;
  acousticEnergyProxy:number|null;
  proxySource:'RECORDED_STUDIO_FEATURE'|'USER_DECLARATION'|'UNAVAILABLE';
  priorReleaseDate:string|null;
};
export type ReleaseSequenceResult={
  contract:'SFI-STUDIO-RELEASE-SEQUENCING-1.0';
  generatedFrom:'EXPLICIT_SELECTED_RELEASES';
  scenarios:Array<{
    id:'DECLARED'|'ENERGY_RAMP'|'ENERGY_CONTRAST';
    order:string[];
    rationale:string;
    epistemic:'DECLARED'|'SIMULATED_HEURISTIC';
    available:boolean;
    missingEvidence:string[];
  }>;
  schedule:Array<{
    itemId:string;title:string;date:string;
    spotifyPitchDeadline:string;
    industryBasis:{
      releaseDay:'FRIDAY_CONVENTION_NOT_MANDATORY';
      pitchLeadDays:7;
      sources:string[];
    };
    campaign:{
      preStart:string;releaseDay:string;postEnd:string;
      t0:string;t1:string;
    };
    conflicts:Array<{event:string;url:string;date:string;relevance:string}>;
    status:'PROPOSED_NOT_APPROVED';
  }>;
  constraints:{
    earliest:string;spacingWeeks:number;fridayPolicy:'BASELINE_NOT_PROOF_OF_OPTIMALITY';
    scenarioId:string;
  };
  determination:{
    optimality:'NOT_CALIBRATED';
    audienceMetrics:'NOT_OBSERVED';
    worldSignalPredictiveValidation:'NOT_PERFORMED';
    actionAuthority:'NOT_GRANTED';
    comparisonNeeded:'ACTUAL_POST_RELEASE_RETURNS_AND_REVISED_WORLD_EVIDENCE';
  };
};
const DAY=86_400_000;
function parseDay(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('INVALID_CALENDAR_DAY');
  const n=Date.parse(value+'T12:00:00Z');
  if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value)throw new Error('INVALID_CALENDAR_DAY');
  return n;
}
function isoDay(value:number){return new Date(value).toISOString().slice(0,10);}
function nextFriday(value:number){
  const weekday=new Date(value).getUTCDay();
  return value+((5-weekday+7)%7)*DAY;
}
function cleanItems(input:ReleaseSequenceItem[]):ReleaseSequenceItem[]{
  if(input.length<1||input.length>24)throw new Error('RELEASE_COUNT_OUT_OF_RANGE');
  const ids=new Set<string>();
  for(const item of input){
    if(!item.id||!item.title||ids.has(item.id))throw new Error('RELEASE_IDENTITIES_NOT_UNIQUE');
    ids.add(item.id);
    if(item.acousticEnergyProxy!==null &&
      (!Number.isFinite(item.acousticEnergyProxy)||item.acousticEnergyProxy<0||item.acousticEnergyProxy>1)){
      throw new Error('ACOUSTIC_PROXY_OUT_OF_RANGE');
    }
    if(item.proxySource==='UNAVAILABLE'&&item.acousticEnergyProxy!==null){
      throw new Error('ACOUSTIC_PROXY_UNSUPPORTED');
    }
  }
  return [...input].sort((a,b)=>a.originalOrder-b.originalOrder);
}
export function sequenceStudioReleases(input:{
  items:ReleaseSequenceItem[];
  earliestDate:string;
  spacingWeeks:number;
  scenarioId?:'DECLARED'|'ENERGY_RAMP'|'ENERGY_CONTRAST';
  worldEvidence?:CampaignEvidenceInput[];
}):ReleaseSequenceResult {
  const items=cleanItems(input.items);
  const begin=parseDay(input.earliestDate);
  const spacing=input.spacingWeeks;
  if(!Number.isInteger(spacing)||spacing<1||spacing>16)throw new Error('INVALID_RELEASE_SPACING');
  const measured=items.filter(item=>item.acousticEnergyProxy!==null && item.proxySource==='RECORDED_STUDIO_FEATURE');
  const fullCoverage=measured.length===items.length;
  const byEnergy=fullCoverage?[...items].sort((a,b)=>
    (a.acousticEnergyProxy!)-(b.acousticEnergyProxy!)||a.originalOrder-b.originalOrder):[];
  const contrast:ReleaseSequenceItem[]=[];
  if(fullCoverage){
    let lo=0,hi=byEnergy.length-1;
    while(lo<=hi){
      if(lo===hi){contrast.push(byEnergy[lo]);break;}
      contrast.push(byEnergy[lo++],byEnergy[hi--]);
    }
  }
  const missing=items.filter(item=>item.acousticEnergyProxy===null||
    item.proxySource!=='RECORDED_STUDIO_FEATURE').map(item=>item.id);
  const scenarios:ReleaseSequenceResult['scenarios']=[
    {id:'DECLARED',order:items.map(item=>item.id),rationale:'Orden de selección preservado; no altera la continuidad histórica.',
      epistemic:'DECLARED',available:true,missingEvidence:[]},
    {id:'ENERGY_RAMP',order:byEnergy.map(item=>item.id),
      rationale:'Experimento de progresión ascendente de un indicador acústico almacenado; no demuestra preferencia del público.',
      epistemic:'SIMULATED_HEURISTIC',available:fullCoverage,missingEvidence:missing},
    {id:'ENERGY_CONTRAST',order:contrast.map(item=>item.id),
      rationale:'Experimento alternando valores del indicador acústico; no es un óptimo narrativo o social.',
      epistemic:'SIMULATED_HEURISTIC',available:fullCoverage,missingEvidence:missing},
  ];
  const scenario=scenarios.find(s=>s.id===(input.scenarioId??'DECLARED'));
  if(!scenario||!scenario.available)throw new Error('SELECTED_SEQUENCE_SCENARIO_UNSUPPORTED_BY_MEASUREMENTS');
  const byId=new Map(items.map(item=>[item.id,item]));
  // Starting at least 7 days after earliest planning date allows a Spotify
  // artist to prepare an eligible pitch. It does not guarantee editorial placement.
  const first=nextFriday(begin+7*DAY);
  const events=(input.worldEvidence??[]).filter(event=>
    event.observationKind==='DATED_FUTURE_EVENT'&&event.eventDate&&event.sourceUrl.startsWith('https://'));
  const schedule=scenario.order.map((id,index)=>{
    const item=byId.get(id)!;
    const candidate=first+index*spacing*7*DAY;
    const date=isoDay(candidate);
    const conflicts=events.filter(e=>{
      try{return Math.abs(parseDay(e.eventDate!)-candidate)<=2*DAY;}catch{return false;}
    }).map(e=>({
      event:e.sourceTitle,url:e.sourceUrl,date:e.eventDate!,relevance:e.relevance,
    }));
    return {
      itemId:id,title:item.title,date,
      spotifyPitchDeadline:isoDay(candidate-7*DAY),
      industryBasis:{
        releaseDay:'FRIDAY_CONVENTION_NOT_MANDATORY' as const,pitchLeadDays:7,
        sources:[
          'https://musicbiz.org/news/new-music-fridays-music-industry-faq/',
          'https://support.spotify.com/us/artists/article/pitching-music-and-videos-to-playlist-editors/',
        ],
      },
      campaign:{
        preStart:isoDay(candidate-21*DAY),releaseDay:date,
        postEnd:isoDay(candidate+14*DAY),
        t0:isoDay(candidate-21*DAY),t1:isoDay(candidate+14*DAY),
      },
      conflicts,status:'PROPOSED_NOT_APPROVED' as const,
    };
  });
  return {
    contract:'SFI-STUDIO-RELEASE-SEQUENCING-1.0',
    generatedFrom:'EXPLICIT_SELECTED_RELEASES',
    scenarios,schedule,
    constraints:{earliest:input.earliestDate,spacingWeeks:spacing,
      fridayPolicy:'BASELINE_NOT_PROOF_OF_OPTIMALITY',scenarioId:scenario.id},
    determination:{
      optimality:'NOT_CALIBRATED',audienceMetrics:'NOT_OBSERVED',
      worldSignalPredictiveValidation:'NOT_PERFORMED',actionAuthority:'NOT_GRANTED',
      comparisonNeeded:'ACTUAL_POST_RELEASE_RETURNS_AND_REVISED_WORLD_EVIDENCE',
    },
  };
}
