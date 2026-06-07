import { classifyRootLayer, separatesRealityLayers, type RootLayer } from './rootLayers';
import { getRootLayerLabel } from './rootLayerLabels';
import { translateRootState, type RootStateTranslation } from './rootStateTranslator';

type UnknownRecord = Record<string, unknown>;

export type RootFieldSeverity = 'critical' | 'high' | 'medium' | 'low';

export type RootFieldAlert = {
  severity: RootFieldSeverity;
  title: string;
  detail: string;
  recommendedAction: string;
};

export type RootFieldAnswer = {
  question: string;
  answer: string;
  detail: string;
  state?: RootStateTranslation;
};

export type RootFieldState = {
  generatedAt: string;
  regime: RootStateTranslation;
  layerCounts: Record<RootLayer, number>;
  answers: RootFieldAnswer[];
  wsv: {
    label: string;
    state: RootStateTranslation;
    observedAt: string | null;
    detail: string;
    implication: string;
  };
  mihm: {
    label: string;
    state: RootStateTranslation;
    observedObject: string | null;
    detail: string;
    implication: string;
  };
  alerts: RootFieldAlert[];
  openMutations: string[];
  possibleEjectors: string[];
  sessionDelta: string;
  mainTwinProposal: string;
  rce: string;
  realityDebt: string;
  closedCircuitRisk: string;
  compliance: string[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoOrNull(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function titleOf(value: unknown, fallback: string) {
  const record = asRecord(value);
  const payload = asRecord(record.payload);
  const proposal = asRecord(payload.proposal);
  return stringValue(
    record.title,
    record.label,
    record.summary,
    proposal.title,
    proposal.objective,
    proposal.requested_output,
    record.id,
  ) ?? fallback;
}

function statusOf(value: unknown) {
  const record = asRecord(value);
  return stringValue(record.status, record.state, record.runtimeState, record.sourceState, record.source_state);
}

function observedAtOf(value: unknown) {
  const record = asRecord(value);
  return isoOrNull(
    record.observedAt
    ?? record.observed_at
    ?? record.occurredAt
    ?? record.occurred_at
    ?? record.updatedAt
    ?? record.updated_at
    ?? record.createdAt
    ?? record.created_at
    ?? record.ts
    ?? record.timestamp,
  );
}

function currentData(input: unknown) {
  const root = asRecord(input);
  const data = asRecord(root.data);
  return Object.keys(data).length ? data : root;
}

function collectItems(data: UnknownRecord) {
  const seed = asRecord(data.seed);
  return [
    ...arrayValue(seed.nodeCatalog),
    ...arrayValue(seed.documentCatalog),
    ...arrayValue(seed.patternCatalog),
    ...arrayValue(seed.executionCatalog),
    ...arrayValue(seed.recentEvents),
    ...arrayValue(seed.recentKernelCycles),
    ...arrayValue(data.proposals),
    ...arrayValue(data.nodeCatalog),
    ...arrayValue(data.documentCatalog),
    ...arrayValue(data.patternCatalog),
    ...arrayValue(data.executionCatalog),
  ];
}

function priorityRank(severity: RootFieldSeverity) {
  if (severity === 'critical') return 0;
  if (severity === 'high') return 1;
  if (severity === 'medium') return 2;
  return 3;
}

function limitAlerts(alerts: RootFieldAlert[]) {
  const sorted = alerts.sort((a, b) => priorityRank(a.severity) - priorityRank(b.severity));
  const limits: Record<RootFieldSeverity, number> = { critical: 1, high: 2, medium: 3, low: 2 };
  const used: Record<RootFieldSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  return sorted.filter((alert) => {
    if (used[alert.severity] >= limits[alert.severity]) return false;
    used[alert.severity] += 1;
    return true;
  });
}

function buildWsv(data: UnknownRecord) {
  const seed = asRecord(data.seed);
  const worldspect = asRecord(data.worldspect ?? seed.latestWorldSpect);
  const sourceState = stringValue(worldspect.sourceState, worldspect.source_state) ?? 'missing';
  const state = translateRootState(sourceState);
  const observedAt = observedAtOf(worldspect);
  const degraded = arrayValue(worldspect.degraded_sources).filter((item): item is string => typeof item === 'string');
  const sources = arrayValue(worldspect.sources);

  if (!Object.keys(worldspect).length) {
    return {
      label: 'Lectura del mundo observado',
      state,
      observedAt: null,
      detail: 'No hay lectura WSV disponible en el estado visible.',
      implication: 'No usar WSV como evidencia hasta que exista lectura real.',
    };
  }

  if (sourceState === 'missing') {
    return {
      label: 'Lectura del mundo observado',
      state,
      observedAt,
      detail: observedAt ? `No hay lectura WSV utilizable. Ultima marca visible: ${observedAt}.` : 'No hay lectura WSV utilizable.',
      implication: 'Declarar ausencia y no sostener regimen con WSV.',
    };
  }

  const sourceText = sources.length ? `${sources.length} fuente(s) visibles` : 'sin fuentes visibles';
  const degradedText = degraded.length ? ` Fuente degradada: ${degraded.join(', ')}.` : '';
  return {
    label: 'Lectura del mundo observado',
    state,
    observedAt,
    detail: `${sourceText}.${degradedText || ' Sin fuente degradada declarada.'}`,
    implication: degraded.length ? 'Usar con cautela; fuente degradada no sostiene evidencia fuerte.' : 'Puede orientar lectura externa si la fecha es vigente.',
  };
}

function buildMihm(data: UnknownRecord) {
  const seed = asRecord(data.seed);
  const mihm = asRecord(data.mihmRuntimeMatrix ?? seed.mihmRuntimeMatrix);
  const state = translateRootState(stringValue(mihm.sourceState, mihm.source_state, mihm.regime) ?? 'missing');
  const observedObject = stringValue(mihm.object, mihm.observedObject, mihm.observed_object, mihm.target, mihm.targetObject);
  const observedAt = observedAtOf(mihm);

  if (!Object.keys(mihm).length) {
    return {
      label: 'Lectura homeostatica',
      state,
      observedObject: null,
      detail: 'No hay lectura MIHM disponible.',
      implication: 'MIHM no puede orientar decision sin lectura visible.',
    };
  }

  if (!observedObject) {
    return {
      label: 'Lectura homeostatica',
      state,
      observedObject: null,
      detail: observedAt ? `MIHM tiene lectura con fecha ${observedAt}, pero no declara objeto observado.` : 'MIHM no puede interpretarse porque no declara objeto observado.',
      implication: 'No mostrar como decision fuerte hasta declarar objeto observado.',
    };
  }

  return {
    label: 'Lectura homeostatica',
    state,
    observedObject,
    detail: `MIHM observado sobre: ${observedObject}. Regimen visible: ${stringValue(mihm.regime) ?? 'sin regimen declarado'}.`,
    implication: 'Puede orientar lectura homeostatica con objeto, fuente y fecha visibles.',
  };
}

function openItems(items: unknown[]) {
  return items.filter((item) => {
    const status = statusOf(item);
    if (!status) return false;
    const translated = translateRootState(status).normalizedState;
    return translated === 'queued' || translated === 'pending' || translated === 'proposed' || translated === 'accepted' || translated === 'design_approved';
  });
}

function buildAlerts(input: {
  warnings: string[];
  open: unknown[];
  degradedItems: unknown[];
  wsv: RootFieldState['wsv'];
  mihm: RootFieldState['mihm'];
}) {
  const alerts: RootFieldAlert[] = [];

  if (input.warnings.length > 0) {
    alerts.push({
      severity: input.warnings.some((warning) => /failed|error|critical/i.test(warning)) ? 'critical' : 'high',
      title: 'Advertencia de fuente',
      detail: input.warnings.slice(0, 3).join(' / '),
      recommendedAction: 'revisar fuente antes de usar esta lectura como soporte fuerte.',
    });
  }

  if (input.wsv.state.normalizedState === 'missing' || input.wsv.state.normalizedState === 'degraded') {
    alerts.push({
      severity: 'high',
      title: 'WSV sin soporte fuerte',
      detail: input.wsv.detail,
      recommendedAction: 'declarar ausencia o degradacion y no sostener regimen con WSV.',
    });
  }

  if (!input.mihm.observedObject) {
    alerts.push({
      severity: 'medium',
      title: 'MIHM sin objeto observado',
      detail: input.mihm.detail,
      recommendedAction: 'declarar objeto observado antes de interpretar MIHM.',
    });
  }

  if (input.open.length > 0) {
    alerts.push({
      severity: 'medium',
      title: 'Cierres pendientes',
      detail: `${input.open.length} elemento(s) abiertos requieren cierre, ejecucion, reobservacion o archivo.`,
      recommendedAction: 'priorizar cierre sin tratar aceptacion como ejecucion.',
    });
  }

  if (input.degradedItems.length > 0) {
    alerts.push({
      severity: 'medium',
      title: 'Lecturas degradadas',
      detail: `${input.degradedItems.length} elemento(s) muestran perdida de confiabilidad.`,
      recommendedAction: 'reobservar causa y evitar decisiones fuertes con esa lectura.',
    });
  }

  return limitAlerts(alerts);
}

export function buildRootFieldState(input: unknown): RootFieldState {
  const data = currentData(input);
  const seed = asRecord(data.seed);
  const allItems = collectItems(data);
  const grouped = separatesRealityLayers(allItems);
  const layerCounts = Object.fromEntries(
    Object.entries(grouped).map(([layer, items]) => [layer, items.length]),
  ) as Record<RootLayer, number>;
  const wsv = buildWsv(data);
  const mihm = buildMihm(data);
  const regime = translateRootState(
    stringValue(
      asRecord(data.mihmRuntimeMatrix).regime,
      asRecord(seed.mihmRuntimeMatrix).regime,
      asRecord(data.kernel).status,
      data.latest_kernel_status,
    ) ?? 'missing',
  );
  const warnings = arrayValue(data.warnings).filter((item): item is string => typeof item === 'string');
  const open = openItems([
    ...arrayValue(data.proposals),
    ...arrayValue(seed.executionCatalog),
    ...arrayValue(seed.recentEvents),
  ]);
  const degradedItems = allItems.filter((item) => translateRootState(statusOf(item) ?? '').normalizedState === 'degraded');
  const livingItems = grouped.living_observatory;
  const sandboxItems = grouped.sandbox;
  const mainProposal = arrayValue(data.proposals).find((proposal) => {
    const state = translateRootState(statusOf(proposal) ?? 'missing').normalizedState;
    return state === 'proposed' || state === 'accepted' || state === 'queued' || state === 'pending' || state === 'design_approved';
  });
  const latestEvent = arrayValue(seed.recentEvents)[0];
  const possibleEjectors = [
    ...open.slice(0, 3).map((item) => `Pendiente sin cierre: ${titleOf(item, 'registro abierto')}`),
    ...sandboxItems.slice(0, 2).map((item) => `Prueba contenida: ${titleOf(item, 'elemento sandbox')}`),
  ];
  const alerts = buildAlerts({ warnings, open, degradedItems, wsv, mihm });

  return {
    generatedAt: new Date().toISOString(),
    regime,
    layerCounts,
    answers: [
      {
        question: 'Como esta mi sistema hoy?',
        answer: regime.label,
        detail: regime.explanation,
        state: regime,
      },
      {
        question: 'Que esta vivo?',
        answer: livingItems.length ? `${livingItems.length} elemento(s) en Observatorio Vivo.` : 'Sin elementos vivos suficientes en la lectura visible.',
        detail: getRootLayerLabel('living_observatory').implication,
      },
      {
        question: 'Que esta degradado?',
        answer: degradedItems.length ? `${degradedItems.length} elemento(s) con perdida de confiabilidad.` : 'No hay degradacion declarada en los estados visibles.',
        detail: degradedItems.length ? degradedItems.slice(0, 3).map((item) => titleOf(item, 'elemento degradado')).join(' / ') : 'Mantener observacion; nada es valido permanentemente.',
      },
      {
        question: 'Que esta contaminando?',
        answer: possibleEjectors.length ? possibleEjectors[0] : 'Sin eyector suficiente para declarar contaminacion.',
        detail: possibleEjectors.length ? possibleEjectors.join(' / ') : 'No se inventan eyectores sin senal visible.',
      },
      {
        question: 'Que debo observar?',
        answer: alerts[0]?.title ?? 'Observar continuidad del campo.',
        detail: alerts[0]?.detail ?? 'No hay alerta prioritaria con evidencia suficiente.',
      },
      {
        question: 'Que debo cerrar?',
        answer: open.length ? `${open.length} pendiente(s) sin cierre.` : 'Sin cierres abiertos detectados.',
        detail: open.length ? open.slice(0, 3).map((item) => titleOf(item, 'pendiente')).join(' / ') : 'No convertir ausencia de pendientes en metricas inventadas.',
      },
      {
        question: 'Que propone el Twin / AMV?',
        answer: mainProposal ? titleOf(mainProposal, 'propuesta visible') : 'Sin propuesta principal visible.',
        detail: mainProposal ? translateRootState(statusOf(mainProposal) ?? 'missing').implication : 'No se inventa propuesta si el Twin no expone una.',
      },
      {
        question: 'Que cambio desde la ultima vez?',
        answer: latestEvent ? titleOf(latestEvent, 'evento reciente') : 'Sin delta de sesion visible.',
        detail: latestEvent ? `Ultima marca visible: ${observedAtOf(latestEvent) ?? 'sin timestamp visible'}.` : 'El estado visible no expone comparacion de sesiones suficiente.',
      },
    ],
    wsv,
    mihm,
    alerts,
    openMutations: open.slice(0, 5).map((item) => titleOf(item, 'pendiente')),
    possibleEjectors,
    sessionDelta: latestEvent ? titleOf(latestEvent, 'evento reciente') : 'sin delta de sesion visible',
    mainTwinProposal: mainProposal ? titleOf(mainProposal, 'propuesta visible') : 'sin propuesta principal visible',
    rce: 'RCE: sin lectura suficiente. No hay acciones verificadas en el periodo observado.',
    realityDebt: 'Deuda de Realidad: sin lectura suficiente. No hay modelo visible de deuda consolidada en esta fase.',
    closedCircuitRisk: 'Riesgo de circuito cerrado: sin lectura suficiente. Requiere fuerza de atractor, proporcion de evidencia externa y duracion.',
    compliance: [
      'No se trata propuesta aceptada como accion ejecutada.',
      'No se trata prueba como evidencia real.',
      'No se fortalece atractor sin Accion de Realidad verificable.',
      'RCE, deuda y circuito cerrado quedan en fallback explicito si faltan datos suficientes.',
    ],
  };
}

export function summarizeRootLayerCounts(state: RootFieldState) {
  return Object.entries(state.layerCounts).map(([layer, count]) => ({
    layer,
    count,
    label: getRootLayerLabel(layer as RootLayer).label,
  }));
}

export function classifyFieldItem(value: unknown) {
  const classification = classifyRootLayer(value);
  const label = getRootLayerLabel(classification.layer);
  return { ...classification, label };
}
