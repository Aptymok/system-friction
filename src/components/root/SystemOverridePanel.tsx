// src/components/root/SystemOverridePanel.tsx
'use client';
import { useState } from 'react';

export function SystemOverridePanel() {
  const [threshold, setThreshold] = useState(0.7);
  const [loading, setLoading] = useState(false);

  const updateThreshold = async () => {
    setLoading(true);
    await fetch('/api/admin/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confidenceThreshold: threshold }),
    });
    setLoading(false);
  };

  const freezeSystem = async () => {
    await fetch('/api/admin/freeze', { method: 'POST' });
  };

  return (
    <div className="terminal-panel p-4">
      <h3 className="text-sm font-mono text-gold mb-2">Control Root</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs block">Umbral de confianza</label>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs">{threshold}</div>
          <button onClick={updateThreshold} disabled={loading} className="mt-1 bg-gold/20 px-2 py-1 text-xs rounded">
            Aplicar
          </button>
        </div>
        <button onClick={freezeSystem} className="w-full border border-red-500 text-red-500 py-1 text-xs rounded">
          🛑 Congelar Sistema
        </button>
      </div>
    </div>
  );
}
