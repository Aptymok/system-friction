export type WorldSpectOperatorStatus =
  | 'observacion_confiable'
  | 'observacion_parcial'
  | 'observacion_interna'
  | 'observacion_detenida'
  | 'sin_lectura';

export type WorldSpectOperatorInput = {
  runtimeStatus?: string | null;
  sourceCoverage?: number | null;
  publicSourceCount?: number | null;
  internalSourceCount?: number | null;
  missingOrDegradedCount?: number | null;
  realInputCount?: number | null;
  degradation?: number | null;
  degradedSources?: string[];
  hasSnapshot?: boolean;
};

export type WorldSpectOperatorState = {
  status: WorldSpectOperatorStatus;
  label: string;
  summary: string;
  decisionUse: 'execute' | 'observe' | 'internal_only' | 'hold';
  action: string;
  evidence: {
    sourceCoverage: number;
    publicSourceCount: number;
    internalSourceCount: number;
    missingOrDegradedCount: number;
    realInputCount: number;
    degradedSources: string[];
    degradation: number;
  };
};

function finite(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round4(value: number) {
  return Number(Number.isFinite(value) ? value.toFixed(4) : 0);
}

export function buildWorldSpectOperatorState(input: WorldSpectOperatorInput): WorldSpectOperatorState {
  const sourceCoverage = round4(finite(input.sourceCoverage));
  const publicSourceCount = finite(input.publicSourceCount);
  const internalSourceCount = finite(input.internalSourceCount);
  const missingOrDegradedCount = finite(input.missingOrDegradedCount);
  const realInputCount = finite(input.realInputCount);
  const degradation = round4(finite(input.degradation));
  const degradedSources = Array.isArray(input.degradedSources) ? input.degradedSources.filter(Boolean) : [];
  const hasSnapshot = input.hasSnapshot !== false;

  const evidence = {
    sourceCoverage,
    publicSourceCount,
    internalSourceCount,
    missingOrDegradedCount,
    realInputCount,
    degradedSources,
    degradation,
  };

  if (!hasSnapshot || realInputCount <= 0) {
    return {
      status: 'sin_lectura',
      label: 'Sin lectura',
      summary: 'WorldSpect no tiene evidencia suficiente para orientar una decisión.',
      decisionUse: 'hold',
      action: 'No ejecutar decisiones apoyadas en WorldSpect hasta recuperar lectura mínima.',
      evidence,
    };
  }

  if (publicSourceCount <= 0 && internalSourceCount > 0) {
    return {
      status: 'observacion_interna',
      label: 'Observación interna',
      summary: 'WorldSpect conserva lectura interna de SFI, pero no tiene verificación externa suficiente.',
      decisionUse: 'internal_only',
      action: 'Usar sólo para observación interna; no tratar como validación externa.',
      evidence,
    };
  }

  if (sourceCoverage >= 0.75 && degradation >= 0.35 && missingOrDegradedCount > 0) {
    return {
      status: 'observacion_parcial',
      label: 'Observación parcial',
      summary: 'La lectura existe y tiene fuentes vivas, pero la degradación rebasa el umbral de confianza operativa.',
      decisionUse: 'observe',
      action: 'Observar y registrar; no ejecutar como certeza completa hasta recuperar fuentes degradadas.',
      evidence,
    };
  }

  if (sourceCoverage >= 0.75 && degradation < 0.35) {
    return {
      status: 'observacion_confiable',
      label: 'Observación confiable',
      summary: 'WorldSpect tiene lectura suficiente para orientar decisión operativa.',
      decisionUse: 'execute',
      action: 'Puede usarse como evidencia de contexto junto con ScoreFriction, ROOT y evidencia directa.',
      evidence,
    };
  }

  if (sourceCoverage >= 0.45) {
    return {
      status: 'observacion_parcial',
      label: 'Observación parcial',
      summary: 'WorldSpect tiene lectura utilizable, pero la cobertura o degradación limita su fuerza.',
      decisionUse: 'observe',
      action: 'Usar como orientación, no como prueba fuerte.',
      evidence,
    };
  }

  return {
    status: 'observacion_detenida',
    label: 'Observación detenida',
    summary: 'WorldSpect tiene demasiada pérdida de fuente para sostener lectura operativa.',
    decisionUse: 'hold',
    action: 'Recuperar fuentes o sostener la lectura como no concluyente.',
    evidence,
  };
}


