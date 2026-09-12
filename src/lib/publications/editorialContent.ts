export const SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT = 'SFI-EDITORIAL-PUBLICATION-CONTENT-1.0' as const;

export type SfiEditorialPublicationSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
  items?: readonly string[];
};

export type SfiEditorialPublication = {
  contract: typeof SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT;
  slug: string;
  editorialKind: 'TEMPORAL_NOTE';
  series: string;
  issue: string;
  title: string;
  subtitle: string;
  motto: string;
  deck: string;
  publishedAt: string;
  sections: readonly SfiEditorialPublicationSection[];
  cadence: readonly { interval: string; name: string; scope: string }[];
  domains: readonly string[];
  epistemicBoundary: readonly string[];
};

export const SFI_NOTAS_TEMPORALES_V1: SfiEditorialPublication = Object.freeze({
  contract: SFI_EDITORIAL_PUBLICATION_CONTENT_CONTRACT,
  slug: 'notas-temporales-v1',
  editorialKind: 'TEMPORAL_NOTE',
  series: 'SFI · Notas Temporales',
  issue: 'v1.0',
  title: 'Notas Temporales',
  subtitle: 'Observación sistémica para un mundo en transición',
  motto: 'El futuro no se adivina, se observa a tiempo.',
  deck: 'Una serie documental periódica para registrar, relacionar y traducir señales relevantes del entorno sin confundir observación con predicción. Las Notas Temporales conectan evidencia pública, cambios externos, memoria institucional y el World Spector Vector 16×16 para hacer visibles fricciones, convergencias y preguntas que merecen seguimiento.',
  publishedAt: '2026-09-12T00:00:00-06:00',
  sections: Object.freeze([
    {
      id: 'que-son',
      title: 'Qué son las Notas Temporales',
      paragraphs: Object.freeze([
        'Notas Temporales es la superficie editorial periódica del System Friction Institute para observar cambios mientras todavía están ocurriendo. Su función no es producir una voz profética ni convertir cada señal en una tesis institucional. Su función es dejar un registro legible de qué cambió, qué evidencia existe, qué relación puede tener con otros dominios y qué todavía no sabemos.',
        'Cada nota puede integrar señales externas, datos y fuentes públicas, cambios regulatorios o institucionales, observaciones de campo, preguntas del fundador y del equipo, y relaciones derivadas por los instrumentos de SFI. Esas capas deben permanecer identificables. Una observación externa no se vuelve cierta porque un modelo la interprete, y una interpretación no se vuelve evidencia porque resulte plausible.',
        'La serie existe para reducir una falla recurrente en sistemas complejos: reconocer demasiado tarde que varias señales pequeñas ya estaban formando una trayectoria. Documentar temprano no elimina la incertidumbre; permite que la incertidumbre tenga fecha, fuente, contexto y posibilidad de contraste posterior.',
      ]),
      items: Object.freeze([
        'Señales tempranas y cambios de estado.',
        'Contexto, narrativa y relaciones entre dominios.',
        'Datos, fuentes y evidencia identificable.',
        'Análisis relacional mediante el World Spector Vector 16×16.',
        'Observaciones, hipótesis y recomendaciones claramente separadas.',
      ]),
    },
    {
      id: 'proposito',
      title: 'Propósito: transformar incertidumbre en claridad operativa',
      paragraphs: Object.freeze([
        'Una Nota Temporal tiene valor cuando permite entender mejor una situación antes de que la fricción se convierta en crisis o antes de que una oportunidad deje de ser accesible. Esto exige observar eventos puntuales, pero también la velocidad y dirección con la que distintos dominios empiezan a tocarse.',
        'El objetivo institucional es conectar puntos sin fabricar causalidad. Cuando tecnología, regulación, trabajo, energía, biodiversidad y cultura se mueven simultáneamente, la nota debe mostrar dónde existe evidencia de convergencia, dónde sólo existe coincidencia temporal y qué observación futura podría distinguir una de otra.',
        'La utilidad final no es acumular texto. Es construir memoria institucional: que SFI pueda regresar meses después, comparar lo que veía entonces con lo que ocurrió después y aprender tanto de los aciertos como de las hipótesis que no sobrevivieron al contraste.',
      ]),
    },
    {
      id: 'metodo',
      title: 'Método de observación',
      paragraphs: Object.freeze([
        'El ciclo editorial parte de una recolección deliberadamente heterogénea: fuentes oficiales, datos, noticias verificables, literatura académica, publicaciones técnicas, observaciones de campo y señales culturales. La heterogeneidad no autoriza a mezclar niveles de evidencia; obliga a etiquetarlos.',
        'Después se filtra por relevancia, procedencia, confiabilidad y relación con los dominios del vector. La fase de análisis busca recurrencias, anomalías, sincronías y tensiones entre dominios. La interpretación traduce esos patrones a implicaciones posibles, pero conserva visibles las alternativas y los faltantes. Finalmente, la documentación fija la nota, sus fuentes y sus límites; sólo después puede alimentar seguimiento, alertas, hipótesis o propuestas de intervención gobernadas.',
      ]),
      items: Object.freeze([
        '1 · Recolección — observar fuentes y señales con procedencia identificable.',
        '2 · Filtrado — separar relevancia, confiabilidad, ruido y faltantes.',
        '3 · Análisis — cruzar dominios y relaciones del grafo 16×16.',
        '4 · Interpretación — formular implicaciones sin promoverlas automáticamente a hechos.',
        '5 · Documentación — publicar lenguaje humano, fuentes, estado epistémico y limitaciones.',
        '6 · Acción — sólo cuando corresponde, abrir seguimiento, alerta, hipótesis o intervención bajo autoridad explícita.',
      ]),
    },
    {
      id: 'convergencia',
      title: 'Qué significa observar convergencia',
      paragraphs: Object.freeze([
        'SFI presta atención especial a transiciones que no pertenecen a una sola industria o institución. Un cambio legal, un nuevo umbral energético, una capacidad tecnológica, una transformación demográfica o una perturbación ecológica pueden avanzar con relojes distintos y, aun así, encontrarse en un mismo sistema.',
        'Las Notas de Convergencia observan particularmente la distancia entre desarrollo tecnológico e integración humana, institucional y biodiversa. Una tecnología puede madurar técnicamente antes de que existan reglas, capacidades organizacionales, aceptación social o condiciones bioéticas para integrarla. Esa distancia constituye una fricción observable y no debe reducirse a entusiasmo tecnológico ni a rechazo preventivo.',
        'La bioética aparece aquí como restricción de diseño: la integración tecnológica se observa también por su efecto sobre personas, otras formas de vida, territorio, energía y biosfera. El vector no pregunta únicamente qué puede desplegarse, sino qué relaciones y costos se vuelven visibles cuando algo se despliega.',
      ]),
    },
    {
      id: 'discovery',
      title: 'Publicación, Discovery y RETURN',
      paragraphs: Object.freeze([
        'Publicar una nota sólo demuestra EXPOSURE: SFI colocó un objeto canónico en una superficie donde puede ser encontrado. No demuestra que alguien lo haya descubierto. Discovery requiere evidencia de recuperación o hallazgo por un tercero; Recognition requiere evidencia de que ese tercero identificó correctamente el objeto o a SFI; Interaction, Relation, Propagation, PULL y RETURN requieren evidencia adicional.',
        'Esta separación evita que métricas internas de publicación se conviertan artificialmente en legitimidad externa. Discovery Mesh sirve para transportar una identidad canónica coherente a HTML, feeds, sitemap y superficies de máquina y, después, registrar qué parte de esa exposición produjo una relación observable con el exterior.',
      ]),
    },
  ]),
  cadence: Object.freeze([
    { interval: 'DIARIA', name: 'Notas de pulso', scope: 'Señales rápidas, eventos relevantes y actualizaciones críticas; típicamente 1–3 páginas.' },
    { interval: 'SEMANAL', name: 'Notas de convergencia', scope: 'Cruces entre dominios, tendencias y cambios cuya relación merece seguimiento; típicamente 5–10 páginas.' },
    { interval: 'MENSUAL', name: 'Cuadernos institucionales', scope: 'Análisis profundo por dominio, mapas, indicadores, contradicciones y memoria del periodo; típicamente 15–30 páginas.' },
    { interval: 'TRIMESTRAL', name: 'Anexos estratégicos', scope: 'Evaluación de impactos, escenarios, aprendizaje y actualización de relaciones sistémicas; normalmente 30+ páginas.' },
    { interval: 'ANUAL', name: 'Compendio SFI', scope: 'Síntesis longitudinal del año, tesis que sobrevivieron, hipótesis rechazadas y evolución de marcos.' },
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

export const SFI_EDITORIAL_PUBLICATIONS: readonly SfiEditorialPublication[] = Object.freeze([
  SFI_NOTAS_TEMPORALES_V1,
]);

export function editorialPublicationForSlug(slug: string) {
  return SFI_EDITORIAL_PUBLICATIONS.find((publication) => publication.slug === slug) ?? null;
}
