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

const GENERATED_IMAGE_PROVENANCE = 'GENERADA (IA) · SFI / OpenAI · 2026-09-12 · identidad editorial institucional · uso web';

export const SFI_EDITORIAL_FAMILIES: readonly SfiEditorialFamily[] = Object.freeze([
  {
    contract: SFI_EDITORIAL_FAMILY_CONTRACT,
    key: 'SIGNAL',
    label: 'Notas de Señal',
    shortLabel: 'Señal',
    description: 'Indicios, anomalías y estados emergentes que merecen seguimiento antes de convertirse en conclusión.',
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
    label: 'Notas de Caso',
    shortLabel: 'Caso',
    description: 'Objetos situados donde una fricción puede reconstruirse, contrastarse y recibir RETURN sin generalizar más allá de la evidencia.',
    image: '/images/editorial/notas-de-caso.webp',
    imageProvenance: GENERATED_IMAGE_PROVENANCE,
    slugs: Object.freeze(['kavak-estado-autoridad-ejecucion']),
  },
  {
    contract: SFI_EDITORIAL_FAMILY_CONTRACT,
    key: 'FIELD',
    label: 'Notas de Campo',
    shortLabel: 'Campo',
    description: 'Lecturas longitudinales del campo: trayectorias, persistencias y relaciones que sólo aparecen cuando varios estados pueden compararse.',
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
    label: 'Notas de Retorno',
    shortLabel: 'Retorno',
    description: 'Piezas que vuelven sobre una observación anterior para medir qué persistió, qué cambió y qué interpretación necesita corregirse.',
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
    label: 'Notas de Laboratorio',
    shortLabel: 'Laboratorio',
    description: 'Métodos, instrumentos y pruebas de arquitectura institucional. Un laboratorio conserva el método y sus límites; no promociona una hipótesis a hecho.',
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
  alt: 'System Friction Institute · superficie editorial de publicaciones',
});
