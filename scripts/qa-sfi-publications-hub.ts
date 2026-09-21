import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import sitemapProjection from '../src/app/sitemap';

const read = (path: string) => readFileSync(path, 'utf8');
const page = read('src/app/publications/page.tsx');
const css = read('src/app/publications/publications.css');
const entryCss = read('src/components/sfi/PublicEntryGateway.css');
const institutionCss = read('src/app/institution/institution.css');
const families = read('src/lib/publications/editorialFamilies.ts');
const editorial = read('src/lib/publications/editorialContent.ts');
const publicationEntry = read('src/app/publications/[slug]/page.tsx');
const temporalCss = read('src/app/publications/[slug]/temporalIssue.css');
const temporalView = read('src/components/publications/TemporalIssueView.tsx');

for (const asset of [
  'public/images/editorial/notas-temporales-septiembre-2026.webp',
  'public/images/editorial/notas-de-caso.webp',
  'public/images/editorial/notas-de-senal.webp',
  'public/images/editorial/notas-de-campo.webp',
  'public/images/editorial/notas-de-retorno.webp',
  'public/images/editorial/notas-de-laboratorio.webp',
  'public/images/editorial/publications-banner-web.webp',
  'public/images/editorial/publications-banner-mobile.webp',
  'public/images/editorial/reality-chain/reality-chain-cover.svg',
  'public/images/editorial/reality-chain/reality-chain-world-to-claim.svg',
  'public/images/editorial/reality-chain/reality-chain-transparency-paradox.svg',
  'public/images/editorial/reality-chain/reality-chain-epistemic-overproduction.svg',
  'public/images/editorial/reality-chain/reality-chain-benchmark-v0.svg',
  'public/images/editorial/reality-chain/reality-chain-six-integrities.svg',
]) assert.ok(existsSync(asset), `missing_editorial_asset:${asset}`);

assert.ok(page.includes('SFI_NOTAS_TEMPORALES_V1'), 'monthly_temporal_issue_not_projected');
assert.ok(page.includes('SFI_REALITY_CHAIN_BRIEF') && page.includes('PUBLIC-SOURCE FRICTION BRIEF'), 'reality_chain_brief_not_projected');
assert.ok(editorial.includes("slug: 'the-reality-chain'") && editorial.includes("language: 'en'") && editorial.includes("editorialKind: 'FRICTION_BRIEF'"), 'reality_chain_editorial_contract_missing');
assert.ok(publicationEntry.includes('publication.visuals.map') && publicationEntry.includes('OPEN PDF'), 'reality_chain_visual_or_pdf_surface_missing');
assert.ok(page.includes('SFI_EDITORIAL_FAMILIES'), 'editorial_families_not_projected');
assert.ok(page.includes('<picture>') && page.includes('SFI_PUBLICATIONS_BANNER.mobile'), 'responsive_editorial_banner_missing');
assert.ok(page.includes('GENERADA (IA)') || families.includes('GENERADA (IA)'), 'generated_image_provenance_missing');
assert.equal(page.includes('Notas de Tiempo'), false, 'monthly_temporal_notes_must_not_be_reclassified_as_notas_de_tiempo');
assert.ok(editorial.includes("editorialKind: 'TEMPORAL_ISSUE'") && editorial.includes("collection: 'Notas Temporales'"), 'monthly_notes_canonical_boundary_missing');
assert.ok(editorial.includes("code: 'SFI-TN-M / 2026-09'") && editorial.includes("coordinate: '2026 / 09'"), 'temporal_coordinate_contract_missing');
assert.ok(editorial.includes("state: 'PUBLIC'") && editorial.includes('1LFQkhEtcilXQ6IgeUwIflDcj-MAJVSvE'), 'temporal_pdf_public_rendition_missing');
assert.ok(publicationEntry.includes('TemporalIssueView') && temporalView.includes('QUÉ OBSERVAR DESPUÉS'), 'canonical_temporal_surface_missing');
assert.ok(temporalView.includes('DESCARGAR / ABRIR PDF') && temporalView.includes('SEMÁNTICA TEMPORAL'), 'temporal_download_or_semantics_missing');

for (const family of ['SIGNAL', 'CASE', 'FIELD', 'RETURN', 'LAB']) assert.ok(families.includes(`key: '${family}'`), `missing_editorial_family:${family}`);
assert.equal(families.includes('SFI_CANONICAL_OBJECT_REGISTRY'), false, 'presentation_family_must_not_mutate_canonical_registry');

for (const token of ['--void:#060605', '--gold:#c8a951', '--cream:#e8ddc3', '--signal:#4a7aaa', '--critical:#b85050']) {
  assert.ok(css.toLowerCase().includes(token), `identity_manual_palette_missing:${token}`);
}
assert.ok(css.includes('Noto Serif Display') && css.includes('EB Garamond') && css.includes('Liberation Mono') && css.includes('Noto Sans'), 'identity_manual_typography_roles_missing');
for (const family of ['Noto Serif Display', 'EB Garamond', 'Liberation Mono', 'Noto Sans']) {
  assert.ok(temporalCss.includes(family), `temporal_identity_typography_missing:${family}`);
}
for (const token of ['--void:#060605', '--gold:#c8a951', '--cream:#e8ddc3', '--signal:#4a7aaa', '--critical:#b85050']) {
  assert.ok(temporalCss.toLowerCase().includes(token), `temporal_identity_palette_missing:${token}`);
}
assert.ok(temporalCss.includes(':focus-visible') && temporalCss.includes('prefers-reduced-motion'), 'temporal_accessibility_boundary_missing');
for (const [surface, surfaceCss] of [['entry', entryCss], ['institution', institutionCss]] as const) {
  for (const family of ['Noto Serif Display', 'EB Garamond', 'Liberation Mono', 'Noto Sans']) {
    assert.ok(surfaceCss.includes(family), `identity_manual_typography_missing:${surface}:${family}`);
  }
  assert.equal(/Space Grotesk|\bInter\b/.test(surfaceCss), false, `noncanonical_public_typography:${surface}`);
}
assert.ok(css.includes(':focus-visible'), 'keyboard_focus_visibility_missing');
assert.ok(css.includes('prefers-reduced-motion'), 'reduced_motion_boundary_missing');

const sitemapUrls = sitemapProjection().map((entry) => entry.url);
assert.ok(sitemapUrls.includes('https://systemfriction.org/publications'), 'publications_hub_missing_from_sitemap');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PUBLICATIONS-HUB-IDENTITY-1.2',
  monthly: 'Notas Temporales remains one monthly institutional issue series',
  families: ['Notas de Señal', 'Notas de Caso', 'Notas de Campo', 'Notas de Retorno', 'Notas de Laboratorio'],
  identityManual: 'SFI-ID-003 / MASTER EDITION V4.0',
  publicTypography: 'CANONICAL_ROLES_ENFORCED',
  generatedImageProvenance: true,
  realityChain: 'PUBLIC_SOURCE_FRICTION_BRIEF_EN',
  canonicalMutation: false,
  publicationsSitemapProjection: true,
}, null, 2));
