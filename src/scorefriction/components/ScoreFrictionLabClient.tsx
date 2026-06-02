'use client';

import { useState } from 'react';

const SAMPLE = {
  case_id: 'CW-009',
  source_name: 'soundcloud_public_v2',
  source_url: 'https://soundcloud.com/example/track',
  territory: 'MX',
  raw_payload: {
    title: '',
    artist: '',
    genre: '',
    description: '',
    comments: [],
    playback_count: 0,
    likes_count: 0,
    reposts_count: 0,
    waveform_url: '',
  },
};

export function ScoreFrictionLabClient() {
  const [payload, setPayload] = useState(JSON.stringify(SAMPLE, null, 2));
  const [result, setResult] = useState<string>('Sin envio todavia.');
  const [busy, setBusy] = useState(false);

  async function submit(endpoint: string) {
    setBusy(true);
    setResult('Procesando...');
    try {
      const parsed = JSON.parse(payload);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const json = await response.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'scorefriction_request_failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="border border-[#26221b] bg-[#0c0b09] p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8924b]">New Observation</div>
        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          spellCheck={false}
          className="mt-3 min-h-[520px] w-full resize-y border border-[#26221b] bg-[#050504] p-4 font-mono text-xs leading-5 text-[#d8d0bd] outline-none focus:border-[#b8924b]"
        />
        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          <button disabled={busy} onClick={() => void submit('/api/scorefriction/observe/manual')} className="border border-[#b8924b] px-3 py-2 text-[#ead8aa] disabled:opacity-40">
            Guardar evidencia manual
          </button>
          <button disabled={busy} onClick={() => void submit('/api/scorefriction/evaluate')} className="border border-[#344f6f] px-3 py-2 text-[#9dbfe8] disabled:opacity-40">
            Evaluar vectores
          </button>
          <button disabled={busy} onClick={() => void submit('/api/scorefriction/propose')} className="border border-[#425d35] px-3 py-2 text-[#add28d] disabled:opacity-40">
            Proponer prototipo
          </button>
        </div>
      </div>
      <aside className="border border-[#26221b] bg-[#0c0b09] p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8924b]">Evidence Ledger Response</div>
        <pre className="mt-3 max-h-[620px] overflow-auto whitespace-pre-wrap border border-[#26221b] bg-[#050504] p-4 font-mono text-[11px] leading-5 text-[#b8ad98]">{result}</pre>
      </aside>
    </section>
  );
}
