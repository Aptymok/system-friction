import type { CSSProperties } from 'react';
import { buildOperationalState } from '@/lib/operational/state';

export const dynamic = 'force-dynamic';

export default function ScoreFrictionOperationalPage() {
  const state = buildOperationalState();
  const organs = state.organs;
  const live = organs.filter((organ) => organ.status === 'vivo').length;
  const partial = organs.filter((organ) => organ.status === 'parcial').length;
  const missing = organs.filter((organ) => organ.status === 'ausente').length;

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.kicker}>SYSTEM FRICTION INSTITUTE · OPERATIONAL MEMBRANE P02</p>
        <h1 style={styles.title}>ScoreFriction Operational</h1>
        <p style={styles.lede}>
          P02 agrega circulación mínima: eventos operacionales, oportunidad Edwing, decisión de gobernanza,
          borrador publicable y estado central enriquecido. Todavía no persiste en base de datos; eso corresponde a P03.
        </p>
        <div style={styles.metrics}>
          <Metric label="RÉGIMEN" value={state.systemRegime} small />
          <Metric label="EVENTOS" value={state.eventCount} />
          <Metric label="VIVOS" value={live} />
          <Metric label="AUSENTES + PARCIALES" value={missing + partial} />
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Último estado operacional</h2>
        <div style={styles.statusGrid}>
          <StatusBlock title="Observación" value={state.latestObservation?.summary || 'Sin observación'} />
          <StatusBlock title="Decisión" value={state.latestDecision?.reason || 'Sin decisión'} />
          <StatusBlock title="Oportunidad" value={state.latestOpportunity?.summary || 'Sin oportunidad'} />
          <StatusBlock title="Publicación" value={state.latestPublication?.summary || 'Sin borrador'} />
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Eventos recientes</h2>
        <div style={styles.eventList}>
          {state.events.slice(0, 8).map((event) => (
            <article key={event.id} style={styles.eventCard}>
              <div style={styles.cardHeader}>
                <span style={styles.status}>{event.kind}</span>
                <span style={styles.risk}>risk:{event.risk || 'medium'}</span>
              </div>
              <h3 style={styles.eventTitle}>{event.title}</h3>
              <p style={styles.eventSummary}>{event.summary}</p>
              <p style={styles.next}><strong>Siguiente acción:</strong> {event.next_action || 'Clasificar.'}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.grid}>
        {organs.map((organ) => (
          <article key={organ.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.status}>{organ.status}</span>
              <span style={styles.risk}>risk:{organ.risk}</span>
            </div>
            <h2 style={styles.cardTitle}>{organ.name}</h2>
            <p style={styles.question}>{organ.question}</p>
            <Block title="Entra" items={organ.input} />
            <Block title="Sale" items={organ.output} />
            <Block title="APIs" items={organ.linkedApis} mono />
            {organ.latestEvent ? <p style={styles.next}><strong>Evento:</strong> {organ.latestEvent.title}</p> : null}
            <p style={styles.next}><strong>Siguiente acción:</strong> {organ.nextAction}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric(props: { label: string; value: number | string; small?: boolean }) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{props.label}</span>
      <strong style={props.small ? styles.metricValueSmall : styles.metricValue}>{props.value}</strong>
    </div>
  );
}

function StatusBlock(props: { title: string; value: string }) {
  return (
    <div style={styles.statusBlock}>
      <span style={styles.metricLabel}>{props.title}</span>
      <p style={styles.statusText}>{props.value}</p>
    </div>
  );
}

function Block(props: { title: string; items: string[]; mono?: boolean }) {
  return (
    <div style={styles.block}>
      <h3 style={styles.blockTitle}>{props.title}</h3>
      <ul style={props.mono ? styles.monoList : styles.list}>
        {props.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: '#050505', color: '#f2f0e8', padding: '32px', fontFamily: 'Georgia, Times New Roman, serif' },
  hero: { border: '1px solid rgba(216,180,95,.28)', background: 'radial-gradient(circle at 78% 18%, rgba(216,180,95,.16), transparent 32%), #090908', padding: '28px', margin: '0 auto 22px', maxWidth: '1180px' },
  kicker: { margin: '0 0 10px', color: '#d8b45f', font: '11px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', letterSpacing: '.14em' },
  title: { margin: 0, fontSize: '44px', fontWeight: 400, letterSpacing: '.02em', textTransform: 'uppercase' },
  lede: { maxWidth: '920px', color: '#cfc7b7', fontSize: '16px', lineHeight: 1.55 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginTop: '22px' },
  metric: { border: '1px solid rgba(216,180,95,.25)', padding: '14px', background: 'rgba(255,255,255,.03)' },
  metricLabel: { display: 'block', color: '#9f946f', font: '10px/1.2 ui-monospace, Menlo, Consolas, monospace', letterSpacing: '.14em', textTransform: 'uppercase' },
  metricValue: { display: 'block', marginTop: '8px', fontSize: '32px', color: '#f0d486' },
  metricValueSmall: { display: 'block', marginTop: '11px', font: '12px/1.4 ui-monospace, Menlo, Consolas, monospace', color: '#f0d486' },
  panel: { maxWidth: '1180px', margin: '0 auto 22px', border: '1px solid rgba(216,180,95,.22)', background: '#0a0a09', padding: '18px' },
  sectionTitle: { margin: '0 0 14px', fontWeight: 400, color: '#f0d486', textTransform: 'uppercase', letterSpacing: '.06em' },
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  statusBlock: { border: '1px solid rgba(216,180,95,.18)', padding: '12px', background: 'rgba(255,255,255,.025)' },
  statusText: { color: '#ddd4c2', fontSize: '13px', lineHeight: 1.45, margin: '8px 0 0' },
  eventList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' },
  eventCard: { border: '1px solid rgba(216,180,95,.18)', padding: '14px', background: 'rgba(255,255,255,.025)' },
  eventTitle: { margin: '12px 0 6px', fontSize: '17px', fontWeight: 400 },
  eventSummary: { margin: 0, color: '#ddd4c2', fontSize: '13px', lineHeight: 1.45 },
  grid: { maxWidth: '1180px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' },
  card: { border: '1px solid rgba(216,180,95,.22)', background: '#0a0a09', padding: '18px', minHeight: '360px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid rgba(216,180,95,.18)', paddingBottom: '10px' },
  status: { color: '#f0d486', font: '10px/1.2 ui-monospace, Menlo, Consolas, monospace', letterSpacing: '.14em', textTransform: 'uppercase' },
  risk: { color: '#9f946f', font: '10px/1.2 ui-monospace, Menlo, Consolas, monospace' },
  cardTitle: { margin: '14px 0 6px', fontSize: '22px', fontWeight: 400 },
  question: { margin: '0 0 14px', color: '#d8b45f', fontSize: '14px' },
  block: { marginTop: '12px' },
  blockTitle: { margin: '0 0 5px', color: '#9f946f', font: '10px/1.2 ui-monospace, Menlo, Consolas, monospace', letterSpacing: '.14em', textTransform: 'uppercase' },
  list: { margin: 0, paddingLeft: '18px', color: '#ddd4c2', fontSize: '13px', lineHeight: 1.45 },
  monoList: { margin: 0, paddingLeft: '18px', color: '#ddd4c2', font: '11px/1.45 ui-monospace, Menlo, Consolas, monospace' },
  next: { margin: '14px 0 0', color: '#f2f0e8', fontSize: '13px', lineHeight: 1.45 },
};
