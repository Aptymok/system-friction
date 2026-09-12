import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT,
  SFI_EDITORIAL_PUBLICATIONS,
  SFI_NOTAS_TEMPORALES_V1,
  editorialPublicationForSlug,
} from './editorialContent';

test('Notas Temporales v1 preserves one canonical editorial identity and the 16-domain observation frame', () => {
  assert.equal(SFI_NOTAS_TEMPORALES_V1.contract, SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT);
  assert.equal(SFI_NOTAS_TEMPORALES_V1.slug, 'notas-temporales-v1');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.editorialKind, 'TEMPORAL_NOTE');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.issue, 'v1.0');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.domains.length, 16);
  assert.equal(new Set(SFI_NOTAS_TEMPORALES_V1.domains).size, 16);
  assert.deepEqual(SFI_NOTAS_TEMPORALES_V1.cadence.map((item) => item.interval), [
    'DIARIA', 'SEMANAL', 'MENSUAL', 'TRIMESTRAL', 'ANUAL',
  ]);
});

test('editorial body cannot collapse publication exposure into Discovery or RETURN', () => {
  const boundary = SFI_NOTAS_TEMPORALES_V1.epistemicBoundary.join(' ');
  assert.match(boundary, /Publicación equivale a EXPOSURE/);
  assert.match(boundary, /no a Discovery/i);
  assert.match(boundary, /RETURN/);
  assert.match(boundary, /Coincidencia temporal no establece causalidad/);
});

test('editorial lookup exposes only registered publication bodies', () => {
  assert.equal(SFI_EDITORIAL_PUBLICATIONS.length, 1);
  assert.equal(editorialPublicationForSlug('notas-temporales-v1')?.title, 'Notas Temporales');
  assert.equal(editorialPublicationForSlug('notas-inexistentes'), null);
});
