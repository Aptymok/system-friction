'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

const ACCEPTED = '.wav,.wave,.mp3,.m4a,.aac,.flac,.ogg,.oga,.opus,.aiff,.aif,.mp4,.mov,.webm,.mkv,.m4v,.png,.jpg,.jpeg,.webp,.gif,.tif,.tiff,.txt,.md,.markdown,.json,.csv,.tsv,.rtf,.pdf,.docx';

type IntakeType = 'auto' | 'audio' | 'video' | 'image' | 'text' | 'community' | 'time_coordinate';

type IntakeStatus = 'idle' | 'preparing' | 'uploading' | 'verifying' | 'analyzing' | 'complete' | 'blocked';

export function StudioObjectIntake({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<IntakeStatus>('idle');
  const [objectType, setObjectType] = useState<IntakeType>('auto');
  const [message, setMessage] = useState('Carga un objeto real. Studio almacenará el archivo de forma privada y ejecutará el extractor correspondiente.');

  if (!open) return null;

  async function jsonResponse(response: Response) {
    return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
  }

  async function upload(file: File) {
    setStatus('preparing');
    setMessage('Preparando objeto, ownership y URL firmada.');

    try {
      const prepareResponse = await fetch('/api/studio/objects/upload/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || null,
          sizeBytes: file.size,
          title: file.name.replace(/\.[^.]+$/, ''),
          objectType: objectType === 'auto' ? null : objectType,
        }),
      });
      const prepared = await jsonResponse(prepareResponse);
      if (!prepareResponse.ok || prepared?.ok !== true) {
        throw new Error(String(prepared?.details ?? prepared?.error ?? `PREPARE_HTTP_${prepareResponse.status}`));
      }

      const storagePath = String(prepared.storagePath ?? '');
      const token = String(prepared.token ?? '');
      const objectId = String(prepared.objectId ?? '');
      if (!storagePath || !token || !objectId) throw new Error('SIGNED_UPLOAD_CONTRACT_INCOMPLETE');

      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error('SUPABASE_BROWSER_CLIENT_UNAVAILABLE');

      setStatus('uploading');
      setMessage(`Subiendo ${file.name} directamente al storage privado.`);
      const uploaded = await supabase.storage.from('studio-objects').uploadToSignedUrl(storagePath, token, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (uploaded.error) throw uploaded.error;

      setStatus('verifying');
      setMessage('Verificando que el archivo exista y corresponda al objeto creado.');
      const completeResponse = await fetch('/api/studio/objects/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId }),
      });
      const completed = await jsonResponse(completeResponse);
      if (!completeResponse.ok || completed?.ok !== true) {
        throw new Error(String(completed?.details ?? completed?.error ?? `COMPLETE_HTTP_${completeResponse.status}`));
      }

      setStatus('analyzing');
      setMessage('Archivo almacenado. Ejecutando el extractor real de su modalidad.');
      const analyzeResponse = await fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });
      const analysis = await jsonResponse(analyzeResponse);
      if (!analyzeResponse.ok || analysis?.ok === false) {
        throw new Error(String(analysis?.details ?? analysis?.error ?? `ANALYZE_HTTP_${analyzeResponse.status}`));
      }

      setStatus('complete');
      setMessage(`Objeto ${objectId} almacenado y analizado: ${String(analysis?.status ?? 'COMPLETE')}.`);
      router.refresh();
      window.setTimeout(onClose, 1200);
    } catch (error) {
      setStatus('blocked');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="sfi-production__intake">
      <div className="sfi-production__intake-panel">
        <button type="button" className="sfi-production__icon-button" onClick={onClose}>X</button>
        <span>OBJECT INTAKE</span>
        <h2>INGESTA MULTIMODAL TRAZABLE</h2>
        <p>{message}</p>
        <label>
          MODALIDAD
          <select value={objectType} onChange={(event) => setObjectType(event.target.value as IntakeType)} disabled={status !== 'idle' && status !== 'blocked'}>
            <option value="auto">DETECTAR AUTOMÁTICAMENTE</option>
            <option value="audio">AUDIO</option>
            <option value="video">VIDEO</option>
            <option value="image">IMAGEN</option>
            <option value="text">TEXTO / DOCUMENTO</option>
            <option value="community">COMUNIDAD ESTRUCTURADA</option>
            <option value="time_coordinate">COORDENADA TEMPORAL</option>
          </select>
        </label>
        <input ref={inputRef} type="file" accept={ACCEPTED} onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void upload(file);
        }} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={['preparing', 'uploading', 'verifying', 'analyzing'].includes(status)}>
          SELECCIONAR OBJETO
        </button>
        <small>Audio: WAV, MP3, M4A/AAC, FLAC, OGG, OPUS, AIFF · Video: MP4, MOV, WEBM, MKV · Imagen: PNG, JPEG, WEBP, GIF, TIFF · Documento: TXT, MD, JSON, CSV, TSV, RTF, PDF, DOCX.</small>
        <em>{status.toUpperCase()}</em>
      </div>
    </div>
  );
}
