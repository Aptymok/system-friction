import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import sitemapProjection from '../src/app/sitemap';

const read=(path:string)=>readFileSync(path,'utf8');
const page=read('src/app/publications/page.tsx');
const graph=read('src/app/publications/PublicationsCatalog.tsx');
const css=read('src/app/publications/publications.css');
const editorial=read('src/lib/publications/editorialContent.ts');
const publicationEntry=read('src/app/publications/[slug]/page.tsx');
const temporalCss=read('src/app/publications/[slug]/temporalIssue.css');
const temporalView=read('src/components/publications/TemporalIssueView.tsx');
const publicState=read('src/lib/observatory/publicState.ts');

for(const asset of [
  'public/images/editorial/notas-temporales-septiembre-2026.webp',
  'public/images/editorial/reality-chain/reality-chain-cover.svg',
  'public/images/editorial/reality-chain/reality-chain-world-to-claim.svg',
  'public/images/editorial/reality-chain/reality-chain-six-integrities.svg',
]) assert.ok(existsSync(asset),`missing_editorial_detail_asset:${asset}`);

assert.ok(page.includes('SFI_NOTAS_TEMPORALES_V1'),'monthly_temporal_issue_not_projected');
assert.ok(page.includes("force-dynamic"),'persisted_publication_projection_must_not_be_force_static');
assert.ok(page.includes("getPublicPublishedReturns"),'persisted_publication_projection_missing_public_read_model');
assert.equal(page.includes("createServiceSupabaseClient"),false,'publications_interface_must_not_construct_supabase_client');
assert.ok(publicState.includes(".from('sfi_publications')")&&publicState.includes(".eq('status', 'PUBLISHED')"),'persisted_published_returns_not_projected_by_server_read_model');

assert.ok(page.includes('Memory is a graph, not a gallery.'),'registry_graph_identity_missing');
assert.ok(page.includes('<PublicationsCatalog items={items}/>'),'registry_graph_must_be_primary_publication_surface');
for(const forbidden of ['DOCUMENT_COVERS','SFI_PUBLICATIONS_BANNER','SFI_EDITORIAL_FAMILIES','<picture>','<img']){
  assert.equal(page.includes(forbidden),false,`registry_page_must_not_use_decorative_image_layer:${forbidden}`);
}
assert.equal(graph.includes('<img'),false,'registry_graph_nodes_must_not_use_cover_images');
assert.equal(graph.includes('cover:'),false,'registry_graph_item_contract_must_not_require_cover_images');

for(const shape of ['hex','diamond','square','circle','rounded','triangle','ring','pill']) assert.ok(graph.includes(`'${shape}'`),`registry_node_shape_missing:${shape}`);
for(const kind of ['SEQUENCE','THEME']) assert.ok(graph.includes(`'${kind}'`),`registry_edge_kind_missing:${kind}`);
assert.ok(graph.includes("data-shape={shape}")&&graph.includes("data-category={item.category}"),'registry_shape_color_projection_missing');
assert.ok(graph.includes('chronological adjacency only')&&graph.includes('shared editorial classification only'),'registry_relation_semantics_missing');
assert.ok(graph.includes('OPEN INFORMATION HUB →'),'registry_nodes_must_open_information_hubs');
assert.ok(css.includes('.pubGraphNode[data-category=')&&css.includes('.pubGraphEdges line[data-kind="THEME"]'),'registry_graph_visual_semantics_missing');

assert.ok(editorial.includes("slug: 'the-reality-chain'")&&editorial.includes("language: 'en'")&&editorial.includes("editorialKind: 'FRICTION_BRIEF'"),'reality_chain_editorial_contract_missing');
assert.ok(publicationEntry.includes('publication.visuals.map')&&publicationEntry.includes('OPEN PDF'),'publication_detail_visual_or_pdf_surface_missing');
assert.ok(editorial.includes("editorialKind: 'TEMPORAL_ISSUE'")&&editorial.includes("collection: 'Notas Temporales'"),'monthly_notes_canonical_boundary_missing');
assert.ok(editorial.includes("code: 'SFI-TN-M / 2026-09'")&&editorial.includes("coordinate: '2026 / 09'"),'temporal_coordinate_contract_missing');
assert.ok(publicationEntry.includes('TemporalIssueView')&&temporalView.includes('WHAT TO OBSERVE NEXT'),'canonical_temporal_surface_missing');
assert.ok(temporalView.includes('DOWNLOAD / OPEN PDF')&&temporalView.includes('TEMPORAL SEMANTICS'),'temporal_download_or_semantics_missing');

for(const token of ['--void:#060605','--gold:#c8a951','--cream:#e8ddc3','--signal:#4a7aaa','--critical:#b85050']) assert.ok(css.toLowerCase().includes(token),`identity_manual_palette_missing:${token}`);
assert.ok(css.includes('Noto Serif Display')&&css.includes('EB Garamond')&&css.includes('Liberation Mono')&&css.includes('Noto Sans'),'identity_manual_typography_roles_missing');
for(const family of ['Noto Serif Display','EB Garamond','Liberation Mono','Noto Sans']) assert.ok(temporalCss.includes(family),`temporal_identity_typography_missing:${family}`);
assert.ok(temporalCss.includes(':focus-visible')&&temporalCss.includes('prefers-reduced-motion'),'temporal_accessibility_boundary_missing');
assert.ok(css.includes(':focus-visible')&&css.includes('prefers-reduced-motion'),'registry_accessibility_boundary_missing');

const sitemapUrls=sitemapProjection().map((entry)=>entry.url);
assert.ok(sitemapUrls.includes('https://systemfriction.org/publications'),'publications_hub_missing_from_sitemap');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-REGISTRY-GRAPH-2.0',
  publicSurface:'GRAPH_ONLY',
  decorativeRegistryPhotos:false,
  nodeSemantics:'SHAPE_AND_COLOR_BY_EDITORIAL_CLASS',
  edgeSemantics:['SEQUENCE','THEME'],
  relationClaimsCausal:false,
  informationHubs:true,
},null,2));
