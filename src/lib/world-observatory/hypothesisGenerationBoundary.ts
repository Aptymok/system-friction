/**
 * Pure boundary for World hypothesis generation. Never changes the scientific
 * admission contract or turns inference into measured evidence.
 */
import { parseHypothesisTestContract } from './hypothesisTestContract';

type Row=Record<string,unknown>;
const record=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const bounded=(v:unknown,max:number)=>typeof v==='string'?v.slice(0,max):v;

/**
 * Choose a bounded, source-family-diverse sample of existing observations.
 * This is coverage selection, NOT an evidence sufficiency or hypothesis gate.
 * Preserve the original temporal order within each declared source family.
 */
export function selectWorldHypothesisSeeds<T extends { observation: { id: string; source_family: string } }>(
  items: T[], limit = 12,
): T[] {
  const boundedLimit = Math.max(0, Math.min(12, Math.floor(limit)));
  const groups = new Map<string, T[]>();
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.observation.id || seen.has(item.observation.id)) continue;
    seen.add(item.observation.id);
    const family = item.observation.source_family || 'UNKNOWN';
    const bucket = groups.get(family) ?? [];
    bucket.push(item);
    groups.set(family, bucket);
  }
  const selected: T[] = [];
  let offset = 0;
  while (selected.length < boundedLimit) {
    let added = false;
    for (const group of groups.values()) {
      if (selected.length >= boundedLimit) break;
      const next = group[offset];
      if (!next) continue;
      selected.push(next);
      added = true;
    }
    if (!added) break;
    offset += 1;
  }
  return selected;
}

export function prepareWorldHypothesisPrompt(input:{
 methodology:string; testContract:string;
 learningProfile:unknown; observations:Row[]; derivedRelations:Row[];
}) {
 // The old JSON.stringify(...).slice(0,30000) could truncate JSON in mid-field.
 // Keep source IDs and observables, do not forward unbounded scraped payloads.
 const observations=input.observations.slice(0,8).map(o=>({
  id:o.id,sourceId:o.sourceId,sourceFamily:o.sourceFamily,publisher:o.publisher,
  title:bounded(o.title,240),summary:bounded(o.summary,850),
  observedAt:o.observedAt,sourceUrl:bounded(o.sourceUrl,600),
  affectedSystems:Array.isArray(o.affectedSystems)?o.affectedSystems.slice(0,12):[],
  actors:Array.isArray(o.actors)?o.actors.slice(0,12):[],
  sourceConfidence:o.sourceConfidence,metrics:o.metrics,
 }));
 const learning=record(input.learningProfile);
 const prompt={
  methodology:input.methodology,testContract:input.testContract,
  learningProfile:{
   sampleSize:learning.sampleSize,classificationCounts:learning.classificationCounts,
   partialValidationRate:learning.partialValidationRate,
   decisiveRate:learning.decisiveRate,inconclusiveRate:learning.inconclusiveRate,
   tightenDiscrimination:learning.tightenDiscrimination,
   topMissingVariables:learning.topMissingVariables,
   generationGuidance:learning.generationGuidance,
   boundaries:learning.boundaries,
  },
  observations,derivedRelations:input.derivedRelations.slice(0,24),
  epistemicBoundary:'Source records are observations; derived metrics and graph coincidences are not causes; model conclusions are inference.',
 };
 const serialized=JSON.stringify(prompt);
 return {prompt:serialized,observationCount:observations.length,relationCount:Math.min(input.derivedRelations.length,24),length:serialized.length};
}
export function diagnoseWorldHypothesisResponse(raw:string):{
 code:'MALFORMED_JSON'|'INVALID_DECISION'|'MISSING_OR_INVALID_TEST_CONTRACT'|'VALID_NO_HYPOTHESIS'|'VALID_PROPOSE';
 decision:string|null; parsed:Row|null;
} {
 let parsed:Row;
 try {
  const clean=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  parsed=record(JSON.parse(clean));
 } catch {
  return {code:'MALFORMED_JSON',decision:null,parsed:null};
 }
 const decision=typeof parsed.decision==='string'?parsed.decision.trim().toUpperCase():null;
 if(decision!=='PROPOSE'&&decision!=='NO_HYPOTHESIS')return {code:'INVALID_DECISION',decision,parsed};
 if(decision==='NO_HYPOTHESIS')return {code:'VALID_NO_HYPOTHESIS',decision,parsed};
 if(!parseHypothesisTestContract(parsed.testContract))return {code:'MISSING_OR_INVALID_TEST_CONTRACT',decision,parsed};
 return {code:'VALID_PROPOSE',decision,parsed};
}
