/**
 * Canonical SFI deep links for shared Case Platform / Timeline records.
 * IDs are validated; authorization is always rechecked at the destination.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function normalizedSfiUuid(value:unknown):string|null {
  if(typeof value!=='string')return null;
  const id=value.trim();
  return UUID.test(id)?id.toLowerCase():null;
}
export function casePlatformHref(id:unknown,objectId?:unknown):string|null {
  const canonical=normalizedSfiUuid(id);
  if(!canonical)return null;
  const object=normalizedSfiUuid(objectId);
  return '/reality-chain?caseId='+encodeURIComponent(canonical)+
    (object?'&objectId='+encodeURIComponent(object):'');
}
export function projectPlatformHref(id:unknown):string|null {
  const canonical=normalizedSfiUuid(id);
  return canonical?'/reality-chain?projectId='+encodeURIComponent(canonical):null;
}
export function caseTimelineHref(id:unknown):string|null {
  const canonical=normalizedSfiUuid(id);
  return canonical?'/timeline?caseId='+encodeURIComponent(canonical):null;
}
