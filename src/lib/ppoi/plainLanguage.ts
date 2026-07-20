import type { PhenomenonState, PpoiIndices } from './ppoiTypes';

/**
 * Esta capa NO calcula nada nuevo. Traduce a español entendible lo que
 * `calibration.ts` y `hypothesisEngine.ts` ya calcularon y guardaron.
 * Ningún texto aquí afirma algo que no esté respaldado por un valor
 * almacenado (R19: No Verdad Sin Regla de Verificación).
 */

export type IndiceExplicado = {
  clave: string;
  nombre: string;
  valor: number;
  maximo: number;
  significado: string;
};

const INDEX_META: Record<
  string,
  { nombre: string; maximo: number; significado: (v: number) => string }
> = {
  PT: {
    nombre: 'Persistencia temporal',
    maximo: 5,
    significado: (v) =>
      v <= 1
        ? 'La evidencia aparece en un solo momento o el fenómeno lleva mucho tiempo sin actividad.'
        : v <= 2
          ? 'La evidencia está concentrada en un periodo corto.'
          : v <= 3
            ? 'El fenómeno se sostiene en un rango de meses.'
            : 'El fenómeno lleva sosteniéndose por un periodo largo (más de medio año).',
  },
  PM: {
    nombre: 'Pluralidad de dominios',
    maximo: 5,
    significado: (v) =>
      v <= 1
        ? 'La evidencia proviene de un solo dominio (por ejemplo, solo música o solo redes).'
        : 'La evidencia aparece en varios dominios distintos, lo que da más solidez al fenómeno.',
  },
  IE: {
    nombre: 'Independencia de fuentes',
    maximo: 5,
    significado: (v) =>
      v <= 1
        ? 'Toda la evidencia viene de una sola fuente — conviene buscar una segunda fuente independiente.'
        : 'La evidencia viene de varias fuentes distintas entre sí.',
  },
  RC: {
    nombre: 'Recurrencia (retorno tras pausa)',
    maximo: 5,
    significado: (v) =>
      v === 0
        ? 'Aún no hay señales de que el fenómeno regrese después de una pausa.'
        : 'El fenómeno ha reaparecido después de al menos una pausa, lo cual indica que no fue un evento único.',
  },
  CG: {
    nombre: 'Capacidad generativa',
    maximo: 5,
    significado: (v) =>
      v === 0
        ? 'La evidencia cargada hasta ahora no generó artefactos nuevos (obras, publicaciones, objetos).'
        : 'Parte de la evidencia generó artefactos nuevos, no solo menciones.',
  },
  ES: {
    nombre: 'Estabilidad semántica',
    maximo: 5,
    significado: (v) =>
      v <= 2
        ? 'El contenido cambia bastante de una evidencia a otra — el fenómeno todavía no tiene un discurso estable.'
        : 'El contenido se mantiene consistente entre evidencias sucesivas.',
  },
  LT: {
    nombre: 'Ritmo temporal',
    maximo: 5,
    significado: (v) =>
      v <= 1
        ? 'Las evidencias llegan muy seguido (ritmo alto).'
        : v <= 3
          ? 'Las evidencias llegan con un ritmo moderado.'
          : 'Las evidencias llegan muy espaciadas en el tiempo.',
  },
  IO: {
    nombre: 'Orientación técnica/institucional',
    maximo: 5,
    significado: (v) =>
      v === 0
        ? 'El contenido no usa todavía vocabulario técnico o institucional (protocolo, sistema, repositorio, etc.).'
        : 'Parte del contenido usa vocabulario técnico o institucional, lo que sugiere una dirección más formal.',
  },
};

export function explicarIndices(indices: PpoiIndices): IndiceExplicado[] {
  return Object.entries(indices)
    .filter(([, valor]) => typeof valor === 'number')
    .map(([clave, valor]) => {
      const meta = INDEX_META[clave];
      const numero = Number(valor);
      return {
        clave,
        nombre: meta?.nombre ?? clave,
        valor: numero,
        maximo: meta?.maximo ?? 5,
        significado: meta ? meta.significado(numero) : 'Índice sin descripción registrada.',
      };
    });
}

export function explicarComposite(composite: number | null): string {
  if (composite === null) {
    return 'Todavía no hay suficiente evidencia para calcular un puntaje general.';
  }
  if (composite < 1.5) {
    return 'El fenómeno está en una etapa muy inicial — señal débil, apenas detectada.';
  }
  if (composite < 2.5) {
    return 'El fenómeno se está formando, pero aún no muestra consistencia sostenida.';
  }
  if (composite < 3.5) {
    return 'El fenómeno tiene una base sólida y comienza a repetirse en el tiempo.';
  }
  if (composite < 4.5) {
    return 'El fenómeno está consolidado: aparece en varios dominios y se sostiene en el tiempo.';
  }
  return 'El fenómeno está fuertemente consolidado y con evidencia robusta.';
}

const DIRECTION_ES: Record<string, string> = {
  EXPANSION: 'Expandiéndose — está llegando a más dominios o audiencias.',
  DEEPENING: 'Profundizando — se está volviendo más denso en su dominio actual, sin expandirse aún.',
  FRAGMENTATION: 'Fragmentándose — la evidencia empieza a dispersarse sin un centro claro.',
  CONVERGENCE: 'Convergiendo — distintas líneas de evidencia están apuntando a un mismo punto.',
  INSTITUTIONALIZATION: 'Institucionalizándose — está adquiriendo estructura formal (protocolos, sistemas, repositorios).',
  DEGRADATION: 'En degradación — la señal se está debilitando; conviene atención pronto.',
  ABSTRACTION: 'Abstrayéndose — está pasando de casos concretos a un patrón más general.',
  OPERATIONALIZATION: 'Operacionalizándose — está pasando de idea a ejecución concreta.',
};

export function explicarDireccion(direction?: string | null): string {
  if (!direction) return 'Sin dirección calculada todavía.';
  return DIRECTION_ES[direction] ?? `Dirección registrada: ${direction}.`;
}

export function explicarEstado(status: string): string {
  const map: Record<string, string> = {
    OPEN: 'Caso abierto — en observación activa.',
    ACTIVE: 'Caso abierto — en observación activa.',
    CLOSED: 'Caso cerrado.',
    CALIBRATING: 'En proceso de recalibración.',
    DORMANT: 'Sin actividad reciente.',
  };
  return map[status?.toUpperCase()] ?? status;
}

/**
 * Sugerencia de próxima observación: heurística determinística basada
 * SOLO en los índices ya calculados (el más bajo). No inventa hallazgos
 * ni predice contenido — solo indica qué tipo de evidencia falta.
 */
export function sugerirProximaObservacion(
  indices: PpoiIndices,
  evidenceCount: number,
): string {
  if (evidenceCount === 0) {
    return 'Aún no hay evidencia registrada. La primera observación debería cargar al menos una fuente con fecha verificable.';
  }

  const explicadas = explicarIndices(indices);
  if (!explicadas.length) {
    return 'Todavía no se han calculado índices — ejecuta una recalibración con la evidencia actual.';
  }

  const masBajo = explicadas.reduce((min, item) =>
    item.valor < min.valor ? item : min
  );

  const sugerenciaPorIndice: Record<string, string> = {
    PT: 'Buscar evidencia más reciente o confirmar que el fenómeno sigue vivo con una observación nueva.',
    PM: 'Buscar evidencia en un dominio distinto al que ya tienes (ej. si toda tu evidencia es de audio, busca en texto o en redes).',
    IE: 'Buscar una fuente independiente de las que ya tienes, para no depender de un solo emisor.',
    RC: 'Esperar y confirmar si el fenómeno regresa después de esta pausa — no se puede forzar.',
    CG: 'Buscar si esta evidencia generó algo nuevo (una obra, un post, un commit) y no solo una mención.',
    ES: 'Revisar si el discurso alrededor del fenómeno se está volviendo más consistente o sigue disperso.',
    LT: 'Sin acción requerida — este índice depende del ritmo natural del fenómeno.',
    IO: 'Buscar si el fenómeno ya está generando vocabulario técnico o institucional propio.',
  };

  return `Índice más débil: ${masBajo.nombre} (${masBajo.valor}/${masBajo.maximo}). ${
    sugerenciaPorIndice[masBajo.clave] ?? 'Cargar evidencia adicional para fortalecer este índice.'
  }`;
}

export type TimelineEntry = {
  fecha: string;
  titulo: string;
  detalle: string;
};

export function construirTimeline(
  evidence: PhenomenonState['evidence'],
): TimelineEntry[] {
  return [...evidence]
    .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())
    .map((item) => ({
      fecha: item.observed_at,
      titulo: `${item.evidence_type} · ${item.domain}`,
      detalle: item.content_text
        ? String(item.content_text).slice(0, 160)
        : `Fuente: ${item.source}`,
    }));
}
