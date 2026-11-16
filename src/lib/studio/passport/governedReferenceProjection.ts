/** Explicit cross-surface references for an owned Studio object.
 * No inference from title similarity, user prompt or genre. No authority expansion.
 */
type Row = Record<string, unknown>;
const rec=(value:unknown):Row =>
  value!==null && typeof value==='object' && !Array.isArray(value) ? value as Row:{};
const str=(value:unknown):string|null =>
  typeof value==='string' && value.trim().length ? value.trim() : null;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AGENT_ID=/^[a-zA-Z0-9][a-zA-Z0-9:_./-]{0,119}$/;
export type StudioGovernedReferences = {
  caseIds:string[];
  agentIds:string[];
  rootReceiptRefs:string[];
  declarationSource:'STUDIO_OBJECT_METADATA_ONLY';
  matchedBy:'EXPLICIT_IDENTIFIER_ONLY';
};
function refs(value:unknown):unknown[]{
  if(Array.isArray(value))return value.slice(0,24);
  return value===undefined || value===null ? []:[value];
}
export function extractStudioGovernedReferences(metadata:unknown):StudioGovernedReferences {
  const meta=rec(metadata);
  const passport=rec(meta.passport);
  const links=rec(meta.governedRefs);
  const caseIds=[...new Set([
    meta.caseId,meta.case_id,passport.caseId,
    ...refs(links.caseIds),...refs(links.caseId),
  ].flatMap(value=>{
    const candidate=str(value);
    return candidate && UUID.test(candidate)?[candidate]:[];
  }))].slice(0,6);
  const agentIds=[...new Set([
    meta.agentId,passport.agentId,
    ...refs(links.agentIds),
  ].flatMap(value=>{
    const candidate=str(value);
    return candidate&&AGENT_ID.test(candidate)?[candidate]:[];
  }))].slice(0,12);
  const rootReceiptRefs=[...new Set([
    ...refs(links.rootReceiptRefs),
  ].flatMap(value=>{
    const candidate=str(value);
    return candidate&&candidate.length<=180&&AGENT_ID.test(candidate)?[candidate]:[];
  }))].slice(0,12);
  return {
    caseIds,agentIds,rootReceiptRefs,
    declarationSource:'STUDIO_OBJECT_METADATA_ONLY',
    matchedBy:'EXPLICIT_IDENTIFIER_ONLY',
  };
}
