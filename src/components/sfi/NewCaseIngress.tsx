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
  { value: 'OBSERVED_TIME', label: 'Observed time' },
  { value: 'RECONSTRUCTED_TIME', label: 'Reconstructed time' },
  { value: 'SIMULATED_TIME', label: 'Simulated time' },
  { value: 'PROJECTED_TIME', label: 'Projected time' },
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
        if (!tenantId) throw new Error('Select the institutional or client space where the project will live.');
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
        router.push('/instruments/reality-chain');
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
      router.push('/instruments/reality-chain?case='+encodeURIComponent(caseId));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SFI_INGRESS_FAILED');
    } finally {
      setSubmitting(false);
    }
  }

  if (auth.status !== 'authenticated') {
    return <main className="newCaseShell"><header className="newCaseTop"><Link href="/instruments/reality-chain" className="newCaseWordmark">SFI</Link><SessionControls /></header><section className="newCaseAccess"><span>WORK SPACE</span><h1>Authentication is required.</h1><p>The authenticated identity determines which projects, cases, evidence and memory are visible or mutable.</p><SessionControls /></section></main>;
  }

  return <main className="newCaseShell">
    <header className="newCaseTop"><div className="newCaseIdentity"><Link href="/cases" className="newCaseWordmark">SFI</Link><div><strong>NEW WORK OBJECT</strong><small>Project / Attractor or Case</small></div></div><div className="newCaseTopActions"><Link href="/cases">BACK TO CASES</Link><SessionControls /></div></header>

    <section className="newCaseFrame">
      <div className="newCaseIntro"><span>DECLARE → OBSERVE → CONTRAST → RETURN</span><h1>What should SFI follow?</h1><p>A Project begins with a declared target state and trajectory. A Case begins with a bounded problem, system or phenomenon that requires observation.</p></div>

      <div className="newCaseMode" role="tablist" aria-label="Work object type"><button type="button" className={mode === 'PROJECT' ? 'active' : ''} onClick={() => setMode('PROJECT')}><strong>PROJECT / ATTRACTOR</strong><span>A declared target state and its trajectory are followed over time.</span></button><button type="button" className={mode === 'CASE' ? 'active' : ''} onClick={() => setMode('CASE')}><strong>CASE</strong><span>A bounded problem is observed, reconstructed or resolved.</span></button></div>

      <form className="newCaseForm" onSubmit={submit}>
        {mode === 'PROJECT' ? <>
          <label className="newCaseWide"><span>What do you want to happen?</span><textarea required maxLength={4000} rows={5} value={attractor} onChange={(event) => setAttractor(event.target.value)} placeholder="Describe the target state. SFI records it as an attractor declaration, not as evidence that the state is attainable." /></label>
          <label><span>Project name</span><input required maxLength={240} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Manhattan Observatory" /></label>
          <label><span>Space / organization</span><select required value={tenantId} onChange={(event) => setTenantId(event.target.value)}><option value="">Select…</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{String(tenant.name ?? tenant.tenantKey ?? tenant.id)}</option>)}</select></label>
          <label className="newCaseWide"><span>Initial context · optional</span><textarea maxLength={4000} rows={4} value={projectContext} onChange={(event) => setProjectContext(event.target.value)} placeholder="Current conditions, preserved constraints and known limitations enter as declaration/context, not verified fact." /></label>
          <div className="newCaseAuthority newCaseWide"><strong>What SFI will do next</strong><p>It will persist the Project, its Attractor and an identifiable trajectory. Cases, observations, evidence, hypotheses, perturbations and RETURN can be linked later without losing prior state.</p></div>
        </> : <>
          <label className="newCaseWide"><span>What do you want to understand or resolve?</span><input required maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. why a certification loses validity after normal changes" /></label>
          <label className="newCaseWide"><span>What should SFI observe, and what is out of scope?</span><textarea required maxLength={2000} rows={5} value={scope} onChange={(event) => setScope(event.target.value)} placeholder="Describe the problem in ordinary language, its boundaries and what would be useful to determine." /></label>
          <label className="newCaseWide"><span>Related Project / Attractor · optional</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">No related project</option>{projects.filter((project) => project.status === 'ACTIVE').map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <details className="newCaseAdvanced newCaseWide"><summary>Advanced options</summary><div className="newCaseAdvancedGrid"><label><span>Service profile</span><select value={serviceProfileId} onChange={(event) => changeProfile(event.target.value)}>{SFI_SERVICE_PROFILES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><small>{profile.requiredSources.join(' · ')}</small></label><label><span>Temporal mode</span><select value={temporalMode} onChange={(event) => setTemporalMode(event.target.value as SfiTemporalMode)}>{profile.temporalPolicy.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span>Temporal basis</span><select value={temporalBasis} onChange={(event) => setTemporalBasis(event.target.value as SfiTemporalBasis)}>{TEMPORAL_BASES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label><span>Reproducible cutoff</span><input required type="datetime-local" value={cutoffLocal} onChange={(event) => setCutoffLocal(event.target.value)} /></label><label><span>Timezone</span><input required maxLength={120} value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label></div></details>
          <div className="newCaseAuthority newCaseWide"><strong>Automatic</strong><p>SFI derives the canonical boundary, cutoff date and technical lineage. Creating the Case does not convert a declaration into evidence or grant additional authority.</p></div>
        </>}

        {error && <div className="newCaseError newCaseWide" role="alert">{error}</div>}
        <div className="newCaseSubmit newCaseWide"><Link href="/cases">CANCEL</Link><button type="submit" disabled={submitting || (mode === 'PROJECT' ? !attractor.trim() || !projectName.trim() || !tenantId : !subject.trim() || !scope.trim())}>{submitting ? 'PERSISTING…' : mode === 'PROJECT' ? 'CREATE PROJECT / ATTRACTOR' : 'CREATE CASE'}</button></div>
      </form>
    </section>
  </main>;
}
