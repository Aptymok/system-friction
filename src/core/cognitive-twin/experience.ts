import 'server-only';

import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';
import { processEpistemicEvent } from '@/core/memory/institutionalEventPipeline';
import { evaluateCognitiveTwinAuthority } from './contract';
import { assessCognitiveExperienceAgainstFounderCanon, FOUNDER_COGNITIVE_CANON_VERSION } from './founderCognitiveCanon';

export type CognitiveTwinExperienceType = 'EVIDENCE' | 'STATE' | 'DECISION' | 'METHOD' | 'ERROR' | 'EXCEPTION';

type EpistemicClass = 'observed' | 'declared' | 'derived' | 'inferred' | 'simulated' | 'missing';

function epistemicClassFromContent(value: unknown): EpistemicClass {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (normalized.startsWith('OBSERVED')) return 'observed';
  if (normalized.startsWith('SIMULATED')) return 'simulated';
  if (normalized.startsWith('MISSING')) return 'missing';
  if (normalized.startsWith('INFERRED')) return 'inferred';
  if (normalized.startsWith('DERIVED')) return 'derived';
  return 'declared';
}

function explicitConfidence(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

export async function recordCognitiveTwinExperience(input: {
  memoryKey: string;
  memoryType: CognitiveTwinExperienceType;
  sourceKind: string;
  sourceRef: string;
  content: Record<string, unknown>;
  evidenceRefs?: string[];
  createdBy?: string | null;
  version?: string;
  operation?: 'CAPTURE' | 'REVIEW' | 'REPLAY' | 'OBSERVE';
}) {
  const evidenceRefs=[...new Set((input.evidenceRefs??[]).filter(Boolean))];
  const authority=evaluateCognitiveTwinAuthority({action:'persist_memory',founderAbsent:false,evidencePresent:evidenceRefs.length>0||Boolean(input.sourceRef)});
  if(authority.decision!=='ALLOW') return {ok:false as const,blocked:true,reason:authority.reason};

  const canonAssessment=assessCognitiveExperienceAgainstFounderCanon({memoryType:input.memoryType,content:input.content,evidenceRefs,sourceRef:input.sourceRef});
  if(canonAssessment.blocking) return {ok:false as const,blocked:true,reason:`FOUNDER_COGNITIVE_CANON_BLOCK:${[...canonAssessment.constraintRefs,...canonAssessment.warnings].join(',')}`,canonAssessment};

  const confidence=explicitConfidence(input.content.confidence);
  const epistemicClass=epistemicClassFromContent(input.content.epistemicClass);
  const emitted=await emitEpistemicEvent({
    eventName:'cognitive_twin.experience.recorded',
    logbookId:`cognitive-twin:${input.memoryKey}`,
    epistemicClass,
    schemaVersion:input.version??'sfi-ct-experience-v2',
    sourceId:input.sourceRef||input.memoryKey,
    sourceType:input.sourceKind,
    actorId:input.createdBy??null,
    confidence:confidence ?? 0,
    payload:{
      memoryKey:input.memoryKey,memoryType:input.memoryType,operation:input.operation??'OBSERVE',
      content:{...input.content,cognitiveTwinExperienceContract:'SFI-CT-EXPERIENCE-2.1',founderCognitiveCanonVersion:FOUNDER_COGNITIVE_CANON_VERSION,cognitiveConstraintRefs:canonAssessment.constraintRefs,counterPatternRefs:canonAssessment.counterPatternRefs,canonWarnings:canonAssessment.warnings},
      evidenceRefs,sourceKind:input.sourceKind,sourceRef:input.sourceRef,
      confidenceState:confidence===null?'UNASSESSED':'EXPLICIT',
      promotionBoundary:'Experience is appended to the epistemic ledger first. Memory promotion is policy-governed and never expands Cognitive Twin authority.',
    },
    lineage:evidenceRefs,
    uncertainty:confidence===null?'Confidence was not assessed; numeric confidence=0 is a schema sentinel and not a measurement.':undefined,
  });
  if(!emitted.ok) return {ok:false as const,blocked:false,reason:emitted.error,canonAssessment};

  const promotion=await processEpistemicEvent(emitted.event);
  const memoryResult='memoryResult' in promotion ? promotion.memoryResult : null;
  if(memoryResult && !memoryResult.ok){
    return {ok:false as const,blocked:false,reason:`MEMORY_PROMOTION_FAILED:${memoryResult.error??'unknown_error'}`,event:emitted.event,promotion,canonAssessment};
  }

  const memory=promotion.promoted && memoryResult && 'memory' in memoryResult ? memoryResult.memory : undefined;
  return {ok:true as const,blocked:false,event:emitted.event,promotion,memory,canonAssessment};
}
