import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import sitemapProjection from '../src/app/sitemap';

const read = (path: string) => readFileSync(path, 'utf8');
const page = read('src/app/publications/page.tsx');
const css = read('src/app/publications/publications.css');
const families = read('src/lib/publications/editorialFamilies.ts');
const editorial = read('src/lib/publications/editorialContent.ts');

for (const asset of [
  'public/images/editorial/notas-temporales-septiembre-2026.webp',
  'public/images/editorial/notas-de-caso.webp',
  'public/images/editorial/notas-de-senal.webp',
  'public/images/editorial/notas-de-campo.webp',
  'public/images/editorial/notas-de-retorno.webp',
  'public/images/editorial/notas-de-laboratorio.webp',
  'public/images/editorial/publications-banner-web.webp',
  'public/images/editorial/publications-banner-mobile.webp',
]) assert.ok(existsSync(asset), `missing_editorial_asset:${asset}`);

assert.ok(page.includes('SFI_NOTAS_TEMPORALES_V1'), 'monthly_temporal_issue_not_projected');
assert.ok(page.includes('SFI_EDITORIAL_FAMILIES'), 'editorial_families_not_projected');
assert.ok(page.includes('<picture>') && page.includes('SFI_PUBLICATIONS_BANNER.mobile'), 'responsive_editorial_banner_missing');
assert.ok(page.includes('GENERADA (IA)') || families.includes('GENERADA (IA)'), 'generated_image_provenance_missing');
assert.equal(page.includes('Notas de Tiempo'), false, 'monthly_temporal_notes_must_not_be_reclassified_as_notas_de_tiempo');
assert.ok(editorial.includes("editorialKind: 'TEMPORAL_ISSUE'") && editorial.includes("collection: 'Notas Temporales'"), 'monthly_notes_canonical_boundary_missing');

for (const family of ['SIGNAL', 'CASE', 'FIELD', 'RETURN', 'LAB']) assert.ok(families.includes(`key: '${family}'`), `missing_editorial_family:${family}`);
assert.equal(families.includes('SFI_CANONICAL_OBJECT_REGISTRY'), false, 'presentation_family_must_not_mutate_canonical_registry');

for (const token of ['--void:#060605', '--gold:#c8a951', '--cream:#e8ddc3', '--signal:#4a7aaa', '--critical:#b85050']) {
  assert.ok(css.toLowerCase().includes(token), `identity_manual_palette_missing:${token}`);
}
assert.ok(css.includes('Noto Serif Display') && css.includes('EB Garamond') && css.includes('Liberation Mono') && css.includes('Noto Sans'), 'identity_manual_typography_roles_missing');
assert.ok(css.includes(':focus-visible'), 'keyboard_focus_visibility_missing');
assert.ok(css.includes('prefers-reduced-motion'), 'reduced_motion_boundary_missing');

const sitemapUrls = sitemapProjection().map((entry) => entry.url);
assert.ok(sitemapUrls.includes('https://systemfriction.org/publications'), 'publications_hub_missing_from_sitemap');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PUBLICATIONS-HUB-IDENTITY-1.1',
  monthly: 'Notas Temporales remains one monthly institutional issue series',
  families: ['Notas de Señal', 'Notas de Caso', 'Notas de Campo', 'Notas de Retorno', 'Notas de Laboratorio'],
  identityManual: 'SFI-ID-003 / MASTER EDITION V4.0',
  generatedImageProvenance: true,
  canonicalMutation: false,
  publicationsSitemapProjection: true,
}, null, 2));
