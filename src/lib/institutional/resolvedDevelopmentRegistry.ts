import { SFI_DEVELOPMENT_REGISTRY, type SfiDevelopmentEntry } from './developmentRegistry';

type Override = Pick<SfiDevelopmentEntry,'state'|'implementation'|'nextGate'>;

const IMPLEMENTATION_OVERRIDES:Record<string,Override>={
  'inference-trace':{
    state:'READY',
    implementation:'Executable inference traces are persisted inside an SFI operating cycle with primary hypothesis, rivals, unknowns, discriminating observations, stopping condition, evidence references and ROOT audit. The trace remains INFERRED and cannot promote itself.',
    nextGate:'Run the rival-hypothesis discrimination benchmark and measure failure modes; this is validation work, not missing platform implementation.',
  },
  'digital-product-trajectory':{
    state:'READY',
    implementation:'A distinct Digital Product / Artifact Trajectory product capability is now wired into the central SFI operating cycle: evidence-bound trajectory events preserve object identity, parent relation, platform/source, observed time, optional real artifact hash, provenance marker and semantic state without inventing propagation claims.',
    nextGate:'Run a real cross-platform artifact case through registration → observation → trajectory → intervention/return and evaluate identity/drift claims; this is operational validation, not missing pipeline wiring.',
  },
};

export const SFI_RESOLVED_DEVELOPMENT_REGISTRY:SfiDevelopmentEntry[]=SFI_DEVELOPMENT_REGISTRY.map(entry=>{
  const override=IMPLEMENTATION_OVERRIDES[entry.id];
  return override?{...entry,...override}:entry;
});

export function summarizeResolvedDevelopment(){
  const core=SFI_RESOLVED_DEVELOPMENT_REGISTRY.filter(item=>['PRODUCT','INFRASTRUCTURE'].includes(item.classification));
  const blocking=core.filter(item=>['IN_DEVELOPMENT','GATED'].includes(item.state));
  const research=SFI_RESOLVED_DEVELOPMENT_REGISTRY.filter(item=>['PROGRAM','LAB_ONLY'].includes(item.classification));
  const genealogy=SFI_RESOLVED_DEVELOPMENT_REGISTRY.filter(item=>['ABSORBED','ARCHIVED'].includes(item.classification));
  return {
    coreTotal:core.length,
    coreImplemented:core.length-blocking.length,
    coreBlocking:blocking.map(item=>item.id),
    researchCount:research.length,
    genealogyCount:genealogy.length,
    implementationOverrides:Object.keys(IMPLEMENTATION_OVERRIDES),
  };
}
