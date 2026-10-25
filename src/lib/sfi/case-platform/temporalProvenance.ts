/**
 * C13-C14: read-only multi-clock projection. Provider-displayed dates,
 * documentary timestamps and case-ingest times are never interchangeable.
 */
export const SFI_CASE_TEMPORAL_PROVENANCE_CONTRACT='SFI-CASE-TEMPORAL-PROVENANCE-1.0' as const;
type Dict=Record<string,unknown>;
export type TemporalCaseObject={
  kind:string; createdAt:string; observedAt?:string|null;
  canonicalRef:{id:string}; payload:Dict;
};
export type TemporalFact={
  objectRef:string;
  objectKind:string;
  clock:'DOCUMENT_CREATED'|'DOCUMENT_MODIFIED'|'PROVIDER_DISPLAYED_RELEASE'|'OBSERVATION_RECORDED'|'CASE_OBJECT_PERSISTED';
  value:string;
  precision:'DAY'|'TIMESTAMP';
  interpretation:'DOCUMENT_METADATA'|'PROVIDER_CLAIM'|'RECORDED_OBSERVATION'|'INSTITUTIONAL_INGEST';
  relationToCutoff:'BEFORE_OR_ON_CUTOFF'|'AFTER_CUTOFF'|'NOT_COMPARABLE';
  historicalStatus:'NO_RETROSPECTIVE_VERIFICATION';
  source:string|null;
};
function dict(x:unknown):Dict{return x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Dict:{};}
function txt(x:unknown):string|null{return typeof x==='string'&&x.trim()?x.trim():null;}
function validTime(x:unknown):{value:string;precision:'DAY'|'TIMESTAMP'}|null{
  const v=txt(x);if(!v)return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)){
    const n=Date.parse(v+'T00:00:00Z');
    return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===v?{value:v,precision:'DAY'}:null;
  }
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v))return null;
  const n=Date.parse(v);
  return Number.isFinite(n)?{value:new Date(n).toISOString(),precision:'TIMESTAMP'}:null;
}
function relation(value:string,cutoff:string):TemporalFact['relationToCutoff']{
  const day=validTime(value)?.value.slice(0,10);
  const stop=validTime(cutoff)?.value.slice(0,10);
  if(!day||!stop)return 'NOT_COMPARABLE';
  return day<=stop?'BEFORE_OR_ON_CUTOFF':'AFTER_CUTOFF';
}
/** Only project timestamp metadata; never expose private text, media or URLs. */
export function projectCaseTemporalProvenance(
  objects:readonly TemporalCaseObject[],cutoff:string,maxFacts=300,
){
  const facts:TemporalFact[]=[];let skippedInvalid=0;
  const add=(o:TemporalCaseObject,clock:TemporalFact['clock'],value:unknown,
    interpretation:TemporalFact['interpretation'],source:string|null)=>{
    if(value===null||value===undefined)return;
    const valid=validTime(value);
    if(!valid){skippedInvalid++;return;}
    facts.push({objectRef:o.canonicalRef.id,objectKind:o.kind,clock,
      value:valid.value,precision:valid.precision,interpretation,
      relationToCutoff:relation(valid.value,cutoff),
      historicalStatus:'NO_RETROSPECTIVE_VERIFICATION',source});
  };
  for(const o of objects){
    const p=dict(o.payload),m=dict(p.metadata);
    if(o.kind==='SOURCE'&&p.sourceType==='AUTHORED_DOCUMENT'){
      add(o,'DOCUMENT_CREATED',m.fileCreatedAt,'DOCUMENT_METADATA',txt(p.label));
      add(o,'DOCUMENT_MODIFIED',m.fileModifiedAt,'DOCUMENT_METADATA',txt(p.label));
    }
    if(o.kind==='SOURCE'&&p.sourceType==='PUBLIC_PROVIDER_CATALOG'){
      add(o,'PROVIDER_DISPLAYED_RELEASE',m.providerDisplayedReleaseDate,
        'PROVIDER_CLAIM',txt(m.supplier));
    }
    if(o.kind==='OBSERVATION'){
      add(o,'PROVIDER_DISPLAYED_RELEASE',p.providerDisplayedReleaseDate,
        'PROVIDER_CLAIM',txt(p.provider));
      add(o,'OBSERVATION_RECORDED',o.observedAt,
        'RECORDED_OBSERVATION',txt(p.provider));
    }
    add(o,'CASE_OBJECT_PERSISTED',o.createdAt,'INSTITUTIONAL_INGEST',null);
  }
  facts.sort((a,b)=>a.value.localeCompare(b.value)
    || a.objectRef.localeCompare(b.objectRef)||a.clock.localeCompare(b.clock));
  const cap=Number.isFinite(maxFacts)?Math.max(1,Math.min(1000,Math.trunc(maxFacts))):300;
  return {
    contract:SFI_CASE_TEMPORAL_PROVENANCE_CONTRACT,cutoff,
    snapshotObjectCount:objects.length,
    events:facts.slice(0,cap),totalFacts:facts.length,
    truncated:facts.length>cap,skippedInvalid,
    boundary:'DOCUMENT_DATES_PROVIDER_CLAIMS_AND_INGEST_TIMES_ARE_DISTINCT_NOT_EVIDENCE_ADJUDICATION_OR_RETURN',
    warning:'Provider dates observed after cutoff do not establish historic visibility. This data plane snapshot may be stale.',
  };
}
