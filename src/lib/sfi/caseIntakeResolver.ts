export const SFI_CASE_INTAKE_RESOLVER_CONTRACT = 'SFI-CASE-INTAKE-RESOLVER-1.0' as const;

type Row = Record<string, unknown>;

export type SfiCaseClass = 'DESCRIPTIVE' | 'EMPIRICAL_CONTRAST' | 'LONGITUDINAL' | 'DECISION' | 'INTERVENTION';
export type SfiIntakeQuestion = {
  key: string;
  question: string;
  reason: string;
  blocking: boolean;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function arrayHasValues(value: unknown) {
  return Array.isArray(value) && value.some((item) => item !== null && item !== undefined && String(item).trim());
}

function signalKind(input: Row) {
  return (text(row(input.signal).kind) ?? 'unknown').toLowerCase();
}

function inferCaseClass(input: Row): SfiCaseClass {
  const blob = [input.question, input.objective, input.declaredFunction, input.systemType, JSON.stringify(input.context ?? {})]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/interven|cambiar|change|implementar|deploy|execute|ejecut|estrateg|perturb|acción|accion/.test(blob)) return 'INTERVENTION';
  if (/decidir|decision|elegir|prioriz|recommend|recomendar|seleccionar/.test(blob)) return 'DECISION';
  if (/longitud|evolu|through time|trayector|seguimiento|monitor|recurr|persist|antes.*después|before.*after/.test(blob)) return 'LONGITUDINAL';
  if (/hipótesis|hipotesis|hypothesis|predict|predic|contrastar|causa|causal|explicar|explain/.test(blob)) return 'EMPIRICAL_CONTRAST';
  return 'DESCRIPTIVE';
}

function privacyRelevant(kind: string) {
  return ['dataset', 'csv', 'json', 'document', 'conversation', 'email', 'person', 'audio', 'video', 'image'].includes(kind);
}

export function resolveUniversalCaseIntake(inputValue: unknown) {
  const input = row(inputValue);
  const signal = row(input.signal);
  const kind = signalKind(input);
  const context = row(input.context);
  const questions: SfiIntakeQuestion[] = [];
  const caseClass = inferCaseClass(input);

  // Intent is the only pre-observation question that can block a universal cycle.
  // Everything else should first be inferred from the material object when possible,
  // then surfaced as an unresolved question only if it still matters to analysis/action.
  if (!text(input.question) && !text(input.objective)) {
    questions.push({ key: 'INTENT', question: '¿Qué quieres entender, decidir o cambiar a partir de esta señal?', reason: 'A cycle needs an explicit intent to determine what question it is trying to resolve.', blocking: true });
  }

  if (!text(input.declaredFunction) && ['audio', 'video', 'image', 'document', 'dataset', 'unknown', 'composite'].includes(kind)) {
    questions.push({ key: 'OBJECT_FUNCTION', question: '¿Qué función cumple este objeto dentro del problema: fuente, evidencia por verificar, sistema a observar, artefacto, intervención u otra?', reason: 'Representation does not determine epistemic or operational function. SFI should attempt to infer this after material observation before asking the operator.', blocking: false });
  }

  const boundaryKnown = text(input.systemType) || text(context.systemBoundary) || text(context.systemBoundaryRef) || text(context.boundary);
  if (!boundaryKnown && ['DECISION', 'INTERVENTION', 'LONGITUDINAL', 'EMPIRICAL_CONTRAST'].includes(caseClass)) {
    questions.push({ key: 'SYSTEM_BOUNDARY', question: '¿Cuál es el sistema o frontera exacta que sí pertenece al caso y qué queda fuera?', reason: 'A bounded system is required before strong causal, longitudinal or intervention claims, but initial material observation should happen first and may resolve the boundary.', blocking: false });
  }

  const temporalKnown = text(context.cutoff) || text(context.temporalCutoff) || text(context.timeWindow) || text(context.observationWindow) || text(signal.observedAt);
  if (!temporalKnown && ['LONGITUDINAL', 'EMPIRICAL_CONTRAST', 'INTERVENTION'].includes(caseClass)) {
    questions.push({ key: 'TEMPORAL_BOUNDARY', question: '¿Cuál es el periodo observado o cutoff temporal que debe gobernar este caso?', reason: 'Temporal scope is required before time-bounded conclusions, but it should first be inferred from the observed object when possible.', blocking: false });
  }

  const outcomeKnown = text(context.successCriteria) || text(context.failureCriteria) || text(context.expectedOutcome) || text(context.decisionCriterion);
  if (!outcomeKnown && ['DECISION', 'INTERVENTION'].includes(caseClass)) {
    questions.push({ key: 'OUTCOME_CRITERIA', question: '¿Qué resultado distinguiría éxito, fracaso o una decisión incorrecta?', reason: 'Discriminating outcome criteria are required before governed execution/closure, not before SFI observes and analyzes the supplied object.', blocking: false });
  }

  const futureSignalKnown = text(context.discriminatingObservation) || text(context.contradictionSignal) || text(context.returnWindow) || arrayHasValues(context.expectedSignals);
  if (!futureSignalKnown && ['LONGITUDINAL', 'EMPIRICAL_CONTRAST', 'INTERVENTION'].includes(caseClass)) {
    questions.push({ key: 'DISCRIMINATING_RETURN', question: '¿Qué observación futura o señal contradictoria permitiría discriminar entre la hipótesis principal y una rival?', reason: 'SFI learning requires a future discriminating observation when the case makes contrastable claims.', blocking: false });
  }

  const privacyKnown = text(context.dataHandling) || text(context.privacyBoundary) || typeof context.containsPersonalData === 'boolean';
  if (!privacyKnown && privacyRelevant(kind)) {
    questions.push({ key: 'DATA_BOUNDARY', question: '¿El objeto contiene datos personales, reservados o sensibles que deban minimizarse, redactarse o mantenerse sólo por referencia?', reason: 'SFI should default to minimization/sanitization during extraction and only ask if the unresolved privacy boundary affects what can be retained or disclosed.', blocking: false });
  }

  return {
    contract: SFI_CASE_INTAKE_RESOLVER_CONTRACT,
    caseClass,
    missingContext: questions.map((item) => item.key),
    questions,
    blockingQuestions: questions.filter((item) => item.blocking),
    readyForObservation: !questions.some((item) => item.blocking),
    principle: 'OBSERVE FIRST. Ask only what remains genuinely unresolved after material observation. Do not require the operator to classify the object, pre-validate system boundaries, or predefine action criteria before SFI has inspected the supplied material.',
  };
}

export function resolveCasePlatformCreationIntake(inputValue: unknown) {
  const input = row(inputValue);
  const temporal = row(input.temporalWindow);
  const questions: SfiIntakeQuestion[] = [];
  if (!text(input.serviceProfileId)) questions.push({ key: 'SERVICE_PROFILE', question: '¿Qué tipo de servicio/observación debe gobernar este caso?', reason: 'Case Platform requires a service profile to select admissible instruments and reports.', blocking: true });
  if (!text(input.subject)) questions.push({ key: 'SUBJECT', question: '¿Cuál es el sujeto u objeto principal del caso?', reason: 'The case needs a stable subject identity.', blocking: true });
  if (!text(input.scope)) questions.push({ key: 'SCOPE', question: '¿Qué pregunta, alcance o resultado debe cubrir este caso?', reason: 'Scope constrains inference and report claims.', blocking: true });
  if (!text(row(input.systemBoundaryRef).id)) questions.push({ key: 'SYSTEM_BOUNDARY', question: '¿Cuál es la referencia del sistema o frontera que se observará?', reason: 'The operational case contract requires an explicit boundary.', blocking: true });
  if (!text(temporal.cutoff)) questions.push({ key: 'TEMPORAL_CUTOFF', question: '¿Cuál es el cutoff temporal de la evidencia que debe considerarse?', reason: 'Case reconstruction must be reproducible as-of a concrete cutoff.', blocking: true });

  return {
    contract: SFI_CASE_INTAKE_RESOLVER_CONTRACT,
    missingContext: questions.map((item) => item.key),
    questions,
    readyForCreate: questions.length === 0,
    principle: 'Operational Case creation is downstream of universal observation/classification. Create the Case only when its service contract is resolvable; do not use Case creation as the universal ingestion gate.',
  };
}
