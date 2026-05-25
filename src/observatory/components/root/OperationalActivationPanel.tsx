'use client';

import { useState } from 'react';

type DemoState = {
  reading?: any;
  contrast?: any;
  objective?: any;
  calendar?: any;
  cron?: any;
  error?: string;
};

export function OperationalActivationPanel() {
  const [text, setText] = useState('Objetivo: observar fricción operativa y convertirla en acción mínima verificable.');
  const [title, setTitle] = useState('Objetivo operativo');
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<DemoState>({});
  const [loading, setLoading] = useState(false);

  const runFlow = async () => {
    setLoading(true);
    setState({});

    try {
      const form = new FormData();
      form.append('text', text);
      if (file) form.append('file', file);

      const twinRes = await fetch('/api/cognitive-twin', { method: 'POST', body: form });
      const twin = await twinRes.json();
      if (!twinRes.ok) throw new Error(twin.error || 'cognitive_twin_failed');

      const objectiveRes = await fetch('/api/project-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: text }),
      });
      const objective = await objectiveRes.json();
      if (!objectiveRes.ok) throw new Error(objective.error || 'project_manager_failed');

      const contrastRes = await fetch('/api/spectrum-contrast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reading: twin.reading }),
      });
      const contrast = await contrastRes.json();
      if (!contrastRes.ok) throw new Error(contrast.error || 'spectrum_contrast_failed');

      const socialRes = await fetch('/api/social/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: objective.objective.id, title, reading: twin.reading }),
      });
      const social = await socialRes.json();
      if (!socialRes.ok) throw new Error(social.error || 'social_calendar_failed');

      setState({
        reading: twin.reading,
        contrast: contrast.contrast,
        objective,
        calendar: social.item,
      });
    } catch (error) {
      setState({ error: error instanceof Error ? error.message : 'unknown_error' });
    } finally {
      setLoading(false);
    }
  };

  const updateCalendar = async (action: 'accept' | 'cancel') => {
    if (!state.calendar?.id) return;
    const res = await fetch('/api/social/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: state.calendar.id, action }),
    });
    const data = await res.json();
    setState((current) => ({ ...current, calendar: data.item }));
  };

  const wakeCron = async () => {
    const res = await fetch('/api/cron-agent');
    const data = await res.json();
    setState((current) => ({ ...current, cron: data }));
  };

  return (
    <div className="terminal-panel p-4 space-y-4">
      <div>
        <h2 className="font-mono text-sm text-gold">Activación funcional</h2>
        <p className="text-xs text-zinc-500">Archivo/objetivo → MIHM → contraste → bitácora → calendario sugerido.</p>
      </div>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="w-full border border-gold/20 bg-black/30 px-3 py-2 text-xs outline-none"
        placeholder="Objetivo/proyecto"
      />
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="min-h-24 w-full border border-gold/20 bg-black/30 px-3 py-2 text-xs outline-none"
        placeholder="Texto operacional"
      />
      <input
        type="file"
        accept=".txt,.pdf,.wav,.png,.jpg,.jpeg,.html,.htm,.py,.json"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="w-full text-xs text-zinc-400"
      />

      <div className="flex gap-2">
        <button onClick={runFlow} disabled={loading} className="border border-gold/40 px-3 py-2 text-xs text-gold disabled:opacity-50">
          {loading ? 'Procesando...' : 'Ejecutar flujo mínimo'}
        </button>
        <button onClick={() => updateCalendar('accept')} disabled={!state.calendar} className="border border-gold/20 px-3 py-2 text-xs">
          Aceptar calendario
        </button>
        <button onClick={() => updateCalendar('cancel')} disabled={!state.calendar} className="border border-red-500/30 px-3 py-2 text-xs text-red-300">
          Cancelar
        </button>
        <button onClick={wakeCron} className="border border-zinc-700 px-3 py-2 text-xs">
          Leer cron
        </button>
      </div>

      {state.error && <div className="border border-red-500/30 p-2 text-xs text-red-200">{state.error}</div>}

      {state.reading && (
        <div className="space-y-2 border border-gold/10 p-3 text-xs">
          <p>{state.reading.narrative}</p>
          <div className="grid grid-cols-3 gap-2 font-mono">
            <span>IHG {state.reading.ihg}</span>
            <span>NTI {state.reading.nti}</span>
            <span>LDI {state.reading.ldi}</span>
          </div>
          <pre className="max-h-40 overflow-auto text-[10px] text-zinc-500">{JSON.stringify({ contrast: state.contrast, calendar: state.calendar, cron: state.cron }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
