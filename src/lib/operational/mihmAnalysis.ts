import { sha256 } from './common';

function words(input: string) {
  return input.toLowerCase().split(/[^a-z0-9áéíóúüñ]+/i).filter(Boolean);
}

function hasAny(haystack: string[], needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

export function analyzeMihmInput(input: unknown) {
  const raw = typeof input === 'string' ? input : JSON.stringify(input ?? {});
  const tokenList = words(raw);
  const dimensions = [
    ...(hasAny(tokenList, ['evidencia', 'evidence', 'dato', 'registro']) ? ['evidence'] : []),
    ...(hasAny(tokenList, ['riesgo', 'risk', 'bloqueo', 'tension', 'tensión']) ? ['risk'] : []),
    ...(hasAny(tokenList, ['nodo', 'graph', 'campo', 'kernel']) ? ['field_structure'] : []),
    ...(hasAny(tokenList, ['decision', 'aprobacion', 'aprobación', 'mutacion', 'mutación']) ? ['governed_action'] : []),
  ];
  const sentences = raw.split(/[.!?\n]+/).map((item) => item.trim()).filter(Boolean);
  const claims = sentences.slice(0, 5).map((claim, index) => ({ id: `claim:${index + 1}`, claim }));
  const evidence = sentences
    .filter((sentence) => /evidencia|registro|observado|hash|evento|dato/i.test(sentence))
    .slice(0, 5)
    .map((item, index) => ({ id: `evidence:${index + 1}`, content: item }));
  const tensions = sentences
    .filter((sentence) => /pero|aunque|sin embargo|tension|tensión|inconsistente|riesgo/i.test(sentence))
    .slice(0, 5)
    .map((item, index) => ({ id: `tension:${index + 1}`, content: item }));
  const risks = sentences
    .filter((sentence) => /riesgo|bloqueo|falla|degradado|blind|rechazo/i.test(sentence))
    .slice(0, 5)
    .map((item, index) => ({ id: `risk:${index + 1}`, content: item }));
  const confidence = Math.max(0.2, Math.min(0.9, (dimensions.length * 0.14) + (evidence.length * 0.12) + (claims.length > 0 ? 0.22 : 0)));
  const homeostaticVector = {
    ihg: Number(Math.min(1, 0.35 + dimensions.length * 0.08).toFixed(4)),
    nti: Number(Math.min(1, 0.25 + tensions.length * 0.12 + risks.length * 0.08).toFixed(4)),
    ldi: Number(Math.min(1, 0.2 + Math.max(0, claims.length - evidence.length) * 0.07).toFixed(4)),
    phi: Number(Math.min(1, confidence * 0.72).toFixed(4)),
  };

  return {
    input_hash: sha256(raw),
    detected_dimensions: dimensions.length ? dimensions : ['field_note'],
    claims,
    evidence,
    tensions,
    risks,
    confidence: Number(confidence.toFixed(4)),
    homeostatic_vector: homeostaticVector,
  };
}
