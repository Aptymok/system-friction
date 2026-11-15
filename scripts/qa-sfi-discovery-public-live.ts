// SFI-03 LIVE public-boundary verification. Never uses mocks or fixture outcomes.
import assert from 'node:assert/strict';
import { SFI_CANONICAL_IDENTITY_FINGERPRINT, SFI_EXTERNAL_IDENTITY_NODES, verifiedInstitutionSameAs } from '../src/lib/public/institutionProfile';

const canonical = new URL(SFI_CANONICAL_IDENTITY_FINGERPRINT.canonicalUrl);
const startedAt = new Date().toISOString();
const observations: Array<{ path: string; status: number; finalUrl: string; bytes: number }> = [];
async function observe(path: string, accept: string) {
  const url = new URL(path,canonical);
  const response = await fetch(url,{
    redirect: 'follow',cache:'no-store',
    headers:{ accept,'user-agent':'SFI-08-real-discovery-assurance/1.0' },
    signal:AbortSignal.timeout(18000),
  });
  const body=await response.text();
  const final=new URL(response.url);
  assert.ok(final.protocol==='https:' && (final.hostname===canonical.hostname || final.hostname==='www.'+canonical.hostname), 'PUBLIC_SOURCE_REDIRECT_OUTSIDE_CANON');
  observations.push({path,status:response.status,finalUrl:response.url,bytes:Buffer.byteLength(body)});
  return {status:response.status,body,response};
}
async function main() {
const home=await observe('/','text/html');
assert.equal(home.status,200,'PUBLIC_HOME_NOT_ACCESSIBLE');
const scripts=[...home.body.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>{
  try{return JSON.parse(m[1]);}catch{return null;}
}).filter(Boolean);
const organization=scripts.find(x=>x['@id']===SFI_CANONICAL_IDENTITY_FINGERPRINT.entityId);
assert.ok(organization,'PUBLIC_CANONICAL_IDENTITY_NOT_EXPOSED');
assert.equal(organization.name,SFI_CANONICAL_IDENTITY_FINGERPRINT.name,'CANONICAL_IDENTITY_NAME_MISMATCH');
const expected=verifiedInstitutionSameAs().slice().sort();
const observed=Array.isArray(organization.sameAs)?organization.sameAs.slice().sort():[];
assert.deepEqual(observed,expected,'PUBLIC_SAMEAS_DOES_NOT_MATCH_CANONICAL_VERIFIED_INSTITUTION_NODES');
const publicMachineIndex=await observe('/ai-index.json','application/json');
assert.equal(publicMachineIndex.status,200,'PUBLIC_MACHINE_INDEX_NOT_ACCESSIBLE');
const machineIdentity=JSON.parse(publicMachineIndex.body);
assert.equal(machineIdentity.name,SFI_CANONICAL_IDENTITY_FINGERPRINT.name,'PUBLIC_MACHINE_INDEX_IDENTITY_MISMATCH');
assert.equal(machineIdentity.abbreviation,SFI_CANONICAL_IDENTITY_FINGERPRINT.abbreviation,'PUBLIC_MACHINE_INDEX_ABBREVIATION_MISMATCH');
assert.equal(new URL(machineIdentity.canonical_url).origin,canonical.origin,'PUBLIC_MACHINE_INDEX_CANONICAL_URL_MISMATCH');
for(const node of SFI_EXTERNAL_IDENTITY_NODES) {
  if(node.state!=='VERIFIED'||node.identityClass!=='INSTITUTION_PROFILE'){
    assert.ok(!observed.includes(node.url),'UNVERIFIED_OR_NON_EQUIVALENT_EXTERNAL_IDENTITY_EMITTED');
  }
}
const sitemap=await observe('/sitemap.xml','application/xml');
assert.equal(sitemap.status,200,'PUBLIC_SITEMAP_NOT_ACCESSIBLE');
const exposed=[...sitemap.body.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));
assert.ok(exposed.length>0,'SITEMAP_HAS_NO_PUBLIC_LOCATIONS');
for(const link of exposed) {
  const p=new URL(link,canonical);
  assert.ok(p.hostname===canonical.hostname || p.hostname==='www.'+canonical.hostname,'SITEMAP_EMITS_FOREIGN_OWNER');
  assert.ok(!/^\/(?:root|method-lab|login|api\/root|api\/oauth)(?:\/|$)/.test(p.pathname),'SITEMAP_EXPOSES_PRIVATE_ROUTE:'+p.pathname);
}
const robots=await observe('/robots.txt','text/plain');
assert.equal(robots.status,200,'PUBLIC_ROBOTS_NOT_ACCESSIBLE');
assert.match(robots.body,/Disallow:\s*\/root(?:\s|$)/im,'PRIVATE_ROOT_CRAWLER_RULE_MISSING');
assert.match(robots.body,/Disallow:\s*\/api\/root(?:\s|$)/im,'PRIVATE_ROOT_API_CRAWLER_RULE_MISSING');
const privateApi=await observe('/api/root/discovery','application/json');
assert.ok([401,403,404].includes(privateApi.status),'PRIVATE_DISCOVERY_API_ACCESSIBLE_WITHOUT_AUTH:'+privateApi.status);
const privateCycles=await observe('/api/pipeline/cycles','application/json');
assert.ok([401,403,404].includes(privateCycles.status),'PRIVATE_OPERATING_CYCLES_ACCESSIBLE_WITHOUT_AUTH:'+privateCycles.status);
const manifest=await observe('/api/external/v1/manifest','application/json');
assert.equal(manifest.status,200,'PUBLIC_EXTERNAL_MANIFEST_UNAVAILABLE');
const publicGatewayManifest=JSON.parse(manifest.body);
assert.equal(publicGatewayManifest.ok,true,'PUBLIC_GATEWAY_MANIFEST_CONTRACT_INCOMPLETE');
assert.equal(publicGatewayManifest.discovery?.aiIndex,'/ai-index.json','PUBLIC_MACHINE_INDEX_MANIFEST_POINTER_MISMATCH');
assert.doesNotMatch(manifest.body,/"(?:SUPABASE_SERVICE_ROLE_KEY|VERCEL_TOKEN|ROOT_ADMIN_SECRET)"\s*:\s*"/i,'PUBLIC_MANIFEST_EXPOSES_PRIVILEGED_SECRETS');
console.log(JSON.stringify({
  contract:'SFI-03-LIVE-PUBLIC-BOUNDARY-1.0',
  observation:'LIVE_PUBLIC_NETWORK',
  startedAt,completedAt:new Date().toISOString(),
  canonicalEntityId:organization['@id'],
  publicSameAsCount:observed.length,
  machineIdentityVerified:true,
  publicGatewayManifestVerified:true,
  publicSitemapLocations:exposed.length,
  privateAccessesDenied:2,
  observations,
  result:'PASS',
}));

}
main().catch(error => { console.error(error); process.exitCode=1; });
