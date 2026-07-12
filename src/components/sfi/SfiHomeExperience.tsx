'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  FlaskConical,
  Radar,
  ScanSearch,
  X,
} from 'lucide-react';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import { trackEvent } from '@/lib/analytics/client';
import { SfiWorldInterfaceHero } from './SfiWorldInterfaceHero';

type Hub = {
  id: string;
  title: string;
  question: string;
  description: string;
  route: string;
  action: string;
  icon: typeof Radar;
  primary?: boolean;
};

const HUBS: Hub[] = [
  {
    id: 'observatory',
    title: 'OBSERVATORY',
    question: '¿Qué está pasando en el campo?',
    description: 'Lee el estado observado del mundo, sus tensiones, persistencia y trayectoria sin convertirlo en pronóstico.',
    route: '/observatory',
    action: 'LEER EL CAMPO',
    icon: Radar,
  },
  {
    id: 'field',
    title: 'FIELD',
    question: '¿Qué sistema real necesitas mover?',
    description: 'Aplica MOP-H, sella una hipótesis, ejecuta una perturbación mínima y regresa con evidencia a las 72 horas.',
    route: '/field',
    action: 'ABRIR UN CICLO',
    icon: Activity,
    primary: true,
  },
  {
    id: 'studio',
    title: 'STUDIO',
    question: '¿Qué objeto o señal necesitas medir?',
    description: 'Ingiere texto, audio, imagen o video; sintetiza variables MIHM y proyecta su relación con el campo.',
    route: '/login?next=%2Fstudio',
    action: 'ANALIZAR OBJETO',
    icon: FlaskConical,
  },
  {
    id: 'scorefriction',
    title: 'SCOREFRICTION',
    question: '¿Qué señal cultural quieres seguir?',
    description: 'Observa propagación, persistencia, transformación y tensión cultural sin reducirlas a popularidad.',
    route: '/scorefriction',
    action: 'OBSERVAR SEÑAL',
    icon: ScanSearch,
  },
  {
    id: 'repository',
    title: 'REPOSITORY',
    question: '¿Necesitas método, evidencia o definición?',
    description: 'Consulta documentos, contratos, manuales, variables y límites epistemológicos del Instituto.',
    route: '/repository',
    action: 'ABRIR EL MÉTODO',
    icon: BookOpen,
  },
];

function HubCard({ hub }: { hub: Hub }) {
  const Icon = hub.icon;
  return (
    <Link
      href={hub.route}
      data-analytics-label={`home_hub_${hub.id}`}
      onClick={() => trackEvent('hub_open', { hub: hub.id, destination: hub.route.split('?')[0] })}
      className={`group relative flex min-h-[184px] flex-col border p-4 transition duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9bb67] ${hub.primary
        ? 'border-[#c9aa5488] bg-[radial-gradient(circle_at_top_right,rgba(201,170,84,0.19),transparent_50%),rgba(12,10,6,0.94)] hover:border-[#e5c774]'
        : 'border-[#3c3424] bg-[rgba(7,7,5,0.91)] hover:border-[#8d783f] hover:bg-[rgba(12,10,6,0.96)]'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex h-9 w-9 items-center justify-center border border-[#4a3f28] bg-[#060604] text-[#c9aa54]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#746b59]">{hub.primary ? 'RECOMMENDED ENTRY' : 'PUBLIC HUB'}</span>
      </div>
      <strong className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[#dfc778]">{hub.title}</strong>
      <h2 className="mt-2 text-base font-medium leading-6 text-[#f2e7cc]">{hub.question}</h2>
      <p className="mt-2 flex-1 text-[11px] leading-5 text-[#918876]">{hub.description}</p>
      <span className="mt-4 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#b8a166] transition group-hover:text-[#f0d487]">
        {hub.action}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function SfiHomeExperience({ state }: { state: SfiWorldInterfaceState }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="sfi-home-experience">
      <SfiWorldInterfaceHero state={state} />

      {open ? (
        <section className="sfi-entry-layer" aria-label="Orientación de hubs de System Friction Institute">
          <div className="sfi-entry-backdrop" aria-hidden="true" />
          <div className="sfi-entry-panel">
            <header className="sfi-entry-header">
              <div>
                <span>SELECT OPERATIONAL ENTRY</span>
                <h1>¿Qué necesitas hacer?</h1>
                <p>Cada hub responde una pregunta distinta. Elige por objetivo, no por nombre.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar orientación y observar el campo">
                <X className="h-4 w-4" />
                <span>OBSERVAR CAMPO</span>
              </button>
            </header>
            <div className="sfi-hub-grid">
              {HUBS.map((hub) => <HubCard key={hub.id} hub={hub} />)}
            </div>
            <footer>
              <span>WORLD STATE → OBJECT / SYSTEM → EVIDENCE → HYPOTHESIS → RETURN</span>
              <Link href="/contact?offer=SFI-DR01" onClick={() => trackEvent('contact_intent', { source_surface: 'home_orientation', offer: 'SFI-DR01' })}>NO SÉ POR DÓNDE EMPEZAR</Link>
            </footer>
          </div>
        </section>
      ) : (
        <button type="button" className="sfi-entry-launcher" onClick={() => setOpen(true)}>
          <ScanSearch className="h-4 w-4" />
          <span>¿A DÓNDE VOY?</span>
        </button>
      )}

      <style jsx global>{`
        .sfi-home-experience {
          position: relative;
          min-height: 100svh;
          background: #030302;
        }

        .sfi-entry-layer {
          position: absolute;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 96px 24px 190px;
          pointer-events: none;
        }

        .sfi-entry-backdrop {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 42%, rgba(6, 6, 4, 0.27), rgba(2, 2, 1, 0.64) 44%, rgba(2, 2, 1, 0.28) 74%),
            linear-gradient(180deg, rgba(2, 2, 1, 0.16), rgba(2, 2, 1, 0.43));
          backdrop-filter: blur(2.5px);
        }

        .sfi-entry-panel {
          position: relative;
          width: min(1180px, calc(100vw - 48px));
          border: 1px solid rgba(201, 170, 84, 0.31);
          background: rgba(4, 4, 3, 0.91);
          box-shadow: 0 32px 120px rgba(0, 0, 0, 0.62), inset 0 1px rgba(255,255,255,0.025);
          pointer-events: auto;
          font-family: var(--sfi-font-mono), 'JetBrains Mono', monospace;
        }

        .sfi-entry-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding: 22px 24px 18px;
          border-bottom: 1px solid rgba(201, 170, 84, 0.18);
        }

        .sfi-entry-header > div > span {
          display: block;
          color: #c9aa54;
          font-size: 9px;
          letter-spacing: 0.22em;
        }

        .sfi-entry-header h1 {
          margin: 7px 0 0;
          color: #f5ead0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(28px, 3vw, 46px);
          font-weight: 500;
          letter-spacing: -0.025em;
        }

        .sfi-entry-header p {
          margin: 7px 0 0;
          color: rgba(226, 214, 187, 0.58);
          font-size: 11px;
          line-height: 1.6;
        }

        .sfi-entry-header button {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(201, 170, 84, 0.25);
          padding: 10px 12px;
          background: rgba(2, 2, 1, 0.72);
          color: rgba(226, 214, 187, 0.64);
          font-size: 8px;
          letter-spacing: 0.16em;
          cursor: pointer;
        }

        .sfi-entry-header button:hover {
          border-color: rgba(201, 170, 84, 0.62);
          color: #ead391;
        }

        .sfi-hub-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          padding: 12px;
        }

        .sfi-entry-panel footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border-top: 1px solid rgba(201, 170, 84, 0.16);
          padding: 12px 18px;
          color: rgba(226, 214, 187, 0.42);
          font-size: 8px;
          letter-spacing: 0.13em;
        }

        .sfi-entry-panel footer a {
          border-left: 1px solid rgba(201, 170, 84, 0.25);
          padding-left: 18px;
          color: #c9aa54;
          white-space: nowrap;
        }

        .sfi-entry-launcher {
          position: absolute;
          z-index: 80;
          top: 118px;
          left: 50%;
          display: inline-flex;
          transform: translateX(-50%);
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(201, 170, 84, 0.46);
          background: rgba(4, 4, 3, 0.9);
          padding: 11px 15px;
          color: #d8bd70;
          font-family: var(--sfi-font-mono), monospace;
          font-size: 9px;
          letter-spacing: 0.18em;
          cursor: pointer;
          box-shadow: 0 16px 60px rgba(0,0,0,.45);
        }

        @media (max-width: 1180px) {
          .sfi-entry-layer {
            align-items: start;
            overflow: auto;
            padding: 104px 18px 70px;
          }
          .sfi-hub-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sfi-hub-grid > :last-child { grid-column: span 2; min-height: 150px; }
        }

        @media (max-width: 680px) {
          .sfi-entry-layer { padding: 92px 10px 36px; }
          .sfi-entry-panel { width: calc(100vw - 20px); }
          .sfi-entry-header { padding: 17px 15px 14px; }
          .sfi-entry-header button span { display: none; }
          .sfi-hub-grid { grid-template-columns: 1fr; padding: 8px; }
          .sfi-hub-grid > :last-child { grid-column: auto; }
          .sfi-entry-panel footer { align-items: flex-start; flex-direction: column; }
          .sfi-entry-panel footer a { border-left: 0; border-top: 1px solid rgba(201,170,84,.2); padding: 10px 0 0; }
          .sfi-entry-launcher { top: 92px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sfi-home-experience *, .sfi-home-experience *::before, .sfi-home-experience *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
