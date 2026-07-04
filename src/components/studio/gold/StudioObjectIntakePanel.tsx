'use client';

import { useState } from 'react';
import type { StudioArtifactKind } from '@/lib/studio/cultural-lab/types';

type IntakeKind = StudioArtifactKind | 'image' | 'text' | 'community' | 'time_coordinate' | 'civilizational_gap';

type IntakeStatus = 'idle' | 'running' | 'complete' | 'error';

const intakeKinds: Array<{ kind: IntakeKind; label: string; hint: string }> = [
  { kind: 'song', label: 'MUSICA / AUDIO', hint: 'cancion, demo, letra, audio, REM618, evidencia sonora' },
  { kind: 'video', label: 'VIDEO', hint: 'clip, documental, registro audiovisual, performance' },
  { kind: 'image', label: 'IMAGEN', hint: 'foto, poster, frame, mapa, evidencia visual' },
  { kind: 'text', label: 'TEXTO', hint: 'ensayo, letra, post, manifiesto, documento' },
  { kind: 'community', label: 'COMUNIDAD', hint: 'grupo, fandom, escena, institucion, ecosistema social' },
  { kind: 'time_coordinate', label: 'COORDENADA TEMPORAL', hint: '1500-1550, Britania, civilizacion, brecha historica' },
  { kind: 'civilizational_gap', label: 'GAP CIVILIZATORIO', hint: 'periodo intermedio, tension historica, campo cultural' },
  { kind: 'campaign', label: 'CAMPANA', hint: 'narrativa publica, lanzamiento, intervencion cultural' },
];

function normalizeKind(kind: IntakeKind): StudioArtifactKind {
  if (kind === 'image' || kind === 'text' || kind === 'community' || kind === 'time_coordinate' || kind === 'civilizational_gap') return 'other';
  return kind;
}

export function StudioObjectIntakePanel() {
  const [kind, setKind] = useState<IntakeKind>('song');
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [coordinate, setCoordinate] = useState('');
  const [community, setCommunity] = useState('');
  const [text, setText] = useState('');
  const [fileLabel, setFileLabel] = useState('');
  const [status, setStatus] = useState<IntakeStatus>('idle');
  const [result, setResult] = useState('SIN EJECUCION');

  async function submit() {
    const safeTitle = title.trim() || fileLabel || coordinate || 'OBJETO SIN TITULO';
    const enrichedNotes = [
      `declared_kind=${kind}`,
      coordinate ? `coordinate=${coordinate}` : null,
      community ? `community=${community}` : null,
      fileLabel ? `file=${fileLabel}` : null,
    ].filter(Boolean).join('\n');

    setStatus('running');
    setResult('Ejecutando pipeline real /api/studio/pipeline...');

    try {
      const response = await fetch('/api/studio/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: normalizeKind(kind),
          title: safeTitle,
          sourceUrl: sourceUrl.trim() || undefined,
          text: text.trim() || undefined,
          notes: enrichedNotes,
          targetAudience: community.trim() || undefined,
          desiredShift: coordinate.trim() || undefined,
          createdAt: new Date().toISOString(),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'studio_pipeline_failed');
      const stages = Array.isArray(payload.trace?.stages) ? payload.trace.stages.length : 0;
      setStatus('complete');
      setResult(`PIPELINE COMPLETO · ${stages} etapas · ${payload.trace?.artifactId ?? safeTitle}`);
    } catch (error) {
      setStatus('error');
      setResult(error instanceof Error ? error.message : 'object_intake_failed');
    }
  }

  return (
    <section className="sfi-studio-gold sfi-studio-gold__object-intake">
      <div className="sfi-studio-gold__panel">
        <div className="sfi-studio-gold__panel-title">
          <div>
            <h2>CARGA DE OBJETO</h2>
            <p>MUSICA · VIDEO · IMAGEN · TEXTO · COMUNIDAD · COORDENADA HISTORICA</p>
          </div>
          <button type="button" onClick={submit}>{status === 'running' ? 'EVALUANDO' : 'EJECUTAR'}</button>
        </div>

        <div className="sfi-studio-gold__intake-grid">
          <div className="sfi-studio-gold__intake-kinds">
            {intakeKinds.map((item) => (
              <button type="button" key={item.kind} className={kind === item.kind ? 'is-active' : ''} onClick={() => setKind(item.kind)}>
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>

          <div className="sfi-studio-gold__intake-form">
            <label>TITULO / IDENTIFICADOR<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="REM618 / manifiesto / comunidad / coordenada" /></label>
            <label>ARCHIVO LOCAL / EVIDENCIA<input type="file" onChange={(event) => setFileLabel(event.target.files?.[0]?.name ?? '')} /></label>
            <label>URL / FUENTE<input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>
            <label>COMUNIDAD / CAMPO SOCIAL<input value={community} onChange={(event) => setCommunity(event.target.value)} placeholder="escena, fandom, ciudad, institucion, ecosistema" /></label>
            <label>COORDENADA / GAP TEMPORAL<input value={coordinate} onChange={(event) => setCoordinate(event.target.value)} placeholder="1500-1550 · Britania · civilizacion · in-between gap" /></label>
            <label className="is-wide">TEXTO / DESCRIPCION / LETRA / HIPOTESIS<textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Pega texto, describe imagen/video/audio, declara evidencia o formula la coordenada a medir." /></label>
          </div>

          <div className={`sfi-studio-gold__intake-status is-${status}`}>
            <span>ESTADO DE CARGA</span>
            <strong>{status.toUpperCase()}</strong>
            <p>{result}</p>
            <em>La carga ejecuta el pipeline real existente. Los archivos binarios se registran como metadata hasta conectar storage persistente.</em>
          </div>
        </div>
      </div>

      <style>{`
.sfi-studio-gold__object-intake { min-height: auto; padding: 0 8px 8px; background: #050608; }
.sfi-studio-gold__intake-grid { display: grid; grid-template-columns: 310px minmax(0, 1fr) 260px; gap: 10px; padding: 10px; }
.sfi-studio-gold__intake-kinds { display: grid; gap: 6px; }
.sfi-studio-gold__intake-kinds button { text-align: left; border: 1px solid rgba(193,132,45,.18); padding: 8px; background: rgba(5,6,8,.65); }
.sfi-studio-gold__intake-kinds button.is-active { border-color: rgba(244,199,106,.62); box-shadow: inset 0 0 18px rgba(244,199,106,.08); }
.sfi-studio-gold__intake-kinds strong { display: block; color: var(--sfi-gold-bright); font: 700 9px ui-monospace, monospace; letter-spacing: .12em; }
.sfi-studio-gold__intake-kinds span { display: block; margin-top: 4px; color: var(--sfi-muted); font: 600 8px/1.35 ui-monospace, monospace; }
.sfi-studio-gold__intake-form { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
.sfi-studio-gold__intake-form label { display: grid; gap: 5px; color: var(--sfi-gold); font: 700 8px ui-monospace, monospace; letter-spacing: .12em; }
.sfi-studio-gold__intake-form label.is-wide { grid-column: 1 / -1; }
.sfi-studio-gold__intake-form input, .sfi-studio-gold__intake-form textarea { width: 100%; border: 1px solid rgba(193,132,45,.22); background: rgba(2,3,4,.82); color: var(--sfi-text); padding: 8px; font: 600 10px ui-monospace, monospace; }
.sfi-studio-gold__intake-form textarea { min-height: 84px; resize: vertical; }
.sfi-studio-gold__intake-status { border: 1px solid rgba(193,132,45,.22); padding: 12px; background: rgba(5,6,8,.7); }
.sfi-studio-gold__intake-status span { color: var(--sfi-gold); font: 700 9px ui-monospace, monospace; letter-spacing: .14em; }
.sfi-studio-gold__intake-status strong { display: block; margin-top: 8px; color: var(--sfi-gold-bright); font: 700 18px ui-monospace, monospace; }
.sfi-studio-gold__intake-status p { margin: 10px 0 0; color: var(--sfi-text); font: 600 10px/1.45 ui-monospace, monospace; }
.sfi-studio-gold__intake-status em { display: block; margin-top: 12px; color: var(--sfi-muted); font: 600 9px/1.45 ui-monospace, monospace; font-style: normal; }
.sfi-studio-gold__intake-status.is-error strong { color: var(--sfi-danger); }
@media (max-width: 1180px) { .sfi-studio-gold__object-intake { padding: 0 14px 10px; } .sfi-studio-gold__intake-grid, .sfi-studio-gold__intake-form { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
}
