export const ROOT_LAYERS = [
  'sfi_archive',
  'living_observatory',
  'attractor',
  'sandbox',
  'technical_audit',
] as const;

export type RootLayer = (typeof ROOT_LAYERS)[number];

export type RootLayerConfidence = 'high' | 'medium' | 'low';

export type RootDirectionalWeight = 'high' | 'medium' | 'low' | 'none' | number | null | undefined;

export type RootLayerInput = {
  layer?: unknown;
  layers?: unknown;
  type?: unknown;
  kind?: unknown;
  source?: unknown;
  status?: unknown;
  runtimeState?: unknown;
  state?: unknown;
  tags?: unknown;
  title?: unknown;
  label?: unknown;
  id?: unknown;
  nodeKey?: unknown;
  documentId?: unknown;
  eventName?: unknown;
  event_name?: unknown;
  proposalType?: unknown;
  proposal_type?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
  updatedAt?: unknown;
  updated_at?: unknown;
  observedAt?: unknown;
  observed_at?: unknown;
  occurredAt?: unknown;
  occurred_at?: unknown;
  timestamp?: unknown;
  directionalWeight?: RootDirectionalWeight;
  directional_weight?: RootDirectionalWeight;
  evidenceWeight?: unknown;
  confidence?: unknown;
  verified?: unknown;
  simulated?: unknown;
  test?: unknown;
};

export type RootLayerClassification = {
  layer: RootLayer;
  confidence: RootLayerConfidence;
  reason: string;
  matchedSignals: string[];
};

const EXPLICIT_LAYER_ALIASES: Record<string, RootLayer> = {
  archivo: 'sfi_archive',
  archive: 'sfi_archive',
  sfi_archive: 'sfi_archive',
  corpus: 'sfi_archive',
  vivo: 'living_observatory',
  live: 'living_observatory',
  living: 'living_observatory',
  living_observatory: 'living_observatory',
  'observatorio vivo': 'living_observatory',
  observatorio_vivo: 'living_observatory',
  attractor: 'attractor',
  atractor: 'attractor',
  sandbox: 'sandbox',
  prueba: 'sandbox',
  test: 'sandbox',
  simulation: 'sandbox',
  simulacion: 'sandbox',
  audit: 'technical_audit',
  auditoria: 'technical_audit',
  'auditoria tecnica': 'technical_audit',
  technical_audit: 'technical_audit',
  auditoria_tecnica: 'technical_audit',
};

const SANDBOX_TERMS = [
  'sandbox',
  'test',
  'prueba',
  'simulated',
  'simulation',
  'simulacion',
  'mock',
  'stub',
  'fixture',
  'experimental',
  'unverified',
  'sin origen',
];

const AUDIT_TERMS = [
  'audit',
  'auditoria',
  'log',
  'trace',
  'telemetry',
  'endpoint',
  'route',
  'table',
  'payload',
  'ledger',
  'usage',
  'root_audit',
  'root_audit_events',
  'api',
  'cron',
];

const ATTRACTOR_TERMS = [
  'attractor',
  'atractor',
  'direction',
  'direccion',
  'directional',
  'peso direccional',
  'external_validation',
  'accion de realidad',
  'reality_action',
];

const LIVE_TERMS = [
  'active',
  'activo',
  'observed',
  'recent',
  'reciente',
  'living',
  'vivo',
  'signal',
  'senal',
  'evidence',
  'evidencia',
  'mutation',
  'mutacion',
  'proposal',
  'propuesta',
  'queued',
  'pending',
  'accepted',
  'wsv',
  'worldspect',
  'mihm',
  'pattern',
  'patron',
  'event',
  'evento',
];

const ARCHIVE_TERMS = [
  'archive',
  'archivo',
  'catalog',
  'catalogo',
  'corpus',
  'document',
  'documento',
  'frontmatter',
  'static',
  'dataset',
  'historical',
  'historico',
  'foundation',
  'fundacional',
  'atlas',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalize(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
  return '';
}

function valuesFrom(input: RootLayerInput): string[] {
  const raw = [
    input.layer,
    input.layers,
    input.type,
    input.kind,
    input.source,
    input.status,
    input.runtimeState,
    input.state,
    input.tags,
    input.title,
    input.label,
    input.id,
    input.nodeKey,
    input.documentId,
    input.eventName,
    input.event_name,
    input.proposalType,
    input.proposal_type,
  ];

  return raw.flatMap((value) => {
    if (Array.isArray(value)) return value.map(normalize).filter(Boolean);
    if (isRecord(value)) return Object.values(value).map(normalize).filter(Boolean);
    const normalized = normalize(value);
    return normalized ? [normalized] : [];
  });
}

function hasAny(values: string[], terms: string[]) {
  return terms.some((term) => values.some((value) => value.includes(term)));
}

function matched(values: string[], terms: string[]) {
  return terms.filter((term) => values.some((value) => value.includes(term)));
}

function explicitLayer(input: RootLayerInput): RootLayer | null {
  const candidates = [
    ...valuesFrom({ layer: input.layer }),
    ...valuesFrom({ layers: input.layers }),
  ];

  for (const value of candidates) {
    const direct = EXPLICIT_LAYER_ALIASES[value];
    if (direct) return direct;
  }

  return null;
}

function hasDirectionalWeight(input: RootLayerInput) {
  const raw = input.directionalWeight ?? input.directional_weight;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0;
  const normalized = normalize(raw);
  return normalized === 'high' || normalized === 'medium' || normalized === 'low' || normalized === 'alto' || normalized === 'medio' || normalized === 'bajo';
}

function hasTimestamp(input: RootLayerInput) {
  return Boolean(
    input.createdAt
    || input.created_at
    || input.updatedAt
    || input.updated_at
    || input.observedAt
    || input.observed_at
    || input.occurredAt
    || input.occurred_at
    || input.timestamp
  );
}

function classify(layer: RootLayer, confidence: RootLayerConfidence, reason: string, matchedSignals: string[]): RootLayerClassification {
  return { layer, confidence, reason, matchedSignals };
}

export function classifyRootLayer(value: unknown): RootLayerClassification {
  const input = isRecord(value) ? value as RootLayerInput : {};
  const values = valuesFrom(input);
  const explicit = explicitLayer(input);

  if (explicit) {
    return classify(explicit, 'high', 'Explicit layer marker provided by the item.', [explicit]);
  }

  if (input.simulated === true || input.test === true || hasAny(values, SANDBOX_TERMS)) {
    return classify('sandbox', 'high', 'Test, simulation, sandbox or unverifiable-origin signal must not affect real regime.', matched(values, SANDBOX_TERMS));
  }

  if (hasAny(values, AUDIT_TERMS)) {
    return classify('technical_audit', 'high', 'Technical trace, table, endpoint, telemetry or audit signal belongs in internal lineage.', matched(values, AUDIT_TERMS));
  }

  if (hasDirectionalWeight(input) || hasAny(values, ATTRACTOR_TERMS)) {
    return classify('attractor', 'high', 'Directional weight or attractor marker means the item can affect system direction.', matched(values, ATTRACTOR_TERMS));
  }

  if (hasAny(values, ARCHIVE_TERMS) && !hasAny(values, LIVE_TERMS)) {
    return classify('sfi_archive', 'medium', 'Catalog, corpus, document, historical or static material belongs to Archivo SFI.', matched(values, ARCHIVE_TERMS));
  }

  if (hasAny(values, LIVE_TERMS) || hasTimestamp(input)) {
    return classify('living_observatory', hasTimestamp(input) ? 'medium' : 'low', 'Active, recent, observed or operational signal belongs to what is operating now.', matched(values, LIVE_TERMS));
  }

  return classify('sfi_archive', 'low', 'Unknown material defaults to Archivo SFI so it cannot silently become live evidence.', []);
}

export function isRootLayer(value: unknown): value is RootLayer {
  return typeof value === 'string' && (ROOT_LAYERS as readonly string[]).includes(value);
}

export function rootLayerMatches(value: unknown, layer: RootLayer) {
  return classifyRootLayer(value).layer === layer;
}

export function separatesRealityLayers(items: unknown[]) {
  return items.reduce<Record<RootLayer, unknown[]>>((groups, item) => {
    groups[classifyRootLayer(item).layer].push(item);
    return groups;
  }, {
    sfi_archive: [],
    living_observatory: [],
    attractor: [],
    sandbox: [],
    technical_audit: [],
  });
}
