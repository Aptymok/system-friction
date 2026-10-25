/**
 * C20 preflight: compare two independently fetched, authorized case snapshots.
 * No database credentials, no network requests, no reconciliation writes.
 * Canonical-ref equality by itself is NOT sufficient to resolve a fork.
 */
export const SFI_CASE_SNAPSHOT_PARITY_PREFLIGHT='SFI-CASE-SNAPSHOT-PARITY-PREFLIGHT-1.0' as const;
export type CaseSnapshotFingerprint={
  canonicalRefId:string;
  rowId:string;
  objectKind:string;
  payloadDigest:string;
  canonicalVersion:string|null;
};
function valid(x:CaseSnapshotFingerprint){
  return Boolean(x.canonicalRefId&&x.rowId&&x.objectKind&&x.payloadDigest&&x.canonicalVersion!==undefined);
}
function inventory(rows:readonly CaseSnapshotFingerprint[]){
  const map=new Map<string,CaseSnapshotFingerprint>();
  const duplicateRefs:string[]=[];
  const invalidRefs:string[]=[];
  for(const row of rows){
    if(!valid(row)){invalidRefs.push(row.canonicalRefId||'[MISSING_REF]');continue;}
    if(map.has(row.canonicalRefId))duplicateRefs.push(row.canonicalRefId);
    else map.set(row.canonicalRefId,row);
  }
  return {map,duplicateRefs:duplicateRefs.sort(),invalidRefs:invalidRefs.sort()};
}
export function preflightCaseSnapshotParity(
  primary:readonly CaseSnapshotFingerprint[],
  continuity:readonly CaseSnapshotFingerprint[],
){
  const a=inventory(primary),b=inventory(continuity);
  const sharedExact:string[]=[],sharedConflicts:{ref:string;reasons:string[]}[]=[];
  const primaryOnly:string[]=[],continuityOnly:string[]=[];
  for(const [ref,left] of a.map){
    const right=b.map.get(ref);
    if(!right){primaryOnly.push(ref);continue;}
    const reasons:string[]=[];
    if(left.rowId!==right.rowId)reasons.push('ROW_ID_MISMATCH');
    if(left.objectKind!==right.objectKind)reasons.push('OBJECT_KIND_MISMATCH');
    if(left.payloadDigest!==right.payloadDigest)reasons.push('CONTENT_DIGEST_MISMATCH');
    if(left.canonicalVersion!==right.canonicalVersion)reasons.push('CANONICAL_VERSION_MISMATCH');
    if(reasons.length)sharedConflicts.push({ref,reasons});
    else sharedExact.push(ref);
  }
  for(const ref of b.map.keys())if(!a.map.has(ref))continuityOnly.push(ref);
  sharedExact.sort();primaryOnly.sort();continuityOnly.sort();
  sharedConflicts.sort((l,r)=>l.ref.localeCompare(r.ref));
  const complete=Boolean(primary.length&&continuity.length&&
    !a.invalidRefs.length&&!b.invalidRefs.length&&
    !a.duplicateRefs.length&&!b.duplicateRefs.length);
  const parityVerified=complete&&!sharedConflicts.length&&!primaryOnly.length&&!continuityOnly.length;
  return {
    contract:SFI_CASE_SNAPSHOT_PARITY_PREFLIGHT,
    counts:{primary:primary.length,continuity:continuity.length,
      exactMatches:sharedExact.length,conflictingRefs:sharedConflicts.length,
      primaryOnly:primaryOnly.length,continuityOnly:continuityOnly.length},
    sharedExact,sharedConflicts,primaryOnly,continuityOnly,
    invalid:{primary:a.invalidRefs,continuity:b.invalidRefs},
    duplicate:{primary:a.duplicateRefs,continuity:b.duplicateRefs},
    inventoryComparable:complete,
    parityVerified,
    state:parityVerified?'IDENTICAL_SNAPSHOT_FINGERPRINTS_ONLY'
      :'FORK_OR_INCOMPLETE_INVENTORY_REQUIRES_GOVERNED_RECONCILIATION',
    permitsMirrorDrain:false as const,
    permitsAuthorityReplay:false as const,
    permitsSourcePromotion:false as const,
    boundary:'SNAPSHOT_FINGERPRINT_PARITY_IS_NOT_OAUTH_JOURNAL_RECONCILIATION_OR_WRITE_AUTHORIZATION',
  };
}
