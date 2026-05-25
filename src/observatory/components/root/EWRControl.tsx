// src/components/root/ERWControl.tsx
'use client';
import { useEffect, useState } from 'react';

export function ERWControl() {
  const [erw, setErw] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchERW = async () => {
    try {
      const res = await fetch('/api/admin/EWR');
      const data = await res.json();
      setErw(data.erw);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetERW = async () => {
    await fetch('/api/admin/EWR/reset', { method: 'POST' });
    fetchERW();
  };

  useEffect(() => {
    fetchERW();
  }, []);

  if (loading) return <div className="terminal-panel p-4">Cargando ERW...</div>;

  return (
    <div className="terminal-panel p-4">
      <h3 className="text-sm font-mono text-gold mb-2">External Reality Weight (ERW)</h3>
      <div className="text-2xl font-mono">{erw?.toFixed(4) ?? '—'}</div>
      <p className="text-xs text-zinc-500 mt-1">
        Umbral dinámico = base - (ERW × sensibilidad). Mide acierto histórico.
      </p>
      <button
        onClick={resetERW}
        className="mt-3 w-full border border-gold/30 bg-gold/10 py-1 text-xs rounded hover:bg-gold/20"
      >
        Resetear ERW (forzar recálculo)
      </button>
    </div>
  );
}
