'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import './root-revenue-workspace.css';

type JsonRow = Record<string, unknown>;

type Workspace = {
  schemaReady: boolean;
  warnings: string[];
  clients: JsonRow[];
  opportunities: JsonRow[];
  proposals: JsonRow[];
  sourceProposals: JsonRow[];
  counts: {
    clients: number;
    openOpportunities: number;
    draftProposals: number;
    activeProposals: number;
    acceptedProposals: number;
  };
};

type Analysis = {
  ifnorm?: {
    entity_name?: string;
    person_or_role?: string;
    sector?: string;
    detected_pain?: string;
    public_signal?: string;
    recommended_offer?: string;
    recommended_action?: string;
    suggested_human_message?: string;
    p_response?: number;
    p_meeting?: number;
    p_paid_diagnostic?: number;
    evidence?: string[];
    status?: string;
  };
  warnings?: string[];
};

type SignalDraft = {
  company: string;
  website: string;
  sector: string;
  role: string;
  contactName: string;
  contactEmail: string;
  source: string;
  signal: string;
  notes: string;
  estimatedValue: string;
};

const EMPTY: SignalDraft = {
  company: '',
  website: '',
  sector: '',
  role: '',
  contactName: '',
  contactEmail: '',
  source: '',
  signal: '',
  notes: '',
  estimatedValue: '35000',
};

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function primaryContact(row: JsonRow) {
  const value = row.primary_contact;
  return value && typeof value === 'object' ? value as JsonRow : {};
}

function money(value: unknown, currency = 'MXN') {
  const amount = number(value);
  return amount ? new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount) : 'Sin estimación';
}

async function request(intent: string, payload: JsonRow = {}) {
  const response = await fetch('/api/root/commercial', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent, payload }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
  return body.data;
}

export function RootRevenueWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SignalDraft>(EMPTY);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/root/commercial', { cache: 'no-store', credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      setWorkspace(body.data);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'commercial_workspace_load_failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const clients = workspace?.clients ?? [];
  const opportunities = workspace?.opportunities ?? [];
  const proposals = workspace?.proposals ?? [];
  const clientById = useMemo(() => new Map(clients.map((client) => [String(client.id), client])), [clients]);
  const selected = opportunities.find((row) => String(row.id) === selectedId) ?? opportunities[0] ?? null;
  const selectedClient = selected ? clientById.get(String(selected.client_id)) ?? null : null;
  const selectedProposal = selected ? proposals.find((row) => String(row.opportunity_id) === String(selected.id)) ?? null : null;

  async function analyze() {
    if (!draft.company || !draft.signal) {
      setMessage('Escribe empresa y señal observable antes de ejecutar los agentes.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await request('analyze_signal', {
        entityName: draft.company,
        personOrRole: draft.role,
        sector: draft.sector,
        publicSignal: draft.signal,
        source: draft.source,
        notes: draft.notes,
      }) as Analysis;
      setAnalysis(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'signal_analysis_failed');
    } finally {
      setLoading(false);
    }
  }

  async function persist() {
    if (!analysis?.ifnorm || !draft.company) return;
    setLoading(true);
    setMessage(null);
    try {
      let client = clients.find((row) => text(row.name, '').toLowerCase() === draft.company.trim().toLowerCase());
      if (!client) {
        client = await request('create_client', {
          name: draft.company,
          legalName: draft.company,
          sector: draft.sector,
          website: draft.website,
          contactName: draft.contactName,
          contactRole: draft.role,
          contactEmail: draft.contactEmail,
          source: draft.source || 'root_signal_analysis',
          notes: draft.notes,
        }) as JsonRow;
      }

      const opportunity = await request('create_opportunity', {
        clientId: String(client.id),
        title: `${analysis.ifnorm.recommended_offer ?? 'SFI-DR01'} · ${draft.company}`,
        problemStatement: analysis.ifnorm.detected_pain ?? draft.signal,
        recommendedOffer: analysis.ifnorm.recommended_offer ?? 'SFI-DR01',
        estimatedValue: Number(draft.estimatedValue || 0),
        probability: analysis.ifnorm.p_paid_diagnostic ?? 0.2,
        nextAction: analysis.ifnorm.recommended_action ?? 'Revisar evidencia y aprobar contacto.',
      }) as JsonRow;

      setDraft(EMPTY);
      setAnalysis(null);
      setComposerOpen(false);
      setSelectedId(String(opportunity.id));
      setMessage('Oportunidad persistida. Ya forma parte del pipeline institucional.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'commercial_persistence_failed');
    } finally {
      setLoading(false);
    }
  }

  async function openMail() {
    if (!selected || !selectedClient) return;
    setLoading(true);
    setMessage(null);
    try {
      const contact = primaryContact(selectedClient);
      const draftMail = await request('mail_draft', {
        recipient: text(contact.email, ''),
        company: text(selectedClient.name),
        role: text(contact.role, 'Dirección de Operaciones'),
        pain: text(selected.problem_statement),
        offer: text(selected.recommended_offer, 'SFI-DR01'),
        message: selectedProposal
          ? `${text(contact.name, text(contact.role, 'Equipo responsable'))}:\n\nAdjunto la propuesta ${text(selectedProposal.proposal_number)}: ${text(selectedProposal.title)}.\n\n${text(selectedProposal.diagnosis)}\n\nAlcance: ${text(selectedProposal.service_scope)}\n\nJuan Antonio Marín Liera\nFounder · System Friction Institute`
          : undefined,
      }) as { mailto?: string; requiresRecipient?: boolean };
      if (draftMail.requiresRecipient) {
        setMessage('Falta correo público o autorizado. Registra el contacto antes de abrir Mail.');
        return;
      }
      if (draftMail.mailto) window.location.href = draftMail.mailto;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'mail_draft_failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rrw-root" aria-label="Conversión económica ROOT">
      <header className="rrw-header">
        <div>
          <span>ROOT · CONVERSIÓN ECONÓMICA</span>
          <h2>Observar, seleccionar y actuar sin abandonar el campo.</h2>
          <p>Las señales se convierten en empresa, dolor, evidencia, rol, oferta, contacto y resultado. Ningún artículo completo se presenta como oportunidad.</p>
        </div>
        <button type="button" onClick={() => setComposerOpen((value) => !value)}>{composerOpen ? 'CERRAR CAPTURA' : 'OBSERVAR NUEVA EMPRESA'}</button>
      </header>

      {message ? <div className="rrw-message">{message}</div> : null}
      {workspace?.warnings?.length ? <div className="rrw-warning">{workspace.warnings.join(' · ')}</div> : null}

      <div className="rrw-metrics">
        <article><span>EMPRESAS</span><strong>{workspace?.counts.clients ?? 0}</strong></article>
        <article><span>OPORTUNIDADES ABIERTAS</span><strong>{workspace?.counts.openOpportunities ?? 0}</strong></article>
        <article><span>PROPUESTAS EN PREPARACIÓN</span><strong>{workspace?.counts.draftProposals ?? 0}</strong></article>
        <article><span>PROPUESTAS ACTIVAS</span><strong>{workspace?.counts.activeProposals ?? 0}</strong></article>
        <article><span>CONVERSIONES</span><strong>{workspace?.counts.acceptedProposals ?? 0}</strong></article>
      </div>

      {composerOpen ? (
        <section className="rrw-composer">
          <div className="rrw-form">
            <label>EMPRESA<input value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} placeholder="Nombre verificable" /></label>
            <label>SITIO OFICIAL<input value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} placeholder="https://..." /></label>
            <label>SECTOR<input value={draft.sector} onChange={(event) => setDraft({ ...draft, sector: event.target.value })} /></label>
            <label>ROL COMPRADOR<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} placeholder="Operaciones, CX, Riesgo..." /></label>
            <label>PERSONA PÚBLICA O AUTORIZADA<input value={draft.contactName} onChange={(event) => setDraft({ ...draft, contactName: event.target.value })} /></label>
            <label>CORREO AUTORIZADO<input type="email" value={draft.contactEmail} onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })} /></label>
            <label>FUENTE<input value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} placeholder="URL o procedencia" /></label>
            <label>VALOR INICIAL MXN<input inputMode="numeric" value={draft.estimatedValue} onChange={(event) => setDraft({ ...draft, estimatedValue: event.target.value })} /></label>
            <label className="wide">SEÑAL OBSERVABLE<textarea value={draft.signal} onChange={(event) => setDraft({ ...draft, signal: event.target.value })} placeholder="Hecho, contradicción o dolor visible. No pegues un artículo completo." /></label>
            <label className="wide">NOTAS Y LÍMITES<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
            <div className="rrw-form-actions"><button type="button" onClick={() => void analyze()} disabled={loading}>EJECUTAR AGENTES</button></div>
          </div>

          <aside className="rrw-analysis">
            <span>LECTURA ANTES DE PERSISTIR</span>
            {analysis?.ifnorm ? <>
              <h3>{analysis.ifnorm.entity_name}</h3>
              <p>{analysis.ifnorm.detected_pain}</p>
              <dl>
                <div><dt>Rol</dt><dd>{analysis.ifnorm.person_or_role}</dd></div>
                <div><dt>Oferta</dt><dd>{analysis.ifnorm.recommended_offer}</dd></div>
                <div><dt>Respuesta</dt><dd>{Math.round(number(analysis.ifnorm.p_response) * 100)}%</dd></div>
                <div><dt>Reunión</dt><dd>{Math.round(number(analysis.ifnorm.p_meeting) * 100)}%</dd></div>
                <div><dt>Diagnóstico pagado</dt><dd>{Math.round(number(analysis.ifnorm.p_paid_diagnostic) * 100)}%</dd></div>
                <div><dt>Evidencia</dt><dd>{analysis.ifnorm.evidence?.length ?? 0}</dd></div>
              </dl>
              <button type="button" onClick={() => void persist()} disabled={loading || analysis.ifnorm.status === 'manual_evidence_required'}>PERSISTIR EMPRESA Y OPORTUNIDAD</button>
            </> : <p>La lectura aparecerá aquí dentro del mismo campo. ROOT no cambiará de ruta ni abrirá una tarjeta flotante.</p>}
          </aside>
        </section>
      ) : null}

      <div className="rrw-field">
        <nav className="rrw-stream" aria-label="Pipeline comercial">
          <header><span>PIPELINE</span><b>{opportunities.length}</b></header>
          {opportunities.map((opportunity) => {
            const client = clientById.get(String(opportunity.client_id));
            return <button type="button" key={String(opportunity.id)} className={String(opportunity.id) === String(selected?.id) ? 'active' : ''} onClick={() => setSelectedId(String(opportunity.id))}>
              <span>{text(opportunity.stage)}</span>
              <strong>{text(client?.name, text(opportunity.title))}</strong>
              <p>{text(opportunity.problem_statement)}</p>
              <small>{text(opportunity.recommended_offer)} · {money(opportunity.estimated_value, text(opportunity.currency, 'MXN'))}</small>
            </button>;
          })}
          {!opportunities.length ? <div className="rrw-empty">No hay oportunidades persistidas. Abre “Observar nueva empresa” y ejecuta el primer ciclo.</div> : null}
        </nav>

        <article className="rrw-focus">
          {selected && selectedClient ? <>
            <header>
              <div><span>{text(selected.stage)}</span><h3>{text(selectedClient.name)}</h3></div>
              <b>{money(selected.estimated_value, text(selected.currency, 'MXN'))}</b>
            </header>
            <section className="rrw-pain"><span>DOLOR OBSERVABLE</span><p>{text(selected.problem_statement)}</p></section>
            <div className="rrw-grid">
              <section><span>EMPRESA</span><strong>{text(selectedClient.legal_name, text(selectedClient.name))}</strong><p>{text(selectedClient.sector, 'Sector no registrado')} · {text(selectedClient.website, 'Sitio no registrado')}</p></section>
              <section><span>CONTACTO</span><strong>{text(primaryContact(selectedClient).name, text(primaryContact(selectedClient).role, 'Rol pendiente'))}</strong><p>{text(primaryContact(selectedClient).email, 'Correo pendiente')}</p></section>
              <section><span>OFERTA</span><strong>{text(selected.recommended_offer, 'SFI-DR01')}</strong><p>Probabilidad actual: {Math.round(number(selected.probability) * 100)}%</p></section>
              <section><span>SIGUIENTE ACCIÓN</span><strong>{text(selected.next_action, 'Revisar evidencia')}</strong><p>{text(selected.next_action_at, 'Sin fecha asignada')}</p></section>
            </div>

            {selectedProposal ? <section className="rrw-proposal"><span>PROPUESTA</span><h4>{text(selectedProposal.proposal_number)} · {text(selectedProposal.title)}</h4><p>{text(selectedProposal.diagnosis)}</p><small>{text(selectedProposal.status)} · {money(selectedProposal.price_amount, text(selectedProposal.currency, 'MXN'))}</small></section> : <section className="rrw-proposal missing"><span>PROPUESTA</span><p>Todavía no existe propuesta comercial. La oportunidad permanece visible y no se disfraza como cierre.</p></section>}

            <div className="rrw-actions">
              <button type="button" onClick={() => void openMail()} disabled={loading}>ABRIR BORRADOR EN MAIL</button>
              <button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'ACTUALIZANDO' : 'ACTUALIZAR CAMPO'}</button>
            </div>
          </> : <div className="rrw-empty focus">Selecciona una oportunidad. El expediente, contacto, dolor, oferta, propuesta y acciones aparecerán aquí sin abandonar ROOT.</div>}
        </article>
      </div>
    </section>
  );
}
