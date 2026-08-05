'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RootSovereignState, RootRow } from '@/lib/root/sovereign/rootSovereignState';
import './root-attention-director.css';

type SurfaceState = {
  id: string;
  label: string;
  path: string;
  status: 'checking' | 'ok' | 'attention';
  detail: string;
};

type CommercialWorkspace = {
  opportunities?: RootRow[];
  proposals?: RootRow[];
  counts?: { openOpportunities?: number };
};

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function dateValue(row: RootRow) {
  return text(row.created_at ?? row.updated_at ?? row.observed_at ?? row.timestamp, '');
}

function ageHours(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (Date.now() - timestamp) / 3_600_000);
}

function navigate(detail: { mode: 'observatory' | 'governance' | 'conversion'; lens?: string }) {
  window.dispatchEvent(new CustomEvent('root:navigate', { detail }));
  window.setTimeout(() => document.querySelector('.rgo-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
}

export function RootAttentionDirector({ state }: { state: RootSovereignState }) {
  const [commercial, setCommercial] = useState<CommercialWorkspace | null>(null);
  const [surfaces, setSurfaces] = useState<SurfaceState[]>([
    { id: 'studio', label: 'Studio', path: '/studio', status: 'checking', detail: 'Verificando superficie.' },
    { id: 'field-map', label: 'Field / Map', path: '/field/map', status: 'checking', detail: 'Verificando superficie y datos del mapa.' },
    { id: 'observatory', label: 'Observatory', path: '/observatory', status: 'checking', detail: 'Verificando superficie.' },
    { id: 'root-commercial', label: 'Conversión', path: '/api/root/commercial', status: 'checking', detail: 'Verificando persistencia comercial.' },
  ]);

  useEffect(() => {
    let cancelled = false;
    async function loadCommercial() {
      try {
        const response = await fetch('/api/root/commercial', { cache: 'no-store', credentials: 'include' });
        const body = await response.json().catch(() => null);
        if (!cancelled && response.ok && body?.ok) setCommercial(body.data);
      } catch {
        if (!cancelled) setCommercial(null);
      }
    }
    void loadCommercial();
    return () => { cancelled = true; };
  }, [state.generatedAt]);

  useEffect(() => {
    let cancelled = false;
    async function inspect(surface: SurfaceState): Promise<SurfaceState> {
      try {
        const response = await fetch(surface.path, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'x-root-health-check': '1' },
        });
        if (!response.ok) {
          return { ...surface, status: 'attention', detail: `HTTP ${response.status}. La ruta existe, pero no respondió correctamente.` };
        }
        if (surface.id === 'field-map') {
          const dataResponse = await fetch('/api/field/map/world', { cache: 'no-store', credentials: 'include' }).catch(() => null);
          if (!dataResponse?.ok) return { ...surface, status: 'attention', detail: `La vista responde, pero el conjunto mundial falló${dataResponse ? ` con HTTP ${dataResponse.status}` : ''}.` };
        }
        return { ...surface, status: 'ok', detail: 'Superficie accesible en esta sesión.' };
      } catch (error) {
        return { ...surface, status: 'attention', detail: error instanceof Error ? error.message : 'No fue posible verificar la superficie.' };
      }
    }
    async function run() {
      const next = await Promise.all(surfaces.map(inspect));
      if (!cancelled) setSurfaces(next);
    }
    void run();
    return () => { cancelled = true; };
    // Run once per mounted ROOT session; manual ROOT refresh remount is not required.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const proposedCases = useMemo(() => {
    const commercialRows = commercial?.opportunities ?? [];
    const governanceRows = state.governance.data.proposals.filter((row) => {
      const status = text(row.status).toLowerCase();
      return !['executed', 'blocked', 'rejected', 'closed'].includes(status);
    });
    return commercialRows.length + governanceRows.length;
  }, [commercial, state.governance.data.proposals]);

  const pendingEvidence = state.predictions.data.evidenceRequests.length;
  const staleEvidence = state.predictions.data.evidenceRequests.filter((row) => {
    const age = ageHours(dateValue(row));
    return age !== null && age >= 48;
  }).length;
  const degradedSurfaces = surfaces.filter((surface) => surface.status === 'attention');
  const inactiveAgents = state.agents.data.agents.filter((agent) => {
    const value = text(agent.state.value ?? agent.availability).toLowerCase();
    const age = agent.lastRun ? ageHours(agent.lastRun) : null;
    return Boolean(agent.error) || ['blocked', 'degraded', 'missing', 'inactive'].some((token) => value.includes(token)) || (age !== null && age > 72);
  });
  const openGovernance = state.governance.data.proposals.filter((row) => !['executed', 'rejected', 'closed'].includes(text(row.status).toLowerCase())).length;

  const attentionScore = pendingEvidence + degradedSurfaces.length + inactiveAgents.length + openGovernance;
  const directorMessage = attentionScore === 0
    ? 'No hay bloqueos confirmados. Revisa los casos nuevos y decide qué merece convertirse en acción.'
    : `${attentionScore} condiciones requieren revisión. Empieza por evidencia vencida y superficies en atención antes de abrir trabajo nuevo.`;

  return (
    <section className="rad-root" aria-label="Director de atención ROOT">
      <header className="rad-header">
        <div>
          <span>PROJECT EXECUTION MANAGER · VENTANA INICIAL</span>
          <h1>Qué requiere tu atención ahora</h1>
          <p>{directorMessage}</p>
        </div>
        <button type="button" onClick={() => navigate({ mode: 'governance' })}>ABRIR DECISIONES</button>
      </header>

      <div className="rad-priorities">
        <button type="button" onClick={() => navigate({ mode: 'conversion' })}>
          <span>CASOS NUEVOS PROPUESTOS</span>
          <strong>{proposedCases}</strong>
          <p>Empresas, señales y propuestas que todavía necesitan selección, metodología o contacto.</p>
          <b>IR A CASOS →</b>
        </button>
        <button type="button" data-urgent={staleEvidence > 0} onClick={() => navigate({ mode: 'observatory', lens: 'attractors' })}>
          <span>EVIDENCIA PENDIENTE</span>
          <strong>{pendingEvidence}</strong>
          <p>{staleEvidence ? `${staleEvidence} solicitudes llevan al menos 48 horas sin cierre.` : 'Solicitudes abiertas de evidencia y relaciones que todavía no sostienen una decisión.'}</p>
          <b>IR A ATRACTORES →</b>
        </button>
        <button type="button" data-urgent={degradedSurfaces.length > 0} onClick={() => document.getElementById('rad-site-health')?.scrollIntoView({ behavior: 'smooth' })}>
          <span>SALUD DEL SITIO</span>
          <strong>{degradedSurfaces.length ? `${degradedSurfaces.length} ATTENTION` : 'OK'}</strong>
          <p>Studio, Field, Observatory y la capa de conversión comprobados desde la sesión ROOT.</p>
          <b>VER SUPERFICIES →</b>
        </button>
        <button type="button" data-urgent={inactiveAgents.length > 0} onClick={() => navigate({ mode: 'observatory', lens: 'agents' })}>
          <span>AGENTES A REVISAR</span>
          <strong>{inactiveAgents.length}</strong>
          <p>Errores, estados degradados o agentes sin ejecución registrada durante más de 72 horas.</p>
          <b>IR A AGENTES →</b>
        </button>
      </div>

      <div className="rad-detail-grid">
        <section id="rad-site-health" className="rad-health">
          <header><span>SISTEMA COMPLETO</span><h2>Estado de superficies</h2></header>
          {surfaces.map((surface) => (
            <a key={surface.id} href={surface.path.startsWith('/api/') ? '#' : surface.path} onClick={(event) => { if (surface.path.startsWith('/api/')) event.preventDefault(); }} data-status={surface.status}>
              <i aria-hidden="true" />
              <div><strong>{surface.label}</strong><p>{surface.detail}</p></div>
              <b>{surface.status === 'checking' ? 'CHECKING' : surface.status.toUpperCase()}</b>
            </a>
          ))}
        </section>

        <section className="rad-manager">
          <header><span>PROJECT MANAGER</span><h2>No abras otra cosa antes de revisar esto</h2></header>
          <ol>
            {staleEvidence > 0 ? <li><strong>Cierra evidencia vencida.</strong><span>Hay {staleEvidence} solicitudes con más de 48 horas.</span></li> : null}
            {degradedSurfaces.length > 0 ? <li><strong>Recupera superficies degradadas.</strong><span>{degradedSurfaces.map((item) => item.label).join(', ')} requieren diagnóstico.</span></li> : null}
            {inactiveAgents.length > 0 ? <li><strong>Revisa agentes dormidos o bloqueados.</strong><span>{inactiveAgents.slice(0, 3).map((agent) => agent.role || agent.id).join(', ')}{inactiveAgents.length > 3 ? '…' : ''}</span></li> : null}
            {proposedCases > 0 ? <li><strong>Selecciona un caso y ciérralo como decisión.</strong><span>{proposedCases} objetos siguen abiertos; no todos merecen convertirse en propuesta.</span></li> : null}
            {!attentionScore && !proposedCases ? <li><strong>Ejecuta una observación.</strong><span>No hay pendientes confirmados ni casos abiertos.</span></li> : null}
          </ol>
        </section>
      </div>
    </section>
  );
}
