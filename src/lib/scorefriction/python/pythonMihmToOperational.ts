export type PythonMihmVector = Record<string, unknown>;

export type PythonOperationalReading = {
  friction: string;
  interactionDensity: string;
  systemicCoherence: string;
  relationalEnergy: string;
  intentionalVector: string;
  invisibilityRisk: string;
  semanticField: string;
  protoattractor: string;
  productionDirection: string;
  ihgLevel: 'bajo' | 'medio' | 'alto' | 'insuficiente';
  summary: string;
};

function num(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function level(value: number | null) {
  if (value === null) return 'insuficiente';
  if (value >= 0.66) return 'alto';
  if (value >= 0.33) return 'medio';
  return 'bajo';
}

function phrase(value: number | null, high: string, mid: string, low: string, missing: string) {
  if (value === null) return missing;
  if (value >= 0.66) return high;
  if (value >= 0.33) return mid;
  return low;
}

export function buildScoreFrictionOperationalReading(input: {
  mihmVector?: PythonMihmVector | null;
  ihgFinal?: unknown;
  emissionValid?: unknown;
  ntiUsed?: unknown;
}): PythonOperationalReading {
  const vector = input.mihmVector ?? {};
  const fs = num(vector.F_s);
  const di = num(vector.D_i);
  const cs = num(vector.C_s);
  const er = num(vector.E_r);
  const vi = num(vector.V_i);
  const rsem = num(vector.R_sem);
  const csem = num(vector.C_sem);
  const phi = num(vector.Phi);
  const ihg = num(input.ihgFinal);
  const ihgLevel = input.emissionValid === false ? 'insuficiente' : level(ihg) as PythonOperationalReading['ihgLevel'];

  const friction = phrase(
    fs,
    'Friccion alta: la senal tiene rugosidad/choque perceptual.',
    'Friccion media: la senal muestra tension perceptual manejable.',
    'Friccion baja: la senal se percibe estable o poco rugosa.',
    'Friccion insuficiente: el nucleo Python no pudo medir F_s.',
  );
  const interactionDensity = phrase(
    di,
    'Densidad de interaccion elevada: muchos eventos acusticos por unidad temporal.',
    'Densidad de interaccion media: hay actividad detectable sin congestion fuerte.',
    'Densidad de interaccion baja: pocos eventos acusticos sostienen la senal.',
    'Densidad insuficiente: D_i no fue medible.',
  );
  const systemicCoherence = phrase(
    cs,
    'Alta coherencia: estructura estable.',
    'Coherencia media: estructura legible con variacion.',
    'Coherencia baja: estructura inestable o dispersa.',
    'Coherencia insuficiente: C_s no fue medible.',
  );
  const relationalEnergy = phrase(
    er,
    'Energia relacional alta: la senal tiene empuje corporal/contextual.',
    'Energia relacional media: hay empuje, pero no domina la lectura.',
    'Energia relacional baja: menor empuje corporal/contextual.',
    'Energia relacional insuficiente: E_r no fue medible.',
  );
  const intentionalVector = phrase(
    vi,
    'Vector intencional claro: intencion melodica/vocal explicita.',
    'Vector intencional medio: intencion detectable pero no dominante.',
    'Vector intencional difuso: intencion melodica/vocal menos explicita.',
    'Vector intencional insuficiente: V_i no fue medible.',
  );
  const semanticField = rsem === null && csem === null
    ? 'Campo semantico insuficiente: no se proporciono texto o Whisper no produjo transcripcion.'
    : `Campo semantico ${level(csem)}: R_sem ${rsem?.toFixed(2) ?? 'sin dato'} / C_sem ${csem?.toFixed(2) ?? 'sin dato'}.`;
  const invisibilityRisk = (fs !== null && er !== null && vi !== null && fs < 0.33 && er < 0.33 && vi < 0.45)
    ? 'Riesgo de invisibilidad alto: baja friccion, baja energia y vector intencional difuso pueden hacer que la senal pase desapercibida.'
    : 'Riesgo de invisibilidad no dominante en la lectura actual.';
  const protoattractor = ihgLevel === 'alto' || (phi !== null && phi >= 0.66)
    ? 'Protoatractor emergente: la senal puede sostener hipotesis de produccion verificable.'
    : ihgLevel === 'medio'
      ? 'Protoatractor latente: conviene contrastar con otra evidencia antes de producir.'
      : ihgLevel === 'bajo'
        ? 'Protoatractor debil: registrar mas evidencia antes de abrir produccion.'
        : 'Protoatractor insuficiente: falta nucleo medido para declarar atraccion.';
  const productionDirection = ihgLevel === 'alto'
    ? 'generar brief creativo'
    : ihgLevel === 'medio'
      ? 'comparar contra otro caso'
      : ihgLevel === 'bajo'
        ? 'registrar mas evidencia'
        : 'mantener en sandbox';

  return {
    friction,
    interactionDensity,
    systemicCoherence,
    relationalEnergy,
    intentionalVector,
    invisibilityRisk,
    semanticField,
    protoattractor,
    productionDirection,
    ihgLevel,
    summary: `${friction} ${systemicCoherence} ${protoattractor}`,
  };
}
