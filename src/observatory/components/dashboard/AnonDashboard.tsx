// src/components/dashboard/AnonDashboard.tsx
'use client';
import { useState } from 'react';
import { CognitiveConsole } from './CognitiveConsole';
import { useAnonState } from '@/public/hooks/useAnonState';

export function AnonDashboard({ onClose }: { onClose: () => void }) {
  const { metrics, worldSpectrum, loading } = useAnonState();
  const [showConsole, setShowConsole] = useState(false);

  if (loading) return <div className="p-6 text-center">Cargando World Spectrum...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center border-b border-gold/20 pb-2">
        <h2 className="text-lg font-mono text-gold">Observatorio (Modo Anónimo)</h2>
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-gold">[Cerrar]</button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>IHG global: {metrics.globalAverageIHG?.toFixed(3) || '—'}</div>
        <div>Volatilidad: {metrics.globalVolatility?.toFixed(3) || '—'}</div>
        <div>Total auditorías: {metrics.totalAudits || 0}</div>
      </div>
      <button onClick={() => setShowConsole(!showConsole)} className="text-xs text-gold underline">
        {showConsole ? 'Ocultar consola' : 'Mostrar consola (solo lectura)'}
      </button>
      {showConsole && <CognitiveConsole readonly />}
    </div>
  );
}
