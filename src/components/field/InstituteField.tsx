'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  FileUp,
  Globe2,
  KeyRound,
  Loader2,
  Network,
  Orbit,
  PlugZap,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import './institute-field.css';

type Tenant = {
  id: string;
  key: string;
  name: string;
  type: 'PERSONAL' | 'CLIENT' | 'INTERNAL' | 'RESEARCH';
  role: string;
  status: string;
};

type CaseRecord = {
  id: string;
  tenantId: string;
  serviceProfileId: string;
  subject: string;
  scope: string;
  status: string;
  updatedAt: string;
};

type ServiceProfile = {
  id: string;
  label: string;
  acceptedSubjects: readonly string[];
  requiredSources: readonly string[];
  requiredAnalyses: readonly string[];
  metricProfile: readonly string[];
};

type WorldSummary = {
  observedAt: string | null;
  regime: string;
  wsv: number | null;
  tension: number | null;
  confidence: number | null;
  warning: string | null;
};

type Props = {
  authenticated: boolean;
  initialTenants: Tenant[];
  initialCases: CaseRecord[];
  profiles: ServiceProfile[];
  world: WorldSummary;
};

type Need = {
  id: string;
  title: string;
  description: string;
  profileId: string;
  subject: string;
  personal: boolean;
  organization: boolean;
};

const NEEDS: Need[] = [
  { id: 'understand-system', title: 'Entender un sistema', description: 'Modelar relaciones, fricciones, dependencias y trayectoria antes de intervenir.', profileId: 'SYSTEM_OBSERVATORY', subject: 'SYSTEM', personal: true, organization: true },
  { id: 'helpdesk', title: 'Observar una operación', description: 'Tickets, activos, SLA, recurrencia y trayectoria de servicio en el tiempo.', profileId: 'SERVICE_OBSERVABILITY', subject: 'HELP_DESK', personal: false, organization: true },
  { id: 'ai-governance', title: 'Gobernar IA', description: 'Trazar modelo, contexto, autoridad, decisiones, riesgos y retornos verificables.', profileId: 'AI_GOVERNANCE_ASSURANCE', subject: 'AI_SYSTEM', personal: false, organization: true },
  { id: 'adopt-ai', title: 'Introducir IA en una organización', description: 'Observar el proceso primero; detectar dónde una intervención de IA tiene sentido y cómo medir retorno.', profileId: 'AI_ADOPTION_INTEGRATION', subject: 'ORGANIZATION', personal: false, organization: true },
  { id: 'warranty', title: 'Contratos y garantías', description: 'Relacionar obligaciones, activos, proveedor, eventos, tiempos y cumplimiento observable.', profileId: 'CONTRACT_WARRANTY_ASSURANCE', subject: 'CONTRACT', personal: false, organization: true },
  { id: 'tender', title: 'Evaluar una licitación', description: 'Congelar requisitos, separar evidencia de inferencia y determinar cumplimiento sin seleccionar automáticamente al ganador.', profileId: 'TENDER_ASSURANCE', subject: 'TENDER', personal: false, organization: true },
  { id: 'memory', title: 'Construir memoria institucional', description: 'Conservar relaciones, decisiones y retornos longitudinales sin mezclar tenants.', profileId: 'ENTERPRISE_MEMORY', subject: 'ORGANIZATION', personal: false, organization: true },
  { id: 'cognitive', title: 'Reconstruir conocimiento experto', description: 'Convertir evidencia autorizada en una representación falsable de operaciones cognitivas.', profileId: 'COGNITIVE_RECONSTRUCTION', subject: 'PERSON', personal: true, organization: true },
  { id: 'research', title: 'Investigar un fenómeno', description: 'Abrir un protocolo explícito para un caso que no cabe en los perfiles anteriores.', profileId: 'CUSTOM_RESEARCH', subject: 'PHENOMENON', personal: true, organization: true },
];

function dateLabel(value: string | null) {
  if (!value) return 'sin observación';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value;
}

function slug(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 54) || 'workspace';
}

export function InstituteField({ authenticated, initialTenants, initialCases, profiles, world }: Props) {
  const [tenants, setTenants] = useState(initialTenants);
  const [cases, setCases] = useState(initialCases);
  const [track, setTrack] = useState<'PERSONAL' | 'ORGANIZATION'>('PERSONAL');
  const [tenantId, setTenantId] = useState(initialTenants.find((item) => item.type !== 'PERSONAL')?.id ?? '');
  const [selectedNeed, setSelectedNeed] = useState<Need>(NEEDS[0]);
  const [subject, setSubject] = useState('');
  const [scope, setScope] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(initialCases[0]?.id ?? '');
  const [newOrgName, setNewOrgName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [connectionType, setConnectionType] = useState('API');
  const [connectionTarget, setConnectionTarget] = useState('');
  const [connectionBaseUrl, setConnectionBaseUrl] = useState('');
  const [connectionNotes, setConnectionNotes] = useState('');
  const fileInput = useRef<HTMLInputElement | null>(null);

  const availableNeeds = useMemo(() => NEEDS.filter((item) => track === 'PERSONAL' ? item.personal : item.organization), [track]);
  const selectedProfile = profiles.find((item) => item.id === selectedNeed.profileId) ?? null;
  const selectedCase = cases.find((item) => item.id === selectedCaseId) ?? null;
  const selectedCaseProfile = profiles.find((item) => item.id === selectedCase?.serviceProfileId) ?? null;
  const currentTenant = tenants.find((item) => item.id === (track === 'ORGANIZATION' ? tenantId : selectedCase?.tenantId));

  function changeTrack(next: 'PERSONAL' | 'ORGANIZATION') {
    setTrack(next);
    const nextNeed = NEEDS.find((item) => next === 'PERSONAL' ? item.personal : item.organization) ?? NEEDS[0];
    setSelectedNeed(nextNeed);
    setMessage(null);
  }

  async function refreshCases() {
    const response = await fetch('/api/cases', { credentials: 'include', cache: 'no-store' });
    const body = await response.json().catch(() => null) as { ok?: boolean; cases?: CaseRecord[] } | null;
    if (response.ok && body?.ok) setCases(body.cases ?? []);
  }

  async function createOrganization() {
    if (!newOrgName.trim()) return;
    setBusy('tenant'); setMessage(null);
    try {
      const response = await fetch('/api/cases/tenants', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantKey: `client:${slug(newOrgName)}:${Date.now().toString(36)}`, name: newOrgName.trim(), tenantType: 'CLIENT', metadata: { onboarding: 'FIELD', selfProvisioned: true } }),
      });
      const body = await response.json().catch(() => null) as { ok?: boolean; tenant?: Record<string, unknown>; error?: string; details?: string } | null;
      if (!response.ok || !body?.ok || !body.tenant) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      const row = body.tenant;
      const tenant: Tenant = { id: String(row.id), key: String(row.tenant_key ?? ''), name: String(row.name ?? newOrgName), type: String(row.tenant_type ?? 'CLIENT') as Tenant['type'], role: 'OWNER', status: String(row.status ?? 'ACTIVE') };
      setTenants((current) => [...current, tenant]); setTenantId(tenant.id); setNewOrgName(''); setMessage('Workspace organizacional creado. Sus datos permanecen aislados por tenant.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible crear el workspace.'); }
    finally { setBusy(null); }
  }

  async function createCase() {
    if (!subject.trim() || !scope.trim()) { setMessage('Describe qué sistema o fenómeno quieres observar y qué necesitas entender.'); return; }
    if (track === 'ORGANIZATION' && !tenantId) { setMessage('Selecciona o crea una organización antes de abrir el caso.'); return; }
    setBusy('case'); setMessage(null);
    try {
      const now = new Date().toISOString();
      const response = await fetch('/api/cases', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: track === 'ORGANIZATION' ? tenantId : null,
          serviceProfileId: selectedNeed.profileId,
          subject: subject.trim(),
          scope: scope.trim(),
          systemBoundaryRef: { id: `boundary:${slug(subject)}:${Date.now().toString(36)}`, version: '1.0', hash: null },
          temporalWindow: { mode: selectedNeed.profileId === 'SERVICE_OBSERVABILITY' ? 'RETROLONGITUDINAL' : 'LONGITUDINAL', basis: 'OBSERVED_TIME', start: null, end: null, cutoff: now, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', reconstructionAsOf: null, horizon: null },
        }),
      });
      const body = await response.json().catch(() => null) as { ok?: boolean; case?: CaseRecord; error?: string; details?: string } | null;
      if (!response.ok || !body?.ok || !body.case) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setCases((current) => [body.case!, ...current]); setSelectedCaseId(body.case.id); setSubject(''); setScope(''); setMessage('Caso abierto. Ahora conecta fuentes o arrastra evidencia primaria.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible abrir el caso.'); }
    finally { setBusy(null); }
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!selectedCase) { setMessage('Selecciona un caso antes de agregar archivos.'); return; }
    const list = Array.from(files);
    if (!list.length) return;
    setBusy('upload'); setMessage(null);
    try {
      for (const file of list) {
        const data = new FormData();
        data.set('file', file);
        data.set('sourceType', selectedCaseProfile?.requiredSources[0] ?? 'DECLARED_BY_PROTOCOL');
        const response = await fetch(`/api/cases/${encodeURIComponent(selectedCase.id)}/sources/upload`, { method: 'POST', credentials: 'include', body: data });
        const body = await response.json().catch(() => null) as { ok?: boolean; error?: string; details?: string } | null;
        if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      }
      setMessage(`${list.length} archivo(s) incorporado(s) como SOURCE. SFI no los convierte en evidencia por herencia.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible incorporar los archivos.'); }
    finally { setBusy(null); }
  }

  async function requestConnection() {
    if (!selectedCase || !connectionTarget.trim()) { setMessage('Selecciona un caso y especifica la fuente que quieres conectar.'); return; }
    setBusy('connection'); setMessage(null);
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(selectedCase.id)}/sources/connections`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSourceType: connectionTarget.trim(), connectionType, baseUrl: connectionBaseUrl.trim() || null, notes: connectionNotes.trim() || null, requestedMode: 'READ_ONLY_OBSERVATION' }),
      });
      const body = await response.json().catch(() => null) as { ok?: boolean; error?: string; details?: string } | null;
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setConnectionOpen(false); setConnectionTarget(''); setConnectionBaseUrl(''); setConnectionNotes(''); setMessage('Solicitud registrada. No se almacenaron credenciales. La conexión no se considera activa hasta ser provisionada y observada.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible registrar la conexión.'); }
    finally { setBusy(null); }
  }

  return (
    <main className="if-shell">
      <div className="if-grid" aria-hidden="true" />
      <header className="if-topbar">
        <Link href="/" className="if-mark"><span>SFI</span><small>SYSTEM FRICTION INSTITUTE</small></Link>
        <nav><Link href="/observatory">OBSERVATORY</Link>{authenticated ? <Link href="/root">DIRECTOR</Link> : <Link href="/login">ACCESS</Link>}</nav>
      </header>

      <section className="if-hero">
        <div className="if-eyebrow"><Orbit size={14} /> FIELD · INSTITUTIONAL INTAKE</div>
        <h1>Observa un sistema.<br/><em>Después decide.</em></h1>
        <p>FIELD es la frontera de entrada al instituto. Una persona puede estudiar un sistema propio; una organización opera dentro de su tenant aislado. Archivos, APIs y fuentes externas entran primero como fuentes. Evidencia, inferencia, intervención y retorno permanecen separados.</p>
        <div className="if-world"><span>WORLD</span><b>{world.regime || 'MISSING'}</b><span>{dateLabel(world.observedAt)}</span>{world.warning ? <i>{world.warning}</i> : null}</div>
      </section>

      {!authenticated ? (
        <section className="if-public">
          <article><UserRound/><span>PERSONA</span><h2>Quiero entender algo que me ocurre o un sistema que observo.</h2><p>SFI abre un workspace personal, solicita evidencia proporcional a la pregunta y ejecuta métodos sin otorgar autoridad a la IA sobre ti.</p></article>
          <article><Building2/><span>ORGANIZACIÓN</span><h2>Quiero observar una operación, proceso, sistema de IA o institución.</h2><p>SFI crea un tenant aislado, solicita fuentes y conexiones de sólo lectura y construye trazabilidad longitudinal antes de proponer una intervención.</p></article>
          <div className="if-public-actions"><Link href="/signup">ABRIR WORKSPACE <ArrowRight/></Link><Link href="/login">YA TENGO ACCESO</Link></div>
        </section>
      ) : (
        <div className="if-workspace">
          <aside className="if-rail">
            <span className="if-section-number">01</span><h2>Quién está entrando</h2>
            <button className={track === 'PERSONAL' ? 'active' : ''} onClick={() => changeTrack('PERSONAL')}><UserRound/> Persona <small>tenant personal</small></button>
            <button className={track === 'ORGANIZATION' ? 'active' : ''} onClick={() => changeTrack('ORGANIZATION')}><Building2/> Organización <small>tenant aislado</small></button>
            {track === 'ORGANIZATION' ? <div className="if-org-picker"><label>ORGANIZACIÓN</label><select value={tenantId} onChange={(event) => setTenantId(event.target.value)}><option value="">Seleccionar…</option>{tenants.filter((item) => item.type !== 'PERSONAL').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="if-inline"><input value={newOrgName} onChange={(event) => setNewOrgName(event.target.value)} placeholder="Nueva organización"/><button onClick={() => void createOrganization()} disabled={busy === 'tenant'}>{busy === 'tenant' ? <Loader2 className="spin"/> : '+'}</button></div></div> : <p className="if-note">El tenant personal se provisiona automáticamente al abrir el primer caso y nunca comparte memoria con tenants organizacionales.</p>}
          </aside>

          <section className="if-main">
            <div className="if-step"><span className="if-section-number">02</span><div><h2>Qué necesitas que SFI haga</h2><p>Selecciona la necesidad; el instituto decide qué contrato, fuentes y análisis corresponden.</p></div></div>
            <div className="if-needs">{availableNeeds.map((need) => <button key={need.id} className={selectedNeed.id === need.id ? 'active' : ''} onClick={() => setSelectedNeed(need)}><span>{need.title}</span><small>{need.description}</small></button>)}</div>

            <div className="if-profile">
              <div><span>PROTOCOLO SELECCIONADO</span><strong>{selectedProfile?.label ?? selectedNeed.profileId}</strong></div>
              <div><span>SFI SOLICITARÁ</span><strong>{selectedProfile?.requiredSources.join(' · ') || 'fuentes declaradas por protocolo'}</strong></div>
              <div><span>SFI EJECUTARÁ</span><strong>{selectedProfile?.requiredAnalyses.join(' · ') || 'análisis declarado por protocolo'}</strong></div>
            </div>

            <div className="if-case-create">
              <label>SISTEMA / OBJETO / FENÓMENO<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ej. Mesa de Ayuda institucional"/></label>
              <label>QUÉ NECESITAS ENTENDER<textarea value={scope} onChange={(event) => setScope(event.target.value)} placeholder="Ej. Detectar recurrencia, fricción, trayectorias anómalas y relaciones entre ticket, activo, SLA y proveedor." rows={3}/></label>
              <button className="if-primary" onClick={() => void createCase()} disabled={busy === 'case'}>{busy === 'case' ? <Loader2 className="spin"/> : <Sparkles/>} ABRIR OBSERVACIÓN</button>
            </div>

            <div className="if-step if-step-space"><span className="if-section-number">03</span><div><h2>Conecta el mundo</h2><p>Selecciona un caso. Puedes arrastrar archivos o solicitar una conexión API. Las credenciales nunca se registran como evidencia.</p></div></div>
            <select className="if-case-select" value={selectedCaseId} onChange={(event) => setSelectedCaseId(event.target.value)}><option value="">Seleccionar caso…</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.subject} · {item.serviceProfileId}</option>)}</select>

            <div className="if-source-grid">
              <button className="if-drop" disabled={!selectedCase || busy === 'upload'} onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void uploadFiles(event.dataTransfer.files); }}>
                {busy === 'upload' ? <Loader2 className="spin"/> : <FileUp/>}<strong>ARRASTRAR FUENTES</strong><span>CSV · XLSX · JSON · PDF · imágenes · audio · video · documentos</span><small>Se almacenan de forma privada bajo tenant/case. SOURCE ≠ EVIDENCE.</small>
              </button>
              <input ref={fileInput} hidden multiple type="file" onChange={(event) => event.target.files && void uploadFiles(event.target.files)}/>
              <button className="if-connect" disabled={!selectedCase} onClick={() => setConnectionOpen(true)}><PlugZap/><strong>SOLICITAR CONEXIÓN</strong><span>API · base de datos · export recurrente · webhook de entrada</span><small>Por defecto: observación de sólo lectura. Toda escritura externa requiere gobernanza.</small></button>
            </div>

            {selectedCase ? <div className="if-run-card"><div><span>CASO ACTIVO</span><strong>{selectedCase.subject}</strong><small>{currentTenant?.name ?? (track === 'PERSONAL' ? 'Personal SFI Workspace' : 'tenant')} · {selectedCase.status}</small></div><div className="if-run-flow"><span><Database/> SOURCE</span><ArrowRight/><span><Network/> EVIDENCE</span><ArrowRight/><span><Globe2/> ANALYSIS</span><ArrowRight/><span><ShieldCheck/> GOVERNANCE</span><ArrowRight/><span><CheckCircle2/> RETURN</span></div><Link href="/field/protocol">EJECUTAR PROTOCOLO DE INTERVENCIÓN <ArrowRight/></Link></div> : null}

            {message ? <div className="if-message">{message}</div> : null}
          </section>
        </div>
      )}

      <section className="if-principles"><article><span>OBSERVACIÓN ANTES QUE OPINIÓN</span><p>La realidad precede al relato.</p></article><article><span>EVIDENCIA ANTES QUE AFIRMACIÓN</span><p>Toda proposición debe poder perder contra el mundo.</p></article><article><span>REVERSIBILIDAD ANTES QUE EJECUCIÓN</span><p>Una intervención gobernada debe poder regresar.</p></article><article><span>AUTORIDAD EXPLÍCITA</span><p>La autonomía interna no concede autoridad externa.</p></article></section>

      {connectionOpen ? <div className="if-modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setConnectionOpen(false); }}><section className="if-modal"><button className="if-close" onClick={() => setConnectionOpen(false)}>×</button><span>CONEXIÓN DE FUENTE</span><h2>¿Qué debe observar SFI?</h2><p>Registra la solicitud y la finalidad. No pegues tokens, contraseñas ni secretos aquí.</p><label>FUENTE REQUERIDA<select value={connectionTarget} onChange={(event) => setConnectionTarget(event.target.value)}><option value="">Seleccionar…</option>{(selectedCaseProfile?.requiredSources ?? []).map((source) => <option key={source} value={source}>{source}</option>)}<option value="OTHER">Otra fuente</option></select></label><label>TIPO DE CONEXIÓN<select value={connectionType} onChange={(event) => setConnectionType(event.target.value)}><option>API</option><option>DATABASE</option><option>RECURRENT_EXPORT</option><option>WEBHOOK_INBOUND</option></select></label><label>URL BASE / DOCUMENTACIÓN<input value={connectionBaseUrl} onChange={(event) => setConnectionBaseUrl(event.target.value)} placeholder="https://…"/></label><label>NOTAS<textarea rows={3} value={connectionNotes} onChange={(event) => setConnectionNotes(event.target.value)} placeholder="Qué datos autoriza observar, periodicidad, restricciones."/></label><div className="if-boundary"><KeyRound/><span>Las credenciales se provisionan fuera de la evidencia del caso. La solicitud no cuenta como fuente activa.</span></div><button className="if-primary" onClick={() => void requestConnection()} disabled={busy === 'connection'}>{busy === 'connection' ? <Loader2 className="spin"/> : <PlugZap/>} REGISTRAR SOLICITUD</button></section></div> : null}
    </main>
  );
}
