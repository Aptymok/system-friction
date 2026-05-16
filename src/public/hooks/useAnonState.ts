// src/hooks/useAnonState.ts
import { useEffect, useState } from 'react';

export function useAnonState() {
  const [metrics, setMetrics] = useState<any>({});
  const [worldSpectrum, setWorldSpectrum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/global-metrics').then(res => res.json()),
      fetch('/api/world-spectrum').then(res => res.json())
    ]).then(([globalMetrics, ws]) => {
      setMetrics(globalMetrics);
      setWorldSpectrum(ws);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return { metrics, worldSpectrum, loading };
}