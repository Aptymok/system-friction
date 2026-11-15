/** Browser-only import of a previously downloaded Studio measurement report.
 * Imported measurements are never re-certified or represented as newly executed.
 * The source audio is not inferred to be present or recoverable from this JSON.
 */
export type ImportedStudioFeature = {
  key: string;
  label: string;
  value: number | string | null;
  unit: string | null;
  status: string;
  source: string;
  formulaVersion: string;
  explanation: string;
  warnings: string[];
};
export type ImportedStudioAnalysis = {
  kind: 'audio_analysis';
  name: string;
  sizeBytes: number;
  analyzedAt: string;
  engine?: string;
  method?: string;
  sampleRateHz?: number;
  channels?: number;
  durationSeconds?: number;
  sourceBitDepth?: null;
  features: ImportedStudioFeature[];
  notObserved?: string[];
  limitations?: string[];
  originalTransferred: false;
  originalStored: false;
  persistence: 'NONE';
};
const validStatuses=new Set(['OBSERVED','PARTIAL','DERIVED','CALIBRATED','INSUFFICIENT_SIGNAL','NOT_OBSERVED','DEGRADED','FAILED','PROXY','HYPOTHESIZED']);
const isRecord=(item:unknown):item is Record<string,unknown> =>
  item!==null && typeof item==='object' && !Array.isArray(item);

export function parseStudioLocalReport(raw: unknown): ImportedStudioAnalysis {
  if(!isRecord(raw) || raw.kind!=='audio_analysis' || !Array.isArray(raw.features)) {
    throw new Error('NOT_A_STUDIO_AUDIO_ANALYSIS_REPORT');
  }
  const name=raw.name;
  const sizeBytes=raw.sizeBytes;
  const analyzedAt=raw.analyzedAt;
  const channels=raw.channels;
  const durationSeconds=raw.durationSeconds;
  const sampleRateHz=raw.sampleRateHz;
  if(typeof name!=='string'||name.length<1||name.length>255||
    typeof sizeBytes!=='number'||!Number.isFinite(sizeBytes)||sizeBytes<0||
    typeof analyzedAt!=='string'||!Number.isFinite(Date.parse(analyzedAt))||
    typeof durationSeconds!=='number'||!Number.isFinite(durationSeconds)||durationSeconds<=0||
    typeof sampleRateHz!=='number'||!Number.isFinite(sampleRateHz)||sampleRateHz<8000||sampleRateHz>384000||
    (channels!==1 && channels!==2) || raw.features.length>300 || raw.features.length===0) {
    throw new Error('STUDIO_REPORT_METADATA_INVALID');
  }
  const features:ImportedStudioFeature[]=raw.features.map((item:unknown)=>{
    if(!isRecord(item)||
      typeof item.key!=='string'||item.key.length<1||item.key.length>100||
      typeof item.label!=='string'||item.label.length>160||
      typeof item.source!=='string'||item.source.length>180||
      typeof item.formulaVersion!=='string'||item.formulaVersion.length>120||
      typeof item.explanation!=='string'||item.explanation.length>1000||
      !validStatuses.has(String(item.status)) ||
      !Array.isArray(item.warnings)||item.warnings.length>60||
      !item.warnings.every((entry:unknown)=>typeof entry==='string'&&entry.length<300)||
      !(item.unit===null||(typeof item.unit==='string'&&item.unit.length<50))||
      !(item.value===null||(typeof item.value==='string'&&item.value.length<1000)||
        (typeof item.value==='number'&&Number.isFinite(item.value)))) {
      throw new Error('STUDIO_REPORT_FEATURE_INVALID');
    }
    return {
      key:item.key as string,label:item.label as string,
      value:item.value as number|string|null,
      unit:item.unit as string|null,
      status:item.status as string,source:item.source as string,
      formulaVersion:item.formulaVersion as string,
      explanation:item.explanation as string,warnings:item.warnings as string[],
    };
  });
  // Reject self-contradictory privacy flags; do not normalize away source evidence.
  if(raw.originalStored!==false || raw.originalTransferred!==false || raw.persistence!=='NONE') {
    throw new Error('STUDIO_REPORT_PRIVACY_STATE_UNSUPPORTED');
  }
  const boundedList=(input:unknown)=>
    Array.isArray(input) && input.every((x:unknown)=>typeof x==='string'&&x.length<=300) && input.length<=100
      ? input as string[] : undefined;
  return {
    kind:'audio_analysis',
    name,sizeBytes,analyzedAt,channels,durationSeconds,sampleRateHz,
    features,originalTransferred:false,originalStored:false,persistence:'NONE',
    ...(typeof raw.engine==='string'?{engine:raw.engine.slice(0,200)}:{}),
    ...(typeof raw.method==='string'?{method:raw.method.slice(0,500)}:{}),
    ...(boundedList(raw.notObserved)?{notObserved:boundedList(raw.notObserved)}:{}),
    ...(boundedList(raw.limitations)?{limitations:boundedList(raw.limitations)}:{}),
    sourceBitDepth:null,
  };
}
