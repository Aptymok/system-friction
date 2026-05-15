// src/components/root/GlobalMetricsView.tsx
'use client';
import { useEffect, useState } from 'react';

export function GlobalMetricsView() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch('/api/global-metrics')
      .then((res) => res.json())
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  return (
    <div className="terminal-panel p-4">
      <h3 className="text-sm font-mono text-gold mb-2">Métricas Globales</h3>
      {metrics ? (
        <div className="text-xs space-y-1">
          <div>IHG promedio: {metrics.globalAverageIHG?.toFixed(3)}</div>
          <div>Volatilidad global: {metrics.globalVolatility?.toFixed(3)}</div>
          <div>Total auditorías: {metrics.totalAudits}</div>
          <div>Última actualización: {new Date(metrics.lastUpdated).toLocaleString()}</div>
        </div>
      ) : (
        <div className="text-xs text-zinc-500">Cargando...</div>
      )}
    </div>
  );
}
