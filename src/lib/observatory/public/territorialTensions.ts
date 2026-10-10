export type TerritorialObservationInput={
  id:string;
  sourceId:string;
  lat:number|null;
  lng:number|null;
  countryCodes:string[];
  observedAt:string;
  fetchedAt:string;
  confidence:number|null;
  affectedSystems:string[];
  reading?:Record<string,unknown>|null;
};

export type TerritorialTension={
  id:'north-america'|'latin-america'|'europe'|'africa'|'middle-east'|'asia'|'indo-pacific';
  label:string;
  anchor:{lat:number;lng:number};
  observationCount:number;
  sourceCount:number;
  confidence:number|null;
  systemicFriction:number|null;
  interactionDensity:number|null;
  systemicCoherence:number|null;
  activityDelta:number|null;
  affectedSystems:string[];
  basisIds:string[];
  epistemicState:'DERIVED';
};

const LATIN=new Set(['MX','GT','BZ','SV','HN','NI','CR','PA','CU','DO','HT','JM','CO','VE','GY','SR','EC','PE','BO','BR','PY','UY','AR','CL']);
const NORTH_AMERICA=new Set(['US','CA','GL']);
const EUROPE=new Set(['AL','AD','AT','BE','BA','BG','BY','CH','CZ','DE','DK','EE','ES','FI','FR','GB','GR','HR','HU','IE','IS','IT','LI','LT','LU','LV','MC','MD','ME','MK','MT','NL','NO','PL','PT','RO','RS','SE','SI','SK','UA']);
const AFRICA=new Set(['DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CD','CG','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW']);
const MIDDLE_EAST=new Set(['BH','CY','IR','IQ','IL','JO','KW','LB','OM','PS','QA','SA','SY','TR','AE','YE']);
const ASIA=new Set(['AF','AM','AZ','BD','BT','CN','GE','IN','JP','KZ','KG','KP','KR','MN','NP','PK','RU','LK','TJ','TM','UZ']);
const INDO_PACIFIC=new Set(['AU','BN','KH','FJ','ID','KI','LA','MY','MV','MH','FM','MM','NR','NZ','PW','PG','PH','WS','SG','SB','TH','TL','TO','TV','VU','VN']);

const TERRITORIES=[
  {id:'north-america',label:'N. AMERICA',anchor:{lat:48,lng:-104}},
  {id:'latin-america',label:'LATIN AMERICA',anchor:{lat:-14,lng:-62}},
  {id:'europe',label:'EUROPE',anchor:{lat:52,lng:15}},
  {id:'africa',label:'AFRICA',anchor:{lat:1,lng:21}},
  {id:'middle-east',label:'MIDDLE EAST',anchor:{lat:29,lng:45}},
  {id:'asia',label:'ASIA',anchor:{lat:43,lng:103}},
  {id:'indo-pacific',label:'INDO-PACIFIC',anchor:{lat:-12,lng:124}},
] as const;

type TerritoryId=(typeof TERRITORIES)[number]['id'];

function finite(value:unknown):number|null{
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function mean(values:Array<number|null>):number|null{
  const valid=values.filter((v):v is number=>v!=null&&Number.isFinite(v));
  return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;
}
function codeTerritory(codes:string[]):TerritoryId|null{
  for(const raw of codes){
    const code=raw.trim().toUpperCase();
    if(LATIN.has(code))return'latin-america';
    if(NORTH_AMERICA.has(code))return'north-america';
    if(MIDDLE_EAST.has(code))return'middle-east';
    if(EUROPE.has(code))return'europe';
    if(AFRICA.has(code))return'africa';
    if(INDO_PACIFIC.has(code))return'indo-pacific';
    if(ASIA.has(code))return'asia';
  }
  return null;
}
function coordinateTerritory(lat:number,lng:number):TerritoryId|null{
  if(lat>=12&&lat<=42&&lng>=25&&lng<=65)return'middle-east';
  if(lat>=35&&lat<=72&&lng>=-25&&lng<=45)return'europe';
  if(lat>=-38&&lat<35&&lng>=-20&&lng<=55)return'africa';
  if(lat>=-56&&lat<32&&lng>=-120&&lng<=-34)return'latin-america';
  if(lat>=32&&lat<=78&&lng>=-170&&lng<=-50)return'north-america';
  if(lat>=-50&&lat<35&&lng>=65&&lng<=180)return'indo-pacific';
  if(lat>=30&&lat<=78&&lng>=45&&lng<=180)return'asia';
  return null;
}
function territoryOf(node:TerritorialObservationInput):TerritoryId|null{
  const byCode=codeTerritory(node.countryCodes);
  if(byCode)return byCode;
  return node.lat==null||node.lng==null?null:coordinateTerritory(node.lat,node.lng);
}
function time(value:string){
  const t=Date.parse(value);
  return Number.isFinite(t)?t:0;
}

export function deriveTerritorialTensions(nodes:readonly TerritorialObservationInput[]):{
  territories:TerritorialTension[];
  mappedCount:number;
  unmappedCount:number;
  coverage:number;
}{
  const mapped=nodes.flatMap(node=>{
    const territory=territoryOf(node);
    return territory?[{territory,node}]:[];
  });
  const latestTime=mapped.reduce((max,item)=>Math.max(max,time(item.node.fetchedAt)||time(item.node.observedAt)),0);
  const recentStart=latestTime-(24*60*60*1000);
  const priorStart=recentStart-(24*60*60*1000);

  const territories=TERRITORIES.flatMap(definition=>{
    const group=mapped.filter(item=>item.territory===definition.id).map(item=>item.node);
    if(!group.length)return[];
    const recent=group.filter(node=>(time(node.fetchedAt)||time(node.observedAt))>=recentStart).length;
    const prior=group.filter(node=>{
      const stamp=time(node.fetchedAt)||time(node.observedAt);
      return stamp>=priorStart&&stamp<recentStart;
    }).length;
    const activityDelta=prior>0?(recent-prior)/prior:recent>0?null:0;
    const systems=new Map<string,number>();
    for(const node of group)for(const system of node.affectedSystems)systems.set(system,(systems.get(system)??0)+1);
    const affectedSystems=[...systems.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([system])=>system);
    return [{
      id:definition.id,
      label:definition.label,
      anchor:definition.anchor,
      observationCount:group.length,
      sourceCount:new Set(group.map(node=>node.sourceId)).size,
      confidence:mean(group.map(node=>node.confidence)),
      systemicFriction:mean(group.map(node=>finite(node.reading?.systemic_friction))),
      interactionDensity:mean(group.map(node=>finite(node.reading?.interaction_density))),
      systemicCoherence:mean(group.map(node=>finite(node.reading?.systemic_coherence))),
      activityDelta,
      affectedSystems,
      basisIds:group.slice(0,24).map(node=>node.id),
      epistemicState:'DERIVED' as const,
    }];
  }).sort((a,b)=>(b.systemicFriction??-1)-(a.systemicFriction??-1)||b.observationCount-a.observationCount);

  const mappedCount=mapped.length;
  const unmappedCount=Math.max(0,nodes.length-mappedCount);
  return{
    territories,
    mappedCount,
    unmappedCount,
    coverage:nodes.length?mappedCount/nodes.length:0,
  };
}
