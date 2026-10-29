import { MIHM_PHI_REGISTRY } from './phiContract';
import type {
  MihmPhiEpistemicStatus,
  MihmPhiSemanticRole,
  MihmPhiSymbol,
} from './phiContract';

export type MihmInstrumentType =
  | 'PERSONAL'
  | 'SYSTEMIC'
  | 'PHENOMENOLOGICAL'
  | 'WORLD'
  | 'INSTITUTIONAL'
  | 'EVIDENCE_ONLY';

export type HomeostaticSymbol = MihmPhiSymbol;

export const HOMEOSTATIC_SYMBOL_BY_TYPE: Record<Exclude<MihmInstrumentType, 'EVIDENCE_ONLY'>, HomeostaticSymbol> = {
  PERSONAL: 'PHI_H',
  SYSTEMIC: 'PHI_S',
  PHENOMENOLOGICAL: 'PHI_F',
  WORLD: 'PHI_W',
  INSTITUTIONAL: 'PHI_SFI',
};

export const HOMEOSTATIC_SYMBOL_LABEL: Record<HomeostaticSymbol, string> = {
  PHI_H: 'Φ_H · humano/sesión',
  PHI_S: 'Φ_S · sistema/objeto',
  PHI_F: 'Φ_F · fenómeno',
  PHI_W: 'Φ_W · contexto mundial',
  PHI_SFI: 'Φ_SFI · institución',
};

export type MihmTrajectoryDirection =
  | 'DEEPENING'
  | 'EXPANSION'
  | 'FRAGMENTATION'
  | 'CONVERGENCE'
  | 'INSTITUTIONALIZATION'
  | 'DEGRADATION'
  | 'ABSTRACTION'
  | 'OPERATIONALIZATION';

export type MihmVariableReading = {
  key: string;
  value: number | null;
  scale: '0-1' | '0-5' | string;
};

export type MihmTrajectory = {
  direction: MihmTrajectoryDirection | null;
  confidence: string | null;
};

export type MihmPrediction = {
  statement: string | null;
  confidence: number | null;
  horizon: string | null;
};

export type MihmHomeostaticState = {
  symbol: HomeostaticSymbol;
  label: string;
  value: number | null;
  scale: '0-1';
  semanticRole: MihmPhiSemanticRole;
  formulaRef: string;
  formulaVersion: string;
  epistemicStatus: MihmPhiEpistemicStatus;
};

export type MihmInstrumentState = {
  instrument: 'MOP-H' | 'SCOREFRICTION' | 'PPOI' | 'SMLI-P' | 'WORLD_VECTOR' | 'SFI_INSTITUTIONAL' | (string & {});
  instrumentType: MihmInstrumentType;
  objectId: string;
  comparisonSubjectId?: string;
  snapshotRef?: string;
  variables: MihmVariableReading[];
  homeostaticState: MihmHomeostaticState | null;
  confidence: number | null;
  trajectory: MihmTrajectory | null;
  prediction: MihmPrediction | null;
  observedAt: string;
  warnings: string[];
};

export type MihmInstrumentLink = {left:number;right:number;operation:'CONTEXT'|'COMPARE'|'AVERAGE'|'SUBSTITUTE'};
/** Compatibility admission is not scientific validation or action authorization. */
export function assessMihmInstrumentCompatibility(input:{readings:MihmInstrumentState[];links?:MihmInstrumentLink[];timeCut:string;contradictions?:string[]}) {
  const contradictions=[...(input.contradictions??[])],missing:string[]=[];
  const validTime=(value:unknown)=>{
    if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value))return false;
    const t=Date.parse(value);if(!Number.isFinite(t))return false;
    const z=value.endsWith('Z')?null:value.slice(-6);
    if(z&&(Number(z.slice(1,3))>23||Number(z.slice(4))>59))return false;
    const offset=z?(z[0]==='-'?-1:1)*(Number(z.slice(1,3))*60+Number(z.slice(4))):0;
    return new Date(t+offset*60000).toISOString().slice(0,10)===value.slice(0,10);
  };
  if(!validTime(input.timeCut))contradictions.push('INVALID_TIME_CUT');
  if(!Array.isArray(input.readings)||!input.readings.length)missing.push('INSTRUMENT_READINGS_REQUIRED');
  const readings=Array.isArray(input.readings)?input.readings:[];
  const subject=(r:MihmInstrumentState)=>r.instrument==='WORLD_VECTOR'&&r.instrumentType==='WORLD'&&r.comparisonSubjectId==='worldspect:global-context'&&r.snapshotRef===r.objectId?r.comparisonSubjectId:r.objectId;
  const seen=new Map<string,number>();
  readings.forEach((reading,index)=>{
    if(!reading||!reading.objectId?.trim()||!validTime(reading.observedAt)||Date.parse(reading.observedAt)>Date.parse(input.timeCut)){contradictions.push(`INVALID_IDENTITY_OR_TIME:${index}`);return;}
    const state=reading.homeostaticState;
    if(!state){missing.push(`PHI_MISSING:${index}`);return;}
    const expected=HOMEOSTATIC_SYMBOL_BY_TYPE[reading.instrumentType as Exclude<MihmInstrumentType,'EVIDENCE_ONLY'>];
    const definition=MIHM_PHI_REGISTRY[state.symbol];
    const allowed:Record<string,string[]>={PHI_H:['MOP-H','MOP_H'],PHI_S:['SCOREFRICTION'],PHI_F:['PPOI','SMLI-P'],PHI_W:['WORLD_VECTOR'],PHI_SFI:['SFI_INSTITUTIONAL']};
    if(!allowed[state.symbol]?.includes(reading.instrument))contradictions.push(`INSTRUMENT_NAME_MISMATCH:${index}`);
    if(!definition||state.symbol!==expected||state.semanticRole!==definition.semanticRole||state.formulaRef!==definition.formulaAuthority||state.formulaVersion!==definition.formulaVersion||state.scale!=='0-1'){
      contradictions.push(`INSTRUMENT_SEMANTIC_OR_FORMULA_MISMATCH:${index}`);return;
    }
    if(state.value===null){missing.push(`PHI_VALUE_MISSING:${index}`);return;}
    if(typeof state.value!=='number'||!Number.isFinite(state.value)||state.value<0||state.value>1){contradictions.push(`INVALID_PHI_VALUE:${index}`);return;}
    if(state.epistemicStatus==='CONFLICTED')contradictions.push(`CONFLICTED_PHI:${index}`);
    else if(!['OBSERVED','DERIVED'].includes(state.epistemicStatus))missing.push(`PHI_NOT_USABLE:${index}`);
    const key=[state.symbol,subject(reading),Date.parse(reading.observedAt),state.formulaVersion].join('|');
    if(seen.has(key)&&seen.get(key)!==state.value)contradictions.push(`SAME_SNAPSHOT_CONFLICT:${index}`);
    seen.set(key,state.value);
  });
  for(const link of input.links??[]){
    const a=readings[link.left],b=readings[link.right];
    if(!Number.isInteger(link.left)||!Number.isInteger(link.right)||!a||!b||!['CONTEXT','COMPARE','AVERAGE','SUBSTITUTE'].includes(link.operation)){contradictions.push('INVALID_INSTRUMENT_LINK');continue;}
    if(link.operation==='CONTEXT')continue;
    if(link.operation==='AVERAGE'||link.operation==='SUBSTITUTE'){contradictions.push('PHI_AGGREGATION_OR_SUBSTITUTION_FORBIDDEN');continue;}
    const x=a.homeostaticState,y=b.homeostaticState;
    if(!x||!y){missing.push('COMPARABLE_PHI_REQUIRED');continue;}
    if(x.symbol!==y.symbol||subject(a)!==subject(b)||x.formulaVersion!==y.formulaVersion||x.scale!==y.scale)contradictions.push('INCOMPARABLE_INSTRUMENTS');
  }
  return {readiness:contradictions.length?'CONTRADICTED' as const:missing.length?'INCOMPLETE' as const:'COMPATIBLE_FOR_REVIEW' as const,
    contradictions:[...new Set(contradictions)],missing:[...new Set(missing)],decisionAuthorized:false,scientificValidation:false,
    boundary:'Typed compatibility only. Context is not substitution, common scale is not commensurability, and review readiness grants no decision/action authority.'};
}
