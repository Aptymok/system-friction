import { SFI_EDITORIAL_OBSERVATIONS, type SfiEditorialPublication } from './editorialContent';

export const SFI_EDITORIAL_FAMILY_CONTRACT = 'SFI-EDITORIAL-FAMILY-PROJECTION-1.0' as const;

export type SfiEditorialFamilyKey = 'SIGNAL' | 'CASE' | 'FIELD' | 'RETURN' | 'LAB';

export type SfiEditorialFamily = {
  contract: typeof SFI_EDITORIAL_FAMILY_CONTRACT;
  key: SfiEditorialFamilyKey;
  label: string;
  shortLabel: string;
  description: string;
  image: string;
  imageProvenance: string;
  slugs: readonly string[];
};

const GENERATED_IMAGE_PROVENANCE = 'Type: AI-GENERATED · Author: SFI / OpenAI · Source: ChatGPT ImageGen · Date: 2026-09-12 · Context: institutional editorial identity · Use: web';

export const SFI_EDITORIAL_FAMILIES: readonly SfiEditorialFamily[] = Object.freeze([
  {
    contract: SFI_EDITORIAL_FAMILY_CONTRACT,
    key: 'SIGNAL',
    label: 'Signal Notes',
    shortLabel: 'Signal',
    description: 'Indicators, anomalies and emerging states that deserve observation before becoming conclusions.',
    image: '/images/editorial/notas-de-senal.webp',
    imageProvenance: GENERATED_IMAGE_PROVENANCE,
    slugs: Object.freeze([
      'la-crisis-ya-no-ocurre-como-evento-ocurre-como-estado',
      'la-senal-aparece-antes-de-poder-nombrarla',
      'lo-que-persiste-empieza-a-parecer-normal',
    ]),
  },
  {
    contract: SFI_EDITORIAL_FAMILY_CONTRACT,
    key: 'CASE',
    label: 'Case Notes',
    shortLabel: 'Case',
    description: 'Situated objects where friction can be reconstructed, contrasted and receive RETURN without generalizing beyond the evidence.',
    image: '/images/editorial/notas-de-caso.webp',
    imageProvenance: GENERATED_IMAGE_PROVENANCE,
    slugs: Object.freeze(['kavak-estado-autoridad-ejecucion']),
  },
  {
    contract: SFI_EDITORIAL_FAMILY_CONTRACT,
    key: 'FIELD',
    label: 'Field Notes',
    shortLabel: 'Field',
    description: 'Longitudinal field readings: trajectories, persistence and relations that only become visible when multiple states can be compared.',
    image: '/images/editorial/notas-de-campo.webp',
    imageProvenance: GENERATED_IMAGE_PROVENANCE,
    slugs: Object.freeze([
      'trayectoria',
      'fenomenos-persistentes-un-atlas-en-construccion',
    ]),
  },
  {
    contract: SFI_EDITORIAL_FAMILY_CONTRACT,
    key: 'RETURN',
    label: 'Return Notes',
    shortLabel: 'Return',
    description: 'Pieces that return to an earlier observation to measure what persisted, what changed and which interpretation needs correction.',
    image: '/images/editorial/notas-de-retorno.webp',
    imageProvenance: GENERATED_IMAGE_PROVENANCE,
    slugs: Object.freeze([
      'memoria-antes-que-explicacion',
      'el-punto-de-origen-estaba-al-final',
      't-72-horas-la-senal-no-era-la-cancion',
    ]),
  },
  {
    contract: SFI_EDITORIAL_FAMILY_CONTRACT,
    key: 'LAB',
    label: 'Lab Notes',
    shortLabel: 'Lab',
    description: 'Methods, instruments and tests of institutional architecture. A lab preserves the method and its limits; it does not promote a hypothesis to fact.',
    image: '/images/editorial/notas-de-laboratorio.webp',
    imageProvenance: GENERATED_IMAGE_PROVENANCE,
    slugs: Object.freeze([
      'el-observador-como-parte-del-instrumento',
      'infraestructura-para-observar-lo-que-no-se-deja-ver',
      'atlas',
      't-9-minutos-ia-instituciones-y-friccion',
    ]),
  },
]);

export function editorialFamilyEntries(family: SfiEditorialFamily): SfiEditorialPublication[] {
  const bySlug = new Map(SFI_EDITORIAL_OBSERVATIONS.map((publication) => [publication.slug, publication]));
  return family.slugs.flatMap((slug) => {
    const publication = bySlug.get(slug);
    return publication ? [publication] : [];
  });
}

export function editorialFamilyForSlug(slug: string) {
  return SFI_EDITORIAL_FAMILIES.find((family) => family.slugs.includes(slug)) ?? null;
}

export const SFI_PUBLICATIONS_BANNER = Object.freeze({
  web: '/images/editorial/publications-banner-web.webp',
  mobile: '/images/editorial/publications-banner-mobile.webp',
  provenance: GENERATED_IMAGE_PROVENANCE,
  alt: 'System Friction Institute · public editorial publications surface',
});
