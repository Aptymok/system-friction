import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SFI_EDITORIAL_OBSERVATIONS,
  SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT,
  SFI_EDITORIAL_PUBLICATIONS,
  SFI_NOTAS_TEMPORALES_V1,
  SFI_OBSERVATION_KAVAK,
  SFI_OBSERVATION_T_PLUS_72,
  editorialPublicationForSlug,
  relatedEditorialObservations,
} from './editorialContent';

test('Notas Temporales is one monthly PDF issue, not the umbrella for individual web pieces', () => {
  assert.equal(SFI_NOTAS_TEMPORALES_V1.contract, SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT);
  assert.equal(SFI_NOTAS_TEMPORALES_V1.slug, 'notas-temporales-v1');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.editorialKind, 'TEMPORAL_ISSUE');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.collection, 'Notas Temporales');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.issue, 'Septiembre 2026');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.cadence.length, 1);
  assert.equal(SFI_NOTAS_TEMPORALES_V1.cadence[0]?.interval, 'MENSUAL');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.renditions[0]?.kind, 'PDF');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.renditions[0]?.byteLength, 23085591);
  assert.equal(SFI_NOTAS_TEMPORALES_V1.renditions[0]?.sha256, 'bbc7c9df27b6f7295f9919a707f5adab3f25ddd44fee194812c8d38259135103');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.renditions[0]?.state, 'PUBLIC');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.renditions[0]?.publicUrl, 'https://drive.google.com/file/d/1LFQkhEtcilXQ6IgeUwIflDcj-MAJVSvE/view?usp=drivesdk');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.temporalProfile?.code, 'SFI-TN-M / 2026-09');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.temporalProfile?.coordinate, '2026 / 09');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.temporalProfile?.state, 'ACTIVE');
  assert.equal(SFI_NOTAS_TEMPORALES_V1.temporalProfile?.returnState, 'OPEN');
  assert.ok((SFI_NOTAS_TEMPORALES_V1.temporalProfile?.followUpPrompts.length ?? 0) >= 5);
  assert.equal(SFI_NOTAS_TEMPORALES_V1.domains.length, 16);
});

test('individual web pieces live under Observaciones with typed editorial lenses', () => {
  assert.ok(SFI_EDITORIAL_OBSERVATIONS.length >= 13);
  assert.ok(SFI_EDITORIAL_OBSERVATIONS.every((item) => item.editorialKind === 'OBSERVATION'));
  assert.ok(SFI_EDITORIAL_OBSERVATIONS.every((item) => item.collection === 'Observaciones'));
  const kinds = new Set(SFI_EDITORIAL_OBSERVATIONS.map((item) => item.observationKind));
  for (const expected of ['SIGNAL', 'TRAJECTORY', 'CASE', 'METHOD', 'MEMORY', 'ATLAS', 'INSTITUTIONAL']) {
    assert.ok(kinds.has(expected as never), `missing observation kind ${expected}`);
  }
});

test('T+72 is materialized on SFI and KAVAK is a Case observation', () => {
  assert.equal(SFI_OBSERVATION_T_PLUS_72.contentState, 'MATERIALIZED');
  assert.equal(SFI_OBSERVATION_T_PLUS_72.observationKind, 'TRAJECTORY');
  assert.ok(SFI_OBSERVATION_T_PLUS_72.sections.length >= 10);
  assert.equal(SFI_OBSERVATION_KAVAK.observationKind, 'CASE');
  assert.equal(SFI_OBSERVATION_KAVAK.collection, 'Observaciones');
});

test('editorial bodies cannot collapse publication exposure into Discovery or RETURN', () => {
  const boundaries = SFI_EDITORIAL_PUBLICATIONS.flatMap((item) => item.epistemicBoundary).join(' ');
  assert.match(boundaries, /EXPOSURE/);
  assert.match(boundaries, /Discovery/i);
  assert.match(boundaries, /RETURN/);
});

test('editorial lookup and related navigation are deterministic', () => {
  assert.equal(SFI_EDITORIAL_PUBLICATIONS.length, 1 + SFI_EDITORIAL_OBSERVATIONS.length);
  assert.equal(editorialPublicationForSlug('notas-temporales-v1')?.title, 'Notas Temporales');
  assert.equal(editorialPublicationForSlug('kavak-estado-autoridad-ejecucion')?.observationKind, 'CASE');
  assert.equal(editorialPublicationForSlug('notas-inexistentes'), null);
  const related = relatedEditorialObservations('t-72-horas-la-senal-no-era-la-cancion', 5);
  assert.equal(related.length, 5);
  assert.ok(related.every((item) => item.slug !== 't-72-horas-la-senal-no-era-la-cancion'));
});
