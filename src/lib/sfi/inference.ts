export type SignalKind =
  | 'personal'
  | 'relacional'
  | 'proyecto'
  | 'campania_redes'
  | 'documento'
  | 'audio'
  | 'codigo'
  | 'url'
  | 'estrategia'
  | 'imagen'
  | 'video';

export type OperationalReading = {
  phenomenon: string;
  applicationContext: string;
  observerPosition: string;
  stability: { label: string; detail: string; score: number };
  traceability: { label: string; detail: string; score: number };
  latency: { label: string; detail: string; hours: number };
  risk: { label: string; detail: string; score: number };
  intervention: string;
  requiredEvidence: string[];
  nextAction: string;
  continuity: string;
  pressureLayers: Array<{ layer: 'MUNDO' | 'REDES' | 'PROYECTO' | 'USUARIO'; pressure: number; note: string }>;
  technical: {
    IHG: number;
    NTI_obs: number;
    LDI_hours: number;
    xi_noise: number;
    PHI_SF: number;
    regime: 'HOMEOSTATIC' | 'TRANSITION' | 'CRITICAL';
    runway_days: number | null;
  };
};

const socialKinds: SignalKind[] = ['campania_redes', 'audio', 'imagen', 'video'];

function countMatches(text: string, words: string[]) {
  return words.reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rounded(value: number, digits = 3) {
  return Number(value.toFixed(digits));
}

function band(value: number, lowLabel: string, midLabel: string, highLabel: string) {
  if (value < 0.34) return lowLabel;
  if (value < 0.67) return midLabel;
  return highLabel;
}

export function inferOperationalReading(input: {
  kind: SignalKind;
  signal: string;
  evidenceLabel?: string;
  previousPattern?: string | null;
}): OperationalReading {
  const signal = input.signal.trim();
  const normalized = signal.toLowerCase();
  const lengthFactor = clamp(signal.length / 1800, 0.08, 1);
  const executionTerms = countMatches(normalized, ['hacer', 'entregar', 'publicar', 'resolver', 'cerrar', 'enviar', 'ejecutar', 'medir']);
  const intentionTerms = countMatches(normalized, ['quiero', 'deberia', 'necesito', 'planeo', 'intento', 'estrategia', 'objetivo', 'vision']);
  const delayTerms = countMatches(normalized, ['despues', 'luego', 'pendiente', 'bloqueado', 'mañana', 'tarde', 'retraso', 'esperando', 'no he']);
  const contradictionTerms = countMatches(normalized, ['pero', 'aunque', 'sin embargo', 'no puedo', 'me cuesta', 'contradiccion', 'inconsistente']);
  const evidenceTerms = countMatches(normalized, ['dato', 'captura', 'archivo', 'link', 'url', 'ticket', 'commit', 'metric', 'evidencia', 'pdf']);
  const socialMode = socialKinds.includes(input.kind);

  const stabilityScore = clamp(0.68 + executionTerms * 0.05 - intentionTerms * 0.04 - delayTerms * 0.08 - contradictionTerms * 0.07, 0.08, 0.92);
  const traceabilityScore = clamp(0.24 + evidenceTerms * 0.11 + lengthFactor * 0.22 + (input.evidenceLabel ? 0.12 : 0), 0.08, 0.9);
  const latencyHours = Math.round(clamp(12 + delayTerms * 18 + contradictionTerms * 10 + Math.max(0, intentionTerms - executionTerms) * 9, 4, 168));
  const riskScore = clamp(0.18 + delayTerms * 0.12 + contradictionTerms * 0.1 + (1 - stabilityScore) * 0.35 + (1 - traceabilityScore) * 0.16, 0.08, 0.95);
  const ldiNorm = clamp(latencyHours / 72, 0, 3);
  const xi = rounded(clamp(0.035 + contradictionTerms * 0.012 + (socialMode ? 0.012 : 0), 0.02, 0.22));
  const phi = rounded((stabilityScore * traceabilityScore) / (1 + ldiNorm) + xi);
  const regime = phi > 0.58 && stabilityScore > 0.55 && latencyHours < 36 ? 'HOMEOSTATIC' : phi < 0.28 || latencyHours > 96 ? 'CRITICAL' : 'TRANSITION';

  const phenomenon = socialMode
    ? 'Friccion perceptual en pieza de distribucion: la promesa narrativa no termina de convertirse en accion verificable.'
    : 'Desacoplamiento observable entre intencion declarada, evidencia disponible y ejecucion sostenida.';

  const applicationContext = {
    personal: 'Operacion personal y continuidad de conducta.',
    relacional: 'Campo relacional con friccion de comunicacion o expectativa.',
    proyecto: 'Proyecto activo con riesgo de latencia entre decision y entrega.',
    campania_redes: 'Campo de redes, resonancia publica y coherencia narrativa.',
    documento: 'Documento fuente con tension semantica y trazabilidad verificable.',
    audio: 'Senal oral o audiovisual con carga narrativa observable.',
    codigo: 'Superficie tecnica con deuda, bloqueo o divergencia de ejecucion.',
    url: 'Recurso externo observado como evidencia de contexto.',
    estrategia: 'Estrategia declarada frente a capacidad real de ejecucion.',
    imagen: 'Pieza visual con friccion perceptual y promesa implicita.',
    video: 'Pieza audiovisual con resonancia, ritmo y saturacion observables.',
  }[input.kind];

  const stabilityLabel = band(stabilityScore, 'Baja', 'Media', 'Alta');
  const traceabilityLabel = band(traceabilityScore, 'Limitada', 'Parcial', 'Suficiente');
  const riskLabel = band(riskScore, 'Bajo', 'Moderado', 'Alto');

  return {
    phenomenon,
    applicationContext,
    observerPosition: signal.length > 900 ? 'Observador implicado con evidencia amplia.' : 'Observador implicado con senal inicial insuficiente para cierre definitivo.',
    stability: {
      label: stabilityLabel,
      detail:
        stabilityLabel === 'Baja'
          ? 'existe desacoplamiento entre intencion y ejecucion.'
          : stabilityLabel === 'Media'
            ? 'hay continuidad parcial, pero la ejecucion todavia depende de validacion externa.'
            : 'la ejecucion conserva coherencia operativa visible.',
      score: rounded(stabilityScore),
    },
    traceability: {
      label: traceabilityLabel,
      detail:
        traceabilityLabel === 'Limitada'
          ? 'hay pocas evidencias verificables.'
          : traceabilityLabel === 'Parcial'
            ? 'existen rastros, pero faltan pruebas de continuidad.'
            : 'la senal contiene evidencia suficiente para seguimiento.',
      score: rounded(traceabilityScore),
    },
    latency: {
      label: latencyHours > 72 ? 'Alta' : latencyHours > 24 ? 'Media' : 'Baja',
      detail: latencyHours > 72 ? 'la decision permanece sin transicion estable hacia accion.' : 'la demora todavia puede corregirse con una accion minima.',
      hours: latencyHours,
    },
    risk: {
      label: riskLabel,
      detail:
        riskLabel === 'Alto'
          ? 'el deterioro aumentara si no existe intervencion inmediata.'
          : riskLabel === 'Moderado'
            ? 'el deterioro aumentara si no existe intervencion.'
            : 'el sistema puede sostener seguimiento sin ruptura inmediata.',
      score: rounded(riskScore),
    },
    intervention: socialMode
      ? 'Reducir una promesa narrativa, aumentar evidencia concreta y publicar una version con menor saturacion semantica.'
      : 'Convertir la senal en una accion minima verificable antes de ampliar la explicacion del problema.',
    requiredEvidence: socialMode
      ? ['pieza original', 'objetivo de audiencia', 'resultado esperado', 'metrica de respuesta']
      : ['estado actual', 'accion prometida', 'ultima ejecucion verificable', 'bloqueo observable'],
    nextAction: socialMode
      ? 'Crear una variante de bajo ruido y compararla contra la pieza original antes de publicar.'
      : 'Definir una accion de cierre menor a 25 minutos y registrar evidencia al terminar.',
    continuity: input.previousPattern
      ? 'El sistema detecta continuidad con patrones previos.'
      : 'El sistema inicia linea base; la continuidad se medira desde la siguiente senal.',
    pressureLayers: [
      { layer: 'MUNDO', pressure: rounded(clamp(riskScore * 0.6 + (socialMode ? 0.18 : 0.04), 0, 1)), note: socialMode ? 'campo externo sensible a saturacion' : 'contexto externo en presion basal' },
      { layer: 'REDES', pressure: rounded(clamp(socialMode ? riskScore + 0.08 : riskScore * 0.42, 0, 1)), note: socialMode ? 'resonancia y coherencia narrativa activas' : 'sin activacion principal de redes' },
      { layer: 'PROYECTO', pressure: rounded(clamp((1 - stabilityScore) * 0.8 + delayTerms * 0.05, 0, 1)), note: 'tension entre declaracion y entrega' },
      { layer: 'USUARIO', pressure: rounded(clamp((1 - traceabilityScore) * 0.48 + contradictionTerms * 0.08, 0, 1)), note: 'carga de decision y evidencia pendiente' },
    ],
    technical: {
      IHG: rounded(stabilityScore),
      NTI_obs: rounded(traceabilityScore),
      LDI_hours: latencyHours,
      xi_noise: xi,
      PHI_SF: phi,
      regime,
      runway_days: regime === 'CRITICAL' ? Math.max(7, Math.round(45 - riskScore * 22)) : null,
    },
  };
}
