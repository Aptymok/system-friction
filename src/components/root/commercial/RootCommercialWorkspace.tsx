'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import './root-commercial.css';

type CommercialProposalStatus =
  | 'draft'
  | 'internal_review'
  | 'approved'
  | 'sent'
  | 'viewed'
  | 'negotiation'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';

type Row = Record<string, unknown>;

type Workspace = {
  schemaReady: boolean;
  warnings: string[];
  clients: Row[];
  opportunities: Row[];
  proposals: Row[];
  sourceProposals: Row[];
  counts: {
    clients: number;
    openOpportunities: number;
    draftProposals: number;
    activeProposals: number;
    acceptedProposals: number;
  };
};

type FinderResult = {
  ifnorm?: {
    entity_name?: string;
    person_or_role?: string;
    sector?: string;
    detected_pain?: string;
    recommended_offer?: string;
    recommended_action?: string;
    p_response?: number;
    p_meeting?: number;
    p_paid_diagnostic?: number;
    status?: string;
  };
  warnings?: string[];
};

const EMPTY_WORKSPACE: Workspace = {
  schemaReady: false,
  warnings: [],
  clients: [],
  opportunities: [],
  proposals: [],
  sourceProposals: [],
  counts: {
    clients: 0,
    openOpportunities: 0,
    draftProposals: 0,
    activeProposals: 0,
    acceptedProposals: 0,
  },
};

const TRANSITIONS: Record<string, CommercialProposalStatus[]> = {
  draft: ['internal_review'],
  internal_review: ['draft', 'approved'],
  approved: ['sent'],
  sent: ['viewed', 'negotiation', 'accepted', 'rejected', 'expired'],
  viewed: ['negotiation', 'accepted', 'rejected', 'expired'],
  negotiation: ['accepted', 'rejected', 'expired'],
  accepted: ['converted'],
};

function value(row: Row, key: string) {
  const item = row[key];
  return typeof item === 'string' || typeof item === 'number' ? String(item) : '';
}

function numberValue(row: Row, key: string) {
  const item = row[key];
  return typeof item === 'number' ? item : Number(item ?? 0);
}

function money(amount: unknown, currency: unknown) {
  const number = typeof amount === 'number' ? amount : Number(amount ?? 0);
  if (!Number.isFinite(number)) return 'NO MEDIDO';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: typeof currency === 'string' && currency ? currency : 'MXN',
    maximumFractionDigits: 0,
  }).format(number);
}

function shortDate(input: unknown) {
  return typeof input === 'string' ? input.slice(0, 10) : 'NO MEDIDO';
}

export function RootCommercialWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [finder, setFinder] = useState<FinderResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/root/commercial', { cache: 'no-store', credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok || !body.data) throw new Error(body?.error ?? `HTTP ${response.status}`);
      setWorkspace(body.data);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'commercial_workspace_failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(intent: string, payload: Row) {
    if (!window.confirm('Confirmar mutación comercial gobernada. Esta acción no envía mensajes ni documentos externos.')) return;
    setRunning(intent);
    setMessage(null);
    try {
      const response = await fetch('/api/root/commercial', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, payload }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setMessage(`${intent}: persisted`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'commercial_mutation_failed');
    } finally {
      setRunning(null);
    }
  }

  async function runFinder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setRunning('client_finder');
    setMessage(null);
    try {
      const response = await fetch('/api/root/agentic/client-finder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      setFinder(body);
      setMessage('IFNORM candidate generated. No outreach was executed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'client_finder_failed');
    } finally {
      setRunning(null);
    }
  }

  const clientsById = useMemo(
    () => new Map(workspace.clients.map((client) => [value(client, 'id'), value(client, 'name')])),
    [workspace.clients],
  );

  const opportunitiesById = useMemo(
    () => new Map(workspace.opportunities.map((opportunity) => [value(opportunity, 'id'), opportunity])),
    [workspace.opportunities],
  );

  return (
    <main className="commercial-shell">
      <header className="commercial-topbar">
        <div>
          <span>ROOT / COMMERCIAL CONVERSION</span>
          <h1>CLIENT PROPOSALS</h1>
        </div>
        <div className="commercial-topbar-actions">
          <span className={workspace.schemaReady ? 'ready' : 'blocked'}>
            {workspace.schemaReady ? 'SCHEMA READY' : 'SCHEMA NOT APPLIED'}
          </span>
          <button type="button" onClick={() => void load()} disabled={loading}>REFRESH</button>
          <a href="/root">RETURN TO ROOT</a>
        </div>
      </header>

      <section className="commercial-metrics">
        <article><span>CLIENTS</span><strong>{workspace.counts.clients}</strong></article>
        <article><span>OPEN OPPORTUNITIES</span><strong>{workspace.counts.openOpportunities}</strong></article>
        <article><span>DRAFT / REVIEW</span><strong>{workspace.counts.draftProposals}</strong></article>
        <article><span>ACTIVE PROPOSALS</span><strong>{workspace.counts.activeProposals}</strong></article>
        <article><span>ACCEPTED / CONVERTED</span><strong>{workspace.counts.acceptedProposals}</strong></article>
      </section>

      {workspace.warnings.length > 0 ? (
        <aside className="commercial-warning">
          <strong>DATABASE READINESS</strong>
          {workspace.warnings.map((warning) => <code key={warning}>{warning}</code>)}
          <p>Apply migration: supabase/migrations/20260802144500_root_commercial_proposals.sql</p>
        </aside>
      ) : null}

      {message ? <div className="commercial-message">{message}</div> : null}

      <section className="commercial-grid">
        <article className="commercial-panel finder">
          <header><span>01</span><h2>CLIENT FINDER → IFNORM</h2></header>
          <form onSubmit={runFinder}>
            <label>ENTITY<input name="entityName" placeholder="Company or institution" /></label>
            <label>PERSON / ROLE<input name="personOrRole" placeholder="Decision role" /></label>
            <label>SECTOR<input name="sector" placeholder="Sector" /></label>
            <label>PUBLIC SIGNAL<textarea name="publicSignal" placeholder="Observed public friction or signal" /></label>
            <label>SOURCE<input name="source" placeholder="Public source or manual observation" /></label>
            <button type="submit" disabled={running === 'client_finder'}>{running === 'client_finder' ? 'ANALYZING' : 'RUN CLIENT FINDER'}</button>
          </form>
          {finder?.ifnorm ? (
            <div className="finder-result">
              <strong>{finder.ifnorm.entity_name || 'UNNAMED ENTITY'}</strong>
              <p>{finder.ifnorm.detected_pain}</p>
              <dl>
                <div><dt>OFFER</dt><dd>{finder.ifnorm.recommended_offer}</dd></div>
                <div><dt>ACTION</dt><dd>{finder.ifnorm.recommended_action}</dd></div>
                <div><dt>P RESPONSE</dt><dd>{Number(finder.ifnorm.p_response ?? 0).toFixed(2)}</dd></div>
                <div><dt>P MEETING</dt><dd>{Number(finder.ifnorm.p_meeting ?? 0).toFixed(2)}</dd></div>
                <div><dt>P PAID DIAGNOSTIC</dt><dd>{Number(finder.ifnorm.p_paid_diagnostic ?? 0).toFixed(2)}</dd></div>
              </dl>
            </div>
          ) : null}
        </article>

        <article className="commercial-panel">
          <header><span>02</span><h2>REGISTER CLIENT</h2></header>
          <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void mutate('create_client', Object.fromEntries(form.entries()));
          }}>
            <label>NAME<input name="name" required defaultValue={finder?.ifnorm?.entity_name ?? ''} /></label>
            <label>SECTOR<input name="sector" defaultValue={finder?.ifnorm?.sector ?? ''} /></label>
            <label>WEBSITE<input name="website" type="url" /></label>
            <label>CONTACT NAME<input name="contactName" /></label>
            <label>CONTACT ROLE<input name="contactRole" defaultValue={finder?.ifnorm?.person_or_role ?? ''} /></label>
            <label>CONTACT EMAIL<input name="contactEmail" type="email" /></label>
            <input name="source" type="hidden" value={finder ? 'client_finder' : 'manual'} />
            <label>NOTES<textarea name="notes" defaultValue={finder?.ifnorm?.detected_pain ?? ''} /></label>
            <button type="submit" disabled={running === 'create_client'}>CREATE CLIENT</button>
          </form>
        </article>

        <article className="commercial-panel">
          <header><span>03</span><h2>CREATE OPPORTUNITY</h2></header>
          <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void mutate('create_opportunity', Object.fromEntries(form.entries()));
          }}>
            <label>CLIENT<select name="clientId" required defaultValue=""><option value="" disabled>SELECT</option>{workspace.clients.map((client) => <option key={value(client, 'id')} value={value(client, 'id')}>{value(client, 'name')}</option>)}</select></label>
            <label>TITLE<input name="title" required placeholder="Paid diagnostic / pilot / engagement" /></label>
            <label>PROBLEM STATEMENT<textarea name="problemStatement" required defaultValue={finder?.ifnorm?.detected_pain ?? ''} /></label>
            <label>RECOMMENDED OFFER<input name="recommendedOffer" defaultValue={finder?.ifnorm?.recommended_offer ?? ''} /></label>
            <label>ESTIMATED VALUE<input name="estimatedValue" type="number" min="0" step="1" /></label>
            <label>CURRENCY<select name="currency" defaultValue="MXN"><option>MXN</option><option>USD</option><option>EUR</option></select></label>
            <label>PROBABILITY<input name="probability" type="number" min="0" max="1" step="0.01" defaultValue={finder?.ifnorm?.p_paid_diagnostic ?? 0} /></label>
            <label>SOURCE ACTION PROPOSAL<select name="sourceActionProposalId" defaultValue=""><option value="">NONE</option>{workspace.sourceProposals.map((proposal) => <option key={value(proposal, 'id')} value={value(proposal, 'id')}>{value(proposal, 'title') || value(proposal, 'proposal_type') || value(proposal, 'id')}</option>)}</select></label>
            <label>NEXT ACTION<input name="nextAction" defaultValue={finder?.ifnorm?.recommended_action ?? ''} /></label>
            <button type="submit" disabled={running === 'create_opportunity'}>CREATE OPPORTUNITY</button>
          </form>
        </article>

        <article className="commercial-panel proposal-builder">
          <header><span>04</span><h2>BUILD COMMERCIAL PROPOSAL</h2></header>
          <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void mutate('create_proposal', Object.fromEntries(form.entries()));
          }}>
            <label>OPPORTUNITY<select name="opportunityId" required defaultValue=""><option value="" disabled>SELECT</option>{workspace.opportunities.filter((opportunity) => !['won', 'lost', 'archived'].includes(value(opportunity, 'stage'))).map((opportunity) => <option key={value(opportunity, 'id')} value={value(opportunity, 'id')}>{clientsById.get(value(opportunity, 'client_id'))} · {value(opportunity, 'title')}</option>)}</select></label>
            <label>TITLE<input name="title" required /></label>
            <label>DIAGNOSIS<textarea name="diagnosis" required /></label>
            <label>SERVICE SCOPE<textarea name="serviceScope" required /></label>
            <label>DELIVERABLES<textarea name="deliverables" placeholder="One deliverable per line" /></label>
            <label>DURATION DAYS<input name="durationDays" type="number" min="1" /></label>
            <label>PRICE<input name="priceAmount" type="number" min="0" /></label>
            <label>CURRENCY<select name="currency" defaultValue="MXN"><option>MXN</option><option>USD</option><option>EUR</option></select></label>
            <label>CONFIDENCE<input name="confidence" type="number" min="0" max="1" step="0.01" defaultValue="0.5" /></label>
            <label>VALID UNTIL<input name="validUntil" type="date" /></label>
            <label>ASSUMPTIONS<textarea name="assumptions" placeholder="One assumption per line" /></label>
            <label>EXCLUSIONS<textarea name="exclusions" placeholder="One exclusion per line" /></label>
            <label>EVIDENCE IDS<textarea name="evidenceIds" placeholder="UUIDs, one per line" /></label>
            <label>SOURCE ACTION PROPOSAL IDS<textarea name="sourceActionProposalIds" placeholder="UUIDs, one per line" /></label>
            <button type="submit" disabled={running === 'create_proposal'}>CREATE VERSION 1</button>
          </form>
        </article>
      </section>

      <section className="commercial-register">
        <header><span>05</span><h2>COMMERCIAL REGISTER</h2></header>
        <div className="commercial-table-wrap">
          <table>
            <thead><tr><th>PROPOSAL</th><th>CLIENT</th><th>OPPORTUNITY</th><th>STATUS</th><th>VALUE</th><th>CONF.</th><th>VALID</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {workspace.proposals.map((proposal) => {
                const opportunity = opportunitiesById.get(value(proposal, 'opportunity_id'));
                const status = value(proposal, 'status');
                const transitions = TRANSITIONS[status] ?? [];
                return (
                  <tr key={value(proposal, 'id')}>
                    <td><strong>{value(proposal, 'proposal_number')}</strong><span>{value(proposal, 'title')}</span></td>
                    <td>{clientsById.get(value(proposal, 'client_id')) ?? value(proposal, 'client_id')}</td>
                    <td>{opportunity ? value(opportunity, 'title') : value(proposal, 'opportunity_id')}</td>
                    <td><code>{status}</code></td>
                    <td>{money(proposal.price_amount, proposal.currency)}</td>
                    <td>{numberValue(proposal, 'confidence').toFixed(2)}</td>
                    <td>{shortDate(proposal.valid_until)}</td>
                    <td><div className="transition-actions">{transitions.map((next) => <button type="button" key={next} onClick={() => void mutate('transition_proposal', { proposalId: value(proposal, 'id'), status: next })}>{next.replaceAll('_', ' ')}</button>)}</div></td>
                  </tr>
                );
              })}
              {workspace.proposals.length === 0 ? <tr><td colSpan={8}>NO COMMERCIAL PROPOSALS RECORDED</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="commercial-footer">
        <span>INTERNAL ACTION PROPOSAL ≠ COMMERCIAL PROPOSAL</span>
        <span>No external outreach or document delivery is executed by this surface.</span>
      </footer>
    </main>
  );
}
