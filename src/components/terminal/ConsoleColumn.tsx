'use client';

import { useState } from 'react';
import { useNodeStore } from '@/lib/store/nodeStore';
import { sendAudit } from '@/lib/api/audit'; // función helper que llama a /api/audit

export function ConsoleColumn() {
  const { addLog, status } = useNodeStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    addLog(`> ${input}`, 'user');
    try {
      const result = await sendAudit(input);
      if (result.success) {
        addLog(`[Sistema] IHG: ${result.metrics.ihg.toFixed(3)} | Patrón: ${result.metrics.pattern}`, 'system');
        addLog(`Acción propuesta: ${result.recommendations[0]}`, 'action');
      } else {
        addLog(`Error: ${result.error}`, 'error');
      }
    } catch (err) {
      addLog(`Error de conexión`, 'error');
    }
    setInput('');
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-black text-green-500 font-mono p-4">
      <div className="flex-1 overflow-y-auto space-y-2">
        <div className="text-zinc-500">Sistema listo. Escribe tu observación:</div>
      </div>
      <div className="flex gap-2 mt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
          placeholder="Describe tu fricción actual..."
          disabled={status === 'frozen' || loading}
        />
        <button
          onClick={handleSend}
          disabled={status === 'frozen' || loading}
          className="px-4 py-2 bg-green-700 text-black font-bold disabled:opacity-50"
        >
          {loading ? '...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}