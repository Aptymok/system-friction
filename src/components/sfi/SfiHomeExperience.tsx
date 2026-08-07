'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import type { PublicInstitutionalAttractorState } from '@/lib/institution/publicAttractor';
import { trackEvent } from '@/lib/analytics/client';
import { SfiWorldInterfaceHero } from './SfiWorldInterfaceHero';

const THRESHOLD_STORAGE_KEY = 'sfi.public-threshold.last-seen.v1';
const THRESHOLD_REINTRODUCTION_MS = 7 * 24 * 60 * 60 * 1000;

type ThresholdMode = 'resolving' | 'full' | 'compact';

function shouldShowFullThreshold(raw: string | null) {
  if (!raw) return true;
  const seenAt = Date.parse(raw);
  if (!Number.isFinite(seenAt)) return true;
  return Date.now() - seenAt >= THRESHOLD_REINTRODUCTION_MS;
}

export function SfiHomeExperience({ state, attractor }: { state: SfiWorldInterfaceState; attractor: PublicInstitutionalAttractorState }) {
  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('resolving');
  const coverage = attractor.evidenceCoverage === null ? 'EVIDENCE NOT YET MEASURED' : `${Math.round(attractor.evidenceCoverage * 100)}% EVIDENCE COVERAGE`;

  useEffect(() => {
    try {
      setThresholdMode(shouldShowFullThreshold(window.localStorage.getItem(THRESHOLD_STORAGE_KEY)) ? 'full' : 'compact');
    } catch {
      setThresholdMode('full');
    }
  }, []);

  function enterField() {
    try {
      window.localStorage.setItem(THRESHOLD_STORAGE_KEY, new Date().toISOString());
    } catch {
      // Storage availability is not evidence and must not block the public interface.
    }
    setThresholdMode('compact');
    trackEvent('navigation_click', { source_surface: 'institutional_threshold', destination: 'public_field', action: 'observe' });
  }

  function reopenThreshold() {
    setThresholdMode('full');
    trackEvent('navigation_click', { source_surface: 'public_field', destination: 'institutional_threshold', action: 'reopen' });
  }

  return (
    <div className="sfi-home-experience">
      <SfiWorldInterfaceHero state={state} />

      {thresholdMode === 'full' ? (
        <section className="sfi-threshold" aria-label="Introducción a System Friction Institute">
          <div className="threshold-field" aria-hidden="true" />
          <div className="threshold-shell">
            <header className="threshold-header">
              <div>
                <span>SYSTEM FRICTION INSTITUTE · PUBLIC THRESHOLD</span>
                <h1>Observa antes de intervenir.</h1>
              </div>
              <div className="threshold-runtime">
                <span>FIELD</span>
                <strong>{state.signalState.status}</strong>
                <small>{state.generatedAt.replace('T', ' ').slice(0, 19)} UTC</small>
              </div>
            </header>

            <div className="threshold-body">
              <section className="threshold-intro">
                <p className="lead">SFI estudia sistemas que siguen funcionando mientras acumulan fricción: personas, organizaciones, señales culturales, infraestructuras y campos de interacción.</p>
                <p>No parte de una solución predeterminada. Registra evidencia, reconstruye trayectoria, distingue fenómenos persistentes, contrasta atractores y sólo entonces propone una perturbación mínima verificable.</p>
                <div className="method-line" aria-label="Método resumido">
                  <span>EVIDENCE</span><i>→</i><span>TRAJECTORY</span><i>→</i><span>ATTRACTOR</span><i>→</i><span>MINIMUM PERTURBATION</span><i>→</i><span>RETURN</span><i>→</i><span>GOVERNANCE</span>
                </div>
              </section>

              <section className="threshold-attractor">
                <header><span>INSTITUTIONAL ATTRACTOR</span><em>{attractor.status}</em></header>
                {attractor.desiredState ? <h2>{attractor.desiredState}</h2> : <h2>La declaración institucional no está disponible en el runtime.</h2>}
                <p>{attractor.claimBoundary ?? 'Sin evidencia suficiente, SFI no representa una dirección declarada como logro observado.'}</p>
                <div className="attractor-measure">
                  <strong>{coverage}</strong>
                  <span>{attractor.supportedDimensions.length} con soporte · {attractor.contradictedDimensions.length} contradichas/conflictuadas · {attractor.missingDimensions.length} sin evidencia · {attractor.activePhenomena} trayectorias de fenómeno</span>
                  <small>La cobertura indica dónde existe evidencia o contradicción. No es porcentaje de cumplimiento del atractor.</small>
                </div>
              </section>

              <section className="threshold-coordinates">
                <article><span>01 · WORLD</span><strong>¿Qué está cambiando fuera del sistema?</strong><p>Observatory y World Vector preservan contexto, fuentes, latencia y degradación.</p></article>
                <article><span>02 · OBJECT</span><strong>¿Qué señal está entrando al campo?</strong><p>Studio mide objetos sin confundir forma, interpretación y resultado.</p></article>
                <article><span>03 · SYSTEM</span><strong>¿Qué permanece atascado?</strong><p>FIELD trabaja con evidencia longitudinal y retorno antes de elevar una intervención.</p></article>
              </section>
            </div>

            <footer className="threshold-actions">
              <button type="button" onClick={enterField}>ENTRAR AL CAMPO</button>
              <Link href="/repository" onClick={() => trackEvent('navigation_click', { source_surface: 'institutional_threshold', destination: 'repository', action: 'read_method' })}>LEER MÉTODO</Link>
              <Link className="primary" href="/login" onClick={() => trackEvent('navigation_click', { source_surface: 'institutional_threshold', destination: 'login', action: 'authenticate' })}>INICIAR SESIÓN →</Link>
            </footer>
          </div>
        </section>
      ) : null}

      {thresholdMode === 'compact' ? (
        <aside className="threshold-compact" aria-label="Acceso institucional">
          <div>
            <span>SFI · FIELD</span>
            <strong>{state.signalState.status}</strong>
            <small>{attractor.status === 'MISSING' ? 'Attractor state unavailable' : `${attractor.activePhenomena} phenomenon trajectories`}</small>
          </div>
          <nav>
            <button type="button" onClick={reopenThreshold}>¿QUÉ ES SFI?</button>
            <Link href="/observatory">OBSERVATORY</Link>
            <Link className="primary" href="/login">INICIAR SESIÓN →</Link>
          </nav>
        </aside>
      ) : null}

      <style jsx global>{`
        .sfi-home-experience{position:relative;min-height:100svh;background:#030302}
        .sfi-threshold{position:absolute;z-index:80;inset:0;display:grid;place-items:center;padding:92px 30px 120px;pointer-events:none;font-family:var(--sfi-font-mono),ui-monospace,SFMono-Regular,Menlo,monospace}
        .threshold-field{position:absolute;inset:0;background:radial-gradient(circle at 50% 44%,rgba(12,11,7,.38),rgba(2,2,1,.88) 58%,rgba(2,2,1,.62));backdrop-filter:blur(3px)}
        .threshold-shell{position:relative;width:min(1120px,calc(100vw - 60px));border:1px solid rgba(201,170,84,.4);background:rgba(4,4,3,.93);box-shadow:0 35px 130px rgba(0,0,0,.62);pointer-events:auto}
        .threshold-header{display:flex;justify-content:space-between;gap:30px;padding:22px 25px;border-bottom:1px solid rgba(201,170,84,.2)}.threshold-header span,.threshold-attractor header span,.threshold-coordinates article>span{color:#aa9254;font-size:8px;letter-spacing:.18em}.threshold-header h1{margin:8px 0 0;color:#f0e3c5;font:500 clamp(30px,4vw,55px)/.98 Georgia,serif;letter-spacing:-.035em}.threshold-runtime{text-align:right}.threshold-runtime strong{display:block;margin:7px 0 4px;color:#d7bf7b;font-size:11px;text-transform:uppercase}.threshold-runtime small{color:#665f51;font-size:8px}
        .threshold-body{display:grid;grid-template-columns:1.08fr .92fr;gap:0}.threshold-intro{padding:28px 28px 23px;border-right:1px solid rgba(201,170,84,.15)}.threshold-intro p{max-width:650px;color:#908878;font-size:11px;line-height:1.75}.threshold-intro .lead{margin-top:0;color:#d9ccb0;font:400 18px/1.55 Georgia,serif}.method-line{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:25px;padding-top:15px;border-top:1px solid rgba(201,170,84,.14);color:#806f43;font-size:7px;letter-spacing:.1em}.method-line i{color:#4d473b;font-style:normal}
        .threshold-attractor{padding:28px}.threshold-attractor header{display:flex;justify-content:space-between;gap:12px}.threshold-attractor header em{color:#817864;font-size:8px;font-style:normal}.threshold-attractor h2{margin:18px 0 12px;color:#e7d8b5;font:400 20px/1.42 Georgia,serif}.threshold-attractor p{color:#7e7667;font-size:9px;line-height:1.65}.attractor-measure{margin-top:20px;border-left:1px solid #8d763d;padding-left:13px}.attractor-measure strong{display:block;color:#d8bd72;font-size:12px}.attractor-measure span,.attractor-measure small{display:block;margin-top:5px;color:#686154;font-size:8px;line-height:1.45}.attractor-measure small{color:#857a67}
        .threshold-coordinates{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid rgba(201,170,84,.15)}.threshold-coordinates article{padding:17px 20px;border-right:1px solid rgba(201,170,84,.12)}.threshold-coordinates article:last-child{border-right:0}.threshold-coordinates strong{display:block;margin:9px 0 6px;color:#cfc1a3;font:400 14px/1.4 Georgia,serif}.threshold-coordinates p{margin:0;color:#70695c;font-size:8px;line-height:1.55}
        .threshold-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:13px 18px;border-top:1px solid rgba(201,170,84,.18)}.threshold-actions a,.threshold-actions button{border:1px solid #393122;background:#060604;color:#8f846f;padding:10px 13px;font:inherit;font-size:8px;letter-spacing:.12em;text-decoration:none;cursor:pointer}.threshold-actions a:hover,.threshold-actions button:hover{border-color:#806b37;color:#dbc47f}.threshold-actions .primary{border-color:#9d8040;color:#e0c776;background:#121006}
        .threshold-compact{position:absolute;z-index:70;top:92px;left:50%;transform:translateX(-50%);width:min(980px,calc(100vw - 36px));display:flex;align-items:center;justify-content:space-between;gap:18px;border:1px solid rgba(201,170,84,.25);background:rgba(4,4,3,.84);backdrop-filter:blur(12px);padding:10px 12px 10px 15px;font-family:var(--sfi-font-mono),ui-monospace,SFMono-Regular,Menlo,monospace}.threshold-compact>div{display:flex;align-items:center;gap:10px;min-width:0}.threshold-compact span{color:#9b844d;font-size:7px;letter-spacing:.16em}.threshold-compact strong{color:#d7bf7b;font-size:8px}.threshold-compact small{color:#625c50;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.threshold-compact nav{display:flex;gap:5px;flex-shrink:0}.threshold-compact a,.threshold-compact button{border:1px solid rgba(201,170,84,.18);background:#060604;color:#8f846f;padding:7px 9px;font:inherit;font-size:7px;letter-spacing:.1em;text-decoration:none;cursor:pointer}.threshold-compact a:hover,.threshold-compact button:hover{border-color:#806b37;color:#dbc47f}.threshold-compact .primary{border-color:#8b7339;color:#d9be74;background:#121006}
        @media(max-width:820px){.sfi-threshold{align-items:start;overflow:auto;padding:92px 12px 125px}.threshold-shell{width:calc(100vw - 24px)}.threshold-body{grid-template-columns:1fr}.threshold-intro{border-right:0;border-bottom:1px solid rgba(201,170,84,.15)}.threshold-coordinates{grid-template-columns:1fr}.threshold-coordinates article{border-right:0;border-bottom:1px solid rgba(201,170,84,.1)}.threshold-actions{justify-content:stretch;flex-wrap:wrap}.threshold-actions a,.threshold-actions button{flex:1;text-align:center;white-space:nowrap}.threshold-compact{align-items:flex-start}.threshold-compact>div{display:grid;gap:3px}.threshold-compact nav{overflow-x:auto;max-width:58vw}}
        @media(max-width:520px){.threshold-header{padding:18px;align-items:flex-start}.threshold-runtime small{display:none}.threshold-intro,.threshold-attractor{padding:20px}.threshold-actions a,.threshold-actions button{flex-basis:100%}.threshold-compact{top:82px;display:grid}.threshold-compact nav{max-width:none;width:100%}.threshold-compact a,.threshold-compact button{flex:1;text-align:center}}
      `}</style>
    </div>
  );
}
