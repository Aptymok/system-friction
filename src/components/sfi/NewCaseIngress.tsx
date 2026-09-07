'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import { SFI_SERVICE_PROFILES } from '@/core/case-platform/serviceProfiles';
import type { SfiTemporalBasis, SfiTemporalMode } from '@/core/contracts/sfi';
import { SessionControls } from './SessionControls';
import './NewCaseIngress.css';

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

function messageFromFailure(payload: unknown, status: number) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const row = payload as Record<string, unknown>;
    const error = typeof row.error === 'string' ? row.error : null;
    const details = typeof row.details === 'string' ? row.details : null;
    if (error || details) return [error, details].filter(Boolean).join(' · ');
  }
  return `CASE_CREATE_FAILED:${status}`;
}

export function NewCaseIngress() {
  const router = useRouter();
  const auth = useAuthState();
  const [serviceProfileId, setServiceProfileId] = useState<string>(SFI_SERVICE_PROFILES[0].id);
  const [subject, setSubject] = useState('');
  const [scope, setScope] = useState('');
  const [systemBoundaryId, setSystemBoundaryId] = useState('');
  const [temporalMode, setTemporalMode] = useState<SfiTemporalMode>('CROSS_SECTIONAL');
  const [temporalBasis, setTemporalBasis] = useState<SfiTemporalBasis>('OBSERVED_TIME');
  const [cutoffLocal, setCutoffLocal] = useState(localDateTimeValue);
  const [timezone, setTimezone] = useState(() => {
    if (typeof Intl === 'undefined') return 'UTC';
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = useMemo(
    () => SFI_SERVICE_PROFILES.find((item) => item.id === serviceProfileId) ?? SFI_SERVICE_PROFILES[0],
    [serviceProfileId],
  );

  function changeProfile(nextId: string) {
    setServiceProfileId(nextId);
    const next = SFI_SERVICE_PROFILES.find((item) => item.id === nextId);
    if (!next) return;
    if (!next.temporalPolicy.includes(temporalMode as never)) {
      setTemporalMode(next.temporalPolicy[0] as SfiTemporalMode);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (auth.status !== 'authenticated' || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const cutoff = new Date(cutoffLocal);
      if (Number.isNaN(cutoff.getTime())) throw new Error('TEMPORAL_CUTOFF_INVALID');
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'CASE',
          serviceProfileId,
          subject: subject.trim(),
          scope: scope.trim(),
          systemBoundaryRef: {
            id: systemBoundaryId.trim(),
            version: null,
            hash: null,
          },
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
      const caseId = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? String((payload as { case?: { id?: unknown } }).case?.id ?? '')
        : '';
      if (!caseId) throw new Error('CASE_CREATE_RECEIPT_MISSING_ID');
      router.push(`/cases?case=${encodeURIComponent(caseId)}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'CASE_CREATE_FAILED');
    } finally {
      setSubmitting(false);
    }
  }

  if (auth.status !== 'authenticated') {
    return <main className="newCaseShell">
      <header className="newCaseTop">
        <Link href="/cases" className="newCaseWordmark">SFI</Link>
        <SessionControls />
      </header>
      <section className="newCaseAccess">
        <span>HUMAN INGRESS · NEW CASE</span>
        <h1>Crear caso</h1>
        <p>La creación de un CASE requiere una cuenta SFI autenticada. El ingreso usa el contrato canónico y no concede autoridad ROOT al caso.</p>
        <SessionControls />
      </section>
    </main>;
  }

  return <main className="newCaseShell">
    <header className="newCaseTop">
      <div className="newCaseIdentity">
        <Link href="/cases" className="newCaseWordmark">SFI</Link>
        <div><strong>NEW CASE</strong><small>Human ingress → canonical SFI Case Platform</small></div>
      </div>
      <div className="newCaseTopActions">
        <Link href="/cases">CASOS</Link>
        <SessionControls />
      </div>
    </header>

    <section className="newCaseFrame">
      <div className="newCaseIntro">
        <span>SFI-CASE-1.0 · HUMAN INGRESS</span>
        <h1>Crear un caso sin duplicar el motor.</h1>
        <p>Este formulario escribe exclusivamente mediante <code>POST /api/cases</code>. El tenant personal se resuelve en el repository canónico cuando no existe un tenant institucional seleccionado.</p>
      </div>

      <form className="newCaseForm" onSubmit={submit}>
        <label>
          <span>Perfil de servicio</span>
          <select value={serviceProfileId} onChange={(event) => changeProfile(event.target.value)}>
            {SFI_SERVICE_PROFILES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <small>{profile.requiredSources.join(' · ')}</small>
        </label>

        <label>
          <span>Sujeto</span>
          <input required maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Sistema, organización, proceso, servicio o fenómeno bajo análisis" />
        </label>

        <label className="newCaseWide">
          <span>Alcance</span>
          <textarea required maxLength={2000} rows={5} value={scope} onChange={(event) => setScope(event.target.value)} placeholder="Qué debe reconstruirse, observarse, contrastarse o determinarse; incluye límites explícitos." />
        </label>

        <label className="newCaseWide">
          <span>Frontera del sistema · canonical ref</span>
          <input required maxLength={500} value={systemBoundaryId} onChange={(event) => setSystemBoundaryId(event.target.value)} placeholder="Ej. SYSTEM:PROCUREMENT:2026 o ORG:CLIENT:PROCESS" />
          <small>Identifica la frontera; no implica que la frontera esté verificada por declararla.</small>
        </label>

        <label>
          <span>Modo temporal</span>
          <select value={temporalMode} onChange={(event) => setTemporalMode(event.target.value as SfiTemporalMode)}>
            {profile.temporalPolicy.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </label>

        <label>
          <span>Base temporal</span>
          <select value={temporalBasis} onChange={(event) => setTemporalBasis(event.target.value as SfiTemporalBasis)}>
            {TEMPORAL_BASES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>

        <label>
          <span>Cutoff reproducible</span>
          <input required type="datetime-local" value={cutoffLocal} onChange={(event) => setCutoffLocal(event.target.value)} />
        </label>

        <label>
          <span>Zona horaria</span>
          <input required maxLength={120} value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        </label>

        <div className="newCaseAuthority newCaseWide">
          <strong>Boundary</strong>
          <p>Crear un CASE persiste identidad, alcance, frontera, temporalidad y audit event. No convierte entradas en evidencia, no promueve canon y no concede acceso ROOT.</p>
        </div>

        {error && <div className="newCaseError newCaseWide" role="alert">{error}</div>}

        <div className="newCaseSubmit newCaseWide">
          <Link href="/cases">Cancelar</Link>
          <button type="submit" disabled={submitting || !subject.trim() || !scope.trim() || !systemBoundaryId.trim()}>
            {submitting ? 'PERSISTIENDO…' : 'CREAR CASO'}
          </button>
        </div>
      </form>
    </section>
  </main>;
}
