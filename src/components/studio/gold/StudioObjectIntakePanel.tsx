'use client';

import { useRef, useState } from 'react';
import type { StudioArtifactKind } from '@/lib/studio/cultural-lab/types';

type IntakeStatus = 'idle' | 'reading' | 'running' | 'complete' | 'error';

function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || file.name;
}

function inferKind(file: File): StudioArtifactKind {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|flac|ogg|aiff)$/.test(name)) return 'song';
  if (mime.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/.test(name)) return 'video';
  if (/\.(md|txt|rtf)$/.test(name)) return 'article';
  if (/\.(pdf|doc|docx)$/.test(name)) return 'research';
  if (/campaign|campana|lanzamiento|release/.test(name)) return 'campaign';
  return 'other';
}

function inferDeclaredObject(file: File) {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|flac|ogg|aiff)$/.test(name)) return 'music_audio';
  if (mime.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/.test(name)) return 'video';
  if (mime.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/.test(name)) return 'image';
  if (/community|comunidad|fandom|scene|escena/.test(name)) return 'community';
  if (/1500|1550|britania|civilization|civilizacion|gap|coordinate|coordenada|timeframe/.test(name)) return 'time_coordinate_gap';
  if (/\.(md|txt|rtf|pdf|doc|docx)$/.test(name)) return 'text_document';
  return 'cultural_object';
}

async function readTextIfPossible(file: File) {
  const name = file.name.toLowerCase();
  if (!file.type.startsWith('text/') && !/\.(md|txt|csv|json|rtf)$/.test(name)) return '';
  return file.text();
}

export function StudioObjectIntakePanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<IntakeStatus>('idle');
  const [result, setResult] = useState('ESPERANDO OBJETO');
  const [lastObject, setLastObject] = useState('SIN OBJETO CARGADO');

  async function handleFile(file: File | null) {
    if (!file) return;
    const title = titleFromFile(file);
    const kind = inferKind(file);
    const declaredObject = inferDeclaredObject(file);
    setLastObject(`${title} · ${declaredObject}`);
    setStatus('reading');
    setResult('Leyendo metadata local del objeto...');

    try {
      const text = await readTextIfPossible(file);
      setStatus('running');
      setResult('Ejecutando pipeline real /api/studio/pipeline...');

      const response = await fetch('/api/studio/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          title,
          text: text || undefined,
          notes: [
            `declared_object=${declaredObject}`,
            `file_name=${file.name}`,
            `file_type=${file.type || 'unknown'}`,
            `file_size=${file.size}`,
            'intake_mode=single_upload_button',
            'binary_storage=pending',
          ].join('\n'),
          createdAt: new Date().toISOString(),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'studio_pipeline_failed');
      const stages = Array.isArray(payload.trace?.stages) ? payload.trace.stages.length : 0;
      setStatus('complete');
      setResult(`PIPELINE COMPLETO · ${stages} etapas · ${payload.trace?.artifactId ?? title}`);
    } catch (error) {
      setStatus('error');
      setResult(error instanceof Error ? error.message : 'object_intake_failed');
    }
  }

  return (
    <section className="sfi-studio-gold sfi-studio-gold__object-intake">
      <div className="sfi-studio-gold__panel sfi-studio-gold__object-intake-panel">
        <div className="sfi-studio-gold__panel-title">
          <div>
            <h2>CARGA DE OBJETO</h2>
            <p>UN BOTON · NOMBRE AUTOMATICO · PIPELINE REAL</p>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()}>{status === 'running' ? 'EVALUANDO' : 'CARGAR OBJETO'}</button>
        </div>
        <input ref={inputRef} type="file" className="sfi-studio-gold__intake-hidden" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
        <div className="sfi-studio-gold__intake-single">
          <button type="button" className="sfi-studio-gold__intake-drop" onClick={() => inputRef.current?.click()}>
            <strong>+</strong>
            <span>SUBIR MUSICA · VIDEO · IMAGEN · TEXTO · COMUNIDAD · COORDENADA HISTORICA</span>
            <em>Ejemplo: archivo TXT/MD con “1500-1550 · Britania · civilizacion · in-between gap”.</em>
          </button>
          <div className={`sfi-studio-gold__intake-status is-${status}`}>
            <span>OBJETO DETECTADO</span>
            <strong>{lastObject}</strong>
            <p>{result}</p>
            <em>Audio/video/imagen se evalua por metadata hasta conectar storage binario persistente. Texto y coordenadas en TXT/MD se leen directo.</em>
          </div>
        </div>
      </div>
      <style>{`
.sfi-studio-gold__object-intake { min-height: auto; padding: 0 8px 8px; background: #050608; }
.sfi-studio-gold__object-intake-panel { overflow: hidden; }
.sfi-studio-gold__intake-hidden { display: none; }
.sfi-studio-gold__intake-single { display: grid; grid-template-columns: 320px minmax(0,1fr); gap: 10px; padding: 10px; }
.sfi-studio-gold__intake-drop { min-height: 132px; display: grid; place-items: center; gap: 8px; border: 1px dashed rgba(255,121,217,.45); background: radial-gradient(circle at 50% 30%, rgba(186,92,255,.14), transparent 60%), rgba(5,6,8,.72); text-align: center; }
.sfi-studio-gold__intake-drop strong { color: #ff79d9; font: 700 34px ui-monospace, monospace; text-shadow: 0 0 18px rgba(255,121,217,.55); }
.sfi-studio-gold__intake-drop span { color: #f4d6ff; font: 700 10px ui-monospace, monospace; letter-spacing: .14em; }
.sfi-studio-gold__intake-drop em { max-width: 270px; color: #9b88a8; font: 600 9px/1.45 ui-monospace, monospace; font-style: normal; }
.sfi-studio-gold__intake-status { border: 1px solid rgba(186,92,255,.26); padding: 14px; background: rgba(9,6,14,.78); }
.sfi-studio-gold__intake-status span { color: #ff79d9; font: 700 9px ui-monospace, monospace; letter-spacing: .16em; }
.sfi-studio-gold__intake-status strong { display: block; margin-top: 8px; color: #f4d6ff; font: 700 16px ui-monospace, monospace; letter-spacing: .08em; }
.sfi-studio-gold__intake-status p { margin: 10px 0 0; color: #d8d2c2; font: 600 10px/1.45 ui-monospace, monospace; }
.sfi-studio-gold__intake-status em { display: block; margin-top: 12px; color: #9b88a8; font: 600 9px/1.45 ui-monospace, monospace; font-style: normal; }
.sfi-studio-gold__intake-status.is-error strong { color: #ff5b7e; }
@media (max-width: 1180px) { .sfi-studio-gold__object-intake { padding: 0 14px 10px; } .sfi-studio-gold__intake-single { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
}
