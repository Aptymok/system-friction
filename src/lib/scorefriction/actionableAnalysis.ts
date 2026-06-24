import type { AnalysisMode, ScoreFrictionScope } from './contracts/operationalCycle';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function n(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function s(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function round(value: number) {
  return Number(value.toFixed(4));
}

export type ObjectInputSummary = {
  kind: 'text' | 'file' | 'json' | 'unknown';
  text: string;
  length: number;
  tokens: number;
  keywords: string[];
};

export function summarizeEvaluatedObject(input: unknown): ObjectInputSummary {
  const raw = typeof input === 'string'
    ? input
    : input && typeof input === 'object'
      ? JSON.stringify(input)
      : '';
  const text = raw.trim();
  const words = Array.from(new Set((text.toLowerCase().match(/[a-záéíóúüñ0-9_]{3,}/gi) ?? []).slice(0, 60)));
  const kind = text.startsWith('{') || text.startsWith('[') ? 'json' : text.length ? 'text' : 'unknown';
  return {
    kind,
    text,
    length: text.length,
    tokens: words.length,
    keywords: words.slice(0, 12),
  };
}

export function deriveMihmValues(input: { object: ObjectInputSummary; vector: Row | null; snapshot: Row | null }) {
  const vector = record(input.vector);
  const objectDensity = clamp01(input.object.tokens / 80);
  const semanticMass = clamp01(input.object.length / 2200);
  const vectorTrust = n(vector.trust, 0);
  const vectorPersistence = n(vector.persistence, 0);
  const vectorDegradation = n(vector.degradation, 1);
  const homeostasis = clamp01((vectorTrust + vectorPersistence + (1 - vectorDegradation)) / 3);
  const friction = clamp01(Math.abs(semanticMass - vectorPersistence) * 0.5 + vectorDegradation * 0.5);
  const coherence = clamp01((objectDensity * 0.35) + (vectorTrust * 0.65));
  const degradation = clamp01(vectorDegradation * 0.7 + (1 - coherence) * 0.3);
  const regime = degradation > 0.68 ? 'critical' : degradation > 0.48 ? 'tension' : degradation > 0.28 ? 'watch' : 'stable';

  return {
    homeostasis: round(homeostasis),
    friction: round(friction),
    coherence: round(coherence),
    degradation: round(degradation),
    regime,
    meaning: `MIHM lee estabilidad interna. Coherencia ${round(coherence)} significa que el objeto ${coherence >= 0.55 ? 'sí conversa' : 'todavía no conversa'} con el vector filtrado. Fricción ${round(friction)} indica ${friction >= 0.55 ? 'choque operativo relevante' : 'fricción manejable'}.`,
  };
}

export function derivePsiValues(input: { object: ObjectInputSummary; vector: Row | null; weakSignals: Row[]; persistentSignals: Row[] }) {
  const vector = record(input.vector);
  const recurrence = clamp01(n(vector.persistence, 0));
  const symbolicIdentity = clamp01((input.object.keywords.length / 12) * 0.35 + n(vector.trust, 0) * 0.65);
  const persistence = clamp01(n(vector.persistence, 0));
  const signalLife = persistence >= 0.65 ? 'long' : persistence >= 0.45 ? 'medium' : 'short';
  const weakSignalCount = input.weakSignals.length;
  return {
    recurrence: round(recurrence),
    symbolic_identity: round(symbolicIdentity),
    persistence: round(persistence),
    signal_life: signalLife,
    weak_signal_count: weakSignalCount,
    meaning: `PSI lee reaparición simbólica. La señal tiene vida ${signalLife}; no se confirma por intensidad, se confirma por retorno comparable en el tiempo.`,
  };
}

export function deriveScoreFrictionValues(input: { object: ObjectInputSummary; vector: Row | null; mihm: Row; psi: Row }) {
  const vector = record(input.vector);
  const directionBias = clamp01(n(vector.value, 0));
  const attraction = clamp01((n(input.mihm.coherence, 0) + n(input.psi.symbolic_identity, 0)) / 2);
  const friction = clamp01(n(input.mihm.friction, 0) * 0.65 + (1 - attraction) * 0.35);
  const perturbationNeed = clamp01((friction + n(vector.degradation, 0)) / 2);
  const opportunity = clamp01(attraction * (1 - n(vector.degradation, 0)) + n(input.psi.persistence, 0) * 0.25);
  return {
    direction_bias: round(directionBias),
    attraction: round(attraction),
    friction: round(friction),
    perturbation_need: round(perturbationNeed),
    opportunity: round(clamp01(opportunity)),
    meaning: `ScoreFriction lee si conviene intervenir. Oportunidad ${round(opportunity)} y necesidad ${round(perturbationNeed)}: ${opportunity > perturbationNeed ? 'observar/publicar con baja intensidad' : 'no intervenir todavía; falta evidencia o mejor timing'}.`,
  };
}

export function deriveWorldReading(snapshot: Row | null, sourceMix: Row | null) {
  const snap = record(snapshot);
  const vectors = rows(snap.vectors);
  const top = [...vectors].sort((a, b) => n(b.persistence) - n(a.persistence)).slice(0, 3).map((v) => ({
    domain: s(v.domain, 'UNKNOWN'),
    persistence: round(n(v.persistence)),
    trust: round(n(v.trust)),
    degradation: round(n(v.degradation)),
  }));
  const regime = s(snap.regime, 'UNKNOWN');
  const wsi = round(n(snap.wsi));
  const nti = round(n(snap.nti));
  const coverage = round(n(snap.sourceCoverage ?? record(sourceMix).sourceCoverage));
  return {
    regime,
    wsi,
    nti,
    sourceCoverage: coverage,
    summary: `Hoy el campo mundial está en régimen ${regime}. La señal global es baja/moderada: WSI ${wsi}, NTI ${nti}, cobertura ${coverage}. Los vectores más persistentes son ${top.map((x) => `${x.domain} (${x.persistence})`).join(', ') || 'sin persistencia suficiente'}.`,
    top_vectors: top,
  };
}

export function deriveFilteredReading(vector: Row | null, sourceHealth: Row | null) {
  const v = record(vector);
  const h = record(sourceHealth);
  const domain = s(v.domain ?? h.vector, 'UNKNOWN');
  const trust = round(n(v.trust ?? h.trust));
  const persistence = round(n(v.persistence ?? h.persistence));
  const degradation = round(n(v.degradation ?? h.degradation, 1));
  const interpretation = s(h.interpretation, persistence >= 0.65 ? 'persistente confiable' : trust < 0.55 ? 'señal débil coherente' : 'observación activa');
  return {
    domain,
    trust,
    persistence,
    degradation,
    value: round(n(v.value ?? h.value)),
    interpretation,
    source_count: n(v.source_count ?? h.source_count),
    public_sources: n(h.public_sources),
    internal_sources: n(h.internal_sources),
    sources: rows(h.source_details).map((source) => ({
      id: s(source.id),
      provider: s(source.provider),
      kind: s(source.kind),
      label: s(source.label),
    })),
    summary: `${domain} se encuentra como ${interpretation}. Confianza ${trust}, persistencia ${persistence}, degradación ${degradation}.`,
  };
}

function surfaceForScope(scope: ScoreFrictionScope) {
  if (scope === 'music' || scope === 'culture') return 'ScoreFriction / SFI-LAB campaign panel';
  if (scope === 'writing') return 'Medium / LinkedIn / ensayo breve';
  if (scope === 'cinema') return 'pieza audiovisual corta / storyboard';
  if (scope === 'institution') return 'nota técnica / invitación institucional';
  if (scope === 'project') return 'release note / evidencia de producto';
  return 'observación registrada en bitácora';
}

export function buildRecommendedExperiments(input: {
  scope: ScoreFrictionScope;
  objective: string | null;
  vector: Row | null;
  snapshot: Row | null;
  sourceHealth: Row | null;
  object: ObjectInputSummary;
  mihm: Row;
  psi: Row;
  scorefriction: Row;
}) {
  const filtered = deriveFilteredReading(input.vector, input.sourceHealth);
  const world = deriveWorldReading(input.snapshot, null);
  const objective = input.objective || `observar vector ${filtered.domain}`;
  const opportunity = n(input.scorefriction.opportunity);
  const perturbation = n(input.scorefriction.perturbation_need);
  const shouldAct = opportunity >= 0.42 && perturbation <= 0.62;
  const window = filtered.persistence >= 0.65 ? '48 horas' : filtered.persistence >= 0.45 ? '72 horas' : '5 snapshots';
  const surface = surfaceForScope(input.scope);
  const action = shouldAct
    ? `Publicar una observación verificable en ${surface}: título operativo, 1 evidencia del objeto, 1 comparación contra ${filtered.domain}, 1 pregunta de seguimiento.`
    : `No publicar todavía. Registrar el objeto como evidencia y esperar variación mayor a 0.10 en ${filtered.domain} o un segundo retorno comparable.`;

  return [{
    id: `EXP-${Date.now().toString(36)}`,
    vector: filtered.domain,
    status: shouldAct ? 'ready_to_run' : 'watch_only',
    hypothesis: `Si el objeto mantiene coherencia MIHM ${n(input.mihm.coherence)} y persistencia PSI ${n(input.psi.persistence)} contra ${filtered.domain}, puede abrir oportunidad de señal emergente sin forzar viralidad.`,
    recommended_surface: surface,
    action,
    expected_effect: shouldAct
      ? `Aumentar evidencia comparable en ${filtered.domain} sin subir degradación por encima de ${round(filtered.degradation + 0.08)}.`
      : `Evitar ruido operativo hasta que el campo muestre aceleración o retorno comparable.`,
    verification_window: window,
    success_condition: `Éxito = aparece al menos 1 evidencia nueva comparable o el vector ${filtered.domain} sube persistencia >= ${round(filtered.persistence + 0.05)} sin aumentar degradación > 0.08.`,
    failure_condition: `Fallo = no aparece evidencia comparable, aumenta degradación > 0.08, o el objeto no conserva coherencia con ${filtered.domain}.`,
    evidence_required: ['objeto analizado', 'timestamp', 'fuente/contexto', 'métrica antes', 'métrica después', 'outcome'],
    confidence: round((n(input.mihm.coherence) + n(input.psi.persistence) + n(input.scorefriction.opportunity)) / 3),
    plain_language: shouldAct
      ? `Haz una prueba pequeña y medible. No es campaña completa. Publica una observación, mide si aparece respuesta comparable y decide después.`
      : `No hagas campaña todavía. Guarda evidencia y observa el siguiente cambio real del vector.`,
    world_context: world.summary,
  }];
}

export function buildOperationalInterpretation(input: {
  analysisModes: AnalysisMode[];
  scope: ScoreFrictionScope;
  objective: string | null;
  evaluatedObject: unknown;
  snapshot: Row | null;
  filteredVector: Row | null;
  sourceHealth: Row | null;
  weakSignals: Row[];
  persistentSignals: Row[];
  sourceMix: Row | null;
}) {
  const object = summarizeEvaluatedObject(input.evaluatedObject);
  const mihm = deriveMihmValues({ object, vector: input.filteredVector, snapshot: input.snapshot });
  const psi = derivePsiValues({ object, vector: input.filteredVector, weakSignals: input.weakSignals, persistentSignals: input.persistentSignals });
  const scorefriction = deriveScoreFrictionValues({ object, vector: input.filteredVector, mihm, psi });
  const world = deriveWorldReading(input.snapshot, input.sourceMix);
  const filtered = deriveFilteredReading(input.filteredVector, input.sourceHealth);
  const experiments = buildRecommendedExperiments({
    scope: input.scope,
    objective: input.objective,
    vector: input.filteredVector,
    snapshot: input.snapshot,
    sourceHealth: input.sourceHealth,
    object,
    mihm,
    psi,
    scorefriction,
  });

  return {
    object,
    world,
    filtered_vector: filtered,
    mihm_values: mihm,
    psi_values: psi,
    scorefriction_values: scorefriction,
    object_world_fit: {
      compared_against: `${filtered.domain} + world regime ${world.regime}`,
      verdict: scorefriction.opportunity >= 0.6 ? 'alto potencial de oportunidad' : scorefriction.opportunity >= 0.42 ? 'potencial moderado; probar bajo control' : 'bajo potencial; observar sin campaña',
      explanation: `El objeto se compara contra el mundo actual y el vector filtrado. No se dicta si es "bueno"; se estima si tiene coherencia, fricción y oportunidad de producir señal observable.`,
    },
    recommended_experiments: experiments,
    report_sections: [
      'Lectura actual del mundo',
      'Lectura del vector filtrado',
      'Valores MIHM',
      'Valores PSI',
      'Valores ScoreFriction',
      'Objeto vs mundo/vector',
      'Experimento recomendado',
      'Condiciones de verificación',
    ],
  };
}

export function answerOperationalQuestion(question: string, analysis: Row | null) {
  const text = question.toLowerCase();
  const a = record(analysis);
  const exp = record(rows(a.recommended_experiments)[0]);
  const mihm = record(a.mihm_values);
  const psi = record(a.psi_values);
  const sf = record(a.scorefriction_values);
  const world = record(a.world);
  const filtered = record(a.filtered_vector);

  if (!question.trim()) return 'Escribe una pregunta operacional: ¿qué hago?, ¿qué significa MIHM?, ¿qué vector pesa más?, ¿conviene publicar?, ¿qué verifico?';
  if (/que hago|qué hago|siguiente|accion|acción|ok/.test(text)) return s(exp.plain_language) + ' Acción: ' + s(exp.action);
  if (/mihm/.test(text)) return s(mihm.meaning) + ` Valores: homeostasis ${mihm.homeostasis}, fricción ${mihm.friction}, coherencia ${mihm.coherence}, degradación ${mihm.degradation}.`;
  if (/psi/.test(text)) return s(psi.meaning) + ` Recurrencia ${psi.recurrence}, identidad ${psi.symbolic_identity}, persistencia ${psi.persistence}.`;
  if (/scorefriction|friccion|fricción/.test(text)) return s(sf.meaning) + ` Oportunidad ${sf.opportunity}, atracción ${sf.attraction}, necesidad de perturbación ${sf.perturbation_need}.`;
  if (/mundo|world/.test(text)) return s(world.summary);
  if (/vector|cultural|bio|tech|memetic/.test(text)) return s(filtered.summary);
  if (/exito|éxito|verifico|medir/.test(text)) return `Verifica así: ${s(exp.success_condition)} Fallo: ${s(exp.failure_condition)} Ventana: ${s(exp.verification_window)}.`;
  return `Lectura: ${s(a.object_world_fit && record(a.object_world_fit).verdict)}. Siguiente: ${s(exp.plain_language)}`;
}

export function buildFormalReportMarkdown(state: Row) {
  const analysis = record(state.operational_analysis);
  const world = record(analysis.world);
  const filtered = record(analysis.filtered_vector);
  const mihm = record(analysis.mihm_values);
  const psi = record(analysis.psi_values);
  const sf = record(analysis.scorefriction_values);
  const fit = record(analysis.object_world_fit);
  const experiment = record(rows(analysis.recommended_experiments)[0]);

  return `# Reporte Operativo ScoreFriction

case_id: ${s(state.case_id, 'sin caso')}
fecha: ${new Date().toISOString()}

## 1. Lectura actual del mundo

${s(world.summary)}

## 2. Vector filtrado

${s(filtered.summary)}

Fuentes:
${rows(filtered.sources).map((source) => `- ${s(source.provider)} (${s(source.kind)})`).join('\n') || '- sin fuente legible'}

## 3. Valores MIHM

- Homeostasis: ${mihm.homeostasis}
- Fricción: ${mihm.friction}
- Coherencia: ${mihm.coherence}
- Degradación: ${mihm.degradation}
- Régimen: ${mihm.regime}

${s(mihm.meaning)}

## 4. Valores PSI

- Recurrencia: ${psi.recurrence}
- Identidad simbólica: ${psi.symbolic_identity}
- Persistencia: ${psi.persistence}
- Vida de señal: ${psi.signal_life}

${s(psi.meaning)}

## 5. Valores ScoreFriction

- Atracción: ${sf.attraction}
- Fricción: ${sf.friction}
- Necesidad de perturbación: ${sf.perturbation_need}
- Oportunidad: ${sf.opportunity}

${s(sf.meaning)}

## 6. Objeto vs mundo + vector filtrado

Dictamen: ${s(fit.verdict)}

${s(fit.explanation)}

## 7. Experimento recomendado

Hipótesis:
${s(experiment.hypothesis)}

Acción:
${s(experiment.action)}

Superficie:
${s(experiment.recommended_surface)}

Efecto esperado:
${s(experiment.expected_effect)}

Ventana:
${s(experiment.verification_window)}

Condición de éxito:
${s(experiment.success_condition)}

Condición de fallo:
${s(experiment.failure_condition)}

## 8. Evidencia requerida

${rows(experiment.evidence_required).map((item) => `- ${String(item)}`).join('\n') || '- objeto, fuente, timestamp, antes/después, outcome'}

## 9. Cierre

Este reporte no promete impacto. Define una observación verificable contra el estado actual del mundo y del vector filtrado.
`;
}