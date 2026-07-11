'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

const ACCEPTED = '.wav,.wave,.mp3,.m4a,.aac,.flac,.ogg,.oga,.opus,.aiff,.aif,.mp4,.mov,.webm,.mkv,.m4v,.png,.jpg,.jpeg,.webp,.gif,.tif,.tiff,.txt,.md,.markdown,.json,.csv,.tsv,.rtf,.pdf,.docx';

type IntakeType = 'auto' | 'audio' | 'video' | 'image' | 'text' | 'community' | 'time_coordinate';
type IntakeStatus = 'idle' | 'preparing' | 'uploading' | 'verifying' | 'analyzing' | 'synthesizing' | 'complete' | 'blocked';

type Synthesis = {
  status: string;
  objectReading: { summary: string; interpretability: string; limitations: string[] };
  worldContext: { relation: string; explanation: string; dominantSignal: string | null; confidence: number | null };
  mihm: { status: string; coverage: number; coreCoverage: number; ihg: number | null; summary: string; limitations: string[] };
  leverage: {
    status: string;
    minimumPerturbation: string | null;
    rationale: string;
    expectedSignal: string | null;
    verificationWindow: string | null;
    falsificationCriterion: string | null;
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

function confidence(value: number | null) {
  return value === null ? 'UNKNOWN' : Number(value.toFixed(3));
}

export function StudioObjectIntake({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<IntakeStatus>('idle');
  const [objectType, setObjectType] = useState<IntakeType>('auto');
  const [declaredAttractor, setDeclaredAttractor] = useState('');
  const [desiredShift, setDesiredShift] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [prohibitedEffects, setProhibitedEffects] = useState('');
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [message, setMessage] = useState('Carga un objeto real. Studio almacenará el archivo de forma privada, ejecutará su extractor y después intentará interpretar su relación con el campo.');

  if (!open) return null;

  async function jsonResponse(response: Response) {
    return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
  }

  async function upload(file: File) {
    setSynthesis(null);
    setStatus('preparing');
    setMessage('Preparando objeto, ownership, contexto declarado y URL firmada.');

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
          context: {
            declaredAttractor: declaredAttractor.trim() || null,
            desiredShift: desiredShift.trim() || null,
            targetAudience: targetAudience.trim() || null,
            prohibitedEffects: prohibitedEffects.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean),
          },
        }),
      });
      const prepared = await jsonResponse(prepareResponse);
      if (!prepareResponse.ok || prepared?.ok !== true) {
        throw new Error(responseFailure(prepareResponse, prepared, 'PREPARE'));
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
        throw new Error(responseFailure(completeResponse, completed, 'COMPLETE'));
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
        throw new Error(responseFailure(analyzeResponse, analysis, 'ANALYZE'));
      }

      setStatus('synthesizing');
      setMessage('Extracción completa. Comparando objeto, MIHM parcial, Cultural Vector y trayectoria WorldSpect.');
      const synthesisResponse = await fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persist: true }),
      });
      const synthesisPayload = await jsonResponse(synthesisResponse);
      if (!synthesisResponse.ok || synthesisPayload?.ok !== true) {
        throw new Error(responseFailure(synthesisResponse, synthesisPayload, 'SYNTHESIS'));
      }
      const result = synthesisPayload.synthesis as Synthesis | undefined;
      if (!result) throw new Error('SYNTHESIS_CONTRACT_INCOMPLETE');
      setSynthesis(result);
      setStatus('complete');
      setMessage(`Objeto ${objectId} analizado e interpretado con estado ${result.status}. La perturbación solo aparece cuando existe atractor y una regla calibrada.`);
      router.refresh();
      if (inputRef.current) inputRef.current.value = '';
    } catch (error) {
      setStatus('blocked');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  const busy = ['preparing', 'uploading', 'verifying', 'analyzing', 'synthesizing'].includes(status);

  return (
    <div className="sfi-production__intake">
      <div className="sfi-production__intake-panel">
        <button type="button" className="sfi-production__icon-button" onClick={onClose}>X</button>
        <span>OBJECT INTAKE</span>
        <h2>INGESTA + INTERPRETACIÓN TRAZABLE</h2>
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
        <label>
          ATRACTOR DECLARADO · QUÉ DEBE PRESERVARSE O ALCANZARSE
          <textarea value={declaredAttractor} onChange={(event) => setDeclaredAttractor(event.target.value)} disabled={busy} placeholder="Ej. preservar la tensión central de la pieza sin perder legibilidad ni energía." />
        </label>
        <label>
          DESPLAZAMIENTO DESEADO
          <textarea value={desiredShift} onChange={(event) => setDesiredShift(event.target.value)} disabled={busy} placeholder="Qué cambio esperas observar en el objeto, audiencia o contexto." />
        </label>
        <label>
          AUDIENCIA / CAMPO OBJETIVO
          <input value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} disabled={busy} placeholder="Audiencia, comunidad o contexto de recepción." />
        </label>
        <label>
          EFECTOS PROHIBIDOS
          <textarea value={prohibitedEffects} onChange={(event) => setProhibitedEffects(event.target.value)} disabled={busy} placeholder="Separados por coma o línea. Ej. no reducir intensidad; no cambiar duración." />
        </label>
        <input ref={inputRef} type="file" accept={ACCEPTED} onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void upload(file);
        }} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          SELECCIONAR OBJETO
        </button>
        <small>Sin atractor, Studio puede describir y diagnosticar, pero bloqueará la perturbación. Un audio sin letra/contexto solo permite lectura formal, no significado cultural.</small>
        <em>{status.toUpperCase()}</em>

        {synthesis ? (
          <section className="sfi-production__panel">
            <header><span>OBJECT–WORLD SYNTHESIS</span><strong>{synthesis.status}</strong></header>
            <dl className="sfi-production__object-grid">
              <dt>Qué es observable</dt><dd>{synthesis.objectReading.summary}</dd>
              <dt>Interpretabilidad</dt><dd>{synthesis.objectReading.interpretability}</dd>
              <dt>Relación con el mundo</dt><dd>{synthesis.worldContext.relation}: {synthesis.worldContext.explanation}</dd>
              <dt>World confidence</dt><dd>{confidence(synthesis.worldContext.confidence)}</dd>
              <dt>MIHM</dt><dd>{synthesis.mihm.status} · coverage {Number(synthesis.mihm.coverage.toFixed(3))} · core {Number(synthesis.mihm.coreCoverage.toFixed(3))}</dd>
              <dt>IHG</dt><dd>{synthesis.mihm.ihg === null ? 'BLOCKED_UNTIL_CORE_COVERAGE' : Number(synthesis.mihm.ihg.toFixed(4))}</dd>
              <dt>Qué significa</dt><dd>{synthesis.mihm.summary}</dd>
              <dt>Punto de palanca</dt><dd>{synthesis.leverage.status}: {synthesis.leverage.rationale}</dd>
              <dt>Perturbación mínima</dt><dd>{synthesis.leverage.minimumPerturbation ?? 'NO_PERTURBATION_EMITTED'}</dd>
              <dt>Señal esperada</dt><dd>{synthesis.leverage.expectedSignal ?? 'MISSING'}</dd>
              <dt>Verificación</dt><dd>{synthesis.leverage.verificationWindow ?? 'MISSING'} · {synthesis.leverage.falsificationCriterion ?? 'NO_FALSIFICATION_CRITERION'}</dd>
              <dt>Límites</dt><dd>{[...synthesis.objectReading.limitations, ...synthesis.mihm.limitations].join(' / ') || 'NONE'}</dd>
            </dl>
          </section>
        ) : null}
      </div>
    </div>
  );
}
