export const SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT = 'SFI-EDITORIAL-PUBLICATION-CONTENT-1.1' as const;

export type SfiEditorialPublicationSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
  items?: readonly string[];
};

export type SfiEditorialPublicationVisual = {
  id: string;
  src: string;
  alt: string;
  caption: string;
};

export type SfiEditorialPublicationRendition = {
  kind: 'PDF';
  mediaType: 'application/pdf';
  filename: string;
  byteLength: number;
  sha256: string;
  publicUrl: string | null;
  state: 'IDENTIFIED' | 'PUBLIC';
};

export type SfiEditorialTemporalProfile = {
  code: string;
  coordinate: string;
  year: number;
  month: number;
  phase: 'BASELINE' | 'ACTIVE' | 'CLOSURE';
  state: 'OPEN' | 'ACTIVE' | 'CLOSED';
  returnState: 'OPEN' | 'PENDING' | 'CLOSED';
  cutoffLabel: string;
  scopeLabel: string;
  authorityLabel: string;
  nextAuthority: string;
  followUpPrompts: readonly string[];
};

export type SfiEditorialObservationKind =
  | 'SIGNAL'
  | 'TRAJECTORY'
  | 'CASE'
  | 'METHOD'
  | 'MEMORY'
  | 'ATLAS'
  | 'INSTITUTIONAL';

export type SfiEditorialPublication = {
  contract: typeof SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT;
  canonicalId: string;
  slug: string;
  editorialKind: 'TEMPORAL_ISSUE' | 'OBSERVATION' | 'FRICTION_BRIEF';
  collection: 'Notas Temporales' | 'Observaciones' | 'Friction Briefs';
  observationKind: SfiEditorialObservationKind | null;
  language: 'es' | 'en';
  series: string;
  issue: string;
  title: string;
  subtitle: string;
  motto: string;
  deck: string;
  publishedAt: string;
  mediumUrl: string | null;
  coverImage: string | null;
  visuals: readonly SfiEditorialPublicationVisual[];
  contentState: 'MATERIALIZED' | 'INDEXED_EXTERNAL';
  renditions: readonly SfiEditorialPublicationRendition[];
  sections: readonly SfiEditorialPublicationSection[];
  cadence: readonly { interval: string; name: string; scope: string }[];
  domains: readonly string[];
  epistemicBoundary: readonly string[];
  temporalProfile?: SfiEditorialTemporalProfile | null;
};

const SHARED_OBSERVATION_BOUNDARY = Object.freeze([
  'Una pieza editorial describe una lectura situada; no convierte interpretación en evidencia por sí sola.',
  'Publicación equivale a EXPOSURE. Discovery, Recognition, Interaction, PULL y RETURN requieren evidencia independiente.',
  'Las afirmaciones causales requieren evidencia específica; secuencia o coincidencia temporal no bastan.',
]);

const SFI_NOTAS_TEMPORALES_V1_RENDITIONS: readonly SfiEditorialPublicationRendition[] = Object.freeze([
  {
    kind: 'PDF',
    mediaType: 'application/pdf',
    filename: 'SFI_Notas_Temporales_Mexico_Septiembre_2026_FINAL.pdf',
    byteLength: 23085591,
    sha256: 'bbc7c9df27b6f7295f9919a707f5adab3f25ddd44fee194812c8d38259135103',
    publicUrl: 'https://drive.google.com/file/d/1LFQkhEtcilXQ6IgeUwIflDcj-MAJVSvE/view?usp=drivesdk',
    state: 'PUBLIC',
  },
]);

export const SFI_NOTAS_TEMPORALES_V1: SfiEditorialPublication = Object.freeze({
  contract: SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT,
  canonicalId: 'SFI-PUB-NT-001',
  slug: 'notas-temporales-v1',
  editorialKind: 'TEMPORAL_ISSUE',
  collection: 'Notas Temporales',
  observationKind: null,
  language: 'es',
  series: 'SFI · Notas Temporales',
  issue: 'Septiembre 2026',
  title: 'Notas Temporales',
  subtitle: 'Observación sistémica para un mundo en transición',
  motto: 'El futuro no se adivina, se observa a tiempo.',
  deck: 'Publicación institucional mensual de SFI. Cada edición fija un corte temporal del campo observado: señales, evidencia pública, convergencias, contradicciones y preguntas que merecen seguimiento. No es una colección de artículos individuales ni una categoría para publicaciones de Medium.',
  publishedAt: '2026-09-12T00:00:00-06:00',
  mediumUrl: null,
  coverImage: '/images/editorial/notas-temporales-septiembre-2026.webp',
  visuals: Object.freeze([]),
  contentState: 'MATERIALIZED',
  renditions: SFI_NOTAS_TEMPORALES_V1_RENDITIONS,
  temporalProfile: Object.freeze({
    code: 'SFI-TN-M / 2026-09',
    coordinate: '2026 / 09',
    year: 2026,
    month: 9,
    phase: 'ACTIVE',
    state: 'ACTIVE',
    returnState: 'OPEN',
    cutoffLabel: '12 SEP 2026',
    scopeLabel: 'MÉXICO · CORTE MENSUAL',
    authorityLabel: 'SFI · PUBLICACIÓN INSTITUCIONAL',
    nextAuthority: 'RETURN / OPEN',
    followUpPrompts: Object.freeze([
      'Qué cambió desde el corte de septiembre.',
      'Qué señales recibieron evidencia suficiente para cambiar de estado.',
      'Qué contradicciones permanecen abiertas o requieren corrección.',
      'Qué hipótesis expiraron o perdieron soporte observable.',
      'Qué resultados deben regresar al siguiente corte mediante RETURN.',
    ]),
  }),
  sections: Object.freeze([
    {
      id: 'que-son',
      title: 'Qué son las Notas Temporales',
      paragraphs: Object.freeze([
        'Notas Temporales es la publicación mensual del System Friction Institute para conservar un corte periódico del entorno mientras todavía se encuentra en transición. Su unidad es la edición mensual completa, normalmente materializada como PDF institucional.',
        'La edición registra qué cambió, qué evidencia existe, qué relaciones entre dominios merecen seguimiento y qué todavía no puede afirmarse. Observación, inferencia, proyección y resultado permanecen separados.',
        'Cada nueva edición debe poder compararse con las anteriores. El valor de la serie no está únicamente en cada documento aislado, sino en la memoria longitudinal que aparece cuando varios meses pueden ponerse en contraste.',
      ]),
      items: Object.freeze([
        'Una edición institucional por mes.',
        'Identidad y hash propios por edición.',
        'Señales, fuentes, contradicciones y faltantes conservados por periodo.',
        'Comparación longitudinal entre ediciones sin reescribir retrospectivamente el estado anterior.',
      ]),
    },
    {
      id: 'metodo',
      title: 'Método de observación mensual',
      paragraphs: Object.freeze([
        'El ciclo parte de fuentes oficiales, datos, literatura, publicaciones técnicas, observaciones de campo y señales culturales. La heterogeneidad de las fuentes no autoriza a mezclar niveles de evidencia; obliga a identificarlos.',
        'La edición mensual fija un estado suficientemente legible para RETURN futuro: qué se observaba en ese momento, qué faltaba, qué hipótesis estaban abiertas y qué cambios posteriores obligaron a revisar la lectura.',
      ]),
    },
    {
      id: 'discovery',
      title: 'Publicación, Discovery y RETURN',
      paragraphs: Object.freeze([
        'Publicar una edición sólo demuestra EXPOSURE: SFI colocó un objeto canónico en una superficie donde puede ser encontrado. No demuestra que un tercero lo haya descubierto, reconocido o utilizado.',
        'Discovery Mesh distribuye la identidad canónica del objeto a superficies humanas y de máquina. Los efectos externos posteriores se registran por separado y nunca se fabrican a partir de métricas internas de publicación.',
      ]),
    },
  ]),
  cadence: Object.freeze([
    { interval: 'MENSUAL', name: 'Notas Temporales', scope: 'Una edición PDF institucional por mes, con identidad, fecha, evidencia y límites propios.' },
  ]),
  domains: Object.freeze([
    'Política y gobernanza',
    'Economía y finanzas',
    'Legislación y regulación',
    'Tecnología y ciencia',
    'Sociedad y demografía',
    'Trabajo y producción',
    'Educación y conocimiento',
    'Salud y bienestar',
    'Medio ambiente y biodiversidad',
    'Energía y recursos',
    'Infraestructura y territorio',
    'Cultura y narrativa',
    'Seguridad y riesgos',
    'Geopolítica',
    'Mercados y cadenas de suministro',
    'Ética y conciencia',
  ]),
  epistemicBoundary: Object.freeze([
    'No son predicciones. Una proyección debe declararse como proyección y conservar sus supuestos.',
    'Modelo, IA o análisis derivado no equivalen a observación del mundo.',
    'Coincidencia temporal no establece causalidad.',
    'MISSING permanece visible; no se rellena narrativamente.',
    'Publicación equivale a EXPOSURE, no a Discovery, Recognition, PULL ni RETURN.',
  ]),
});

function indexedObservation(input: {
  canonicalId: string;
  slug: string;
  observationKind: SfiEditorialObservationKind;
  title: string;
  subtitle: string;
  publishedAt: string;
  mediumUrl: string;
  deck?: string;
}): SfiEditorialPublication {
  return Object.freeze({
    contract: SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT,
    canonicalId: input.canonicalId,
    slug: input.slug,
    editorialKind: 'OBSERVATION',
    collection: 'Observaciones',
    observationKind: input.observationKind,
    language: 'es',
    series: 'SFI · Observaciones',
    issue: input.observationKind,
    title: input.title,
    subtitle: input.subtitle,
    motto: 'Observar · Contrastar · Retornar',
    deck: input.deck ?? input.subtitle,
    publishedAt: input.publishedAt,
    mediumUrl: input.mediumUrl,
    coverImage: null,
    visuals: Object.freeze([]),
    contentState: 'INDEXED_EXTERNAL',
    renditions: Object.freeze([]),
    sections: Object.freeze([]),
    cadence: Object.freeze([]),
    domains: Object.freeze([]),
    epistemicBoundary: SHARED_OBSERVATION_BOUNDARY,
  });
}

export const SFI_OBSERVATION_CRISIS_STATE = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-001',
  slug: 'la-crisis-ya-no-ocurre-como-evento-ocurre-como-estado',
  observationKind: 'SIGNAL',
  title: 'La crisis ya no ocurre como evento. Ocurre como estado.',
  subtitle: 'Notas sobre observación longitudinal, saturación perceptual y sistemas que continúan operando mientras se degradan.',
  publishedAt: '2026-05-25T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/la-crisis-ya-no-ocurre-como-evento-ocurre-como-estado-96416b451b3c',
});

export const SFI_OBSERVATION_SIGNAL_NAMING = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-002',
  slug: 'la-senal-aparece-antes-de-poder-nombrarla',
  observationKind: 'SIGNAL',
  title: 'La señal aparece antes de poder nombrarla',
  subtitle: 'Notas sobre observación, reconocimiento y fenómenos que comienzan a existir antes de poder explicarse.',
  publishedAt: '2026-06-07T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/la-se%C3%B1al-aparece-antes-de-poder-nombrarla-1f1c38133f7c',
});

export const SFI_OBSERVATION_PERSISTENCE_NORMAL = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-003',
  slug: 'lo-que-persiste-empieza-a-parecer-normal',
  observationKind: 'SIGNAL',
  title: 'Lo que persiste empieza a parecer normal',
  subtitle: 'Notas sobre habituación a la anomalía, rastros públicos y fenómenos que se expanden antes de ser reconocidos.',
  publishedAt: '2026-06-15T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/lo-que-persiste-empieza-a-parecer-normal-c6a6cc27473f',
});

export const SFI_OBSERVATION_TRAJECTORY = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-004',
  slug: 'trayectoria',
  observationKind: 'TRAJECTORY',
  title: 'Trayectoria',
  subtitle: 'Notas sobre la observación de vectores, la acumulación de cambios imperceptibles y la detección de dirección en sistemas complejos.',
  publishedAt: '2026-06-22T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/trayectoria-8d226b97a49c',
});

export const SFI_OBSERVATION_PERSISTENT_PHENOMENA = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-005',
  slug: 'fenomenos-persistentes-un-atlas-en-construccion',
  observationKind: 'ATLAS',
  title: 'Fenómenos persistentes. Un atlas en construcción.',
  subtitle: 'Notas sobre las configuraciones que regresan, se desplazan y conservan dirección a través del tiempo.',
  publishedAt: '2026-06-29T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/fen%C3%B3menos-persistentes-un-atlas-en-construcci%C3%B3n-f688ce1c3ba9',
});

export const SFI_OBSERVATION_OBSERVER_INSTRUMENT = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-006',
  slug: 'el-observador-como-parte-del-instrumento',
  observationKind: 'METHOD',
  title: 'El observador como parte del instrumento',
  subtitle: 'Notas sobre metacognición, registro asistido y la transformación de la mirada en infraestructura.',
  publishedAt: '2026-07-07T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/el-observador-como-parte-del-instrumento-f450bf8460df',
});

export const SFI_OBSERVATION_INFRASTRUCTURE = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-007',
  slug: 'infraestructura-para-observar-lo-que-no-se-deja-ver',
  observationKind: 'METHOD',
  title: 'Infraestructura para observar lo que no se deja ver',
  subtitle: 'Notas sobre evidencia, trazabilidad y la transformación de una intuición en instrumento.',
  publishedAt: '2026-07-12T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/infraestructura-para-observar-lo-que-no-se-deja-ver-da1edf73fcd3',
});

export const SFI_OBSERVATION_MEMORY = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-008',
  slug: 'memoria-antes-que-explicacion',
  observationKind: 'MEMORY',
  title: 'Memoria antes que explicación',
  subtitle: 'Notas sobre lo que persiste mientras la atención colectiva mira a otra parte.',
  publishedAt: '2026-07-19T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/memoria-antes-que-explicaci%C3%B3n-bcfb728ed6dc',
});

export const SFI_OBSERVATION_ATLAS = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-009',
  slug: 'atlas',
  observationKind: 'ATLAS',
  title: 'Atlas',
  subtitle: 'Notas sobre cartografía en territorios emergentes.',
  publishedAt: '2026-07-27T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/atlas-e18e665608a1',
});

export const SFI_OBSERVATION_ORIGIN_END = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-010',
  slug: 'el-punto-de-origen-estaba-al-final',
  observationKind: 'TRAJECTORY',
  title: 'El punto de origen estaba al final',
  subtitle: 'Notas sobre una trayectoria que sólo podía reconocerse después de haberla recorrido.',
  publishedAt: '2026-08-02T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/el-punto-de-origen-estaba-al-final-24ab2fd6d1e7',
});

export const SFI_OBSERVATION_T_MINUS_9 = indexedObservation({
  canonicalId: 'SFI-PUB-OBS-011',
  slug: 't-9-minutos-ia-instituciones-y-friccion',
  observationKind: 'INSTITUTIONAL',
  title: 'T-9 minutos: IA, instituciones y fricción',
  subtitle: 'Una ventana de decisión observada antes de que el sistema cierre sobre una respuesta.',
  publishedAt: '2026-09-12T00:00:00-06:00',
  mediumUrl: 'https://medium.com/@systemfriction/t-9-minutos-ia-instituciones-y-fricci%C3%B3n-ec8ca0edf4f4',
});

export const SFI_OBSERVATION_T_PLUS_72: SfiEditorialPublication = Object.freeze({
  contract: SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT,
  canonicalId: 'SFI-PUB-OBS-012',
  slug: 't-72-horas-la-senal-no-era-la-cancion',
  editorialKind: 'OBSERVATION',
  collection: 'Observaciones',
  observationKind: 'TRAJECTORY',
  language: 'es',
  series: 'SFI · Observaciones',
  issue: 'TRAJECTORY',
  title: 'T+72 horas: la señal no era la canción',
  subtitle: 'KXTXR, REM618, 111 y QUE NO: lo que aparece cuando una obra puede ser observada antes, durante y después de entrar al mundo',
  motto: 'Observar · Contrastar · Retornar',
  deck: 'Una canción puede desaparecer de una plataforma y continuar modificando otra cosa. Esta observación sigue la distancia entre publicación, señal, memoria, cuerpo y RETURN sin confundir visibilidad con permanencia.',
  publishedAt: '2026-09-12T00:00:00-06:00',
  mediumUrl: null,
  coverImage: null,
  visuals: Object.freeze([]),
  contentState: 'MATERIALIZED',
  renditions: Object.freeze([]),
  sections: Object.freeze([
    {
      id: 'apertura',
      title: 'La señal no era la canción',
      paragraphs: Object.freeze([
        'Primero fue una canción. Eso creíamos. Un archivo. Una portada. Una fecha. Un lanzamiento.',
        'Después aparecieron números. Reproducciones. Alcance. Retención. Comentarios. Silencio. Y durante un momento pareció que el problema era sencillo: había que saber si la canción había funcionado.',
        'Pero ésa resultó ser la pregunta equivocada. Una canción puede desaparecer de una plataforma y continuar modificando otra cosa. Puede producir poca interacción y abrir una relación. Puede generar atención sin producir memoria. Puede fracasar como publicación y persistir como lenguaje.',
        'Puede funcionar durante tres días y no dejar absolutamente nada. O puede parecer que no ocurrió nada. Hasta que aparece la siguiente señal.',
      ]),
    },
    {
      id: 't72',
      title: 'T+72',
      paragraphs: Object.freeze([
        'Con REM618 hicimos algo relativamente pequeño. Esperamos.',
        'No intentamos corregir inmediatamente lo que estaba ocurriendo. No convertimos cada movimiento de una plataforma en una decisión. No asumimos que un número bajo significaba rechazo. Tampoco que uno alto significaba permanencia.',
        'Durante una ventana de 72 horas conservamos el estado. La obra estaba afuera. El sistema estaba respondiendo. Nosotros todavía no sabíamos exactamente qué estábamos observando.',
        'Eso importaba. Porque una de las formas más fáciles de destruir una señal es interpretarla demasiado rápido.',
      ]),
    },
    {
      id: 'kxtrx',
      title: 'La canción salió. La observación empezó después.',
      paragraphs: Object.freeze([
        'KXTXR no fue creado para convertirse en un experimento de System Friction Institute. KXTXR existe como proyecto artístico autónomo. Edwing produce, compone, interpreta y emite. La música debe poder existir aunque SFI desaparezca mañana.',
        'SFI llegó después. No para decidir qué debía significar la obra, sino para intentar conservar una pregunta distinta: ¿qué ocurre alrededor de una señal cultural mientras atraviesa un campo?',
        'No sólo cuántas personas la escuchan. Qué cambia. Qué persiste. Qué desaparece. Qué reaparece. Qué necesita ser reinterpretado cuando llega el siguiente objeto.',
      ]),
    },
    {
      id: 'rem618',
      title: 'REM618',
      paragraphs: Object.freeze([
        'REM618 fue el primer lugar donde el problema se volvió visible. Al principio existía una obra. Después apareció un archivo. Después versiones. Después imágenes. Después publicaciones. Después observaciones. Después interpretaciones incompatibles acerca de lo que estaba ocurriendo.',
        'Y entonces apareció algo más interesante que una métrica: una trayectoria. REM618 podía ser observado en distintos momentos sin dejar de ser REM618. Pero el campo alrededor de REM618 ya no era el mismo.',
        'Eso permitió conservar una separación que después sería fundamental: observación no era hipótesis; hipótesis no era evidencia; evidencia no era significado; y significado no era resultado.',
      ]),
    },
    {
      id: '111',
      title: 'Entonces apareció 111',
      paragraphs: Object.freeze([
        '111 hizo posible que REM618 dejara de estar solo. Ahora había dos puntos. Y dos puntos todavía no forman una trayectoria. Pero permiten empezar a preguntar si existe una.',
        'El master de 111 entró a SFI como un objeto distinto. Después apareció otro archivo: un premaster. Si dos archivos diferentes terminan siendo tratados como la misma canción, las mediciones pueden sobrevivir mientras el objeto que supuestamente describen ya cambió.',
        'El problema dejó de ser musical. Era epistemológico. ¿Qué exactamente habíamos medido? ¿En qué momento? ¿Sobre cuál versión? ¿Y qué afirmaciones todavía podían sostenerse después del cambio?',
        '111 convirtió una intuición en una necesidad. La memoria tenía que conservar versiones, no únicamente resultados.',
      ]),
    },
    {
      id: 'atlas',
      title: 'ATLAS apareció después',
      paragraphs: Object.freeze([
        'No como dashboard. No como una colección de métricas. Como memoria: objeto, observación, hipótesis, publicación, retorno, contradicción, aprendizaje, otra publicación, otra observación.',
        'La unidad importante ya no era una pieza aislada. Era la relación entre estados separados por tiempo. Entonces una publicación de REM618 podía adquirir un significado distinto después de 111, y una observación de 111 podía obligarnos a revisar lo que creíamos haber entendido de REM618.',
        'El pasado no había cambiado. Nuestra resolución sobre él sí.',
      ]),
    },
    {
      id: 'return',
      title: 'Conservar antes de conocer el desenlace',
      paragraphs: Object.freeze([
        'La cultura normalmente se mide después de ocurrir, cuando ya conocemos streams, charts, ventas, asistencia, seguidores o cobertura.',
        'Pero para estudiar una trayectoria necesitamos conservar algo antes de conocer su desenlace: qué creíamos que podía ocurrir, qué alternativas considerábamos, qué decidimos hacer, qué decidimos no hacer. Y sólo después regresar.',
        'RETURN no existe para comprobar que teníamos razón. Existe para encontrar la distancia entre lo que proyectamos y lo que realmente ocurrió.',
      ]),
    },
    {
      id: 'que-no',
      title: 'QUE NO entra aquí',
      paragraphs: Object.freeze([
        'No como la siguiente canción. Como el siguiente estado del campo. REM618 ya existe detrás. 111 ya existe detrás. Hay imágenes, residuos visuales, decisiones que funcionaron y otras que no.',
        'QUE NO ya no entra en un espacio vacío. Entra en un campo con memoria. Eso significa que una modificación ahora puede distinguirse de una continuidad y que una continuidad puede ser deliberada en lugar de accidental.',
      ]),
    },
    {
      id: 'algoritmo',
      title: 'El algoritmo es un ambiente, no un oráculo',
      paragraphs: Object.freeze([
        'Las plataformas digitales nos acostumbraron a leer sus métricas como si fueran una descripción del mundo. No lo son. Describen una interacción dentro de un ambiente específico, con reglas que además pueden cambiar.',
        'Un reel con poco alcance no demuestra que una obra fue rechazada. Uno con mucho alcance tampoco demuestra que apareció un fenómeno cultural. Silencio no significa fracaso. Visibilidad no significa permanencia.',
        'Cuando se entiende esa diferencia se vuelve posible hacer algo menos espectacular y más útil: observar.',
      ]),
    },
    {
      id: 'cuerpo',
      title: 'KXTXR dejó de ser únicamente digital',
      paragraphs: Object.freeze([
        'Había otra prueba pendiente: el cuerpo. Una pieza puede existir perfectamente dentro de un archivo, Spotify, Instagram, YouTube o una arquitectura visual, y aun así no existir cuando cinco personas están frente a ella en una habitación.',
        'Por eso apareció KXTXR LIVE UNIT. No como una nueva identidad, sino como una forma de materialización. La pregunta es simple: ¿puede la señal sobrevivir al paso del archivo al espacio?',
      ]),
    },
    {
      id: 'live',
      title: 'Primero quince minutos',
      paragraphs: Object.freeze([
        'No una gira. No un gran escenario. No una declaración. Quince minutos. KXTXR SIGNAL. REM618 como residuo. 111 como memoria. QUE NO como objeto legible. Después silencio. Observar qué permanece.',
        'Si puede sostenerse, aparece KXTXR RETURN: una configuración más larga y audiovisual donde la imagen reacciona a la trayectoria y el escenario empieza a mostrar tiempo.',
      ]),
    },
    {
      id: 'signal-chamber',
      title: 'SIGNAL CHAMBER',
      paragraphs: Object.freeze([
        'Museo, galería, universidad o festival de arte y tecnología permiten otra condición de observación. Aquí puede mostrarse ATLAS: la separación entre evidencia e interpretación, las versiones, contradicciones y señales que desaparecieron o persistieron.',
        'Pero la frontera debe conservarse. Un museo no puede demostrar que KXTXR funciona como música, de la misma forma que Spotify no puede demostrar que una instalación funciona como campo de observación. Son pruebas distintas.',
      ]),
    },
    {
      id: 'mihm',
      title: 'REM618 salió del circuito puramente artístico',
      paragraphs: Object.freeze([
        'REM618 entró como caso empírico en investigación alrededor de MIHM. Una publicación académica no valida una canción, no demuestra su valor cultural y no convierte una decisión artística en verdad científica.',
        'Establece algo más específico: que ese objeto fue utilizado como caso, que existe una metodología, que hubo observación documentada y que existe una coordenada desde la cual alguien más puede discutirla, refutarla o reconstruirla.',
      ]),
    },
    {
      id: 'sfi',
      title: 'Aquí empezó a aparecer SFI',
      paragraphs: Object.freeze([
        'No como marca detrás de KXTXR. Como instrumento. Una infraestructura capaz de conservar simultáneamente lo que ocurrió, lo que creemos que ocurrió, lo que proyectamos que ocurriría, lo que decidimos modificar y lo que ocurrió después de modificarlo.',
        'Separado. Trazable. Revisable. Eso permite la capacidad de equivocarse sin perder la historia.',
      ]),
    },
    {
      id: 'cierre',
      title: 'La trayectoria apenas había empezado',
      paragraphs: Object.freeze([
        'El problema no era cómo producir una canción, hacer un videoclip, conseguir alcance o construir una identidad. Era cómo permitir que algo cambiara sin destruir la posibilidad de entender por qué cambió.',
        'REM618, 111 y QUE NO no son tres respuestas. Son tres coordenadas. Todavía no sabemos cuál será la forma final. Ésa es precisamente la razón para conservarlas.',
        'El siguiente estado depende del mundo. QUE NO tendrá que salir. El cuerpo tendrá que aparecer. KXTXR tendrá que tocar. Alguien llegará sin conocer el lore, MIHM, ATLAS o SFI. Escuchará o no. Permanecerá o no. Volverá o no. Después podremos regresar a lo que pensábamos hoy y comparar. Eso será RETURN.',
        'Un instrumento no existe para demostrar aquello que esperaba encontrar. Existe para conservar suficiente mundo como para reconocer cuando estaba equivocado.',
        'T+72 horas. La canción seguía ahí. Pero ya no estábamos observando solamente una canción. Estábamos observando una trayectoria. Y la trayectoria apenas había empezado.',
      ]),
    },
  ]),
  cadence: Object.freeze([]),
  domains: Object.freeze([]),
  epistemicBoundary: SHARED_OBSERVATION_BOUNDARY,
});

export const SFI_OBSERVATION_KAVAK: SfiEditorialPublication = Object.freeze({
  contract: SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT,
  canonicalId: 'SFI-PUB-OBS-013',
  slug: 'kavak-estado-autoridad-ejecucion',
  editorialKind: 'OBSERVATION',
  collection: 'Observaciones',
  observationKind: 'CASE',
  language: 'es',
  series: 'SFI · Observaciones',
  issue: 'CASE',
  title: 'KAVAK / ESTADO / AUTORIDAD / EJECUCIÓN',
  subtitle: 'Una observación falsable sobre qué permanece reconstruible cuando el estado comunicado y el cierre material divergen.',
  motto: 'Observar · Contrastar · Retornar',
  deck: 'Un caso de fricción externa observado desde la distancia entre conversación, estado comunicado, autoridad operativa y ejecución material. La pieza no convierte experiencia en causalidad; conserva aquello que puede ser reconstruido y posteriormente contrastado.',
  publishedAt: '2026-09-12T00:00:00-06:00',
  mediumUrl: null,
  coverImage: '/images/editorial/notas-de-caso.webp',
  visuals: Object.freeze([]),
  contentState: 'MATERIALIZED',
  renditions: Object.freeze([]),
  sections: Object.freeze([
    {
      id: 'caso',
      title: 'El estado no es la ejecución',
      paragraphs: Object.freeze([
        'KAVAK entra a esta colección como caso de observación organizacional, no como acusación ni como demostración automática de una hipótesis sobre la empresa.',
        'La pregunta es más estrecha: qué puede reconstruirse cuando una conversación comunica un estado, una autoridad parece haber reconocido una resolución y el cierre material todavía no coincide con esa descripción.',
        'Para SFI la fricción útil aparece precisamente en esa distancia. Conversación, estado, autoridad y ejecución no son equivalentes. Cuando se conservan por separado se vuelve posible preguntar qué cambió realmente y qué permaneció únicamente como narrativa de cierre.',
      ]),
    },
    {
      id: 'frontera',
      title: 'Qué puede afirmarse',
      paragraphs: Object.freeze([
        'El caso permite observar una divergencia documentable entre capas del proceso. No autoriza por sí solo a generalizar esa fricción a todas las operaciones de KAVAK ni a inferir intención, causa sistémica o patrón institucional sin evidencia adicional.',
        'Su valor está en conservar una secuencia falsable que pueda recibir RETURN: si la ejecución material ocurre, cuándo ocurre, qué referencia la identifica y qué parte de la lectura inicial sobrevive después del cierre real.',
      ]),
    },
  ]),
  cadence: Object.freeze([]),
  domains: Object.freeze([]),
  epistemicBoundary: SHARED_OBSERVATION_BOUNDARY,
});

const SFI_REALITY_CHAIN_RENDITIONS: readonly SfiEditorialPublicationRendition[] = Object.freeze([
  {
    kind: 'PDF',
    mediaType: 'application/pdf',
    filename: 'SFI-FB-PS-2026-09-002-PUB-V1.0_THE_REALITY_CHAIN_EN.pdf',
    byteLength: 10174948,
    sha256: 'c169d7674b2934083c26e1fd1b7f33eaecf13fbd3ab1588f068471c9a3cbacae',
    publicUrl: null,
    state: 'IDENTIFIED',
  },
]);

export const SFI_REALITY_CHAIN_BRIEF: SfiEditorialPublication = Object.freeze({
  contract: SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT,
  canonicalId: 'SFI-PUB-FB-002',
  slug: 'the-reality-chain',
  editorialKind: 'FRICTION_BRIEF',
  collection: 'Friction Briefs',
  observationKind: 'METHOD',
  language: 'en',
  series: 'SFI · Public-Source Friction Briefs',
  issue: 'PUBLIC-SOURCE FRICTION BRIEF',
  title: 'The Reality Chain',
  subtitle: 'Evidence, Artificial Intelligence and the Collapse of the Distance Between Observation and Claim',
  motto: 'The last trustworthy image will not be an image. It will be a reconstructable chain.',
  deck: 'A public-source investigation into what institutions must preserve when machines increasingly participate in observing, interpreting and acting on the world. UAP material from AARO/PURSUE is used as Case Zero because it combines sensor data, missing context, uncertain attribution, chain-of-custody problems and high-pressure interpretation.',
  publishedAt: '2026-09-20T19:16:00-06:00',
  mediumUrl: null,
  coverImage: '/images/editorial/reality-chain/reality-chain-cover.svg',
  visuals: Object.freeze([
    { id: 'world-to-claim', src: '/images/editorial/reality-chain/reality-chain-world-to-claim.svg', alt: 'World-to-Claim Traceability from physical event through sensor, artifact, context, inference, authority, claim and RETURN.', caption: 'WORLD-TO-CLAIM TRACEABILITY · Authenticity does not by itself establish the truth of an institutional claim.' },
    { id: 'transparency-paradox', src: '/images/editorial/reality-chain/reality-chain-transparency-paradox.svg', alt: 'Transparency Paradox comparing disclosure volume with evidentiary power.', caption: 'THE TRANSPARENCY PARADOX · More disclosure can increase access without increasing adjudicative capacity.' },
    { id: 'epistemic-overproduction', src: '/images/editorial/reality-chain/reality-chain-epistemic-overproduction.svg', alt: 'Epistemic Overproduction showing observation and generation scaling faster than verification.', caption: 'EPISTEMIC OVERPRODUCTION · Verification capacity becomes the scarce institutional resource.' },
    { id: 'benchmark-v0', src: '/images/editorial/reality-chain/reality-chain-benchmark-v0.svg', alt: 'Reality Chain Benchmark v0 with layered evidence from observation through corroboration.', caption: 'REALITY CHAIN BENCHMARK v0 · Evidence is revealed in layers to measure justified claims, abstention and narrative inflation.' },
    { id: 'six-integrities', src: '/images/editorial/reality-chain/reality-chain-six-integrities.svg', alt: 'Six integrities of institutional evidence: capture, transformation, context, inference, authority and RETURN.', caption: 'SIX INTEGRITIES · A reconstructable chain from reality to accountability.' },
  ]),
  contentState: 'MATERIALIZED',
  renditions: SFI_REALITY_CHAIN_RENDITIONS,
  sections: Object.freeze([
    {
      id: 'abstract',
      title: 'Abstract',
      paragraphs: Object.freeze([
        'Artificial intelligence changes the evidence problem in two opposite directions at once. Machines can detect rare patterns across enormous multimodal datasets, while generative systems can create persuasive synthetic evidence at negligible marginal cost. The institutional bottleneck therefore shifts from obtaining information to establishing when an observation, inference or action was sufficiently warranted by reality.',
        'This brief audits public AARO/PURSUE material, resolved and unresolved UAP cases, NASA recommendations on data quality and anomaly analysis, C2PA limits on content provenance, NIST work on synthetic media and traceability, and contemporary benchmarks on abstention, multimodal conflict and verification cost. The investigation does not establish extraterrestrial origin. It uses UAP as a stress test for evidence under uncertainty.',
      ]),
    },
    {
      id: 'method',
      title: 'Method and evidence boundary',
      paragraphs: Object.freeze([
        'The study is a retrospective public-source audit, not a randomized experiment. Resolved AARO cases were examined for the information that materially enabled adjudication; unresolved cases were examined as negative controls for what remained unavailable. Those patterns were then triangulated against external benchmark evidence on multimodal uncertainty, abstention, provenance and verification cost.',
        'The result is classified as a supported derived hypothesis, not a validated universal law. The proposed Reality Chain Benchmark remains a designed but not yet independently executed SFI benchmark.',
      ]),
    },
    {
      id: 'information-state',
      title: 'Finding 01 · Unidentified is an information state',
      paragraphs: Object.freeze([
        'A file can be authentic while the observed object remains unidentified. A physical object can be established while its identity remains unresolved. An object can remain unidentified while a specific extraordinary interpretation is rejected. These are different epistemic states and should not be collapsed into one label.',
        'The central distinction is: authentic artifact ≠ physical object ≠ identified object ≠ anomalous behavior ≠ extraordinary origin.',
      ]),
    },
    {
      id: 'context',
      title: 'Finding 02 · The decisive information often sits outside the image',
      paragraphs: Object.freeze([
        'Across the intentionally selected resolved AARO cases audited in this project, resolution depended on material context beyond visual inspection alone: geometry, wind, traffic data, sensor behavior, later imagery, metadata, reconstruction or corroborating records.',
        'This does not prove that every UAP case has a conventional explanation. It does support a narrower claim: evidentiary power frequently increases when the observation is connected to its measurement conditions and external context.',
      ]),
    },
    {
      id: 'transparency',
      title: 'Finding 03 · The Transparency Paradox',
      paragraphs: Object.freeze([
        'Disclosure increases access to artifacts. It does not automatically increase the power to adjudicate what those artifacts mean. PURSUE contains material for which AARO itself notes incomplete or unsupported chain of custody and, in some instances, prior digital modification.',
        'More evidence objects can therefore coexist with more possible narratives. Transparency without provenance, metadata, contextual reconstruction and adjudication can increase interpretive surface faster than knowledge.',
      ]),
    },
    {
      id: 'ai',
      title: 'Finding 04 · AI creates an asymmetry between inference and verification',
      paragraphs: Object.freeze([
        'External benchmarks converge on a consistent weakness: stronger inference does not guarantee correct abstention. Models can remain confident under contradictory multimodal evidence, reasoning fine-tuning can reduce abstention performance, and agentic systems can be materially better at acting than at recognizing when action is insufficiently justified.',
        'The relevant scarcity is therefore verification capacity. Generation, perception, detection and interpretation can scale rapidly; institutional verification does not necessarily scale at the same rate.',
      ]),
    },
    {
      id: 'reality-chain',
      title: 'The Reality Chain',
      paragraphs: Object.freeze([
        'The proposed institutional unit is not merely the authenticated file. It is the reconstructable path by which a physical event becomes an authorized claim: WORLD → SENSOR → SIGNAL → ARTIFACT → CONTEXT → INFERENCE → AUTHORITY → CLAIM → ACTION → RETURN.',
        'The chain matters because provenance can authenticate the history of an artifact without establishing the truth of the interpretation attached to it. Institutions therefore need claim provenance in addition to file provenance.',
      ]),
    },
    {
      id: 'integrities',
      title: 'Six integrities of institutional evidence',
      paragraphs: Object.freeze([
        'Capture integrity asks what the sensor could and could not observe. Transformation integrity records what happened to the data. Context integrity preserves corroborating and constraining information. Inference integrity preserves hypotheses, uncertainty and reasons. Authority integrity identifies who could convert an inference into an institutional claim. RETURN integrity records what later confirmed, contradicted or revised that claim.',
        'These layers are separable. A chain can be strong in one and weak in another. That is precisely why a single authenticity score is insufficient.',
      ]),
    },
    {
      id: 'benchmark',
      title: 'Reality Chain Benchmark v0',
      paragraphs: Object.freeze([
        'The proposed benchmark reveals evidence in four layers: L0 observation only; L1 instrument context; L2 external context; L3 corroboration or contradiction. At every layer the model must classify the claim state, state its confidence, preserve rival hypotheses, identify missing critical evidence, and choose among claim, investigate or abstain.',
        'Primary metrics are Claim Justification, Abstention Calibration, Evidence Responsiveness, Narrative Inflation, Traceability and Verification Cost. The benchmark is designed to test whether additional reality produces better adjudication rather than merely more elaborate narrative.',
      ]),
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      paragraphs: Object.freeze([
        'The investigation supports a bounded hypothesis: machine intelligence is increasing the capacity to perceive, infer and act faster than the capacity to establish when perception, inference and action are epistemically justified.',
        'The infrastructure missing from the AI era is therefore not only another detector. It is the chain that proves when a machine had enough reality to speak.',
      ]),
    },
  ]),
  cadence: Object.freeze([]),
  domains: Object.freeze(['Artificial intelligence', 'Evidence', 'Institutional governance', 'Synthetic media', 'UAP / anomaly adjudication']),
  epistemicBoundary: Object.freeze([
    'This brief does not establish extraterrestrial origin for any UAP case.',
    'Unresolved does not mean extraterrestrial, anomalous propulsion, or non-human technology.',
    'The timing of government disclosure and the rise of generative AI is not presented as evidence of a hidden causal relationship.',
    'The documentary audit supports a derived hypothesis; it does not establish a universal causal law.',
    'Reality Chain Benchmark v0 is designed but has not yet completed an independent multi-model SFI execution.',
  ]),
});

const SFI_YEARS_THAT_DID_EXIST_RENDITIONS: readonly SfiEditorialPublicationRendition[] = Object.freeze([
  {
    kind: 'PDF',
    mediaType: 'application/pdf',
    filename: 'SFI_LAB_NOTE_THE_YEARS_THAT_DID_EXIST_EN_V1.0.pdf',
    byteLength: 6686076,
    sha256: 'bdcfaf3b3282ca0d579ff72ae3c74f75d63a20a85098818b70ab5e666abbdcef',
    publicUrl: null,
    state: 'IDENTIFIED',
  },
]);

export const SFI_YEARS_THAT_DID_EXIST_LAB_NOTE: SfiEditorialPublication = Object.freeze({
  contract: SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT,
  canonicalId: 'SFI-PUB-LN-001',
  slug: 'the-years-that-did-exist',
  editorialKind: 'FRICTION_BRIEF',
  collection: 'Friction Briefs',
  observationKind: 'METHOD',
  language: 'en',
  series: 'SFI · Research Lab Notes',
  issue: 'LAB NOTE / PUBLIC-SOURCE SYNTHESIS',
  title: 'The Years That Did Exist',
  subtitle: 'From phantom time to a comparative anatomy of civilizational capacity',
  motto: 'The years did exist. What changed was the capacity.',
  deck: 'A falsifiable public-source investigation that rejects a literal chronological hole across the early medieval interval and then asks the harder question: why did some complex systems lose the ability to reproduce high-order capabilities at scale? The note develops a bounded comparative framework around reproductive-capacity stress, rapid coordination fracture and adaptive substitution, while retaining failures, rival explanations and validation limits.',
  publishedAt: '2026-09-20T22:36:00-06:00',
  mediumUrl: null,
  coverImage: '/images/editorial/years-that-did-exist/cover.svg',
  visuals: Object.freeze([]),
  contentState: 'MATERIALIZED',
  renditions: SFI_YEARS_THAT_DID_EXIST_RENDITIONS,
  sections: Object.freeze([
    {
      id: 'abstract',
      title: 'Executive abstract',
      paragraphs: Object.freeze([
        'The literal missing-time claim fails against independent physical chronologies. Annual tree-ring sequences, cosmogenic radiocarbon markers and environmental archives cross the alleged interval. The anomaly therefore shifts from chronology to reproducibility: what collective functions can a complex society continue to produce, at what spatial scale and over what time horizon?',
        'The central synthesis is deliberately bounded. It does not establish a universal law of collapse. It identifies recurring patterns worth testing: slow reproductive erosion, rapid coordination fracture, and the possibility that adaptive substitution separates severe stress from terminal loss of function.',
      ]),
    },
    {
      id: 'method',
      title: 'Method and epistemic contract',
      paragraphs: Object.freeze([
        'The investigation prioritizes physical clocks and material systems where possible: tree rings, radiocarbon excursions, ice-core pollution, pollen, mining, coinage, built infrastructure, settlement, water systems and urbanism. Regional controls prevent a Western-European pattern from being mislabeled as a universal Dark Age.',
        'Comparative scores used for CH-EW, RCF and ASC are SFI analytical coding created during this inquiry. They are not published historical metrics, have not been independently replicated, and never upgrade a weak source.',
      ]),
    },
    {
      id: 'continuity',
      title: 'Finding 01 · The years are physically present',
      paragraphs: Object.freeze([
        'The 774/775 cosmogenic radiocarbon event is embedded in annually formed tree rings and appears across geographically distant chronologies. That physical continuity makes a literal insertion of roughly three centuries extraordinarily difficult to sustain.',
        'This finding does not certify every medieval narrative, date or attribution. It narrows the uncertainty: an archival gap and a physical gap are different claims.',
      ]),
    },
    {
      id: 'capacity',
      title: 'Finding 02 · Material capacity can contract without time disappearing',
      paragraphs: Object.freeze([
        'Mining and lead-pollution proxies, monetary evidence, changing urban systems, hydraulic maintenance and regional landscape records show prolonged material reconfiguration across the late Roman and early medieval worlds. The political date 476 sits inside slower processes rather than acting as a universal switch.',
        'Post-Roman monumental construction did not vanish everywhere. Longobard Italy, Aachen and Reccopolis falsify a simple story of technological amnesia. The sharper question is where, how often and at what scale complex construction could be repeated.',
      ]),
    },
    {
      id: 'comparative-model',
      title: 'Finding 03 · At least two failure regimes appear in the comparative sample',
      paragraphs: Object.freeze([
        'CH-EW is most sensitive to slow loss of reproductive capacity: maintenance deferral, resource-margin erosion, inherited-capital consumption, network contraction and reduced ability to replace what the system uses. It is not a general collapse detector.',
        'RCF captures a different regime: succession breakdown, elite fracture, peripheral defection, fragmented command and rapid loss of coalition integrity. ASC then asks whether a failing function can be substituted, modularized or relocated before dependent functions fail.',
      ]),
    },
    {
      id: 'limits',
      title: 'Limits and falsifiers',
      paragraphs: Object.freeze([
        'The sample is retrospective; the coding is analytical; system boundaries are historically contestable; source quality is heterogeneous; and the framework was revised while cases were being examined. Those conditions prevent a claim of predictive validation.',
        'The framework should be weakened if independent coders cannot reproduce the classifications, if high reproductive stress plus low substitution repeatedly produces stable continuity without reconfiguration, or if rapid coordination fracture plus low substitution repeatedly resolves without loss of the tracked system.',
      ]),
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      paragraphs: Object.freeze([
        'The investigation began by asking whether centuries were missing. Independent physical records reject the strong chronological version of that idea. What remains is more useful: complex societies can preserve people, knowledge and artifacts while losing the capacity to reproduce the coordinated functions that once made high-order outcomes routine.',
        'The working proposition is therefore not that civilizations simply collapse. Systems can erode slowly, fracture quickly, or transform by substitution. The visible ruin is often a late artifact of a deeper question: can the system still produce its own tomorrow?',
      ]),
    },
  ]),
  cadence: Object.freeze([]),
  domains: Object.freeze(['Historical systems', 'Civilizational capacity', 'Institutional resilience', 'Archaeology', 'Complex systems']),
  epistemicBoundary: Object.freeze([
    'The Phantom Time Hypothesis is treated as falsified only in its strong literal chronology form; this does not validate every medieval documentary claim.',
    'CH-EW, RCF and ASC are analytical constructs developed during this investigation and are not validated predictive instruments.',
    'Historical sequence and association do not by themselves establish causality.',
    'System boundaries must be declared before classifying survival, substitution, inheritance or termination.',
    'Publication establishes EXPOSURE only. Discovery, Recognition, Interaction, PULL and RETURN require independent evidence.',
  ]),
});

export const SFI_EDITORIAL_FRICTION_BRIEFS: readonly SfiEditorialPublication[] = Object.freeze([
  SFI_REALITY_CHAIN_BRIEF,
  SFI_YEARS_THAT_DID_EXIST_LAB_NOTE,
]);

export const SFI_EDITORIAL_OBSERVATIONS: readonly SfiEditorialPublication[] = Object.freeze([
  SFI_OBSERVATION_CRISIS_STATE,
  SFI_OBSERVATION_SIGNAL_NAMING,
  SFI_OBSERVATION_PERSISTENCE_NORMAL,
  SFI_OBSERVATION_TRAJECTORY,
  SFI_OBSERVATION_PERSISTENT_PHENOMENA,
  SFI_OBSERVATION_OBSERVER_INSTRUMENT,
  SFI_OBSERVATION_INFRASTRUCTURE,
  SFI_OBSERVATION_MEMORY,
  SFI_OBSERVATION_ATLAS,
  SFI_OBSERVATION_ORIGIN_END,
  SFI_OBSERVATION_T_MINUS_9,
  SFI_OBSERVATION_T_PLUS_72,
  SFI_OBSERVATION_KAVAK,
]);

export const SFI_EDITORIAL_PUBLICATIONS: readonly SfiEditorialPublication[] = Object.freeze([
  SFI_NOTAS_TEMPORALES_V1,
  ...SFI_EDITORIAL_FRICTION_BRIEFS,
  ...SFI_EDITORIAL_OBSERVATIONS,
]);

export function editorialPublicationForSlug(slug: string) {
  return SFI_EDITORIAL_PUBLICATIONS.find((publication) => publication.slug === slug) ?? null;
}

export function relatedEditorialObservations(slug: string, limit = 8) {
  return SFI_EDITORIAL_OBSERVATIONS
    .filter((publication) => publication.slug !== slug)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);
}
