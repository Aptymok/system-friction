'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import { SFI_SERVICE_PROFILES } from '@/core/case-platform/serviceProfiles';
import type { SfiTemporalBasis, SfiTemporalMode } from '@/core/contracts/sfi';
import { SessionControls } from './SessionControls';
import './NewCaseIngress.css';

type Row = Record<string, any>;
type IngressMode = 'PROJECT' | 'CASE';

const TEMPORAL_BASES: Array<{ value: SfiTemporalBasis; label: string }> = [
  { value: 'OBSERVED_TIME', label: 'Tiempo observado' },
  { value: 'RECONSTRUCTED_TIME', label: 'Tiempo reconstruido' },
  { value: 'SIMULATED_TIME', label: 'Tiempo simulado' },
  { value: 'PROJECTED_TIME', label: 'Tiempo proyectado' },
];

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function slug(value: string) { return value.trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'untitled'; }
function messageFromFailure(payload: unknown, status: number) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const row = payload as Record<string, unknown>;
    const error = typeof row.error === 'string' ? row.error : null;
    const details = typeof row.details === 'string' ? row.details : null;
    if (error || details) return [error, details].filter(Boolean).join(' · ');
  }
  return `SFI_INGRESS_FAILED:${status}`;
}

export function NewCaseIngress() {
  const router = useRouter();
  const auth = useAuthState();
  const [mode, setMode] = useState<IngressMode>('PROJECT');
  const [tenants, setTenants] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [attractor, setAttractor] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [serviceProfileId, setServiceProfileId] = useState<string>(SFI_SERVICE_PROFILES[0].id);
  const [subject, setSubject] = useState('');
  const [scope, setScope] = useState('');
  const [temporalMode, setTemporalMode] = useState<SfiTemporalMode>('CROSS_SECTIONAL');
  const [temporalBasis, setTemporalBasis] = useState<SfiTemporalBasis>('OBSERVED_TIME');
  const [cutoffLocal, setCutoffLocal] = useState(localDateTimeValue);
  const [timezone, setTimezone] = useState(() => typeof Intl === 'undefined' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = useMemo(() => SFI_SERVICE_PROFILES.find((item) => item.id === serviceProfileId) ?? SFI_SERVICE_PROFILES[0], [serviceProfileId]);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    let cancelled = false;
    void Promise.all([
      fetch('/api/cases/tenants', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/cases', { cache: 'no-store' }).then((response) => response.json()),
    ]).then(([tenantPayload, casePayload]) => {
      if (cancelled) return;
      const nextTenants = Array.isArray(tenantPayload?.tenants) ? tenantPayload.tenants : [];
      const nextProjects = Array.isArray(casePayload?.projects) ? casePayload.projects : [];
      setTenants(nextTenants);
      setProjects(nextProjects);
      if (!tenantId && nextTenants.length === 1) setTenantId(String(nextTenants[0].id ?? ''));
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'SFI_CONTEXT_READ_FAILED'); });
    return () => { cancelled = true; };
  }, [auth.status, tenantId]);

  function changeProfile(nextId: string) {
    setServiceProfileId(nextId);
    const next = SFI_SERVICE_PROFILES.find((item) => item.id === nextId);
    if (next && !next.temporalPolicy.includes(temporalMode as never)) setTemporalMode(next.temporalPolicy[0] as SfiTemporalMode);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (auth.status !== 'authenticated' || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'PROJECT') {
        if (!tenantId) throw new Error('Selecciona el espacio institucional o de cliente donde vivirá el proyecto.');
        const key = slug(projectName || attractor);
        const response = await fetch('/api/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resource: 'PROJECT',
            tenantId,
            projectKey: key,
            name: projectName.trim() || attractor.trim(),
            description: projectContext.trim(),
            attractorRef: { id: `ATTRACTOR:${key}`, version: '1.0', hash: null },
            trajectoryRef: { id: `TRAJECTORY:${key}`, version: '1.0', hash: null },
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(messageFromFailure(payload, response.status));
        router.push('/cases');
        router.refresh();
        return;
      }

      const cutoff = new Date(cutoffLocal);
      if (Number.isNaN(cutoff.getTime())) throw new Error('TEMPORAL_CUTOFF_INVALID');
      const autoBoundary = `SYSTEM:${slug(subject)}`;
      const selectedProject = projects.find((item) => String(item.id) === projectId);
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'CASE',
          tenantId: selectedProject?.tenantId ?? null,
          projectId: projectId || null,
          serviceProfileId,
          subject: subject.trim(),
          scope: scope.trim(),
          systemBoundaryRef: { id: autoBoundary, version: '1.0', hash: null },
          temporalWindow: {
            mode: temporalMode,
            basis: temporalBasis,
            start: null,
            end: null,
            cutoff: cutoff.toISOString(),
            timezone: timezone.trim() || 'UTC',
            reconstructionAsOf: temporalBasis === 'RECONSTRUCTED_TIME' ? cutoff.toISOString() : null,
            horizon: temporalBasis === 'PROJECTED_TIME' ? cutoff.toISOString() : null,
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromFailure(payload, response.status));
      const caseId = payload && typeof payload === 'object' && !Array.isArray(payload) ? String((payload as { case?: { id?: unknown } }).case?.id ?? '') : '';
      if (!caseId) throw new Error('CASE_CREATE_RECEIPT_MISSING_ID');
      router.push(`/cases?case=${encodeURIComponent(caseId)}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SFI_INGRESS_FAILED');
    } finally {
      setSubmitting(false);
    }
  }

  if (auth.status !== 'authenticated') {
    return <main className="newCaseShell"><header className="newCaseTop"><Link href="/cases" className="newCaseWordmark">SFI</Link><SessionControls /></header><section className="newCaseAccess"><span>ESPACIO DE TRABAJO</span><h1>Entrar para comenzar.</h1><p>Tu identidad determina qué proyectos, casos, evidencia y memoria puedes observar o modificar.</p><SessionControls /></section></main>;
  }

  return <main className="newCaseShell">
    <header className="newCaseTop"><div className="newCaseIdentity"><Link href="/cases" className="newCaseWordmark">SFI</Link><div><strong>NUEVO OBJETO DE TRABAJO</strong><small>Proyecto / Atractor o Case</small></div></div><div className="newCaseTopActions"><Link href="/cases">VOLVER A CASOS</Link><SessionControls /></div></header>

    <section className="newCaseFrame">
      <div className="newCaseIntro"><span>DECLARAR → OBSERVAR → CONTRASTAR → RETORNAR</span><h1>¿Qué quieres que SFI siga?</h1><p>Empieza por el objetivo si existe una trayectoria que quieres sostener; empieza por un Case si primero necesitas comprender un problema, sistema o fenómeno.</p></div>

      <div className="newCaseMode" role="tablist" aria-label="Tipo de objeto"><button type="button" className={mode === 'PROJECT' ? 'active' : ''} onClick={() => setMode('PROJECT')}><strong>PROYECTO / ATRACTOR</strong><span>Quiero que ocurra algo y observar la trayectoria.</span></button><button type="button" className={mode === 'CASE' ? 'active' : ''} onClick={() => setMode('CASE')}><strong>CASE</strong><span>Quiero entender, reconstruir o resolver algo.</span></button></div>

      <form className="newCaseForm" onSubmit={submit}>
        {mode === 'PROJECT' ? <>
          <label className="newCaseWide"><span>¿Qué quieres que ocurra?</span><textarea required maxLength={4000} rows={5} value={attractor} onChange={(event) => setAttractor(event.target.value)} placeholder="Describe el estado hacia el que quieres mover el sistema. SFI lo tratará como una declaración de atractor, no como evidencia de que sea alcanzable." /></label>
          <label><span>Nombre del proyecto</span><input required maxLength={240} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ej. Observatorio Manhattan" /></label>
          <label><span>Espacio / organización</span><select required value={tenantId} onChange={(event) => setTenantId(event.target.value)}><option value="">Seleccionar…</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{String(tenant.name ?? tenant.tenantKey ?? tenant.id)}</option>)}</select></label>
          <label className="newCaseWide"><span>Contexto inicial · opcional</span><textarea maxLength={4000} rows={4} value={projectContext} onChange={(event) => setProjectContext(event.target.value)} placeholder="Qué existe hoy, qué quieres preservar, qué restricciones ya conoces. Esto entra como declaración/contexto, no como hecho verificado." /></label>
          <div className="newCaseAuthority newCaseWide"><strong>Qué hará SFI después</strong><p>Persistirá el Proyecto, su Atractor y una trayectoria identificable. Los Cases, observaciones, evidencia, hipótesis, perturbaciones y RETURN podrán vincularse después sin perder el estado anterior.</p></div>
        </> : <>
          <label className="newCaseWide"><span>¿Qué quieres entender o resolver?</span><input required maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ej. por qué una certificación pierde vigencia después de cambios normales" /></label>
          <label className="newCaseWide"><span>¿Qué debería observar SFI y qué queda fuera?</span><textarea required maxLength={2000} rows={5} value={scope} onChange={(event) => setScope(event.target.value)} placeholder="Describe el problema en lenguaje normal, sus límites y qué sería útil determinar." /></label>
          <label className="newCaseWide"><span>Proyecto / Atractor relacionado · opcional</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Sin proyecto relacionado</option>{projects.filter((project) => project.status === 'ACTIVE').map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <details className="newCaseAdvanced newCaseWide"><summary>Opciones avanzadas</summary><div className="newCaseAdvancedGrid"><label><span>Perfil de servicio</span><select value={serviceProfileId} onChange={(event) => changeProfile(event.target.value)}>{SFI_SERVICE_PROFILES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><small>{profile.requiredSources.join(' · ')}</small></label><label><span>Modo temporal</span><select value={temporalMode} onChange={(event) => setTemporalMode(event.target.value as SfiTemporalMode)}>{profile.temporalPolicy.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span>Base temporal</span><select value={temporalBasis} onChange={(event) => setTemporalBasis(event.target.value as SfiTemporalBasis)}>{TEMPORAL_BASES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label><span>Corte reproducible</span><input required type="datetime-local" value={cutoffLocal} onChange={(event) => setCutoffLocal(event.target.value)} /></label><label><span>Zona horaria</span><input required maxLength={120} value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label></div></details>
          <div className="newCaseAuthority newCaseWide"><strong>Automático</strong><p>SFI deriva la frontera canónica, fecha de corte y lineage técnico. Crear el Case no convierte tu declaración en evidencia ni otorga autoridad adicional.</p></div>
        </>}

        {error && <div className="newCaseError newCaseWide" role="alert">{error}</div>}
        <div className="newCaseSubmit newCaseWide"><Link href="/cases">Cancelar</Link><button type="submit" disabled={submitting || (mode === 'PROJECT' ? !attractor.trim() || !projectName.trim() || !tenantId : !subject.trim() || !scope.trim())}>{submitting ? 'PERSISTIENDO…' : mode === 'PROJECT' ? 'CREAR PROYECTO / ATRACTOR' : 'CREAR CASE'}</button></div>
      </form>
    </section>
  </main>;
}
