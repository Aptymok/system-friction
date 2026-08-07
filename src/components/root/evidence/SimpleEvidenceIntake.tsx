'use client';

import { useState } from 'react';
import { HumanReadableRecord } from '@/components/shared/HumanReadableRecord';

export function SimpleEvidenceIntake() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [evidenceType, setEvidenceType] = useState('observed_evidence');
  const [source, setSource] = useState('manual_observation');
  const [caseId, setCaseId] = useState('');
  const [targetNodeId, setTargetNodeId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim() && !file) return;
    setBusy(true); setMessage(''); setResult(null);
    try {
      const form = new FormData();
      if (title.trim()) form.set('title', title.trim());
      if (content.trim()) form.set('content', content.trim());
      form.set('evidenceType', evidenceType);
      form.set('source', source);
      if (caseId.trim()) form.set('caseId', caseId.trim());
      if (targetNodeId.trim()) form.set('targetNodeId', targetNodeId.trim());
      if (file) form.set('file', file);
      const response = await fetch('/api/root/evidence', { method: 'POST', credentials: 'include', body: form });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setResult(body.data ?? body);
      setMessage(body.duplicate ? 'La evidencia ya existía; no se duplicó.' : 'Evidencia guardada, trazada y vinculada.');
      if (!body.duplicate) { setTitle(''); setContent(''); setCaseId(''); setTargetNodeId(''); setFile(null); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#070706', color: '#eee7d7', padding: 28, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }}>
      <header style={{ borderBottom: '1px solid #6c5a2d', paddingBottom: 18 }}>
        <span style={eyebrow}>SFI · EVIDENCE INTAKE</span>
        <h1 style={{ margin: '7px 0' }}>CARGAR EVIDENCIA</h1>
        <p style={muted}>Una sola entrada para texto o archivo. SFI calcula hash, evita duplicados, registra el evento y crea el nodo de evidencia. Si indicas un nodo objetivo, crea además el vínculo explícito.</p>
      </header>
      <form onSubmit={submit} style={{ ...card, marginTop: 16, display: 'grid', gap: 12 }}>
        <label style={label}>TÍTULO<input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qué estoy observando" /></label>
        <label style={label}>EVIDENCIA / NOTA<textarea style={{ ...input, minHeight: 130 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describe únicamente lo observado. También puedes adjuntar un archivo." /></label>
        <label style={label}>ARCHIVO<input style={input} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
          <label style={label}>TIPO<input style={input} value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} /></label>
          <label style={label}>FUENTE<input style={input} value={source} onChange={(e) => setSource(e.target.value)} /></label>
          <label style={label}>CASO / CONTEXTO<input style={input} value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="opcional" /></label>
          <label style={label}>NODO A VINCULAR<input style={input} value={targetNodeId} onChange={(e) => setTargetNodeId(e.target.value)} placeholder="opcional: node_id existente" /></label>
        </div>
        <p style={muted}>Si no indicas nodo, la evidencia sigue quedando persistida y trazada; simplemente permanece sin relación explícita hasta que la vincules después.</p>
        <button style={button} type="submit" disabled={busy || (!content.trim() && !file)}>{busy ? 'GUARDANDO…' : 'GUARDAR EVIDENCIA'}</button>
        {message ? <output style={{ color: '#d8c488', fontSize: 12 }}>{message}</output> : null}
      </form>
      {result ? <section style={{ ...card, marginTop: 12 }}><h2 style={{ fontSize: 12, color: '#bba365' }}>RESULTADO</h2><HumanReadableRecord value={result} title="Qué se guardó" maxFields={14} /></section> : null}
    </main>
  );
}

const card = { border: '1px solid #29251b', background: '#0d0c09', padding: 16 } as const;
const eyebrow = { color: '#bba365', fontSize: 11, letterSpacing: '.16em' } as const;
const muted = { color: '#958c7b', fontSize: 11, lineHeight: 1.6 } as const;
const label = { display: 'grid', gap: 6, color: '#9b907d', fontSize: 10, letterSpacing: '.08em' } as const;
const input = { width: '100%', boxSizing: 'border-box', border: '1px solid #3a3223', background: '#080806', color: '#eee7d7', padding: 10, font: 'inherit', fontSize: 12 } as const;
const button = { border: '1px solid #6c5a2d', background: '#15130e', color: '#d8c488', padding: '11px 14px', font: 'inherit', cursor: 'pointer' } as const;
