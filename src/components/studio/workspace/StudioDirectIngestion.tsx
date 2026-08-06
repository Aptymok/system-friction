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

export function StudioDirectIngestion() {
  const [stage, setStage] = useState<'IDLE' | 'PREPARING' | 'UPLOADING' | 'VERIFYING' | 'ANALYZING' | 'FAILED'>('IDLE');
  const [detail, setDetail] = useState<string>('Carga directa a almacenamiento; el archivo no atraviesa el límite multipart del servidor.');

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
      setDetail('Creando sesión, objeto, registro de carga y URL firmada.');
      const prepared = await json(await fetch('/api/studio/objects/upload/prepare', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
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
      setDetail('Verificando bytes almacenados y cerrando el registro de carga.');
      await json(await fetch('/api/studio/objects/upload/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ objectId: prepared.objectId }),
      }));

      setStage('ANALYZING');
      setDetail('Ejecutando el analizador correspondiente y persistiendo características, trazas y estado.');
      const analysis = await json(await fetch(`/api/studio/objects/${encodeURIComponent(prepared.objectId)}/analyze`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ force: false }),
      }));

      const status = String(analysis.status ?? 'COMPLETE');
      setDetail(`Análisis ${status}. Abriendo el objeto persistido.`);
      window.location.assign(`/studio?objectId=${encodeURIComponent(prepared.objectId)}`);
    } catch (error) {
      setStage('FAILED');
      setDetail(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="mx-auto max-w-[1500px] border-b border-[#302a1f] bg-[#080807] px-5 py-5 text-[#d8d1c0] md:px-10" aria-label="Carga operativa de Studio">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">STUDIO · INGESTA OPERATIVA</span>
          <h2 className="mt-1 text-xl text-[#f0e5cc]">Cargar, analizar y persistir un objeto</h2>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#9a907e]">{stage}</div>
      </div>
      <form onSubmit={(event) => void submit(event)} className="grid gap-3 md:grid-cols-4">
        <input className="border border-[#302a1f] bg-[#050504] px-3 py-2 text-sm" name="file" type="file" required accept="audio/*,image/*,video/*,text/*,.pdf,.doc,.docx,.md,.json,.csv" />
        <input className="border border-[#302a1f] bg-[#050504] px-3 py-2 text-sm" name="title" placeholder="Nombre del objeto" />
        <select className="border border-[#302a1f] bg-[#050504] px-3 py-2 text-sm" name="objectType" defaultValue="music">
          <option value="music">Audio</option><option value="image">Imagen</option><option value="video">Video</option><option value="text">Texto / documento</option><option value="community">Comunidad</option><option value="unknown">Detectar</option>
        </select>
        <button className="border border-[#c8a951] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#e5cf8b] disabled:opacity-40" type="submit" disabled={!['IDLE', 'FAILED'].includes(stage)}>Cargar y analizar</button>
        <input className="border border-[#302a1f] bg-[#050504] px-3 py-2 text-sm" name="declaredAttractor" placeholder="Atractor declarado" />
        <input className="border border-[#302a1f] bg-[#050504] px-3 py-2 text-sm" name="desiredShift" placeholder="Cambio buscado" />
        <input className="border border-[#302a1f] bg-[#050504] px-3 py-2 text-sm" name="targetAudience" placeholder="Audiencia / sistema objetivo" />
        <input className="border border-[#302a1f] bg-[#050504] px-3 py-2 text-sm" name="prohibitedEffects" placeholder="Efectos prohibidos, separados por coma" />
      </form>
      <p className={`mt-3 font-mono text-[10px] ${stage === 'FAILED' ? 'text-[#c77777]' : 'text-[#9a907e]'}`}>{detail}</p>
    </section>
  );
}
