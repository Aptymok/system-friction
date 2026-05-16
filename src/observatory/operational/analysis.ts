import crypto from 'crypto';

export type MihmVector = {
  F_s: number;
  D_i: number;
  E_r: number;
  C_s: number;
  D_cog: number;
  G_f: number;
  R_sem: number;
  C_sem: number;
};

export type OperationalReading = {
  type: string;
  ihg: number;
  nti: number;
  ldi: number;
  thresholdDistance: number;
  vector: MihmVector;
  narrative: string;
  text: string;
  metadata: Record<string, unknown>;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function round(value: number) {
  return Number(value.toFixed(4));
}

function entropy(text: string) {
  if (!text) return 0;
  const counts = new Map<string, number>();
  for (const char of text) counts.set(char, (counts.get(char) ?? 0) + 1);
  const total = text.length;
  let score = 0;
  counts.forEach((count) => {
    const p = count / total;
    score -= p * Math.log2(p);
  });
  return clamp(score / 5);
}

function lexicalIntegrity(text: string) {
  if (!text) return 0.35;
  const tokens = text.toLowerCase().match(/[a-záéíóúñü0-9_]+/gi) ?? [];
  if (!tokens.length) return 0.4;
  const unique = new Set(tokens);
  return clamp(unique.size / tokens.length);
}

export function detectFileType(fileName: string, mimeType?: string) {
  const lower = fileName.toLowerCase();
  const extension = lower.includes('.') ? lower.split('.').pop() || '' : '';
  if (mimeType?.includes('pdf') || extension === 'pdf') return 'pdf';
  if (mimeType?.includes('wav') || extension === 'wav') return 'wav';
  if (mimeType?.includes('png') || extension === 'png') return 'png';
  if (mimeType?.includes('jpeg') || mimeType?.includes('jpg') || extension === 'jpg' || extension === 'jpeg') return 'jpeg';
  if (mimeType?.includes('html') || extension === 'html' || extension === 'htm') return 'html';
  if (extension === 'py') return 'py';
  if (extension === 'json') return 'json';
  if (mimeType?.includes('text') || extension === 'txt') return 'txt';
  return extension || 'text';
}

export function readUsefulText(buffer: Buffer, type: string) {
  if (['txt', 'html', 'py', 'json'].includes(type)) {
    return buffer.toString('utf8').slice(0, 12000);
  }

  if (type === 'pdf') {
    const raw = buffer.toString('latin1');
    return (raw.match(/[\x20-\x7E]{4,}/g) ?? []).join(' ').slice(0, 12000);
  }

  return '';
}

export function analyzeOperationalInput(input: {
  text?: string;
  fileName?: string;
  mimeType?: string;
  buffer?: Buffer;
}): OperationalReading {
  const type = input.fileName ? detectFileType(input.fileName, input.mimeType) : 'text';
  const fileText = input.buffer ? readUsefulText(input.buffer, type) : '';
  const text = (input.text || fileText || input.fileName || '').trim();
  const byteLength = input.buffer?.byteLength ?? Buffer.byteLength(text);
  const hash = crypto.createHash('sha256').update(input.buffer ?? text).digest('hex').slice(0, 16);

  const density = clamp(text.length / 5000);
  const lineCount = text ? text.split(/\r?\n/).length : 0;
  const structuralMarkers = (text.match(/[{}\[\]():;,.<>#]/g) ?? []).length;
  const markerDensity = clamp(structuralMarkers / Math.max(1, text.length / 24));
  const semanticEntropy = entropy(text);
  const integrity = lexicalIntegrity(text);
  const sizePressure = clamp(byteLength / (1024 * 1024 * 4));

  const vector: MihmVector = {
    F_s: round(clamp(0.18 + semanticEntropy * 0.38 + sizePressure * 0.22)),
    D_i: round(clamp(0.12 + density * 0.48 + markerDensity * 0.16)),
    E_r: round(clamp(0.28 + integrity * 0.34 + (lineCount > 1 ? 0.08 : 0))),
    C_s: round(clamp(0.26 + integrity * 0.48 - markerDensity * 0.12)),
    D_cog: round(clamp(0.16 + semanticEntropy * 0.3 + density * 0.2)),
    G_f: round(clamp(Math.abs(semanticEntropy - integrity) + sizePressure * 0.2)),
    R_sem: round(clamp(integrity * 0.72 + (text.length > 120 ? 0.12 : 0))),
    C_sem: round(clamp(0.32 + integrity * 0.42 + markerDensity * 0.12)),
  };

  const ihg = round(clamp((vector.C_s + vector.E_r + vector.R_sem + vector.C_sem) / 4 - vector.F_s * 0.16));
  const nti = round(clamp((vector.D_i + vector.D_cog + vector.G_f) / 3));
  const ldi = round(clamp(0.18 + vector.F_s * 0.38 + vector.D_cog * 0.28 - ihg * 0.12));
  const thresholdDistance = round(clamp(Math.abs(0.62 - ihg) + nti * 0.18 + ldi * 0.12));

  return {
    type,
    ihg,
    nti,
    ldi,
    thresholdDistance,
    vector,
    text,
    metadata: {
      fileName: input.fileName ?? null,
      mimeType: input.mimeType ?? null,
      byteLength,
      hash,
      extractedTextLength: text.length,
      lineCount,
    },
    narrative: `SF observa: ${type} mantiene un nivel de homeostasis ${ihg}, con integridad de datos ${vector.C_s}, fricción ${vector.F_s} y distancia frente a umbral ${thresholdDistance}.`,
  };
}

export function contrastWithSpectrum(reading: Pick<OperationalReading, 'ihg' | 'nti' | 'ldi' | 'thresholdDistance'>) {
  const world = { ihg: 0.58, nti: 0.44, ldi: 0.36 };
  const cultural = { ihg: 0.52, nti: 0.5, ldi: 0.42 };
  const feeling = { ihg: 0.48, nti: 0.57, ldi: 0.46 };
  const avg = {
    ihg: round((world.ihg + cultural.ihg + feeling.ihg) / 3),
    nti: round((world.nti + cultural.nti + feeling.nti) / 3),
    ldi: round((world.ldi + cultural.ldi + feeling.ldi) / 3),
  };
  const distance = round((Math.abs(reading.ihg - avg.ihg) + Math.abs(reading.nti - avg.nti) + Math.abs(reading.ldi - avg.ldi)) / 3);
  const tendency = reading.ihg >= avg.ihg ? 'homeostasis_por_encima_del_contexto' : 'friccion_por_encima_del_contexto';

  return {
    world,
    cultural,
    feeling,
    contrast: avg,
    thresholdDistance: round(distance + reading.thresholdDistance * 0.25),
    tendency,
    annotation: `Bitácora: contraste ${tendency}; distancia operacional ${distance}.`,
  };
}
