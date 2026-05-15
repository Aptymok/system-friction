// src/hooks/useGate.ts
import { useState } from 'react';

export function useGate() {
  const [canExecute, setCanExecute] = useState(true);

  const execute = async () => {
    console.log('[Gate] Ejecutando acción aprobada');
    await fetch('/api/gate/execute', { method: 'POST' });
  };

  const escalate = () => {
    console.log('[Gate] Escalando a humano');
  };

  const block = () => {
    console.log('[Gate] Bloqueando acción');
    setCanExecute(false);
  };

  return { execute, escalate, block, canExecute };
}
