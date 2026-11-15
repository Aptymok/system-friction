'use client';

import { useRef, useState, type FormEvent } from 'react';
import { exportPcm24Wav, samplePeak } from './localPcmWavExport';

type MeasuredFeature = {
  key: string; label: string; value: number | string | null;
  unit: string | null; status: string; source: string;
  formulaVersion: string; explanation: string; warnings: string[];
};
type Report = {
  name: string; sizeBytes: number; analyzedAt: string;
  originalTransferred: false; originalStored: false; persistence: 'NONE';
  kind: 'audio_analysis' | 'file_intake';
  engine?: string; method?: string;
  sampleRateHz?: number; channels?: number; durationSeconds?: number;
  sourceBitDepth?: null; features?: MeasuredFeature[];
  notObserved?: string[]; limitations?: string[];
  mimeType?: string;
};

function labelFor(key: string) {
  const names: Record<string, string> = {
    lufs_integrated: 'Sonoridad integrada', loudness_range_lu: 'Rango de sonoridad',
    tempo_global_bpm: 'Tempo estimado', rhythm_onset_count: 'Eventos rítmicos',
    rhythm_onset_density_per_second: 'Densidad de ataques',
    key_selected: 'Tonalidad estimada', peak_dbfs: 'Pico de muestra',
    rms_dbfs: 'Nivel RMS', crest_factor_db: 'Factor de cresta',
    clipping_sample_count: 'Muestras cercanas al límite', stereo_correlation: 'Correlación estéreo',
  };
  return names[key];
}

function analyzeInWorker(decoded: AudioBuffer, onProgress: (message: string) => void): Promise<Omit<Report, 'name' | 'sizeBytes' | 'kind'>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./StudioAudioAnalysisWorker.ts', import.meta.url));
    let finished = false;
    const finish = () => { finished = true; worker.terminate(); };
    worker.onmessage = (event: MessageEvent<{type: string; message?: string; report?: Omit<Report, 'name' | 'sizeBytes' | 'kind'>}>) => {
      const payload = event.data;
      if (payload.type === 'progress') { onProgress(payload.message ?? 'Analizando…'); return; }
      finish();
      if (payload.type === 'result' && payload.report) resolve(payload.report);
      else reject(new Error(payload.message || 'El análisis local no terminó correctamente.'));
    };
    worker.onerror = (event) => {
      if (finished) return;
      finish();
      reject(new Error(event.message || 'El motor local de análisis falló.'));
    };
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index).slice());
    worker.postMessage({
      sampleRate: decoded.sampleRate,
      durationSeconds: decoded.duration,
      channels,
    }, channels.map(channel => channel.buffer as ArrayBuffer));
  });
}

async function inspectLocally(file: File, onProgress: (message: string) => void): Promise<Report> {
  if (!file.size || file.size > 150 * 1024 * 1024) {
    throw new Error('Selecciona un archivo válido de hasta 150 MB para análisis local.');
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const audio = ['wav', 'wave', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'aiff', 'aif'].includes(ext) || file.type.startsWith('audio/');
  if (!audio) return {
    kind: 'file_intake', name: file.name, sizeBytes: file.size, mimeType: file.type || 'unknown',
    originalStored: false, originalTransferred: false, persistence: 'NONE', analyzedAt: new Date().toISOString(),
    notObserved: ['Contenido del archivo', 'Análisis de documento', 'Generación derivada'],
  };
  const Context = window.AudioContext;
  if (!Context) throw new Error('El navegador no tiene un decodificador de audio disponible.');
  const context = new Context();
  try {
    onProgress('Decodificando el archivo en tu dispositivo…');
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    if (decoded.numberOfChannels > 2) {
      throw new Error('Este analizador de audio admite mono y estéreo. No se cambiará el original.');
    }
    const result = await analyzeInWorker(decoded, onProgress);
    return { ...result, kind: 'audio_analysis', name: file.name, sizeBytes: file.size };
  } finally {
    await context.close().catch(() => undefined);
  }
}

export default function StudioFileIntake() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const runId = useRef(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    const current = ++runId.current;
    setBusy(true); setStatus('Preparando análisis privado…'); setError(''); setReport(null); setExportMessage('');
    try {
      const result = await inspectLocally(file, (message) => { if (runId.current === current) setStatus(message); });
      if (runId.current === current) { setReport(result); setStatus('Análisis local terminado.'); }
    } catch (cause) {
      if (runId.current === current) {
        setError(cause instanceof Error ? cause.message : 'No se pudo completar el análisis local.');
        setStatus('');
      }
    } finally {
      if (runId.current === current) setBusy(false);
    }
  }

  async function downloadDerivedWav() {
    if (!file || !report || report.kind !== 'audio_analysis' || exportBusy) return;
    setExportBusy(true);
    setExportMessage('');
    try {
      const context = new AudioContext();
      let decoded: AudioBuffer;
      try {
        decoded = await context.decodeAudioData(await file.arrayBuffer());
      } finally {
        await context.close().catch(() => undefined);
      }
      const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i));
      const peak = samplePeak(channels);
      if (!(peak > 0)) throw new Error('El audio no tiene muestras distintas de silencio.');
      // Fixed -1 dBFS sample-peak ceiling for this OPTIONAL technical export.
      // Not a loudness target and not a mastering recommendation.
      const ceiling = Math.pow(10, -1 / 20);
      const gain = 20 * Math.log10(Math.min(1, ceiling / peak));
      const wav = exportPcm24Wav(channels, decoded.sampleRate, gain);
      const url = URL.createObjectURL(wav);
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.name.replace(/\\.[^.]+$/, '') + '-nivel-tecnico-24bit.wav';
        anchor.click();
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      }
      setExportMessage('WAV PCM de 24 bits generado localmente. Ajuste técnico de pico de muestra: ' +
        gain.toFixed(3) + ' dB. No es mastering ni validación True Peak.');
    } catch (cause) {
      setExportMessage('No se generó el WAV: ' + (cause instanceof Error ? cause.message : String(cause)));
    } finally {
      setExportBusy(false);
    }
  }

  function downloadReport() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'studio-local-analysis.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const metric = (key: string) => report?.features?.find(item => item.key === key && item.value !== null);
  const integrated = metric('lufs_integrated');
  const tempo = metric('tempo_global_bpm');
  const tempoConfidence = metric('tempo_confidence');
  const tonal = metric('key_estimate');
  const clipping = metric('clipping_sample_count');
  const estimatedTempoReliable = typeof tempoConfidence?.value === 'number' && tempoConfidence.value >= 0.65 &&
    !tempo?.warnings.includes('TEMPO_HALF_DOUBLE_AMBIGUITY');
  const observations = report?.kind === 'audio_analysis'
    ? [
      integrated ? 'Sonoridad integrada observada: ' + integrated.value + ' LUFS. No define por sí sola una calidad de mastering.' : 'Sonoridad integrada no disponible.',
      tempo ? estimatedTempoReliable
        ? 'Tempo estimado: ' + tempo.value + ' BPM, pendiente de referencia externa.'
        : 'Tempo ambiguo: ' + tempo.value + ' BPM es sólo una hipótesis; revisar alternativas de mitad/doble tiempo.'
        : 'No se obtuvo un tempo defendible.',
      tonal ? 'Tonalidad propuesta: ' + tonal.value + ' (estimación; comprobar con la composición).' : 'Tonalidad no determinada.',
      typeof clipping?.value === 'number' && clipping.value === 0
        ? 'No se detectaron muestras a escala completa; esto NO descarta picos entre muestras.'
        : 'Revisar la medición de muestras cercanas al límite y el verdadero pico.',
    ] : [];

  const readings = report?.features?.filter(feature => feature.value !== null &&
    ['OBSERVED', 'DERIVED', 'CALIBRATED', 'PARTIAL', 'DEGRADED'].includes(feature.status)) ?? [];

  return (
    <form onSubmit={submit} style={{ border: '1px solid rgba(127,200,245,.24)', background: 'rgba(25,68,92,.16)', padding: 20, display: 'grid', gap: 12, marginTop: 26 }}>
      <div style={{ color: '#7fc8f5', fontSize: 11, letterSpacing: '.15em' }}>STUDIO · ANÁLISIS PRIVADO AVANZADO</div>
      <label htmlFor="studio-file" style={{ color: '#dae7ed', fontSize: 13 }}>
        Analiza audio con los motores existentes de Studio. Tu archivo original permanece en este navegador.
      </label>
      <input id="studio-file" type="file" required disabled={busy}
        accept=".wav,.wave,.mp3,.flac,.m4a,.aac,.ogg,.opus,.aiff,.aif,.pdf,.docx,.txt,.md,.json,.csv,.tsv,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm,.zip"
        onChange={event => { runId.current++; setFile(event.target.files?.[0] ?? null); setReport(null); setError(''); setStatus(''); }}
        style={{ color: '#eaf6fb', width: '100%', fontSize: 12 }}
      />
      <button type="submit" disabled={busy || !file} style={{
        minHeight: 40, padding: '9px 15px', border: '1px solid rgba(164,213,255,.4)',
        background: busy ? '#24343d' : '#173d53', color: '#f2fbff',
        cursor: busy ? 'wait' : 'pointer', justifySelf: 'start',
      }}>{busy ? 'ANALIZANDO LOCALMENTE…' : 'ANALIZAR AUDIO SIN ALMACENAR ORIGINAL'}</button>
      {status && <p role="status" style={{ margin: 0, color: '#a7d7ee', fontSize: 12 }}>{status}</p>}
      {error && <p role="alert" style={{ margin: 0, color: '#ffb4a8', fontSize: 12 }}>{error}</p>}
      {report && <section aria-live="polite" style={{ borderTop: '1px solid rgba(127,200,245,.2)', paddingTop: 12, color: '#dcecf4', fontSize: 12 }}>
        <strong>{report.name}</strong>
        {report.kind === 'audio_analysis' ? <>
          <div style={{ border: '1px solid rgba(127,200,245,.2)', background: 'rgba(127,200,245,.05)', padding: 12, marginBottom: 14 }}>
            <strong>Lectura técnica de la obra</strong>
            {observations.map((line, index) => <p key={index} style={{ margin: '8px 0', lineHeight: 1.5 }}>{line}</p>)}
          </div>
          <p style={{ color: '#9bc5d7' }}>{report.durationSeconds?.toFixed(2)} s · {report.sampleRateHz} Hz · {report.channels} canal(es)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            {readings.map(feature => <div key={feature.key} title={feature.explanation} style={{ border: '1px solid rgba(255,255,255,.1)', padding: 10, background: 'rgba(255,255,255,.025)' }}>
              <div style={{ color: '#9ab2c1', fontSize: 10 }}>{labelFor(feature.key) || feature.label}</div>
              <div style={{ fontSize: 15, marginTop: 4 }}>{typeof feature.value === 'number' ? Number(feature.value.toFixed(3)) : feature.value} {feature.unit ?? ''}</div>
              <div style={{ fontSize: 9, color: '#78919d' }}>{feature.status}</div>
            </div>)}
          </div>
        </> : <p>Archivo identificado; la extracción avanzada de documentos sigue sin habilitarse en el navegador.</p>}
        <p style={{ color: '#9ccbb5' }}>Original enviado: NO · Original almacenado: NO · Persistencia: NINGUNA</p>
        {report.notObserved?.length ? <p style={{ color: '#bbad91' }}>No medido: {report.notObserved.join(' · ')}</p> : null}
        {report.kind === 'audio_analysis' && <>
          <button type="button" disabled={exportBusy} onClick={downloadDerivedWav} style={{ background: '#1a3f4d', color: '#e4f7ff', border: '1px solid #547b92', padding: '8px 12px', cursor: exportBusy ? 'wait' : 'pointer', marginRight: 8 }}>
            {exportBusy ? 'GENERANDO WAV…' : 'GENERAR WAV TÉCNICO 24-BIT'}
          </button>
          <p style={{ color: '#97aebd', fontSize: 11 }}>
            Esta exportación es opcional. Sólo reduce el nivel si el pico de muestra supera −1 dBFS; no aumenta la sonoridad, no aplica limitación, no mide dBTP y no equivale a masterizar.
          </p>
          {exportMessage && <p role="status" style={{ color: '#b4dcca' }}>{exportMessage}</p>}
        </>}
        <button type="button" onClick={downloadReport} style={{ background: 'transparent', color: '#b7e3fb', border: '1px solid #547b92', padding: '8px 12px', cursor: 'pointer' }}>
          DESCARGAR INFORME COMPLETO (JSON)
        </button>
      </section>}
      <span style={{ color: '#94a4ad', fontSize: 11 }}>
        Los cálculos se ejecutan en un proceso local del navegador; no se utiliza ninguna API externa.
        Las estimaciones musicales se identifican como estimaciones. No se declara FAD o MIHM sin sus evaluaciones canónicas.
      </span>
    </form>
  );
}
