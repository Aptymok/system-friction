export type SfiOfferId =
  | 'SFI-DR01'
  | 'MOP-H-PILOT'
  | 'SFI-AI01'
  | 'SFI-GOV01'
  | 'SFI-NA01'
  | 'SFI-CX01';

export type SfiOfferStatus = 'canonical_public' | 'internal_provisional';

export type SfiOffer = {
  id: SfiOfferId;
  name: string;
  status: SfiOfferStatus;
  problemClasses: string[];
  observableSignals: string[];
  method: string[];
  deliverables: string[];
  exclusions: string[];
  uniqueCombination: string;
  defaultDurationDays: number;
  minimumEvidenceSources: number;
};

export const SFI_SERVICE_CATALOG: readonly SfiOffer[] = [
  {
    id: 'SFI-DR01',
    name: 'Diagnóstico de Fricción Sistémica',
    status: 'canonical_public',
    problemClasses: [
      'bloqueos persistentes sin causa compartida',
      'información fragmentada entre áreas',
      'decisiones repetidas sin memoria de resultados',
      'señales visibles sin ruta verificable de intervención',
      'crecimiento o transformación con pérdida de coherencia operativa',
    ],
    observableSignals: [
      'reclamos recurrentes',
      'retrabajo',
      'desalineación entre operación y experiencia',
      'cambios de política sin cierre longitudinal',
      'múltiples fuentes que describen el mismo patrón con vocabularios distintos',
    ],
    method: [
      'mapa de fricción',
      'normalización y clasificación epistemológica de evidencia',
      'Neural Graph y relaciones entre observaciones',
      'AMV memory scan',
      'hipótesis y predicción provisional',
      'perturbación mínima gobernada',
      'ventana de retorno y calibración',
    ],
    deliverables: [
      'mapa de fricción sistémica',
      'ledger de evidencia y contraevidencia',
      'cadena causal provisional',
      'matriz de riesgos y oportunidades',
      'intervención mínima reversible',
      'ventana de observación y criterios de cierre',
      'reporte ejecutivo y sesión de lectura',
    ],
    exclusions: [
      'auditoría financiera o legal',
      'diagnóstico médico o psicológico',
      'promesa de crecimiento o rentabilidad',
      'implementación tecnológica completa',
      'predicción de colapso como certeza',
    ],
    uniqueCombination: 'SFI combina evidencia trazable, observación longitudinal, lectura de campo, intervención mínima y calibración prediction→outcome dentro de un mismo contrato gobernado. Esto es una combinación específica de SFI; no demuestra exclusividad absoluta frente a todo el mercado.',
    defaultDurationDays: 28,
    minimumEvidenceSources: 3,
  },
  {
    id: 'MOP-H-PILOT',
    name: 'Piloto MOP-H de perturbación mínima',
    status: 'canonical_public',
    problemClasses: [
      'sistema atorado con una acción reversible disponible',
      'incertidumbre que puede reducirse con una prueba delimitada',
      'necesidad de observar retorno antes de escalar una decisión',
    ],
    observableSignals: [
      'intentos múltiples sin criterio de comparación',
      'debate prolongado sin prueba mínima',
      'riesgo de sobrerreacción organizacional',
    ],
    method: [
      'declaración del sistema atorado',
      'hipótesis gobernada',
      'acción reversible de bajo costo',
      'ventana de retorno normalmente de 72 horas',
      'comparación entre predicción, fidelidad y resultado',
    ],
    deliverables: [
      'protocolo de intervención',
      'criterios de éxito y fallo',
      'registro antes/después',
      'lectura de retorno',
    ],
    exclusions: [
      'intervenciones irreversibles',
      'automatización sin aprobación',
      'cambio organizacional masivo',
    ],
    uniqueCombination: 'MOP-H convierte incertidumbre en una observación controlada, reversible y trazable, vinculada al sistema de evidencia y aprendizaje de SFI.',
    defaultDurationDays: 7,
    minimumEvidenceSources: 2,
  },
  {
    id: 'SFI-AI01',
    name: 'Lectura de fricción en sistemas de IA',
    status: 'internal_provisional',
    problemClasses: ['agentes sin trazabilidad', 'automatización con autoridad ambigua', 'modelos sin ciclo de calibración'],
    observableSignals: ['salidas no auditables', 'decisiones automáticas sin evidencia', 'errores recurrentes sin aprendizaje gobernado'],
    method: ['mapa de autoridad', 'evidencia de ejecución', 'riesgo', 'calibración'],
    deliverables: ['matriz de autoridad', 'inventario de decisiones', 'plan de observabilidad'],
    exclusions: ['certificación de seguridad', 'pentest', 'garantía de exactitud del modelo'],
    uniqueCombination: 'Aplicación interna provisional de los contratos SFI a agentes y modelos; requiere aprobación del fundador antes de ofrecerse externamente.',
    defaultDurationDays: 21,
    minimumEvidenceSources: 3,
  },
  {
    id: 'SFI-GOV01',
    name: 'Lectura de gobernanza y coordinación institucional',
    status: 'internal_provisional',
    problemClasses: ['autoridad fragmentada', 'decisiones sin trazabilidad', 'políticas sin retorno observado'],
    observableSignals: ['duplicidad de decisiones', 'escalamientos repetidos', 'reglas contradictorias'],
    method: ['mapa de autoridad', 'ledger de decisiones', 'riesgo y perturbación mínima'],
    deliverables: ['mapa de gobernanza', 'matriz de colisiones', 'protocolo de cierre'],
    exclusions: ['asesoría jurídica', 'lobby', 'representación regulatoria'],
    uniqueCombination: 'Aplicación interna provisional del modelo de gobernanza SFI; requiere aprobación antes de comercializarse.',
    defaultDurationDays: 28,
    minimumEvidenceSources: 3,
  },
  {
    id: 'SFI-NA01',
    name: 'Lectura de narrativa y señal cultural',
    status: 'internal_provisional',
    problemClasses: ['narrativa fragmentada', 'pérdida de coherencia entre objeto, campo y respuesta'],
    observableSignals: ['mensajes contradictorios', 'propagación sin continuidad', 'desalineación cultural'],
    method: ['ScoreFriction', 'campo cultural', 'trayectoria y evidencia'],
    deliverables: ['mapa narrativo', 'lectura de campo', 'prueba de señal'],
    exclusions: ['garantía de viralidad', 'valoración moral o artística'],
    uniqueCombination: 'Aplicación provisional de Studio, ScoreFriction y Atlas a narrativa; no es todavía una oferta pública canónica.',
    defaultDurationDays: 21,
    minimumEvidenceSources: 3,
  },
  {
    id: 'SFI-CX01',
    name: 'Lectura sistémica de experiencia de cliente',
    status: 'internal_provisional',
    problemClasses: ['reclamos recurrentes', 'rupturas entre promesa y operación', 'soporte reactivo sin memoria longitudinal'],
    observableSignals: ['quejas repetidas', 'devoluciones', 'fallas de entrega', 'inconsistencia omnicanal'],
    method: ['evidencia de cliente', 'mapa operativo', 'trayectoria de fricción', 'MOP-H'],
    deliverables: ['mapa de ruptura CX', 'priorización de causas', 'piloto reversible'],
    exclusions: ['operación de call center', 'implementación CRM', 'investigación de mercado representativa'],
    uniqueCombination: 'Aplicación provisional del ciclo evidencia→campo→intervención→retorno a experiencia de cliente.',
    defaultDurationDays: 21,
    minimumEvidenceSources: 3,
  },
] as const;

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function getCanonicalOffers() {
  return SFI_SERVICE_CATALOG.filter((offer) => offer.status === 'canonical_public');
}

export function getOfferById(id: string | null | undefined) {
  return SFI_SERVICE_CATALOG.find((offer) => offer.id === id) ?? null;
}

export function matchSfiOffer(input: string, allowProvisional = false) {
  const source = normalize(input);
  const candidates = SFI_SERVICE_CATALOG.filter((offer) => allowProvisional || offer.status === 'canonical_public')
    .map((offer) => {
      const terms = [...offer.problemClasses, ...offer.observableSignals].map(normalize);
      const matches = terms.filter((term) => term.split(/\s+/).some((token) => token.length > 5 && source.includes(token)));
      return { offer, score: matches.length / Math.max(1, terms.length), matches };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0] ?? { offer: getCanonicalOffers()[0], score: 0, matches: [] };
}
