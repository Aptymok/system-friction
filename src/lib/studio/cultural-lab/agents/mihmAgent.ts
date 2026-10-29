import type { CulturalArtifactInput, InputArchaeologyResult, MihmDeepElement } from '../types';

/** Consume an explicit analysis receipt; text length is not MIHM metrology. */
export async function mihmAgent(input: CulturalArtifactInput, _archaeology: InputArchaeologyResult): Promise<MihmDeepElement[]> {
  const measurement=input.mihmMeasurement;
  if(!measurement)throw new Error('MIHM_MEASUREMENTS_REQUIRED');
  const at=Date.parse(measurement.observedAt);
  if(!measurement.sourceRef?.trim()||!measurement.caseId?.trim()||!measurement.methodVersion?.trim()||measurement.scale!=='0-1'||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(measurement.observedAt)||!Number.isFinite(at)||
    new Date(at).toISOString().slice(0,10)!==measurement.observedAt.slice(0,10)||at>Date.now()||
    ['ihg','nti','ldi'].some(k=>typeof measurement.values?.[k]!=='number'||!Number.isFinite(measurement.values[k])||measurement.values[k]!<0||measurement.values[k]!>1))
    throw new Error('MIHM_MEASUREMENTS_INVALID');
  return ['ihg','nti','ldi'].map(id=>({
    id,label:`${id.toUpperCase()} · supplied ${measurement.methodVersion} reading`,score:measurement.values[id] as number,
    vector:{[id]:measurement.values[id] as number},
    explanation:'Provided bounded analysis value with declared source, case and method provenance; not independently verified or a canonical cross-domain Phi.',
    evidence:[measurement.sourceRef],
    measurementProvenance:{caseId:measurement.caseId,sourceRef:measurement.sourceRef,methodVersion:measurement.methodVersion,observedAt:measurement.observedAt,scale:measurement.scale,epistemicClass:'DECLARED' as const,independentlyVerified:false as const},
  }));
}
