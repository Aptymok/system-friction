// src/hooks/useAnonState.ts
import { useEffect, useState } from 'react';
import { GlobalLearningAgent } from '@/lib/agents/GlobalLearningAgent';

export function useAnonState() {
  const [metrics, setMetrics] = useState<any>({});
  const [worldSpectrum, setWorldSpectrum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      GlobalLearningAgent.getAggregatedMetrics(),
      fetch('/api/world-spectrum').then(r => r.json())
    ]).then(([globalMetrics, ws]) => {
      setMetrics(globalMetrics);
      setWorldSpectrum(ws);
      setLoading(false);
    });
  }, []);

  return { metrics, worldSpectrum, loading };
}
