import {
  SfiCinematicSurface,
  type SfiCinematicInsight,
  type SfiCinematicNode,
  type SfiCinematicStat,
  type SfiCinematicTimelineItem,
} from '@/components/sfi/cinematic/SfiCinematicSurface';
import { getWorldVectorStatus, getWorldVectorToday } from '@/lib/world-vector/readModel';

export const dynamic = 'force-dynamic';

function value(value: number | null, digits = 3) {
  return value === null ? 'NO_VALUE' : value.toFixed(digits);
}

export default async function WorldVectorPage() {
  const [today, status] = await Promise.all([getWorldVectorToday(), getWorldVectorStatus()]);
  const observation = today.observation;
  const nodes: SfiCinematicNode[] = observation.domain_values.map((domain, index) => ({
    id: `world-domain:${domain.domain}`,
    label: domain.domain,
    type: 'WORLD DOMAIN',
    value: value(domain.value),
    status: domain.confidence === null ? 'CONFIDENCE MISSING' : `conf ${domain.confidence.toFixed(3)} · ${domain.source_count} sources`,
    tone: domain.value === null ? 'MISSING' : 'DERIVED',
    selected: index === 0,
  }));
  const insights: SfiCinematicInsight[] = [
    ...(observation.interpretation ? [{ id: 'interpretation', tone: 'DERIVED' as const, statement: observation.interpretation, at: observation.observed_at }] : []),
    ...observation.dominant_sources.map((source) => ({
      id: `source:${source.key}`,
      tone: source.value === null ? 'MISSING' as const : 'DERIVED' as const,
      statement: `${source.label} · ${source.domain} · ${value(source.value)} · confidence ${source.confidence === null ? 'NO_VALUE' : source.confidence.toFixed(3)}`,
      at: observation.observed_at,
    })),
    ...[...new Set([...observation.warnings, ...status.warnings])].map((warning, index) => ({ id: `warning:${index}`, tone: 'MISSING' as const, statement: warning })),
  ];
  const timeline: SfiCinematicTimelineItem[] = observation.observed_at ? [{
    id: observation.source_snapshot_id ?? `world:${observation.observed_at}`,
    at: observation.observed_at,
    label: observation.dominant_signal ?? 'World Vector observation',
    type: observation.status.toUpperCase(),
    tone: observation.status === 'observed' ? 'OBSERVED' : observation.status === 'failed' ? 'CONTRADICTED' : 'MISSING',
  }] : [];
  const sourceCount = observation.domain_values.reduce((sum, domain) => sum + domain.source_count, 0);
  const evidenceStats: SfiCinematicStat[] = [
    { label: 'SNAPSHOT', value: observation.source_snapshot_id ?? 'MISSING', detail: 'WorldSpect source snapshot identity.', tone: observation.source_snapshot_id ? 'OBSERVED' : 'MISSING' },
    { label: 'SOURCE COUNT', value: String(sourceCount), detail: 'Source contributions across domain values; not a unique-source estimate.', tone: sourceCount ? 'DERIVED' : 'MISSING' },
    { label: 'RECENT SAMPLES', value: String(status.pulse.sample_count), detail: 'Recent World Vector history available to the read model.', tone: status.pulse.sample_count ? 'OBSERVED' : 'MISSING' },
  ];
  const mihmStats: SfiCinematicStat[] = [
    { label: 'W_10', value: 'NO_VALUE', detail: 'No synthetic W_10 is fabricated from demonstration constants. A value must come from a declared canonical input envelope.', tone: 'MISSING' },
    { label: 'Φ_SFI', value: 'NO_VALUE', detail: 'World Vector does not inherit institutional MIHM state.', tone: 'MISSING' },
  ];
  const frictionStats: SfiCinematicStat[] = [
    { label: 'FRICTION', value: 'NO_VALUE', detail: 'Domain dispersion is not automatically labeled as systemic friction.', tone: 'MISSING' },
    { label: 'DOMINANT SIGNAL', value: observation.dominant_signal ?? 'MISSING', detail: 'Derived from the current World Vector observation.', tone: observation.dominant_signal ? 'DERIVED' : 'MISSING' },
  ];
  const regimeStats: SfiCinematicStat[] = [
    { label: 'SECTOR', value: today.cycle_day.sectorLabel, detail: `${today.cycle_day.dayOfWeek} · ${today.cycle_day.sector}`, tone: 'GOVERNED' },
    { label: 'OBSERVATION', value: observation.status.toUpperCase(), detail: `confidence ${observation.confidence.toFixed(3)}`, tone: observation.status === 'observed' ? 'OBSERVED' : 'MISSING' },
    { label: 'CYCLE', value: `${today.cycle_range.cycle_start_date} → ${today.cycle_range.cycle_end_date}`, detail: today.cycle_day.isCycleClose ? 'cycle close day' : 'cycle open', tone: 'GOVERNED' },
  ];
  const returnStats: SfiCinematicStat[] = [
    { label: 'PERSISTENCE', value: today.persistence.enabled ? 'READY' : 'BLOCKED', detail: today.persistence.reason, tone: today.persistence.enabled ? 'GOVERNED' : 'MISSING' },
    { label: 'ROOT AUTHORITY', value: 'NO', detail: 'World Vector is observation/context only.', tone: 'GOVERNED' },
    { label: 'CANONICAL WRITE BY VIEW', value: 'NO', detail: 'Rendering the observation does not publish or govern it.', tone: 'GOVERNED' },
  ];

  return (
    <SfiCinematicSurface
      brand="WORLD VECTOR"
      subtitle="CONTEXT OBSERVATION · SYSTEM FRICTION INSTITUTE"
      crumbs={[
        { label: 'SECTOR', value: today.cycle_day.sector, tone: 'accent' },
        { label: 'DAY', value: today.cycle_day.dayOfWeek },
        { label: 'STATUS', value: observation.status.toUpperCase() },
        { label: 'CONFIDENCE', value: observation.confidence.toFixed(3) },
      ]}
      timeWindow={`${today.cycle_range.cycle_start_date} → ${today.cycle_range.cycle_end_date}`}
      integrity={observation.status}
      artifactId={observation.source_snapshot_id}
      certificateState="READ ONLY OBSERVATION"
      mode="WORLD CONTEXT"
      generatedAt={observation.observed_at}
      nodes={nodes}
      relations={[]}
      fieldLabel="WORLD DOMAIN FIELD"
      fieldDetail="Domain values are current read-model outputs. Geometry is visual only; no cross-domain relation or causal edge is fabricated."
      insights={insights}
      timeline={timeline}
      evidenceStats={evidenceStats}
      mihmStats={mihmStats}
      frictionStats={frictionStats}
      regimeStats={regimeStats}
      returnStats={returnStats}
      actions={[]}
      commands={[]}
      footer={<><span>WORLD VECTOR OBSERVES CONTEXT · ROOT DECIDES ACTION</span><span>NO APPROVAL · NO PUBLISHING · NO CYCLE CLOSE · NO PRIVATE EVIDENCE EXPOSURE</span></>}
    />
  );
}
