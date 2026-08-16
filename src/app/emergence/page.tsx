import type { Metadata } from 'next';
import Link from 'next/link';
import { SFI_PUBLIC_EMERGENCE } from '@/lib/emergence/publicEmergence';
import './emergence.css';

export const dynamic = 'force-static';

const DESCRIPTION =
  'A governed public observation window in which System Friction Institute measures its own external emergence without collapsing publication, attention or model output into evidence.';

export const metadata: Metadata = {
  title: 'Public Emergence · SFI-EMG-0001',
  description: DESCRIPTION,
  alternates: { canonical: '/emergence' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'SFI / PUBLIC EMERGENCE · SFI-EMG-0001',
    description: DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SFI / PUBLIC EMERGENCE · SFI-EMG-0001',
    description: DESCRIPTION,
  },
};

function metricValue(value: number | null, unit: 'count' | 'ratio' | 'seconds') {
  if (value === null) return 'UNMEASURED';
  if (unit === 'ratio') return `${Math.round(value * 100)}%`;
  if (unit === 'seconds') return `${Math.round(value)}s`;
  return String(value);
}

export default function PublicEmergencePage() {
  const experiment = SFI_PUBLIC_EMERGENCE;

  return (
    <main className="emg-root">
      <header className="emg-head" data-sfi-field-anchor="emergence-header">
        <div>
          <span>SYSTEM FRICTION INSTITUTE · PUBLIC OBSERVATION</span>
          <h1>PUBLIC<br />EMERGENCE</h1>
          <p>An institution observing its own transition from built infrastructure to externally measurable operation.</p>
        </div>
        <dl>
          <div><dt>EXPERIMENT</dt><dd>{experiment.id}</dd></div>
          <div><dt>OBJECT</dt><dd>{experiment.object.id}</dd></div>
          <div><dt>STATE</dt><dd>{experiment.state}</dd></div>
          <div><dt>WINDOW</dt><dd>{experiment.window.openedOn} → {experiment.window.closesOn}</dd></div>
        </dl>
      </header>

      <section className="emg-boundary" data-sfi-field-anchor="emergence-boundary">
        {experiment.epistemicBoundary.map((item) => <strong key={item}>{item}</strong>)}
      </section>

      <section className="emg-grid">
        <article className="emg-panel emg-question" data-sfi-field-anchor="emergence-question">
          <header><span>01 / OBJECT + QUESTION</span><b>DECLARED</b></header>
          <small>{experiment.object.type.toUpperCase()} · {experiment.object.label}</small>
          <h2>{experiment.question}</h2>
          <p>This page is a public record of the experiment. It is not, by itself, evidence that SFI has achieved authority, traction, validation or causal influence.</p>
        </article>

        <article className="emg-panel emg-trace" data-sfi-field-anchor="emergence-trace">
          <header><span>02 / INITIAL PUBLIC TRACE</span><b>{experiment.initialTrace.epistemicClass.toUpperCase()}</b></header>
          <small>{experiment.initialTrace.id}</small>
          <h2>{experiment.initialTrace.title}</h2>
          <p>{experiment.initialTrace.statement}</p>
          <div className="emg-state">{experiment.initialTrace.status}</div>
        </article>
      </section>

      <section className="emg-panel emg-protocol" data-sfi-field-anchor="emergence-protocol">
        <header><span>03 / PROTOCOL</span><b>PRE-REGISTERED SEQUENCE</b></header>
        <div>
          {experiment.protocol.map((step, index) => (
            <article key={step.key}>
              <small>{String(index + 1).padStart(2, '0')}</small>
              <strong>{step.key}</strong>
              <p>{step.purpose}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="emg-panel emg-metrics" data-sfi-field-anchor="emergence-baseline">
        <header><span>04 / BASELINE + RETURN METRICS</span><b>NO VALUES INVENTED</b></header>
        <div>
          {experiment.metrics.map((metric) => (
            <article key={metric.key} data-state={metric.state}>
              <span>{metric.label}</span>
              <strong>{metricValue(metric.value, metric.unit)}</strong>
              <small>{metric.state} · {metric.source}</small>
              <p>{metric.interpretation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="emg-panel emg-lineage" data-sfi-field-anchor="emergence-lineage">
        <header><span>05 / PUBLIC LINEAGE</span><b>{experiment.campaign.key}</b></header>
        <div className="emg-lineage-flow">
          <span>EXTERNAL SIGNAL</span><i>→</i><span>ATTRIBUTED VISIT</span><i>→</i><span>SFI SURFACE</span><i>→</i><span>FIELD / OBSERVATORY</span><i>→</i><span>RETURN</span><i>→</i><span>AUDIT</span>
        </div>
        <p>Campaign acquisition is retained only through allowlisted, non-PII attribution parameters. A social publication remains a communication record until independent evidence supports a stronger claim.</p>
      </section>

      <section className="emg-exits" data-sfi-field-anchor="emergence-exits">
        <div>
          <span>OBSERVE</span>
          <h2>Inspect the world-state surface.</h2>
          <Link href="/observatory?origin=%2Femergence&scene=observation&focus=world-state&mode=longitudinal">ENTER OBSERVATORY ↗</Link>
        </div>
        <div>
          <span>ENGAGE</span>
          <h2>Bring a system into the governed field.</h2>
          <Link href="/field?origin=%2Femergence&scene=field&focus=intake&mode=engage&intent=engage">BRING A SYSTEM INTO FIELD ↗</Link>
        </div>
      </section>

      <footer className="emg-footer">
        <span>{experiment.id}</span>
        <strong>OBSERVE → PERTURB → WAIT → RETURN → AUDIT</strong>
        <small>{experiment.window.timezone}</small>
      </footer>
    </main>
  );
}
