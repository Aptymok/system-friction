import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const page = read('src/app/publications/page.tsx');
const publicationPage = read('src/app/publications/[slug]/page.tsx');
const css = read('src/app/publications/publications.css');
const families = read('src/lib/publications/editorialFamilies.ts');
const sitemap = read('src/app/sitemap.ts');
const editorial = read('src/lib/publications/editorialContent.ts');
const september = read('src/lib/publications/notasTemporalesSeptember2026.ts');

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
assert.ok(page.includes('SFI_NOTAS_TEMPORALES_SEPTEMBER_2026_SOURCE'), 'september_temporal_source_not_projected');
assert.ok(publicationPage.includes('PDF DE LA EDICIÓN · SOURCE OF RECORD'), 'temporal_source_of_record_panel_missing');
assert.ok(page.includes('SFI_EDITORIAL_FAMILIES'), 'editorial_families_not_projected');
assert.ok(page.includes('<picture>') && page.includes('SFI_PUBLICATIONS_BANNER.mobile'), 'responsive_editorial_banner_missing');
assert.ok(page.includes('GENERADA (IA)') || families.includes('GENERADA (IA)'), 'generated_image_provenance_missing');
assert.equal(page.includes('Notas de Tiempo'), false, 'monthly_temporal_notes_must_not_be_reclassified_as_notas_de_tiempo');
assert.ok(editorial.includes("editorialKind: 'TEMPORAL_ISSUE'") && editorial.includes("collection: 'Notas Temporales'"), 'monthly_notes_canonical_boundary_missing');

assert.ok(september.includes("filename: 'SFI_Notas_Temporales_Mexico_Septiembre_2026_FINAL.pdf'"), 'september_source_filename_mismatch');
assert.ok(september.includes('byteLength: 23085591'), 'september_source_size_mismatch');
assert.ok(september.includes("sha256: 'bbc7c9df27b6f7295f9919a707f5adab3f25ddd44fee194812c8d38259135103'"), 'september_source_sha256_mismatch');
assert.ok(september.includes('pages: 10'), 'september_source_page_count_mismatch');
for (const heading of ['Nota Editorial', 'Cómo leer estas notas', 'Nota del Fundador', 'Estado del entorno', 'Jornada laboral 2027', 'Vinculación de líneas móviles', 'Trazabilidad financiera', 'Emisión de una frecuencia 01', 'Observación derivada 01']) {
  assert.ok(september.includes(heading), `september_issue_content_missing:${heading}`);
}
assert.ok(september.includes("publicUrl: null") && september.includes('host público controlado'), 'public_binary_must_fail_closed_until_hosted');

for (const family of ['SIGNAL', 'CASE', 'FIELD', 'RETURN', 'LAB']) assert.ok(families.includes(`key: '${family}'`), `missing_editorial_family:${family}`);
assert.equal(families.includes('SFI_CANONICAL_OBJECT_REGISTRY'), false, 'presentation_family_must_not_mutate_canonical_registry');

for (const token of ['--void:#060605', '--gold:#c8a951', '--cream:#e8ddc3', '--signal:#4a7aaa', '--critical:#b85050']) {
  assert.ok(css.toLowerCase().includes(token), `identity_manual_palette_missing:${token}`);
}
assert.ok(css.includes('Noto Serif Display') && css.includes('EB Garamond') && css.includes('Liberation Mono') && css.includes('Noto Sans'), 'identity_manual_typography_roles_missing');
assert.ok(css.includes(':focus-visible'), 'keyboard_focus_visibility_missing');
assert.ok(css.includes('prefers-reduced-motion'), 'reduced_motion_boundary_missing');
assert.ok(sitemap.includes("`${BASE}/publications`"), 'publications_hub_missing_from_sitemap');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PUBLICATIONS-HUB-IDENTITY-1.1',
  monthly: 'Notas Temporales remains one monthly institutional issue series',
  septemberSourceOfRecord: {
    filename: 'SFI_Notas_Temporales_Mexico_Septiembre_2026_FINAL.pdf',
    bytes: 23085591,
    sha256: 'bbc7c9df27b6f7295f9919a707f5adab3f25ddd44fee194812c8d38259135103',
    publicBinary: false,
  },
  families: ['Notas de Señal', 'Notas de Caso', 'Notas de Campo', 'Notas de Retorno', 'Notas de Laboratorio'],
  identityManual: 'SFI-ID-003 / MASTER EDITION V4.0',
  generatedImageProvenance: true,
  canonicalMutation: false,
}, null, 2));