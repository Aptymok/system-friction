import type { ReactNode } from 'react';
import { FlaskConical, ShieldCheck, ScanLine, GitCompareArrows } from 'lucide-react';
import './method-lab-cinematic.css';

export function MethodLabCinematicFrame({ children, identity }: { children: ReactNode; identity: string }) {
  return (
    <main className="ml-cine">
      <header className="ml-cine__bar">
        <div className="ml-cine__brand"><FlaskConical /><div><strong>METHOD LAB</strong><span>SYSTEM FRICTION INSTITUTE</span></div></div>
        <div className="ml-cine__contract"><span>RUN CONTRACT</span><strong>SFI-METHOD-LAB-RUN-1.0</strong></div>
        <div className="ml-cine__state"><ShieldCheck /><span>EPISTEMIC CLASS</span><strong>SIMULATED</strong></div>
        <div className="ml-cine__state"><GitCompareArrows /><span>PROMOTION</span><strong>ROOT REQUIRED</strong></div>
        <div className="ml-cine__state"><ScanLine /><span>IDENTITY</span><strong>{identity}</strong></div>
      </header>
      <section className="ml-cine__continuum">
        <div className="ml-cine__signal" aria-hidden />
        {children}
      </section>
      <footer className="ml-cine__footer"><span>TEST / SIMULATE / CALIBRATE</span><span>SIMULATED ≠ OBSERVED · LAB RUN ≠ CANONICAL MUTATION</span></footer>
    </main>
  );
}
