'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import './root-prospect-radar.css';

type Source = {
  id: string;
  url: string;
  title: string;
  publisher: string | null;
  snippet: string;
  publishedAt: string | null;
  retrievedAt: string;
  sourceType: string;
  reliability: number;
};

type Report = {
  runId: string;
  generatedAt: string;
  researchProvider: string;
  queryPlan: string[];
  candidates: Array<{ company: string; sector: string; reason: string; confidence: number; sourceUrls: string[] }>;
  company: { name: string; sector: string; region: string; website: string | null };
  observedPain: {
    statement: string;
    affectedGroups: string[];
    observedSince: string | null;
    severity: string;
    evidenceUrls: string[];
    counterEvidence: string[];
  };
  causalChain: Array<{ cause: string; epistemicStatus: string; evidenceUrls: string[] }>;
  criticalWindow: {
    kind: string;
    observedAt: string;
    startDate: string;
    endDate: string;
    horizonDays: number;
    threshold: string;
    triggers: string[];
    counterSignals: string[];
    confidence: number;
    collapseAssessment: string;
    caveat: string;
  };
  sfiFit: {
    eligible: boolean;
    offerId: string;
    offerName: string;
    offerStatus: string;
    problemSfiAddresses: string;
    whySfi: string;
    uniqueCombination: string;
    alternatives: string[];
    confidence: number;
  };
  contact: {
    name: string | null;
    role: string;
    whyThisRole: string;
    channelType: string;
    channel: string | null;
    sourceUrl: string | null;
    verified: boolean;
    caveat: string | null;
  };
  email: { subject: string; body: string };
  proposal: {
    title: string;
    executiveSummary: string;
    objectives: string[];
    scope: string[];
    deliverables: string[];
    timelineDays: number;
    assumptions: string[];
    exclusions: string[];
    finalDocumentMarkdown: string;
  };
  sources: Source[];
  confidence: number;
  epistemicStatus: string;
  limitations: string[];
  warnings: string[];
};

type Health = {
  searchProviders?: { openaiWebSearch?: boolean; braveSearch?: boolean };
  requirements?: string[];
};

function percent(value: number | null | undefined) {
  return `${Math.round(Math.max(0, Math.min(1, Number(value ?? 0))) * 100)}%`;
}

function date(value: string | null | undefined) {
  return value ? value.slice(0, 10) : 'NO MEDIDO';
}

function sourceLabel(url: string, sources: Source[]) {
  return sources.find((source) => source.url === url)?.title ?? url;
}

export function RootProspectRadar() {
  const [health, setHealth] = useState<Health | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/root/agentic/prospect-radar', { credentials: 'include', cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => setHealth(body))
      .catch(() => setHealth(null));
  }, []);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.allowProvisionalOffers = form.get('allowProvisionalOffers') === 'on' ? 'true' : 'false';
    setRunning(true);
    setMessage(null);
    setReport(null);
    try {
      const response = await fetch('/api/root/agentic/prospect-radar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          allowProvisionalOffers: form.get('allowProvisionalOffers') === 'on',
          lookbackDays: Number(form.get('lookbackDays') ?? 120),
          maxCandidates: Number(form.get('maxCandidates') ?? 3),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok || !body.report) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setReport(body.report);
      setMessage(`Research completed · ${body.report.sources?.length ?? 0} public sources · ${body.report.researchProvider}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'prospect_radar_failed');
    } finally {
      setRunning(false);
    }
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  }

  const providerReady = Boolean(health?.searchProviders?.openaiWebSearch || health?.searchProviders?.braveSearch);

  return (
    <main className="pr-shell">
      <header className="pr-topbar">
        <div>
          <span>ROOT / AUTONOMOUS PUBLIC RESEARCH</span>
          <h1>PROSPECT RADAR</h1>
          <p>Internet → evidence → friction hypothesis → threshold window → SFI fit → verified recipient → final dossier.</p>
        </div>
        <div className="pr-topbar-actions">
          <span className={providerReady ? 'ready' : 'blocked'}>{providerReady ? 'WEB SEARCH READY' : 'WEB SEARCH BLOCKED'}</span>
          <a href="/root/commercial">CLIENT PROPOSALS</a>
          <a href="/root">ROOT</a>
        </div>
      </header>

      <section className="pr-provider-strip">
        <article><span>OPENAI WEB SEARCH</span><strong>{health?.searchProviders?.openaiWebSearch ? 'AVAILABLE' : 'MISSING KEY'}</strong></article>
        <article><span>BRAVE SEARCH</span><strong>{health?.searchProviders?.braveSearch ? 'AVAILABLE' : 'MISSING KEY'}</strong></article>
        <article><span>EXECUTION</span><strong>HUMAN APPROVAL ONLY</strong></article>
      </section>

      {!providerReady ? (
        <aside className="pr-blocker">
          <strong>PUBLIC SEARCH PROVIDER REQUIRED</strong>
          <p>Add <code>OPENAI_API_KEY</code> or <code>BRAVE_SEARCH_API_KEY</code> to the server environment. This surface does not generate simulated prospects without public search.</p>
        </aside>
      ) : null}

      <section className="pr-layout">
        <article className="pr-panel pr-control">
          <header><span>01</span><h2>RESEARCH DIRECTIVE</h2></header>
          <form onSubmit={run}>
            <label>MODE
              <select name="mode" defaultValue="discover">
                <option value="discover">DISCOVER COMPANIES</option>
                <option value="investigate">INVESTIGATE ONE COMPANY</option>
              </select>
            </label>
            <label>COMPANY — OPTIONAL
              <input name="company" placeholder="Kavak, FEMSA, company name…" />
            </label>
            <label>REGION
              <input name="region" defaultValue="Mexico" required />
            </label>
            <label>SECTOR — OPTIONAL
              <input name="sector" placeholder="mobility, fintech, retail, public sector…" />
            </label>
            <label>PAIN FOCUS — OPTIONAL
              <textarea name="painFocus" placeholder="Customer trust, operational continuity, employee pressure, regulation, logistics, AI governance…" />
            </label>
            <div className="pr-two">
              <label>LOOKBACK DAYS
                <input name="lookbackDays" type="number" min="7" max="730" defaultValue="120" />
              </label>
              <label>MAX CANDIDATES
                <input name="maxCandidates" type="number" min="1" max="5" defaultValue="3" />
              </label>
            </div>
            <label className="pr-check">
              <input name="allowProvisionalOffers" type="checkbox" />
              Allow internal provisional offers. Canonical-only is safer.
            </label>
            <button type="submit" disabled={running || !providerReady}>{running ? 'RESEARCHING PUBLIC WEB…' : 'RUN AUTONOMOUS RADAR'}</button>
          </form>
          <p className="pr-note">No outreach is executed. The system persists a research run and produces a draft for founder review.</p>
        </article>

        <article className="pr-panel pr-execution">
          <header><span>02</span><h2>EXECUTION STATE</h2></header>
          <dl>
            <div><dt>Provider</dt><dd>{report?.researchProvider ?? 'NOT RUN'}</dd></div>
            <div><dt>Run ID</dt><dd>{report?.runId ?? 'NOT CREATED'}</dd></div>
            <div><dt>Sources</dt><dd>{report?.sources.length ?? 0}</dd></div>
            <div><dt>Confidence</dt><dd>{report ? percent(report.confidence) : 'NO MEDIDO'}</dd></div>
            <div><dt>Epistemic state</dt><dd>{report?.epistemicStatus ?? 'NOT RUN'}</dd></div>
          </dl>
          {message ? <div className="pr-message">{message}</div> : null}
          {report?.warnings.length ? <div className="pr-warning-list">{report.warnings.map((warning) => <code key={warning}>{warning}</code>)}</div> : null}
        </article>
      </section>

      {report ? (
        <>
          <section className="pr-metrics">
            <article><span>COMPANY</span><strong>{report.company.name}</strong></article>
            <article><span>PAIN SEVERITY</span><strong>{report.observedPain.severity}</strong></article>
            <article><span>WINDOW</span><strong>{report.criticalWindow.horizonDays} DAYS</strong></article>
            <article><span>WINDOW CONF.</span><strong>{percent(report.criticalWindow.confidence)}</strong></article>
            <article><span>CONTACT</span><strong>{report.contact.verified ? 'VERIFIED' : 'NOT VERIFIED'}</strong></article>
          </section>

          {report.candidates.length > 0 ? (
            <section className="pr-section">
              <header><span>03</span><h2>RANKED CANDIDATES</h2></header>
              <div className="pr-candidates">
                {report.candidates.map((candidate) => (
                  <article key={`${candidate.company}-${candidate.reason}`}>
                    <div><strong>{candidate.company}</strong><span>{candidate.sector}</span></div>
                    <p>{candidate.reason}</p>
                    <em>{percent(candidate.confidence)}</em>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="pr-grid-results">
            <article className="pr-section">
              <header><span>04</span><h2>OBSERVED PAIN</h2></header>
              <h3>{report.company.name}</h3>
              <p>{report.observedPain.statement}</p>
              <dl>
                <div><dt>Sector</dt><dd>{report.company.sector}</dd></div>
                <div><dt>Region</dt><dd>{report.company.region}</dd></div>
                <div><dt>Observed since</dt><dd>{date(report.observedPain.observedSince)}</dd></div>
                <div><dt>Affected groups</dt><dd>{report.observedPain.affectedGroups.join(', ') || 'NO MEDIDO'}</dd></div>
              </dl>
              {report.observedPain.counterEvidence.length ? <div className="pr-counter"><strong>COUNTEREVIDENCE / POSITIVE SIGNALS</strong>{report.observedPain.counterEvidence.map((item) => <p key={item}>{item}</p>)}</div> : null}
            </article>

            <article className="pr-section">
              <header><span>05</span><h2>CAUSAL CHAIN</h2></header>
              <div className="pr-chain">
                {report.causalChain.map((item, index) => (
                  <div key={`${index}-${item.cause}`}>
                    <code>{item.epistemicStatus}</code>
                    <p>{item.cause}</p>
                    {item.evidenceUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{sourceLabel(url, report.sources)}</a>)}
                  </div>
                ))}
                {!report.causalChain.length ? <p>NO CAUSAL CHAIN RETURNED</p> : null}
              </div>
            </article>

            <article className="pr-section pr-window">
              <header><span>06</span><h2>PROJECTED THRESHOLD WINDOW</h2></header>
              <div className="pr-window-dates"><strong>{report.criticalWindow.startDate}</strong><span>→</span><strong>{report.criticalWindow.endDate}</strong></div>
              <p>{report.criticalWindow.threshold}</p>
              <dl>
                <div><dt>Observed at</dt><dd>{report.criticalWindow.observedAt}</dd></div>
                <div><dt>Horizon</dt><dd>{report.criticalWindow.horizonDays} days</dd></div>
                <div><dt>Confidence</dt><dd>{percent(report.criticalWindow.confidence)}</dd></div>
                <div><dt>Collapse assessment</dt><dd>{report.criticalWindow.collapseAssessment}</dd></div>
              </dl>
              <strong>TRIGGERS</strong>
              <ul>{report.criticalWindow.triggers.map((item) => <li key={item}>{item}</li>)}</ul>
              <strong>COUNTER-SIGNALS</strong>
              <ul>{report.criticalWindow.counterSignals.map((item) => <li key={item}>{item}</li>)}</ul>
              <small>{report.criticalWindow.caveat}</small>
            </article>

            <article className="pr-section pr-fit">
              <header><span>07</span><h2>SFI FIT</h2></header>
              <div className={report.sfiFit.eligible ? 'pr-fit-state eligible' : 'pr-fit-state blocked'}>{report.sfiFit.eligible ? 'ELIGIBLE' : 'INSUFFICIENT EVIDENCE'}</div>
              <h3>{report.sfiFit.offerId} · {report.sfiFit.offerName}</h3>
              <p>{report.sfiFit.problemSfiAddresses}</p>
              <p>{report.sfiFit.whySfi}</p>
              <blockquote>{report.sfiFit.uniqueCombination}</blockquote>
              <dl>
                <div><dt>Offer status</dt><dd>{report.sfiFit.offerStatus}</dd></div>
                <div><dt>Fit confidence</dt><dd>{percent(report.sfiFit.confidence)}</dd></div>
              </dl>
              {report.sfiFit.alternatives.length ? <><strong>ALTERNATIVES TO CONSIDER</strong><ul>{report.sfiFit.alternatives.map((item) => <li key={item}>{item}</li>)}</ul></> : null}
            </article>
          </section>

          <section className="pr-grid-results">
            <article className="pr-section pr-contact">
              <header><span>08</span><h2>VERIFIED RECIPIENT</h2></header>
              <h3>{report.contact.name ?? 'NAME NOT VERIFIED'}</h3>
              <p>{report.contact.role}</p>
              <blockquote>{report.contact.whyThisRole}</blockquote>
              <dl>
                <div><dt>Verification</dt><dd>{report.contact.verified ? 'VERIFIED PUBLIC SOURCE' : 'NOT VERIFIED'}</dd></div>
                <div><dt>Channel type</dt><dd>{report.contact.channelType}</dd></div>
              </dl>
              {report.contact.channel ? <a href={report.contact.channel.startsWith('http') ? report.contact.channel : undefined} target="_blank" rel="noreferrer">{report.contact.channel}</a> : null}
              {report.contact.sourceUrl ? <a href={report.contact.sourceUrl} target="_blank" rel="noreferrer">CONTACT SOURCE</a> : null}
              {report.contact.caveat ? <small>{report.contact.caveat}</small> : null}
            </article>

            <article className="pr-section pr-email">
              <header><span>09</span><h2>FINAL EMAIL DRAFT</h2></header>
              <label>SUBJECT<input readOnly value={report.email.subject} /></label>
              <label>BODY<textarea readOnly value={report.email.body} /></label>
              <button type="button" onClick={() => void copy('email', `Subject: ${report.email.subject}\n\n${report.email.body}`)}>{copied === 'email' ? 'COPIED' : 'COPY EMAIL'}</button>
            </article>
          </section>

          <section className="pr-section pr-document">
            <header><span>10</span><h2>FINAL COMMERCIAL DOSSIER</h2></header>
            <div className="pr-document-actions">
              <button type="button" onClick={() => void copy('document', report.proposal.finalDocumentMarkdown)}>{copied === 'document' ? 'COPIED' : 'COPY DOCUMENT'}</button>
              <a href="/root/commercial">OPEN COMMERCIAL REGISTER</a>
            </div>
            <pre>{report.proposal.finalDocumentMarkdown}</pre>
          </section>

          <section className="pr-section pr-sources">
            <header><span>11</span><h2>PUBLIC EVIDENCE SOURCES</h2></header>
            <div>
              {report.sources.map((source) => (
                <article key={source.url}>
                  <header><code>{source.id}</code><span>{source.sourceType}</span><em>{percent(source.reliability)}</em></header>
                  <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                  <p>{source.snippet || 'No snippet returned by provider.'}</p>
                  <small>{source.publisher} · published {source.publishedAt ?? 'not provided'} · retrieved {date(source.retrievedAt)}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="pr-section pr-limits">
            <header><span>12</span><h2>LIMITS</h2></header>
            {report.limitations.map((item) => <p key={item}>{item}</p>)}
          </section>
        </>
      ) : null}
    </main>
  );
}
