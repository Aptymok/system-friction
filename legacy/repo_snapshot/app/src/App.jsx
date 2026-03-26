import { useEffect, useMemo, useState } from 'react';
import SalaEidolon from '@/components/salaEidolon/SalaEidolon';
import Observatorio from '@/components/Observatorio';
import CampoCognitivo from '@/components/CampoCognitivo';
import Dashboard from '@/components/Dashboard';
import Laboratorio from '@/components/Laboratorio';
import ScoreFriction from '@/components/ScoreFriction';
import { useEidolon } from '@/hooks/useEidolon';
import './App.css';

const navRoutes = [
  { path: '/', label: 'Sala' },
  { path: '/observatorio', label: 'Observatorio' },
  { path: '/campo', label: 'Campo' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/laboratorio', label: 'Laboratorio' },
];

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname || '/');
  const eidolon = useEidolon();

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const score = useMemo(() => (Math.abs(eidolon.mihmState.ihg) / 1.2) + (1 - eidolon.mihmState.nti), [eidolon.mihmState]);

  let view = <SalaEidolon />;
  if (path === '/observatorio') view = <Observatorio />;
  if (path === '/campo') view = <CampoCognitivo phi={eidolon.semanticFingerprint?.phi || {}} patterns={eidolon.activePatterns} />;
  if (path === '/dashboard') view = <Dashboard mihmState={eidolon.mihmState} scoreFriction={score} />;
  if (path === '/laboratorio') view = <Laboratorio />;
  if (path === '/scorefriction') view = <ScoreFriction />;

  return (
    <main className="app-shell">
      <nav>
        {navRoutes.map((route) => (
          <button key={route.path} type="button" onClick={() => navigate(route.path)}>{route.label}</button>
        ))}
      </nav>
      {view}
    </main>
  );
}
