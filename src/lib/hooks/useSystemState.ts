// src/hooks/useSystemState.ts
import { useEffect, useState } from 'react';

export function useSystemState() {
  const [gap, setGap] = useState({ expected: 0.78, actual: 0.52, delta: -0.26 });
  const [plans, setPlans] = useState([
    { label: 'A', score: 0.91, risk: 'bajo' },
    { label: 'B', score: 0.78, risk: 'medio' },
    { label: 'C', score: 0.64, risk: 'alto' },
  ]);
  const [systemStatus, setSystemStatus] = useState({ state: 'idle', uncertainty: 0.23, stability: 0.84 });

  useEffect(() => {
    const interval = setInterval(() => {}, 5000);
    return () => clearInterval(interval);
  }, []);

  return { gap, plans, systemStatus };
}
