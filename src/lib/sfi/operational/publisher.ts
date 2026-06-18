import { appendSfiOperationalEvent, readSfiOperationalEvents, type SfiOperationalEvent } from '@/lib/sfi/operational/events';
import { deriveSfiOperationalPatterns } from '@/lib/sfi/operational/patterns';

export type SfiPublicationDraft = {
  title: string;
  channel: 'medium_sfi' | 'linkedin' | 'atlas_report' | 'longitudinal_report' | 'site_report';
  status: 'draft';
  source_event_ids: string[];
  body: string;
  summary: string;
  created_at: string;
};

function newest(events: SfiOperationalEvent[], limit = 8) {
  return [...events]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function buildSfiPublicationDraft(channel: SfiPublicationDraft['channel'] = 'medium_sfi'): SfiPublicationDraft {
  const events = readSfiOperationalEvents();
  const derived = deriveSfiOperationalPatterns(events);
  const recent = newest(events, 8);

  const latestSignal = [...events].reverse().find((event) => event.kind === 'signal');
  const latestDecision = [...events].reverse().find((event) => event.kind === 'governance_decision');
  const latestOpportunity = [...events].reverse().find((event) => event.kind === 'opportunity');

  const title =
    latestSignal?.title
      ? `SFI Operational Signal: ${latestSignal.title}`
      : 'SFI Operational Signal: organismo en transición';

  const patternLines = [
    ...derived.persistentPatterns,
    ...derived.attractors,
    ...derived.institutionalMemory
  ].map((pattern) => `- ${pattern.label}: ${pattern.summary}`);

  const eventLines = recent.map((event) => `- ${event.created_at} · ${event.organ}/${event.kind}: ${event.title}`);

  const body = [
    '# ' + title,
    '',
    '## Observación',
    clean(latestSignal?.summary || 'La membrana operacional de SFI registra eventos, patrones y atractores derivados desde evidencia persistente.'),
    '',
    '## Patrones derivados',
    patternLines.length ? patternLines.join('\n') : '- Sin patrones suficientes todavía.',
    '',
    '## Decisión vigente',
    clean(latestDecision?.summary || 'Sin decisión de gobernanza reciente.'),
    '',
    '## Oportunidad vigente',
    clean(latestOpportunity?.summary || 'Sin oportunidad registrada.'),
    '',
    '## Eventos recientes',
    eventLines.join('\n'),
    '',
    '## Ruta',
    derived.canFeedRegime
      ? 'El organismo ya puede alimentar régimen operacional desde eventos persistidos. Siguiente paso: convertir señales en observaciones ScoreFriction normalizadas.'
      : 'El organismo todavía requiere una señal viva suficiente para alimentar régimen.'
  ].join('\n');

  return {
    title,
    channel,
    status: 'draft',
    source_event_ids: recent.map((event) => event.id),
    body,
    summary: clean(latestSignal?.summary || 'Borrador generado desde eventos persistidos de la membrana operacional SFI.'),
    created_at: new Date().toISOString()
  };
}

export function createSfiPublicationDraftEvent(channel: SfiPublicationDraft['channel'] = 'medium_sfi') {
  const draft = buildSfiPublicationDraft(channel);

  const event = appendSfiOperationalEvent({
    organ: 'publisher',
    kind: 'publication_draft',
    title: draft.title,
    summary: draft.summary,
    source: '/api/publisher/draft',
    risk: 'low',
    status: 'drafted',
    payload: {
      channel: draft.channel,
      source_event_ids: draft.source_event_ids,
      body: draft.body
    },
    next_action: 'Revisar borrador y decidir si se publica, se archiva o se transforma en reporte.'
  });

  return { draft, event };
}
