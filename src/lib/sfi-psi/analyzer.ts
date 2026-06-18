import crypto from 'node:crypto';
import { buildCampaignProposal, buildMediaPlan } from './campaign';
import type {
  SfiEvent,
  SfiHypothesis,
  SfiLabAnalysis,
  SfiLabAnalyzeInput,
  SfiLabMode,
  SfiNode,
  SfiReappearance,
  SfiRegime,
  SfiSignal,
} from './types';
import { buildSfiVector } from './vector';

const STOPWORDS = new Set([
  'para', 'pero', 'como', 'con', 'sin', 'una', 'uno', 'las', 'los', 'del', 'que', 'por', 'este', 'esta', 'esto',
  'that', 'this', 'with', 'from', 'and', 'the', 'for', 'are', 'was', 'were', 'have', 'has',
]);

function hash(value: string, prefix: string) {
  return `${prefix}-${crypto.createHash('sha1').update(value).digest('hex').slice(0, 12)}`;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s:./-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function parseTimestamp(value: string) {
  const match = value.match(/\b(20\d{2}-\d{2}-\d{2}(?:[ t]\d{2}:\d{2}(?::\d{2})?)?)\b/i);
  if (!match) return null;
  const parsed = new Date(match[1].replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function jaccard(a: string[], b: string[]) {
  const left = new Set(a);
  const right = new Set(b);
  const intersection = Array.from(left).filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function modeFrom(value: unknown): SfiLabMode {
  if (value === 'generate_report') return 'generate_report';
  if (value === 'propose_campaign') return 'propose_campaign';
  if (value === 'generate_assets') return 'generate_assets';
  return 'detect_signals';
}

function eventsFrom(input: SfiLabAnalyzeInput): SfiEvent[] {
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text) return [];
  const chunks = text
    .split(/\n{2,}|\r?\n(?=(?:20\d{2}-\d{2}-\d{2}|[-*]\s|evento\s+\d+))/i)
    .map((chunk) => chunk.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
  const source = input.source?.trim() || input.file?.name || 'sfi-lab-text';
  const tags = input.tags?.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()) ?? [];

  return (chunks.length ? chunks : [text]).map((chunk, index) => {
    const normalizedText = normalizeText(chunk);
    return {
      id: hash(`${source}:${index}:${normalizedText}`, 'event'),
      source,
      text: chunk,
      normalizedText,
      timestamp: parseTimestamp(chunk),
      tokens: tokenize(chunk),
      tags,
      file: input.file ?? null,
    };
  });
}

function phraseCandidates(events: SfiEvent[]) {
  const buckets = new Map<string, { eventIds: Set<string>; count: number; tokens: string[] }>();
  for (const event of events) {
    const tokens = event.tokens;
    for (let index = 0; index < tokens.length; index += 1) {
      const candidates = [tokens[index]];
      if (tokens[index + 1]) candidates.push(`${tokens[index]} ${tokens[index + 1]}`);
      for (const candidate of candidates) {
        const found = buckets.get(candidate) ?? { eventIds: new Set<string>(), count: 0, tokens: candidate.split(' ') };
        found.eventIds.add(event.id);
        found.count += 1;
        buckets.set(candidate, found);
      }
    }
  }
  return buckets;
}

function detectReappearances(events: SfiEvent[]): SfiReappearance[] {
  const buckets = phraseCandidates(events);
  const reappearances: SfiReappearance[] = [];
  for (const [pattern, bucket] of buckets) {
    if (bucket.count < 2) continue;
    const eventIds = Array.from(bucket.eventIds);
    const relatedEvents = events.filter((event) => bucket.eventIds.has(event.id));
    const firstSeen = relatedEvents.map((event) => event.timestamp).filter(Boolean).sort()[0] ?? null;
    const lastSeen = relatedEvents.map((event) => event.timestamp).filter(Boolean).sort().at(-1) ?? null;
    reappearances.push({
      id: hash(`${pattern}:${eventIds.join(':')}:${bucket.count}`, 'reapp'),
      eventIds,
      pattern,
      normalizedPattern: normalizeText(pattern),
      recurrence: bucket.count,
      similarity: Math.min(1, bucket.count / Math.max(2, events.length)),
      firstSeen,
      lastSeen,
      status: eventIds.length > 1 ? 'cross_event_recurrence' : 'single_event_recurrence',
    });
  }

  for (let left = 0; left < events.length; left += 1) {
    for (let right = left + 1; right < events.length; right += 1) {
      const similarity = jaccard(events[left].tokens, events[right].tokens);
      if (similarity < 0.34) continue;
      const shared = events[left].tokens.filter((token) => events[right].tokens.includes(token)).slice(0, 3).join(' ');
      if (!shared) continue;
      reappearances.push({
        id: hash(`${events[left].id}:${events[right].id}:${shared}`, 'reapp'),
        eventIds: [events[left].id, events[right].id],
        pattern: shared,
        normalizedPattern: normalizeText(shared),
        recurrence: 2,
        similarity,
        firstSeen: [events[left].timestamp, events[right].timestamp].filter(Boolean).sort()[0] ?? null,
        lastSeen: [events[left].timestamp, events[right].timestamp].filter(Boolean).sort().at(-1) ?? null,
        status: 'semantic_echo',
      });
    }
  }

  return reappearances
    .sort((a, b) => b.recurrence - a.recurrence || b.similarity - a.similarity)
    .slice(0, 24);
}

function formSignals(reappearances: SfiReappearance[]): SfiSignal[] {
  const used = new Set<string>();
  const signals: SfiSignal[] = [];
  for (const reappearance of reappearances) {
    if (used.has(reappearance.id)) continue;
    const rootTokens = reappearance.normalizedPattern.split(' ');
    const related = reappearances.filter((candidate) => {
      if (used.has(candidate.id)) return false;
      const candidateTokens = candidate.normalizedPattern.split(' ');
      return jaccard(rootTokens, candidateTokens) >= 0.34 || rootTokens.some((token) => candidateTokens.includes(token));
    });
    related.forEach((item) => used.add(item.id));
    const eventIds = unique(related.flatMap((item) => item.eventIds));
    const recurrence = related.reduce((sum, item) => sum + item.recurrence, 0);
    const coherence = Math.min(1, related.reduce((sum, item) => sum + item.similarity, 0) / Math.max(1, related.length));
    const visibility = Math.min(1, eventIds.length / 5 + recurrence / 20);
    const status = recurrence >= 3 ? 'persistent_signal' : 'weak_signal';
    signals.push({
      id: hash(`${reappearance.normalizedPattern}:${eventIds.join(':')}`, 'signal'),
      name: reappearance.pattern,
      reappearanceIds: related.map((item) => item.id),
      eventIds,
      recurrence,
      coherence,
      visibility,
      status,
      summary: status === 'persistent_signal'
        ? `Patrón con recurrencia ${recurrence} y coherencia ${coherence.toFixed(2)}.`
        : `Señal débil: requiere más observación antes de escalar a nodo.`,
    });
  }
  return signals.slice(0, 12);
}

function temporalSpanHours(events: SfiEvent[], eventIds: string[]) {
  const timestamps = events
    .filter((event) => eventIds.includes(event.id) && event.timestamp)
    .map((event) => new Date(event.timestamp as string).getTime())
    .sort((a, b) => a - b);
  if (timestamps.length < 2) return null;
  return (timestamps[timestamps.length - 1] - timestamps[0]) / 36e5;
}

function formNodes(events: SfiEvent[], signals: SfiSignal[]): SfiNode[] {
  return signals.flatMap((signal) => {
    const span = temporalSpanHours(events, signal.eventIds);
    const hasTimestamps = events.some((event) => signal.eventIds.includes(event.id) && event.timestamp);
    const identityScore = Math.min(1, signal.coherence * 0.65 + signal.visibility * 0.35);
    const qualifies = signal.recurrence >= 3 && (!hasTimestamps || (span !== null && span >= 24)) && identityScore >= 0.35;
    if (!qualifies) return [];
    const vector = buildSfiVector({
      eventCount: signal.eventIds.length,
      tokenCount: events.filter((event) => signal.eventIds.includes(event.id)).reduce((sum, event) => sum + event.tokens.length, 0),
      reappearances: [{
        id: `${signal.id}-node-recurrence`,
        eventIds: signal.eventIds,
        pattern: signal.name,
        normalizedPattern: normalizeText(signal.name),
        recurrence: signal.recurrence,
        similarity: signal.coherence,
        firstSeen: null,
        lastSeen: null,
        status: 'cross_event_recurrence',
      }],
      signals: [signal],
      nodeCount: 1,
    });
    const node: SfiNode = {
      id: hash(`${signal.id}:node`, 'node'),
      name: signal.name,
      signalIds: [signal.id],
      eventIds: signal.eventIds,
      status: 'emergent_node',
      firstSeen: events.filter((event) => signal.eventIds.includes(event.id)).map((event) => event.timestamp).filter(Boolean).sort()[0] ?? null,
      lastSeen: events.filter((event) => signal.eventIds.includes(event.id)).map((event) => event.timestamp).filter(Boolean).sort().at(-1) ?? null,
      recurrence: signal.recurrence,
      temporalSpanHours: span,
      identityScore,
      persistence: vector.P,
      coherence: signal.coherence,
      friction: vector.F,
      visibility: signal.visibility,
      utility: vector.U,
      sfiVector: vector,
    };
    return [node];
  }).slice(0, 8);
}

function formRegimes(nodes: SfiNode[]): SfiRegime[] {
  if (nodes.length < 2) return [];
  const stability = Math.min(1, nodes.reduce((sum, node) => sum + node.persistence + node.coherence, 0) / (nodes.length * 2));
  return [{
    id: hash(nodes.map((node) => node.id).join(':'), 'regime'),
    name: 'configuración estable de nodos SFI',
    nodeIds: nodes.map((node) => node.id),
    status: stability > 0.62 ? 'stable_regime' : 'emergent_node',
    stability,
    summary: `Configuración con ${nodes.length} nodos y estabilidad ${stability.toFixed(2)}.`,
  }];
}

function hypotheses(analysisId: string, signals: SfiSignal[], nodes: SfiNode[]): SfiHypothesis[] {
  const source = nodes.length ? nodes : signals;
  if (!source.length) {
    return [{
      id: `hyp-${analysisId}-insufficient`,
      title: 'Datos longitudinales insuficientes',
      statement: 'La entrada permite registrar evento, pero no confirmar trayectoria persistente.',
      confidence: 0.18,
      status: 'insufficient_longitudinal_data',
      linkedSignalIds: [],
      linkedNodeIds: [],
      nextObservationWindow: '24-72 horas con al menos tres retornos comparables.',
    }];
  }
  return source.slice(0, 5).map((item, index) => {
    const isNode = 'signalIds' in item;
    return {
      id: `hyp-${analysisId}-${index + 1}`,
      title: isNode ? `Nodo emergente: ${item.name}` : `Señal débil: ${item.name}`,
      statement: isNode
        ? `"${item.name}" conserva identidad suficiente para operar como nodo emergente bajo observación.`
        : `"${item.name}" aparece como señal débil; requiere retorno sostenido antes de decisión fuerte.`,
      confidence: isNode ? item.identityScore : Math.min(0.72, item.coherence),
      status: isNode ? 'emergent_node' : item.status,
      linkedSignalIds: isNode ? item.signalIds : [item.id],
      linkedNodeIds: isNode ? [item.id] : [],
      nextObservationWindow: isNode ? '7 días con revisión de utilidad, visibilidad y tolerancia.' : '24-72 horas con nueva muestra comparable.',
    };
  });
}

export function analyzeSfiLabInput(input: SfiLabAnalyzeInput): SfiLabAnalysis {
  const mode = modeFrom(input.mode);
  const events = eventsFrom(input);
  const reappearances = detectReappearances(events);
  const signals = formSignals(reappearances);
  const nodes = formNodes(events, signals);
  const regimes = formRegimes(nodes);
  const analysisId = hash(JSON.stringify(input), 'analysis');
  const sfiVector = buildSfiVector({
    eventCount: events.length,
    tokenCount: events.reduce((sum, event) => sum + event.tokens.length, 0),
    reappearances,
    signals,
    nodeCount: nodes.length,
  });
  const base = {
    analysisId,
    nodes,
    signals,
    reappearances,
    sfiVector,
  };
  const partial = { ...base, campaign: buildCampaignProposal(base) };
  const campaign = partial.campaign;
  const mediaPlan = buildMediaPlan({ ...base, campaign });
  const limitations = [
    events.length ? '' : 'No se recibió texto procesable; no se simula evidencia como real.',
    reappearances.length ? '' : 'No hay reapariciones suficientes para confirmar señal persistente.',
    nodes.length ? '' : 'No hay nodo SFI confirmado; si existen timestamps, se requiere span mínimo de 24h.',
  ].filter(Boolean);

  return {
    ok: true,
    analysisId,
    createdAt: new Date().toISOString(),
    mode,
    source: input.source?.trim() || input.file?.name || 'sfi-lab',
    dataMode: events.length ? 'real_input' : 'no_input',
    events,
    reappearances,
    signals,
    nodes,
    regimes,
    sfiVector,
    hypotheses: hypotheses(analysisId, signals, nodes),
    recommendations: [
      nodes.length ? 'Escalar nodos emergentes a seguimiento semanal.' : 'Mantener como señal débil hasta reunir tres retornos comparables.',
      'Registrar fuente, timestamp y contexto para la próxima observación.',
      'No convertir campaña en promesa de viralidad; usar hipótesis de campaña y ventana de observación.',
    ],
    campaign,
    mediaPlan,
    limitations,
    nextObservationWindow: nodes.length ? '7 días' : '24-72 horas',
  };
}
