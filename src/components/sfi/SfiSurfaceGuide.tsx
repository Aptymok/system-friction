import type { ReactNode } from 'react';
import Link from 'next/link';
import './sfi-surface-guide.css';

export type SfiSurfaceId = 'field' | 'studio' | 'world-field' | 'observatory';

type Surface = {
  id: SfiSurfaceId;
  label: string;
  purpose: string;
  href: string;
};

const SURFACES: Surface[] = [
  {
    id: 'field',
    label: 'Mi campo',
    purpose: 'Conservar apariciones, evidencia y trayectoria antes de concluir.',
    href: '/interface',
  },
  {
    id: 'studio',
    label: 'Studio',
    purpose: 'Analizar un objeto, probar una transformación y preparar un retorno observable.',
    href: '/studio',
  },
  {
    id: 'world-field',
    label: 'Campo mundial',
    purpose: 'Localizar señales, eventos y tensiones en el mundo.',
    href: '/field/map',
  },
  {
    id: 'observatory',
    label: 'Observatorio público',
    purpose: 'Consultar la síntesis agregada y longitudinal publicada por SFI.',
    href: '/observatory',
  },
];

const EPISTEMIC_PATH = [
  'Observar',
  'Conservar',
  'Relacionar',
  'Formular una hipótesis',
  'Probar de forma reversible',
  'Registrar el retorno',
  'Aprender',
];

export function SfiSurfaceGuide({
  current,
  eyebrow,
  title,
  description,
  children,
}: {
  current: SfiSurfaceId;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="ssg-shell" aria-label="Orientación de la superficie SFI">
      <div className="ssg-intro">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children ? <div className="ssg-actions">{children}</div> : null}
      </div>

      <nav className="ssg-nav" aria-label="Superficies de System Friction Institute">
        {SURFACES.map((surface) => (
          <Link
            key={surface.id}
            href={surface.href}
            className={surface.id === current ? 'is-current' : ''}
            aria-current={surface.id === current ? 'page' : undefined}
          >
            <strong>{surface.label}</strong>
            <span>{surface.purpose}</span>
          </Link>
        ))}
      </nav>

      <div className="ssg-method" aria-label="Secuencia epistemológica compartida de SFI">
        <span>SECUENCIA SFI</span>
        {EPISTEMIC_PATH.map((step, index) => (
          <span key={step}>
            <b>{step}</b>
            {index < EPISTEMIC_PATH.length - 1 ? <i>→</i> : null}
          </span>
        ))}
      </div>
    </section>
  );
}
