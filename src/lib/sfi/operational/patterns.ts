import { type SfiOperationalEvent } from '@/lib/sfi/operational/events';

export type SfiOperationalPattern = {
  id: string;
  label: string;
  type: 'persistent_pattern' | 'attractor' | 'institutional_memory';
  confidence: number;
  evidence_event_ids: string[];
  summary: string;
  next_action: string;
};

function includesAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

export function deriveSfiOperationalPatterns(events: SfiOperationalEvent[]) {
  const allText = events.map((event) => [
    event.title,
    event.summary,
    event.organ,
    event.kind,
    event.source,
    event.next_action,
    JSON.stringify(event.payload || {})
  ].join(' ')).join('\n');

  const byOrgan = (organ: string) => events.filter((event) => event.organ === organ);
  const byKind = (kind: string) => events.filter((event) => event.kind === kind);

  const scoreEvents = byOrgan('scorefriction');
  const evaluatorEvents = byOrgan('evaluator');
  const amvEvents = byOrgan('amv_cognitive_twin');
  const governanceEvents = byOrgan('governance');
  const marketEvents = byOrgan('market');
  const publisherEvents = byOrgan('publisher');
  const signalEvents = byKind('signal');

  const patterns: SfiOperationalPattern[] = [];

  if (scoreEvents.length > 0 && evaluatorEvents.length > 0 && amvEvents.length > 0) {
    patterns.push({
      id: 'pattern-organs-connected',
      label: 'Órganos principales conectados',
      type: 'persistent_pattern',
      confidence: 0.82,
      evidence_event_ids: [
        scoreEvents.at(-1)?.id,
        evaluatorEvents.at(-1)?.id,
        amvEvents.at(-1)?.id
      ].filter(Boolean) as string[],
      summary: 'ScoreFriction, Evaluator/MIHM y AMV/Gemelo ya responden como órganos conectados. La limitación ya no es existencia de órgano, sino alimentación viva y normalización.',
      next_action: 'Crear intake normalizado que convierta señales en observaciones, vectores y narrativa.'
    });
  }

  if (signalEvents.length > 0 && includesAny(allText, ['REM618', 'KXTXR', 'System Friction Institute', 'persistencia'])) {
    patterns.push({
      id: 'pattern-first-live-signal',
      label: 'Primera señal viva persistente',
      type: 'persistent_pattern',
      confidence: 0.74,
      evidence_event_ids: signalEvents.map((event) => event.id).slice(-3),
      summary: 'La membrana ya registró una señal viva. Esto prueba circulación mínima dentro del organismo, aunque todavía no alimenta tablas ScoreFriction productivas.',
      next_action: 'Promover señal a observación normalizada ScoreFriction mediante /api/scorefriction/intake.'
    });
  }

  if (governanceEvents.length > 0 && marketEvents.length > 0) {
    patterns.push({
      id: 'attractor-governed-expansion',
      label: 'Expansión con gobernanza previa',
      type: 'attractor',
      confidence: 0.88,
      evidence_event_ids: [
        marketEvents.at(-1)?.id,
        governanceEvents.at(-1)?.id
      ].filter(Boolean) as string[],
      summary: 'El sistema ya detecta oportunidades externas y bloquea acceso al núcleo sin contrato. El atractor institucional no es entregar motor, sino habilitar acceso limitado y trazable.',
      next_action: 'Crear paquete DEMO / LIMITED_OPERATOR y one-pager público.'
    });
  }

  if (publisherEvents.length > 0) {
    patterns.push({
      id: 'pattern-publisher-bottleneck',
      label: 'Publicador como cuello de botella',
      type: 'persistent_pattern',
      confidence: 0.79,
      evidence_event_ids: publisherEvents.map((event) => event.id).slice(-3),
      summary: 'SFI ya observa, registra y gobierna, pero todavía no emite de forma sostenida. La publicación es el órgano faltante para visibilidad y captura.',
      next_action: 'Crear borrador revisable desde última observación viva.'
    });
  }

  patterns.push({
    id: 'memory-operational-sequence',
    label: 'Secuencia institucional acumulada',
    type: 'institutional_memory',
    confidence: 0.9,
    evidence_event_ids: events.slice(0, 8).map((event) => event.id),
    summary: 'La secuencia P01→P05 muestra transición de arquitectura declarativa a organismo operacional: membrana, eventos, persistencia, adaptadores y patrones derivados.',
    next_action: 'Mantener todo evento nuevo como evidencia; no crear módulos nuevos sin integrarlos a patrones o publicación.'
  });

  const attractors = patterns.filter((pattern) => pattern.type === 'attractor');
  const institutionalMemory = patterns.filter((pattern) => pattern.type === 'institutional_memory');
  const persistentPatterns = patterns.filter((pattern) => pattern.type === 'persistent_pattern');

  return {
    persistentPatterns,
    attractors,
    institutionalMemory,
    patternCount: patterns.length,
    canFeedRegime: persistentPatterns.length > 0 && signalEvents.length > 0,
    canSupportAttractor: attractors.length > 0,
    regime: persistentPatterns.length > 0 && attractors.length > 0 ? 'operational_seeded' : 'persistent_local_degraded'
  };
}
