'use client';

import { useRef, useState } from 'react';

export function StudioObjectIntake({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'complete' | 'blocked'>('idle');
  const [message, setMessage] = useState('Carga un objeto real: audio, video, imagen, texto, comunidad o coordenada temporal.');

  if (!open) return null;

  async function upload(file: File) {
    setStatus('uploading');
    setMessage('Subiendo objeto a /api/studio/objects/upload');
    const form = new FormData();
    form.set('file', file);
    form.set('title', file.name.replace(/\.[^.]+$/, ''));
    const response = await fetch('/api/studio/objects/upload', { method: 'POST', body: form });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      setStatus('blocked');
      setMessage(body?.details || body?.error || 'upload_blocked');
      return;
    }
    setStatus('complete');
    setMessage('Objeto registrado. Recarga Studio para leer el estado persistido.');
  }

  return (
    <div className="sfi-production__intake">
      <div className="sfi-production__intake-panel">
        <button type="button" className="sfi-production__icon-button" onClick={onClose}>X</button>
        <span>OBJECT INTAKE</span>
        <h2>MEDICION DEL OBJETO A EVALUAR</h2>
        <p>{message}</p>
        <input ref={inputRef} type="file" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void upload(file);
        }} />
        <button type="button" onClick={() => inputRef.current?.click()}>
          SELECCIONAR OBJETO
        </button>
        <em>{status.toUpperCase()}</em>
      </div>
    </div>
  );
}
