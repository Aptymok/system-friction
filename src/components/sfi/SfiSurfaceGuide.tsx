import type { ReactNode } from 'react';
import Link from 'next/link';
import './sfi-surface-guide.css';

export type SfiSurfaceId = 'field' | 'studio' | 'world-field' | 'observatory';

type Surface = {
  id: SfiSurfaceId;
  label: string;
  href: string;
};

const SURFACES: Surface[] = [
  { id: 'field', label: 'MI CAMPO', href: '/interface' },
  { id: 'studio', label: 'STUDIO', href: '/studio' },
  { id: 'world-field', label: 'CAMPO MUNDIAL', href: '/field/map' },
  { id: 'observatory', label: 'SÍNTESIS PÚBLICA', href: '/observatory' },
];

const EPISTEMIC_PATH = [
  'Observar',
  'Conservar',
  'Relacionar',
  'Hipótesis',
  'Probar',
  'Retorno',
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
      <div className="ssg-context">
        <nav className="ssg-nav" aria-label="Navegación contextual de la capa">
          {SURFACES.map((surface) => (
            <Link
              key={surface.id}
              href={surface.href}
              className={surface.id === current ? 'is-current' : ''}
              aria-current={surface.id === current ? 'page' : undefined}
            >
              {surface.label}
            </Link>
          ))}
        </nav>
        <div className="ssg-method" aria-label="Secuencia epistemológica compartida de SFI">
          {EPISTEMIC_PATH.map((step, index) => (
            <span key={step}>
              {step}{index < EPISTEMIC_PATH.length - 1 ? <i>→</i> : null}
            </span>
          ))}
        </div>
      </div>

      <div className="ssg-intro">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children ? <div className="ssg-actions">{children}</div> : null}
      </div>
    </section>
  );
}
