import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import sitemapProjection from '../src/app/sitemap';
import { projectRepositoryMihmTimeline, repositoryAxisAt } from '../src/lib/repository/repositoryTemporalProjection';

const read=(path:string)=>readFileSync(path,'utf8');
const repositoryPage=read('src/app/repository/page.tsx');
const repositoryUi=read('src/app/repository/RepositoryConsole.tsx');
const repositoryCss=read('src/app/repository/repository.css');
const repoClockUi=read('src/app/repository/RepositoryMihmTimeline.tsx');
const repoClockProjection=read('src/lib/repository/repositoryTemporalProjection.ts');
const publicationsRedirect=read('src/app/publications/page.tsx');
const publicationRedirect=read('src/app/publications/[slug]/page.tsx');
const editorial=read('src/lib/publications/editorialContent.ts');
const publicState=read('src/lib/observatory/publicState.ts');
const globals=read('src/app/globals.css');

assert.match(repositoryPage,/SFI_CANONICAL_OBJECT_REGISTRY/);
assert.match(repositoryPage,/canonicalPublicationDisposition/);
assert.match(repositoryPage,/SFI_EDITORIAL_PUBLICATIONS/);
assert.match(repositoryPage,/discoveryMachineResources/);
assert.match(repositoryPage,/SFI_DISCOVERY_LIFECYCLE/);
assert.ok(repositoryPage.includes('readPublishedRepositoryPassports'),'repository_must_have_allowlisted_public_persisted_passport_projection');
const publicPassport=read('src/lib/repository/publicPassportProjection.ts');
assert.ok(publicPassport.includes("eq('status','PUBLISHED')")&&publicPassport.includes("not('approved_by','is',null)")&&publicPassport.includes("FIELDS.has(v)"),'repository_persisted_T0_T1_and_questions_must_fail_closed_to_explicit_public_fields');
assert.ok(repositoryUi.includes('T0 / T1')&&repositoryUi.includes('6 PREGUNTAS')&&repositoryUi.includes('HIPÓTESIS'),'repository_must_rebuild_contextual_passport_from_record_type');
assert.ok(repositoryUi.includes('repoReader')&&repositoryUi.includes('repoFieldScroll'),'repository_reader_must_remain_inline_with_horizontal_viewport');

assert.doesNotMatch(repositoryPage,/createServiceSupabaseClient|\.from\(|\.insert\(|\.upsert\(|\.update\(/,'Repository UI must remain a read projection, not a persistence owner');

for(const token of ['SOURCE RECORDS','EVIDENCE','PUBLICATIONS / OBJECTS','PROVENANCE','LINEAGE','VERSIONS','HASHES','MANIFEST','DISCOVERY MESH']){
  assert.ok(repositoryUi.includes(token),`repository_missing:${token}`);
}
assert.ok(repositoryUi.includes('RepositoryMihmTimeline')&&repoClockUi.includes('MIHM-T · RELOJES')&&repoClockUi.includes('TIMELINE_CLOCKS'),'repository_requires_integrated_MIHMT_seven_clock_timeline');
assert.ok(repoClockProjection.includes('projectTimelineClockProfile')&&repoClockProjection.includes('editorial')&&repoClockProjection.includes('recordClock'),'repository_must_reuse_mihmt_without_confusing_publication_with_record');
assert.ok(repoClockUi.includes('NO HAY FECHAS INDEPENDIENTES PUBLICADAS')&&repoClockUi.includes('UNKNOWN'),'repository_missing_temporal_evidence_must_be_visible');
assert.ok(repositoryCss.includes('.repoMihmAxes')&&repositoryCss.includes('.repoMihmClockInspector'),'repository_clock_controls_and_inspector_must_be_functional');
assert.ok(repositoryUi.includes('READ PUBLICATION')&&repositoryUi.includes('repoReader'),'publication_reader_not_absorbed_into_repository');
assert.ok(repositoryUi.includes('PUBLICATION = EXPOSURE')&&repositoryUi.includes('EXPOSURE ≠ DISCOVERY'),'discovery_boundary_missing_from_repository');
assert.ok(repositoryUi.includes('NOT MATERIALIZED')&&repositoryUi.includes('NOT OBSERVED'),'missing_state_must_remain_explicit');
assert.ok(repositoryUi.includes('SHA-256')&&repositoryUi.includes('renditions'),'publication_integrity_not_exposed_in_unified_reader');

assert.ok(repositoryCss.includes('SFI-LIVE-REPOSITORY-1.0'),'operational_repository_must_have_live_projection_contract');
assert.ok(repositoryCss.includes("url('/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_42-7.png')"),'repository_must_reuse_original_access_instrument_artwork');
assert.ok(repositoryCss.includes('.repositoryBackdrop')&&repositoryCss.includes('radial-gradient'),'operational_repository_requires_structural_atmosphere');
assert.ok(repositoryCss.includes('.repoReader')&&repositoryCss.includes('.repoDiscovery'),'repository_integrated_layers_missing');
assert.ok(repositoryCss.includes('@media'),'repository_responsive_boundary_missing');

assert.match(publicationsRedirect,/redirect\('\/repository'\)/,'publications_hub_must_be_compatibility_redirect_only');
assert.match(publicationRedirect,/redirect\('\/repository\?object='\+encodeURIComponent\(slug\)\)/,'publication_object_route_must_redirect_to_repository_reader');

for(const removed of [
  'src/app/publications/PublicationsCatalog.tsx',
  'src/app/publications/RegistryDiscoveryMesh.tsx',
  'src/app/publications/publications.css',
  'src/app/publications/[slug]/temporalIssue.css',
  'src/app/publications/discovery-mesh-publicar-no-es-ser-encontrado/page.tsx',
  'src/app/publications/discovery-mesh-publicar-no-es-ser-encontrado/discovery-note.css',
  'src/components/publications/TemporalIssueView.tsx',
]) assert.equal(existsSync(removed),false,`duplicated_publication_view_must_remain_deleted:${removed}`);

assert.ok(editorial.includes("slug: 'the-reality-chain'")&&editorial.includes("editorialKind: 'FRICTION_BRIEF'"),'reality_chain_editorial_contract_missing');
assert.ok(editorial.includes("editorialKind: 'TEMPORAL_ISSUE'")&&editorial.includes("collection: 'Notas Temporales'"),'monthly_notes_canonical_boundary_missing');
assert.ok(editorial.includes("code: 'SFI-TN-M / 2026-09'")&&editorial.includes("coordinate: '2026 / 09'"),'temporal_coordinate_contract_missing');
assert.match(publicState,/\.eq\('status', 'PUBLISHED'\)/);
assert.match(publicState,/\.not\('published_at', 'is', null\)/);

assert.ok(globals.includes('--sfi-display:"Noto Serif Display"')&&globals.includes('--sfi-narrative:"EB Garamond"')&&globals.includes('--sfi-trace:"Liberation Mono"')&&globals.includes('--sfi-screen:"Noto Sans"'),'identity_global_typography_roles_missing');

// Compare parsed URL components, not arbitrary URL substrings.
// A hostile hostname such as systemfriction.org.example must never pass.
const sitemapPaths=sitemapProjection()
  .map((entry)=>{
    try {
      const url=new URL(entry.url);
      if(url.protocol!=='https:'||url.hostname!=='systemfriction.org'||url.port||url.username||url.password)return null;
      return url.pathname;
    } catch {
      return null;
    }
  });
assert.ok(sitemapPaths.includes('/repository'),'repository_missing_from_sitemap');
assert.equal(sitemapPaths.includes('/publications'),false,'retired_publications_hub_must_not_remain_in_sitemap');

// MIHM-T chronology truth: editorial publication cannot fabricate an event,
// knowledge, authority, execution, independent observation or RETURN clock.
const temporalFixture=[{id:'published-fixture',title:'Published test record',
  createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-03T00:00:00Z',
  editorial:{publishedAt:'2026-10-02T00:00:00Z'}}];
const [defaultClock]=projectRepositoryMihmTimeline(temporalFixture,{});
assert.equal(defaultClock.profile.readings.length,7,'mihmt_must_reuse_exact_seven_distinct_axes');
assert.equal(repositoryAxisAt(defaultClock,'PUBLICATION'),'2026-10-02T00:00:00.000Z');
assert.equal(repositoryAxisAt(defaultClock,'RECORD'),'2026-10-03T00:00:00.000Z');
for(const missing of ['EVENT','OBSERVATION','KNOWLEDGE','AUTHORITY','EXECUTION','RETURN'] as const){
  assert.equal(repositoryAxisAt(defaultClock,missing),null,'editorial_or_registry_date_must_not_mint_clock:'+missing);
}
const [eventClock]=projectRepositoryMihmTimeline(temporalFixture,{
  'published-fixture':{publishedAt:'2026-10-02T00:00:00Z',clockEvidence:{
    EVENT:{at:'2026-09-30T00:00:00Z',sourceRef:'source:explicit-event',
      meaning:'Explicitly verified event timestamp',basis:'OBSERVED_TIME',epistemicClass:'OBSERVED'},
  }},
});
assert.equal(repositoryAxisAt(eventClock,'EVENT'),'2026-09-30T00:00:00.000Z');
assert.equal(repositoryAxisAt(eventClock,'RETURN'),null);
assert.equal(eventClock.profile.documentedIntervals[0].state,'DATED_ORDER');
const [fakeClock]=projectRepositoryMihmTimeline(temporalFixture,{
  'published-fixture':{publishedAt:'2026-10-02T00:00:00Z',clockEvidence:{
    KNOWLEDGE:{at:'2026-09-30T00:00:00Z',sourceRef:'source:synthetic',
      meaning:'Simulation only',basis:'SIMULATED_TIME',epistemicClass:'OBSERVED'},
  } as never},
});
assert.equal(repositoryAxisAt(fakeClock,'KNOWLEDGE'),null,'simulated_time_must_not_claim_documented_actor_knowledge');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-UNIFIED-REPOSITORY-1.0',
  canonicalHumanSurface:'/repository',
  publicationReader:'INTEGRATED',
  discoveryMesh:'INTEGRATED',
  compatibilityRoutes:['/publications','/publications/[slug]'],
  duplicateVisualImplementations:0,
  persistenceOwnersChanged:false,
},null,2));
