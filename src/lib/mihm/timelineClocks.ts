/**
 * MIHM-T Timeline Observatory v0.1 — evidence-bounded temporal reading.
 * Source-of-record temporal axes are distinct from event order and from forecast time.
 * This is a descriptive projection, NOT a dimensional transfer calculation or MIHM-T validation.
 * No clock is populated by borrowing another clock's timestamp.
 */
import type { SfiTemporalBasis } from '../../core/contracts/temporal';

export const TIMELINE_CLOCK_CONTRACT = 'SFI-MIHM-T-TIMELINE-CLOCKS-0.1' as const;

export const TIMELINE_CLOCKS = [
  {id:'EVENT',label:'EVENT',description:'When the represented event actually occurred'},
  {id:'OBSERVATION',label:'OBSERVATION',description:'When an observation of the system was made'},
  {id:'RECORD',label:'RECORD',description:'When its source record was created or updated'},
  {id:'KNOWLEDGE',label:'KNOWLEDGE',description:'When an actor could be verified to know'},
  {id:'AUTHORITY',label:'AUTHORITY',description:'When an applicable authorization existed'},
  {id:'EXECUTION',label:'EXECUTION',description:'When an authorized action was performed'},
  {id:'RETURN',label:'RETURN',description:'When a consequence was independently observed'},
] as const;
export type TimelineClockId = typeof TIMELINE_CLOCKS[number]['id'];
export type TimelineClockEvidence = {
  at: string;
  sourceRef: string;
  meaning: string;
  basis: SfiTemporalBasis;
  epistemicClass: 'OBSERVED'|'RECONSTRUCTED';
};
export type TimelineClockInputs = Partial<Record<TimelineClockId,TimelineClockEvidence>>;
export type TimelineClockReading = {
  clock:TimelineClockId; label:string; at:string|null;
  state:'SOURCE_DATED'|'UNKNOWN';
  sourceRef:string|null; meaning:string; basis:SfiTemporalBasis|null;
  epistemicClass:'OBSERVED'|'RECONSTRUCTED'|'UNKNOWN';
};
export type TimelineClockProfile = {
  contract:typeof TIMELINE_CLOCK_CONTRACT;
  instrument:'TEMPORAL_READER_NOT_VALIDATED_MIHM_T_MODEL';
  eventId:string;
  anchorAt:string;
  anchorMeaning:string;
  readings:TimelineClockReading[];
  documentedIntervals:Array<{from:TimelineClockId;to:TimelineClockId;deltaMs:number;state:'DATED_ORDER'|'REVERSED_OR_CONFLICTED';meaning:string}>;
  incompleteClocks:TimelineClockId[];
  sourceCompleteness:'PARTIAL'|'NO_CLOCK_EVIDENCE';
  inference:'NO_INFERRED_TIMESTAMPS';
  temporalClaim:'DESCRIPTIVE_ONLY_NO_CAUSAL_LAG_OR_TRANSFER';
};

function strictInstant(value:unknown):string|null {
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value))return null;
  const ms=Date.parse(value);
  return Number.isFinite(ms)?new Date(ms).toISOString():null;
}
export function projectTimelineClockProfile(input:{
  eventId:string;anchorAt:string;anchorMeaning:string;clocks?:TimelineClockInputs;
}):TimelineClockProfile {
  const readings:TimelineClockReading[]=TIMELINE_CLOCKS.map(clock=>{
    const evidence=input.clocks?.[clock.id];
    const when=strictInstant(evidence?.at);
    const complete=Boolean(when&&evidence?.sourceRef?.trim()&&evidence?.meaning?.trim()&&
      (evidence.basis==='OBSERVED_TIME'||evidence.basis==='RECONSTRUCTED_TIME')&&
      (evidence.epistemicClass==='OBSERVED'||evidence.epistemicClass==='RECONSTRUCTED'));
    return {clock:clock.id,label:clock.label,at:complete?when:null,
      state:complete?'SOURCE_DATED':'UNKNOWN',
      sourceRef:complete?evidence!.sourceRef:null,
      meaning:complete?evidence!.meaning:'No independently dated source for this clock.',
      basis:complete?evidence!.basis:null,
      epistemicClass:complete?evidence!.epistemicClass:'UNKNOWN'};
  });
  const by=(id:TimelineClockId)=>readings.find(x=>x.clock===id)!;
  // Only show directly computed ordering when both independent clocks are observed.
  // This is an interval, never a calibrated directed-system transfer or causal latency.
  const pairs:Array<[TimelineClockId,TimelineClockId]>=[
    ['EVENT','OBSERVATION'],['OBSERVATION','RECORD'],['EVENT','RECORD'],
    ['EVENT','KNOWLEDGE'],['AUTHORITY','EXECUTION'],['EXECUTION','RETURN']
  ];
  const documentedIntervals=pairs.flatMap(([from,to])=>{
    const a=by(from),b=by(to);
    if(!a.at||!b.at)return [];
    const deltaMs=Date.parse(b.at)-Date.parse(a.at);
    return [{from,to,deltaMs,state:deltaMs<0?'REVERSED_OR_CONFLICTED' as const:'DATED_ORDER' as const,
      meaning:'Timestamp difference, not proof of causal transfer or actor knowledge.'}];
  });
  const incompleteClocks=readings.filter(x=>x.at===null).map(x=>x.clock);
  return {
    contract:TIMELINE_CLOCK_CONTRACT,
    instrument:'TEMPORAL_READER_NOT_VALIDATED_MIHM_T_MODEL',
    eventId:input.eventId,anchorAt:input.anchorAt,anchorMeaning:input.anchorMeaning,
    readings,documentedIntervals,incompleteClocks,
    sourceCompleteness:incompleteClocks.length===readings.length?'NO_CLOCK_EVIDENCE':'PARTIAL',
    inference:'NO_INFERRED_TIMESTAMPS',
    temporalClaim:'DESCRIPTIVE_ONLY_NO_CAUSAL_LAG_OR_TRANSFER'
  };
}
