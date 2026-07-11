'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

const ACCEPTED = '.wav,.wave,.mp3,.m4a,.aac,.flac,.ogg,.oga,.opus,.aiff,.aif,.mp4,.mov,.webm,.mkv,.m4v,.png,.jpg,.jpeg,.webp,.gif,.tif,.tiff,.txt,.md,.markdown,.json,.csv,.tsv,.rtf,.pdf,.docx';

type IntakeType = 'auto' | 'audio' | 'video' | 'image' | 'text' | 'community' | 'time_coordinate';
type IntakeStatus = 'idle' | 'preparing' | 'uploading' | 'verifying' | 'analyzing' | 'synthesizing' | 'projecting' | 'complete' | 'blocked';

type Projection = {
  status: string;
  world: {
    regime: string;
    summary: string;
    dominantDomain: string | null;
    crossVectorTensions: Array<{ between: [string, string]; description: string }>;
    inferredAttractors: Array<{ label: string; description: string; confidence: number }>;
  };
  object: {
    summary: string;
    interpretability: string;
    mihmStatus: string;
    mihmCoverage: number;
    mihmCoreCoverage: number;
  };
  fit: {
    percentage: number | null;
    band: string;
    confidence: number;
    explanation: string;
    acceptanceReason: string;
  };
  opportunityWindow: {
    status: string;
    starts: string;
    minimumDays: number | null;
    maximumDays: number | null;
    basis: string;
  };
  strategy: {
    selectedAttractor: string | null;
    selectedRouteId: string | null;
    selectionReason: string;
    routes: Array<{
      id: string;
      title: string;
      suitability: number;
      rationale: string;
      microAdjustments: string[];
      verification: string[];
    }>;
  };
};

function responseFailure(response: Response, payload: Record<string, unknown> | null, prefix: string) {
  const code = payload?.error ?? payload?.code;
  const detail = payload?.details ?? payload?.message;
  const requestId = response.headers.get('x-vercel-id') ?? response.headers.get('x-request-id');
  const parts = [
    typeof code === 'string' ? code : `${prefix}_HTTP_${response.status}`,
    typeof detail === 'string' ? detail : null,
    requestId ? `REQUEST_ID=${requestId}` : null,
  ].filter((value): value is string => Boolean(value));
  return parts.join(' · ');
}

function metric(value: number | null) {
  return value === null ? 'UNKNOWN' : Number(value.toFixed(3));
}

function windowLabel(projection: Projection) {
  const window = projection.opportunityWindow;
  if (window.minimumDays === null || window.maximumDays === null) return `${window.status} · ${window.starts}`;
  return `${window.status} · ${window.starts} · ${window.minimumDays}–${window.maximumDays} días`;
}

export function StudioObjectIntake({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<IntakeStatus>('idle');
  const [objectType, setObjectType] = useState<IntakeType>('auto');
  const [projection, setProjection] = useState<Projection | null>(null);
  const [message, setMessage] = useState('Carga un objeto real. Studio inferirá su posición frente al mundo, MIHM parcial, compatibilidad de campo, ventana y rutas sin pedirte teoría previa.');

  if (!open) return null;

  async function jsonResponse(response: Response) {
    return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
  }

  async function upload(file: File) {
    setProjection(null);
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
      if (!prepareResponse.ok || prepared?.ok !== true) throw new Error(responseFailure(prepareResponse, prepared, 'PREPARE'));

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
      if (!completeResponse.ok || completed?.ok !== true) throw new Error(responseFailure(completeResponse, completed, 'COMPLETE'));

      setStatus('analyzing');
      setMessage('Archivo almacenado. Ejecutando el extractor real de su modalidad.');
      const analyzeResponse = await fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });
      const analysis = await jsonResponse(analyzeResponse);
      if (!analyzeResponse.ok || analysis?.ok === false) throw new Error(responseFailure(analyzeResponse, analysis, 'ANALYZE'));

      setStatus('synthesizing');
      setMessage('Construyendo vector MIHM parcial y trazabilidad del objeto.');
      const synthesisResponse = await fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persist: true }),
      });
      const synthesisPayload = await jsonResponse(synthesisResponse);
      if (!synthesisResponse.ok || synthesisPayload?.ok !== true) throw new Error(responseFailure(synthesisResponse, synthesisPayload, 'SYNTHESIS'));

      setStatus('projecting');
      setMessage('Observando el mundo longitudinal, tensiones vectoriales, compatibilidad, ventana y microajustes por escenario.');
      const projectionResponse = await fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persist: true }),
      });
      const projectionPayload = await jsonResponse(projectionResponse);
      if (!projectionResponse.ok || projectionPayload?.ok !== true) throw new Error(responseFailure(projectionResponse, projectionPayload, 'PROJECTION'));
      const result = projectionPayload.projection as Projection | undefined;
      if (!result) throw new Error('PROJECTION_CONTRACT_INCOMPLETE');

      setProjection(result);
      setStatus('complete');
      setMessage(`Objeto ${objectId} analizado y proyectado. El porcentaje es compatibilidad de campo; aceptación permanece sin calibrar hasta acumular outcomes comparables.`);
      router.refresh();
      if (inputRef.current) inputRef.current.value = '';
    } catch (error) {
      setStatus('blocked');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  const busy = ['preparing', 'uploading', 'verifying', 'analyzing', 'synthesizing', 'projecting'].includes(status);
  const selectedRoute = projection?.strategy.routes.find((route) => route.id === projection.strategy.selectedRouteId) ?? projection?.strategy.routes[0] ?? null;

  return (
    <div className="sfi-production__intake">
      <div className="sfi-production__intake-panel">
        <button type="button" className="sfi-production__icon-button" onClick={onClose}>X</button>
        <span>OBJECT INTAKE</span>
        <h2>INGESTA + LECTURA ESTRATÉGICA</h2>
        <p>{message}</p>
        <label>
          MODALIDAD
          <select value={objectType} onChange={(event) => setObjectType(event.target.value as IntakeType)} disabled={busy}>
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
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>SELECCIONAR OBJETO</button>
        <small>Studio genera atractores, guardrails y rutas automáticamente. Después puedes precisar en lenguaje normal si buscas integración, singularidad o solo corrección técnica.</small>
        <em>{status.toUpperCase()}</em>

        {projection ? (
          <section className="sfi-production__panel">
            <header><span>FIELD PROJECTION</span><strong>{projection.status}</strong></header>
            <dl className="sfi-production__object-grid">
              <dt>El mundo</dt><dd>{projection.world.summary}</dd>
              <dt>Régimen</dt><dd>{projection.world.regime}</dd>
              <dt>Atractor inferido</dt><dd>{projection.strategy.selectedAttractor ?? 'INDETERMINATE'}</dd>
              <dt>El objeto</dt><dd>{projection.object.summary}</dd>
              <dt>MIHM</dt><dd>{projection.object.mihmStatus} · coverage {metric(projection.object.mihmCoverage)} · core {metric(projection.object.mihmCoreCoverage)}</dd>
              <dt>Compatibilidad</dt><dd>{projection.fit.percentage === null ? 'NO ESTIMABLE' : `${projection.fit.percentage}%`} · {projection.fit.band} · confidence {metric(projection.fit.confidence)}</dd>
              <dt>Aceptación</dt><dd>NO CALIBRADA · {projection.fit.acceptanceReason}</dd>
              <dt>Ventana</dt><dd>{windowLabel(projection)} · {projection.opportunityWindow.basis}</dd>
              <dt>Ruta principal</dt><dd>{selectedRoute?.title ?? 'NO_ROUTE'} · {projection.strategy.selectionReason}</dd>
              <dt>Microajustes</dt><dd>{selectedRoute?.microAdjustments.join(' / ') ?? 'NO_ADJUSTMENTS'}</dd>
              <dt>Verificación</dt><dd>{selectedRoute?.verification.join(' / ') ?? 'NO_VERIFICATION'}</dd>
            </dl>
          </section>
        ) : null}
      </div>
    </div>
  );
}
