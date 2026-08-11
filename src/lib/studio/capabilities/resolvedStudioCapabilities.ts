import {
  studioCapabilityMatrix,
  studioRootCapabilityReadModel,
  type StudioCapabilityInventoryEntry,
} from './studioCapabilityInventory';

const IMPLEMENTED_CAPABILITY_OVERRIDES: Record<string, { implementedBy:string[]; calibration:StudioCapabilityInventoryEntry['calibration']; confidence:number }> = {
  'audio.spectrum.advanced': {
    implementedBy:['src/lib/studio/audio/features/advancedSpectralFeatures.ts'],
    calibration:'required',
    confidence:.74,
  },
  'audio.structure.novelty_repetition': {
    implementedBy:['src/lib/studio/audio/features/structuralFeatures.ts'],
    calibration:'required',
    confidence:.68,
  },
  'voice.semantic.audio': {
    implementedBy:['src/lib/studio/audio/features/voiceSemanticFeatures.ts','src/lib/studio/audio/analyzeStudioAudioObject.ts'],
    calibration:'required',
    confidence:.7,
  },
};

export function resolvedStudioCapabilityEntries():StudioCapabilityInventoryEntry[]{
  return studioCapabilityMatrix().entries.map(entry=>{
    const override=IMPLEMENTED_CAPABILITY_OVERRIDES[entry.id];
    if(!override)return entry;
    return {
      ...entry,
      state:'AVAILABLE',
      absenceState:null,
      implementedBy:override.implementedBy,
      requiredEngine:null,
      calibration:override.calibration,
      nextAction:override.calibration==='required'?'Accumulate calibration/benchmark evidence; implementation is present.':null,
    };
  });
}

export function resolvedStudioCapabilityMatrix(){
  const base=studioCapabilityMatrix();
  const entries=resolvedStudioCapabilityEntries();
  const technicallySolvableBlocked=entries.filter(entry=>entry.state==='BLOCKED_BY_IMPLEMENTATION').map(entry=>entry.id);
  return {
    ...base,
    entries,
    summary:{
      ...base.summary,
      technicallySolvableBlocked,
      byState:entries.reduce<Record<string,number>>((acc,entry)=>{acc[entry.state]=(acc[entry.state]??0)+1;return acc;},{}),
    },
  };
}

export function resolvedStudioRootCapabilityReadModel(){
  return studioRootCapabilityReadModel().map(item=>{
    const override=IMPLEMENTED_CAPABILITY_OVERRIDES[item.capability];
    if(!override)return item;
    return {
      ...item,
      engine:override.implementedBy[0],
      status:'AVAILABLE' as const,
      lastCalibration:override.calibration,
      confidence:override.confidence,
      dependencies:item.requiredInput,
    };
  });
}

export const resolvedStudioCapabilityImplementationIds=Object.keys(IMPLEMENTED_CAPABILITY_OVERRIDES);