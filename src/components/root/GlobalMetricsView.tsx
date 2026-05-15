// src/components/root/GlobalMetricsView.tsx
'use client';
import { useEffect, useState } from 'react';
import { GlobalLearningAgent } from '@/lib/agents/GlobalLearningAgent';

export function GlobalMetricsView() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    GlobalLearningAgent.getAggregatedMetrics().then(setMetrics);
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
