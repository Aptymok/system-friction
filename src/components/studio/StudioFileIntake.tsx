'use client';

import { useState, type FormEvent } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

type Prepared = {
  ok: boolean;
  objectId?: string;
  storagePath?: string;
  signedToken?: string;
  bucket?: string;
  modality?: string;
  error?: string;
  details?: string;
};

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({})) as Prepared;
  if (!response.ok || !body.ok) throw new Error(body.details || body.error || `Studio HTTP ${response.status}`);
  return body;
}

export default function StudioFileIntake() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError('');
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error('La conexión de almacenamiento no está configurada en esta sesión.');
      setStage('Registrando el archivo...');
      const prepared = await readResponse(await fetch('/api/studio/objects/upload/prepare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type || null, sizeBytes: file.size }),
      }));
      if (!prepared.objectId || !prepared.storagePath || !prepared.signedToken || !prepared.bucket) {
        throw new Error('Studio no devolvió una autorización de carga completa.');
      }
      setStage('Transfiriendo el original a la biblioteca privada...');
      const uploaded = await supabase.storage.from(prepared.bucket).uploadToSignedUrl(
        prepared.storagePath,
        prepared.signedToken,
        file,
        { contentType: file.type || 'application/octet-stream', upsert: false },
      );
      if (uploaded.error) throw uploaded.error;
      setStage('Comprobando la persistencia...');
      await readResponse(await fetch('/api/studio/objects/upload/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ objectId: prepared.objectId }),
      }));
      if (prepared.modality === 'audio') {
        setStage('Analizando el audio original...');
        const analysis = await fetch(`/api/studio/objects/${encodeURIComponent(prepared.objectId)}/analyze/audio`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ force: false }),
        });
        if (!analysis.ok) {
          const detail = await analysis.json().catch(() => ({})) as { error?: string; details?: string };
          setStage(`Original guardado; análisis pendiente: ${detail.details || detail.error || analysis.status}`);
        }
      }
      window.location.assign(`/studio?objectId=${encodeURIComponent(prepared.objectId)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La operación de carga falló.');
      setStage('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{
      border: '1px solid rgba(127,200,245,.22)',
      background: 'rgba(25,68,92,.16)',
      padding: 20,
      display: 'grid',
      gap: 12,
      marginTop: 26,
    }}>
      <div style={{ color: '#7fc8f5', fontSize: 11, letterSpacing: '.15em' }}>NUEVO OBJETO · INGRESO A STUDIO</div>
      <label htmlFor="studio-file" style={{ color: '#dae7ed', fontSize: 13 }}>
        Sube un máster o un documento para conservar el original y comenzar su análisis.
      </label>
      <input id="studio-file" type="file" required disabled={busy}
        accept=".wav,.wave,.mp3,.flac,.m4a,.aac,.ogg,.opus,.aiff,.aif,.pdf,.docx,.txt,.md,.json,.csv,.tsv,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm,.zip"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        style={{ color: '#eaf6fb', width: '100%', fontSize: 12 }}
      />
      <button type="submit" disabled={busy || !file} style={{
        minHeight: 40,
        padding: '9px 15px',
        border: '1px solid rgba(164,213,255,.4)',
        background: busy ? '#24343d' : '#173d53',
        color: '#f2fbff',
        cursor: busy ? 'wait' : 'pointer',
        justifySelf: 'start',
      }}>
        {busy ? 'PROCESANDO…' : 'CARGAR Y CONSERVAR EN STUDIO'}
      </button>
      {stage && <p role="status" style={{ margin: 0, color: '#a7d7ee', fontSize: 12 }}>{stage}</p>}
      {error && <p role="alert" style={{ margin: 0, color: '#ffb4a8', fontSize: 12 }}>Error: {error}. El archivo original local no se modifica.</p>}
      <span style={{ color: '#94a4ad', fontSize: 11 }}>
        La carga utiliza almacenamiento privado y autorización temporal. Audio: análisis técnico automático.
        Otras modalidades: análisis disponible desde el objeto. No publica ni genera cargos de IA.
      </span>
    </form>
  );
}
