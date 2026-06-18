import { getOperationalRegime } from './organs';
import { getOperationalEvents, getRuntimeOrgans, latestEventByKind, latestEventByOrgan } from './events';

export function buildOperationalState() {
  const organs = getRuntimeOrgans();
  const events = getOperationalEvents();
  const rawRegime = getOperationalRegime(organs);
  const hasEvents = events.length > 0;
  const latestOpportunity = latestEventByKind('opportunity');
  const latestDecision = latestEventByKind('governance_decision') || latestEventByKind('decision');
  const latestPublication = latestEventByKind('publication_draft');
  const latestObservation = latestEventByKind('observation') || latestEventByKind('signal') || events[0] || null;

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    systemRegime: hasEvents ? `${rawRegime}_with_events` : rawRegime,
    patch: 'P02',
    statement: 'SFI operational membrane P02: organs are declared, central state exists, and operational events are now registered in memory for circulation testing.',
    organs,
    events: events.slice(0, 20),
    eventCount: events.length,
    latestObservation: latestObservation ? {
      source: latestObservation.source || latestObservation.organ,
      title: latestObservation.title,
      summary: latestObservation.summary,
      created_at: latestObservation.created_at,
      next_action: latestObservation.next_action,
    } : null,
    latestDecision: latestDecision ? {
      decision: latestDecision.title,
      reason: latestDecision.summary,
      risk: latestDecision.risk,
      status: latestDecision.status,
      next_action: latestDecision.next_action,
    } : null,
    latestPublication: latestPublication ? {
      title: latestPublication.title,
      summary: latestPublication.summary,
      status: latestPublication.status,
      payload: latestPublication.payload || {},
    } : null,
    latestOpportunity: latestOpportunity ? {
      title: latestOpportunity.title,
      summary: latestOpportunity.summary,
      risk: latestOpportunity.risk,
      status: latestOpportunity.status,
      payload: latestOpportunity.payload || {},
      next_action: latestOpportunity.next_action,
    } : null,
    runtimeFocus: {
      scorefriction: latestEventByOrgan('scorefriction'),
      evaluator: latestEventByOrgan('evaluator'),
      amv_cognitive_twin: latestEventByOrgan('amv_cognitive_twin'),
      market: latestEventByOrgan('market'),
      governance: latestEventByOrgan('governance'),
      publisher: latestEventByOrgan('publisher'),
    },
    nextPatch: 'P03: persistir eventos en Supabase o storage local y conectar adaptadores reales de ScoreFriction, MIHM y AMV.',
  };
}
