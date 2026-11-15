'use client';

import { useState, type FormEvent } from 'react';

type AudioReport = {
  kind: 'audio_analysis';
  name: string;
  sizeBytes: number;
  sampleRateHz: number;
  channels: number;
  durationSeconds: number;
  peakDbfs: number | null;
  rmsDbfs: number | null;
  sampleClippingCount: number;
  sampleClippingPercent: number;
  analysisScope: string[];
  unmeasured: string[];
  originalStored: false;
  originalTransferred: false;
  analyzedAt: string;
};
type FileReport = AudioReport | {
  kind: 'file_intake';
  name: string;
  sizeBytes: number;
  mimeType: string;
  analysisScope: string[];
  originalStored: false;
  originalTransferred: false;
  analyzedAt: string;
};

function dbfs(amplitude: number) {
  return amplitude > 0 ? Number((20 * Math.log10(amplitude)).toFixed(3)) : null;
}

async function inspectAudioLocally(file: File): Promise<AudioReport> {
  // The original bytes and decoded PCM remain inside this browser session.
  const Context = window.AudioContext;
  if (!Context) throw new Error('Este navegador no permite decodificar audio localmente.');
  const context = new Context();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    let max = 0;
    let sumSquares = 0;
    let clipping = 0;
    let total = 0;
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const samples = decoded.getChannelData(channel);
      total += samples.length;
      for (let i = 0; i < samples.length; i++) {
        const amplitude = Math.abs(samples[i]);
        if (amplitude > max) max = amplitude;
        if (amplitude >= 1) clipping++;
        sumSquares += samples[i] * samples[i];
      }
    }
    return {
      kind: 'audio_analysis',
      name: file.name,
      sizeBytes: file.size,
      sampleRateHz: decoded.sampleRate,
      channels: decoded.numberOfChannels,
      durationSeconds: Number(decoded.duration.toFixed(3)),
      peakDbfs: dbfs(max),
      rmsDbfs: dbfs(Math.sqrt(sumSquares / Math.max(1, total))),
      sampleClippingCount: clipping,
      sampleClippingPercent: Number((100 * clipping / Math.max(1, total)).toFixed(6)),
      analysisScope: ['Decodificación local', 'Frecuencia de muestreo', 'Canales', 'Duración', 'Pico de muestra', 'RMS global', 'Muestras a escala completa'],
      unmeasured: ['LUFS integrado', 'True Peak', 'FAD', 'MIHM', 'Calidad artística', 'Mastering'],
      originalStored: false,
      originalTransferred: false,
      analyzedAt: new Date().toISOString(),
    };
  } finally {
    await context.close().catch(() => undefined);
  }
}

export default function StudioFileIntake() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<FileReport | null>(null);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setReport(null);
    try {
      if (file.size === 0 || file.size > 150 * 1024 * 1024) {
        throw new Error('El archivo debe tener contenido y ocupar como máximo 150 MB para esta revisión local.');
      }
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const audioExtensions = ['wav', 'wave', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'aiff', 'aif'];
      const output: FileReport = audioExtensions.includes(extension) || file.type.startsWith('audio/')
        ? await inspectAudioLocally(file)
        : {
          kind: 'file_intake',
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type || 'unknown',
          analysisScope: ['Identificación local del archivo', 'Tamaño', 'Tipo declarado'],
          originalStored: false,
          originalTransferred: false,
          analyzedAt: new Date().toISOString(),
        };
      setReport(output);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudo analizarse este archivo localmente.');
    } finally {
      setBusy(false);
    }
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'studio-local-analysis.json';
      anchor.click();
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  return (
    <form onSubmit={submit} style={{
      border: '1px solid rgba(127,200,245,.22)',
      background: 'rgba(25,68,92,.16)',
      padding: 20, display: 'grid', gap: 12, marginTop: 26,
    }}>
      <div style={{ color: '#7fc8f5', fontSize: 11, letterSpacing: '.15em' }}>ANÁLISIS PRIVADO · NO SE ALMACENA EL ORIGINAL</div>
      <label htmlFor="studio-file" style={{ color: '#dae7ed', fontSize: 13 }}>
        Selecciona un máster o archivo. En este modo permanece en tu navegador: Studio no lo envía ni lo guarda.
      </label>
      <input id="studio-file" type="file" required disabled={busy}
        accept=".wav,.wave,.mp3,.flac,.m4a,.aac,.ogg,.opus,.aiff,.aif,.pdf,.docx,.txt,.md,.json,.csv,.tsv,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm,.zip"
        onChange={event => { setFile(event.target.files?.[0] ?? null); setReport(null); setError(''); }}
        style={{ color: '#eaf6fb', width: '100%', fontSize: 12 }}
      />
      <button type="submit" disabled={busy || !file} style={{
        minHeight: 40, padding: '9px 15px', border: '1px solid rgba(164,213,255,.4)',
        background: busy ? '#24343d' : '#173d53', color: '#f2fbff',
        cursor: busy ? 'wait' : 'pointer', justifySelf: 'start',
      }}>{busy ? 'ANALIZANDO EN ESTE DISPOSITIVO…' : 'ANALIZAR SIN GUARDAR ORIGINAL'}</button>
      {error && <p role="alert" style={{ margin: 0, color: '#ffb4a8', fontSize: 12 }}>{error}</p>}
      {report && (
        <section aria-live="polite" style={{ borderTop: '1px solid rgba(127,200,245,.2)', paddingTop: 12, color: '#dcecf4', fontSize: 12 }}>
          <strong>Resultado local: {report.name}</strong>
          {report.kind === 'audio_analysis' ? (
            <p style={{ lineHeight: 1.8 }}>
              Duración: {report.durationSeconds} s · Frecuencia: {report.sampleRateHz} Hz · Canales: {report.channels}<br />
              Pico de muestra: {report.peakDbfs === null ? 'Silencio' : report.peakDbfs + ' dBFS'} · RMS: {report.rmsDbfs === null ? 'Silencio' : report.rmsDbfs + ' dBFS'}<br />
              Muestras en escala completa: {report.sampleClippingCount} ({report.sampleClippingPercent}%)
            </p>
          ) : <p>Archivo identificado localmente. Su contenido no ha sido interpretado; la extracción avanzada todavía no está habilitada en modo privado.</p>}
          <p style={{ color: '#9ccbb5' }}>Original transferido: NO · Original almacenado: NO</p>
          <button type="button" onClick={downloadReport} style={{ background: 'transparent', color: '#b7e3fb', border: '1px solid #547b92', padding: '8px 12px', cursor: 'pointer' }}>
            DESCARGAR INFORME LOCAL (JSON)
          </button>
        </section>
      )}
      <span style={{ color: '#94a4ad', fontSize: 11 }}>
        Este modo no envía el archivo al servidor. El informe se crea en memoria y sólo se descarga si lo decides.
        Las mediciones de audio son técnicas y parciales; no representan un mastering, FAD o MIHM completo.
      </span>
    </form>
  );
}
