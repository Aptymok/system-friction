'use client';

import { useState, type FormEvent } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

const BUCKET = 'studio-objects';

type Prepared = {
  ok: true;
  objectId: string;
  sessionId: string;
  storagePath: string;
  token: string;
};

async function json(response: Response) {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || body.ok === false) throw new Error(String(body.details ?? body.error ?? `HTTP ${response.status}`));
  return body;
}

export function StudioDirectIngestion({
  sessionId = null,
  fieldNodeId = null,
  compact = false,
}: {
  sessionId?: string | null;
  fieldNodeId?: string | null;
  compact?: boolean;
}) {
  const [stage, setStage] = useState<'IDLE' | 'PREPARING' | 'UPLOADING' | 'VERIFYING' | 'ANALYZING' | 'FAILED'>('IDLE');
  const [detail, setDetail] = useState<string>('El archivo se usa como evidencia. Los ZIP de sesión se reducen a un manifiesto persistente y el archivo pesado se descarta después de extraerlo.');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setStage('FAILED');
      setDetail('Selecciona un archivo no vacío.');
      return;
    }

    try {
      setStage('PREPARING');
      setDetail(sessionId ? 'Vinculando el objeto al campo activo.' : 'Creando el campo de trabajo y su primer objeto.');
      const prepared = await json(await fetch('/api/studio/objects/upload/prepare', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          fileName: file.name,
          mimeType: file.type || null,
          sizeBytes: file.size,
          title: String(data.get('title') ?? '').trim() || file.name,
          objectType: String(data.get('objectType') ?? 'unknown'),
          context: {
            declaredAttractor: String(data.get('declaredAttractor') ?? '').trim() || null,
            desiredShift: String(data.get('desiredShift') ?? '').trim() || null,
            targetAudience: String(data.get('targetAudience') ?? '').trim() || null,
            prohibitedEffects: String(data.get('prohibitedEffects') ?? '').trim() || null,
          },
        }),
      })) as unknown as Prepared;

      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error('SUPABASE_BROWSER_CONFIGURATION_MISSING');

      setStage('UPLOADING');
      setDetail(`Subiendo ${(file.size / 1024 / 1024).toFixed(2)} MB directamente al bucket privado.`);
      const uploaded = await supabase.storage.from(BUCKET).uploadToSignedUrl(prepared.storagePath, prepared.token, file, {
        contentType: file.type || 'application/octet-stream',
      });
      if (uploaded.error) throw new Error(uploaded.error.message);

      setStage('VERIFYING');
      setDetail('Verificando bytes almacenados antes de analizar.');
      await json(await fetch('/api/studio/objects/upload/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ objectId: prepared.objectId }),
      }));

      setStage('ANALYZING');
      setDetail(file.name.toLowerCase().endsWith('.zip')
        ? 'Extrayendo únicamente estructura, valores y lineage del paquete; el ZIP se descarta al terminar.'
        : 'Ejecutando el analizador real y persistiendo características, evidencia y lineage.');
      const analysis = await json(await fetch(`/api/studio/objects/${encodeURIComponent(prepared.objectId)}/analyze`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ force: false }),
      }));

      if (sessionId && fieldNodeId) {
        await json(await fetch('/api/studio/field', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'attach_object', sessionId, objectId: prepared.objectId, nodeId: fieldNodeId }),
        }));
      }

      const status = String(analysis.status ?? 'COMPLETE');
      setDetail(`Análisis ${status}. Abriendo el objeto persistido.`);
      window.location.assign(`/studio?objectId=${encodeURIComponent(prepared.objectId)}`);
    } catch (error) {
      setStage('FAILED');
      setDetail(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className={compact ? 'studio-ingestion studio-ingestion--compact' : 'studio-ingestion'} aria-label="Carga operativa de Studio">
      <div className="studio-ingestion__head">
        <div>
          <span>INGESTA</span>
          <strong>{sessionId ? (fieldNodeId ? 'Cargar evidencia al nodo' : 'Cargar evidencia al campo') : 'Crear primer objeto'}</strong>
        </div>
        <small>{stage}</small>
      </div>
      <form onSubmit={(event) => void submit(event)} className="studio-ingestion__form">
        <input name="file" type="file" required accept="audio/*,image/*,video/*,text/*,.pdf,.doc,.docx,.md,.json,.csv,.zip" />
        <input name="title" placeholder="Nombre del objeto" />
        <select name="objectType" defaultValue="unknown">
          <option value="unknown">Detectar</option>
          <option value="music">Audio</option>
          <option value="session_package">ZIP / sesión DAW</option>
          <option value="image">Imagen</option>
          <option value="video">Video</option>
          <option value="text">Texto / documento</option>
          <option value="community">Comunidad</option>
        </select>
        <button type="submit" disabled={!['IDLE', 'FAILED'].includes(stage)}>Cargar y analizar</button>
        {!compact ? (
          <>
            <input name="declaredAttractor" placeholder="Atractor declarado" />
            <input name="desiredShift" placeholder="Cambio buscado" />
            <input name="targetAudience" placeholder="Audiencia / sistema objetivo" />
            <input name="prohibitedEffects" placeholder="Efectos prohibidos, separados por coma" />
          </>
        ) : null}
      </form>
      <p className={stage === 'FAILED' ? 'studio-ingestion__detail studio-ingestion__detail--error' : 'studio-ingestion__detail'}>{detail}</p>
    </section>
  );
}
