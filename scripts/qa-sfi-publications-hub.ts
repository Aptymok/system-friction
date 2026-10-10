import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import sitemapProjection from '../src/app/sitemap';

const read=(path:string)=>readFileSync(path,'utf8');
const repositoryPage=read('src/app/repository/page.tsx');
const repositoryUi=read('src/app/repository/RepositoryConsole.tsx');
const repositoryCss=read('src/app/repository/repository.css');
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
assert.doesNotMatch(repositoryPage,/createServiceSupabaseClient|\.from\(|\.insert\(|\.upsert\(|\.update\(/,'Repository UI must remain a read projection, not a persistence owner');

for(const token of ['SOURCE RECORDS','EVIDENCE','PUBLICATIONS / OBJECTS','PROVENANCE','LINEAGE','VERSIONS','HASHES','MANIFEST','DISCOVERY MESH','REPOSITORY HISTORY']){
  assert.ok(repositoryUi.includes(token),`repository_missing:${token}`);
}
assert.ok(repositoryUi.includes('READ PUBLICATION')&&repositoryUi.includes('repoReader'),'publication_reader_not_absorbed_into_repository');
assert.ok(repositoryUi.includes('PUBLICATION = EXPOSURE')&&repositoryUi.includes('EXPOSURE ≠ DISCOVERY'),'discovery_boundary_missing_from_repository');
assert.ok(repositoryUi.includes('NOT MATERIALIZED')&&repositoryUi.includes('NOT OBSERVED'),'missing_state_must_remain_explicit');
assert.ok(repositoryUi.includes('SHA-256')&&repositoryUi.includes('renditions'),'publication_integrity_not_exposed_in_unified_reader');

assert.ok(repositoryCss.includes('SFI-LIVE-REPOSITORY-1.0'),'operational_repository_must_have_live_projection_contract');
assert.equal(repositoryCss.includes("url('/assets/sfi/instruments/Imagen de ChatGPT 8 oct 2026, 11_40_42-7.png')"),false,'operational_repository_must_not_fake_dashboards_with_screenshot');
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
