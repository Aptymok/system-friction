'use client';

import { useCallback, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';
import { exportPcm24Wav, samplePeak } from './localPcmWavExport';
import { downloadTextFile, makeReleaseBrief, type ReleaseDirection, type ReleaseDiscoveryEvidence } from './localReleaseMaterials';
import StudioReleaseResearch from './StudioReleaseResearch';
import StudioCampaignContrast from './StudioCampaignContrast';
import StudioReleasePackage from './StudioReleasePackage';
import { createLocalAudioTeaser } from './localTeaserExport';
import { parseStudioLocalReport } from './localReportImport';
import StudioPhotographicProposals from './StudioPhotographicProposals';
import type { StudioPhotographicCover } from './localPhotographicCovers';

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
  const router = useRouter();
  const [authorizeArchive, setAuthorizeArchive] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveMessage, setArchiveMessage] = useState('');
  const [archiveError, setArchiveError] = useState('');
  const [archiveResult, setArchiveResult] = useState<{ objectId: string; fad: Record<string, unknown>; mihm: Record<string, unknown> } | null>(null);
  const [storedObjectId, setStoredObjectId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [reportImported, setReportImported] = useState(false);
  const [error, setError] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [release, setRelease] = useState<ReleaseDirection>({
    title: '', artist: '', sector: '', concept: '', palette: 'nocturnal',
  });
  const [releaseMessage, setReleaseMessage] = useState('');
  const [releaseEvidence, setReleaseEvidence] = useState<ReleaseDiscoveryEvidence | null>(null);
  const [teaserBusy, setTeaserBusy] = useState(false);
  const [photographicCovers,setPhotographicCovers]=useState<StudioPhotographicCover[]>([]);
  const [videoCoverId,setVideoCoverId]=useState('');
  const handlePhotographicCovers=useCallback((value:StudioPhotographicCover[])=>{
    setPhotographicCovers(value);
    setVideoCoverId(current=>value.some(cover=>cover.id===current)?current:(value[0]?.id??''));
  },[]);
  const runId = useRef(0);

  async function importReport(source: File | null) {
    if (!source) return;
    const current=++runId.current;
    setError('');setStatus('Leyendo informe en el navegador…');
    if(source.size===0 || source.size>5*1024*1024 || !/\\.json$/i.test(source.name)){
      setStatus('');setError('Selecciona un informe JSON local de hasta 5 MB.');
      return;
    }
    try {
      const candidate=JSON.parse(await source.text()) as unknown;
      const imported=parseStudioLocalReport(candidate);
      if(current!==runId.current)return;
      setFile(null);setReport(imported);setReportImported(true);
      setRelease(current=>({
        ...current,
        title:current.title.trim()||imported.name.replace(/\\.[^.]+$/,'').slice(0,90),
      }));
      setStatus('Informe recuperado localmente. No se reconstruyó ni descargó el audio original.');
      setReleaseEvidence(null);
    } catch(cause){
      if(current!==runId.current)return;
      setStatus('');
      setError('El informe no se pudo recuperar: '+(cause instanceof Error?cause.message:String(cause)));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    const current = ++runId.current;
    setBusy(true); setStatus('Preparando análisis privado…'); setError(''); setReport(null); setReportImported(false); setExportMessage('');
    setReleaseMessage('');
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

  async function archiveAndAnalyze() {
    if (!file || archiveBusy || !authorizeArchive) return;
    if (!file.type.startsWith('audio/') && !/\.(wav|wave|mp3|m4a|aac|flac|ogg|opus|aiff|aif)$/i.test(file.name)) {
      setArchiveError('Para guardar y ejecutar FAD/MIHM selecciona un archivo de audio.');
      return;
    }
    if (file.size === 0 || file.size > 150 * 1024 * 1024) {
      setArchiveError('El archivo original debe medir entre 1 byte y 150 MB.');
      return;
    }
    setArchiveBusy(true); setArchiveError(''); setArchiveResult(null); setStoredObjectId(null);
    try {
      const client = createBrowserSupabaseClient();
      if (!client) throw new Error('Almacenamiento privado no disponible en este navegador.');
      setArchiveMessage('Preparando registro privado de tu obra…');
      const prepare = await fetch('/api/studio/objects/upload/prepare', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, title: file.name.replace(/\.[^.]+$/, ''), mimeType: file.type || null,
          sizeBytes: file.size, originalPersistenceAuthorized: true, analysisAuthorized: true, rightsBasis: 'operator_owned' }),
      });
      const prepared = await prepare.json() as { ok?: boolean; objectId?: string; bucket?: string;
        storagePath?: string; signedToken?: string; error?: string; details?: string };
      if (!prepare.ok || !prepared.ok || !prepared.objectId || !prepared.bucket || !prepared.storagePath || !prepared.signedToken) {
        throw new Error(prepared.details || prepared.error || 'No se autorizó el registro privado.');
      }
      setArchiveMessage('Guardando el archivo original en el almacenamiento privado…');
      const uploaded = await client.storage.from(prepared.bucket).uploadToSignedUrl(
        prepared.storagePath, prepared.signedToken, file, { contentType: file.type || 'application/octet-stream' });
      if (uploaded.error) throw new Error('No se guardó el archivo: ' + uploaded.error.message);
      const completed = await fetch('/api/studio/objects/upload/complete', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ objectId: prepared.objectId }),
      });
      const completion = await completed.json() as {ok?:boolean;error?:string;details?:string};
      if (!completed.ok || !completion.ok) throw new Error(completion.details || completion.error || 'No se comprobó la carga del original.');
      setStoredObjectId(prepared.objectId);
      setArchiveMessage('Archivo guardado. Ejecutando análisis acústico, FAD y MIHM…');
      const response = await fetch('/api/studio/objects/' + encodeURIComponent(prepared.objectId) + '/analyze/audio', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ integrateMethods: true }),
      });
      const data = await response.json() as {ok?:boolean;error?:string;details?:string;
        methodologicalIntegration?:{fad?:Record<string,unknown>;mihm?:Record<string,unknown>}};
      if (!response.ok && response.status !== 207) {
        throw new Error('El original está guardado, pero el análisis falló: ' + (data.details || data.error || response.status));
      }
      const fad = data.methodologicalIntegration?.fad ?? {state: 'NOT_OBSERVED'};
      const mihm = data.methodologicalIntegration?.mihm ?? {state: 'NOT_OBSERVED'};
      setArchiveResult({ objectId: prepared.objectId, fad, mihm });
      setArchiveMessage('Análisis concluido. Consulta abajo los resultados independientes de FAD y MIHM.');
      router.refresh();
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : 'No se completó el registro.');
      setArchiveMessage('');
    } finally {
      setArchiveBusy(false);
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
  const releaseMetrics = {
    durationSeconds: report?.durationSeconds ?? null,
    loudnessLufs: typeof metric('lufs_integrated')?.value === 'number' ? metric('lufs_integrated')!.value as number : null,
    loudnessRangeLu: typeof metric('loudness_range_lu')?.value === 'number' ? metric('loudness_range_lu')!.value as number : null,
    tempoBpm: typeof metric('tempo_global_bpm')?.value === 'number' ? metric('tempo_global_bpm')!.value as number : null,
    tempoAmbiguous: metric('tempo_global_bpm')?.warnings?.includes('TEMPO_HALF_DOUBLE_AMBIGUITY') ?? true,
    keyEstimate: typeof metric('key_estimate')?.value === 'string' ? metric('key_estimate')!.value as string : null,
  };
  function updateRelease<K extends keyof ReleaseDirection>(key: K, value: ReleaseDirection[K]) {
    setRelease(current => ({ ...current, [key]: value }));
    setReleaseEvidence(null);
    setReleaseMessage('');
  }
  function exportReleaseBrief() {
    if (report?.kind !== 'audio_analysis') return;
    downloadTextFile(makeReleaseBrief(release, releaseMetrics, releaseEvidence), (release.title || 'lanzamiento') + '-brief.txt');
    setReleaseMessage('Expediente editorial descargado; no se envió ni archivó en SFI.');
  }
  async function exportTeaser() {
    if (report?.kind !== 'audio_analysis' || !file || teaserBusy) return;
    setTeaserBusy(true);
    setReleaseMessage('');
    try {
      const selectedCover=photographicCovers.find(cover=>cover.id===videoCoverId)??photographicCovers[0];
      if(!selectedCover)throw new Error('Primero produce una portada fotográfica. No se exportará el visualizador abstracto como video fotográfico.');
      const created = await createLocalAudioTeaser(file, release, message => setReleaseMessage(message), selectedCover.blob);
      setReleaseMessage('Video de ' + created.durationSeconds.toFixed(1) +
        ' segundos generado en tu dispositivo: ' + created.fileName +
        '. Es una muestra audiovisual, no una publicación.');
    } catch (cause) {
      setReleaseMessage('Video no generado: ' + (cause instanceof Error ? cause.message : String(cause)));
    } finally {
      setTeaserBusy(false);
    }
  }


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
      <div style={{ color: '#b4d1e1', fontSize: 12 }}>ANÁLISIS RÁPIDO · PRIVADO</div>
      <label htmlFor="studio-file" style={{ color: '#dae7ed', fontSize: 13 }}>
        Selecciona una canción. Escucharás sus características técnicas sin perder ni modificar tu archivo original.
      </label>
      <input id="studio-file" type="file" required disabled={busy}
        accept=".wav,.wave,.mp3,.flac,.m4a,.aac,.ogg,.opus,.aiff,.aif,.pdf,.docx,.txt,.md,.json,.csv,.tsv,.png,.jpg,.jpeg,.webp,.mp4,.mov,.webm,.zip"
        onChange={event => { runId.current++; setFile(event.target.files?.[0] ?? null); setReport(null); setError(''); setStatus(''); setArchiveResult(null); setStoredObjectId(null); setArchiveError(''); setArchiveMessage(''); setAuthorizeArchive(false); }}
        style={{ color: '#eaf6fb', width: '100%', fontSize: 12 }}
      />
      <details style={{padding:'10px 0',color:'#acc6d2'}}><summary style={{cursor:'pointer',fontSize:12}}>Recuperar un análisis anterior</summary><label htmlFor="studio-report-import" style={{color:'#c7e3ee',fontSize:12}}>
        Recuperar una sesión anterior sin guardar el máster: importar studio-local-analysis.json
      </label>
      <input id="studio-report-import" type="file" accept=".json,application/json"
        onChange={event=>{void importReport(event.target.files?.[0]??null);event.target.value='';}}
        style={{color:'#c7d5df',width:'100%',fontSize:12}}/></details>
      <button type="submit" disabled={busy || !file} style={{
        minHeight: 40, padding: '9px 15px', border: '1px solid rgba(164,213,255,.4)',
        background: busy ? '#24343d' : '#173d53', color: '#f2fbff',
        cursor: busy ? 'wait' : 'pointer', justifySelf: 'start',
      }}>{busy ? 'ANALIZANDO…' : 'ANALIZAR MI CANCIÓN'}</button>
      <section style={{padding:14,border:'1px solid rgba(148,202,224,.22)',background:'rgba(17,39,51,.30)',display:'grid',gap:9}}>
        <strong style={{fontSize:14}}>¿Quieres ejecutar FAD y MIHM con una obra guardada?</strong>
        <p style={{color:'#b6c9d2',fontSize:12,lineHeight:1.5,margin:0}}>
          A diferencia del análisis rápido, esto conserva una copia privada del archivo original en SFI para generar mediciones y evidencia recuperable. No cambia el máster ni lo publica.
        </p>
        <label style={{display:'flex',alignItems:'flex-start',gap:9,color:'#d7e8ed',fontSize:12,lineHeight:1.5}}>
          <input type="checkbox" checked={authorizeArchive} onChange={event=>setAuthorizeArchive(event.target.checked)} disabled={archiveBusy} />
          Soy titular o tengo permiso para analizar esta obra y autorizo expresamente conservar el archivo original en el almacenamiento privado de Studio.
        </label>
        <button type="button" disabled={!file || !authorizeArchive || archiveBusy || busy}
          onClick={()=>void archiveAndAnalyze()}
          style={{padding:'11px 15px',border:'1px solid #89b7cf',background:'#28566a',color:'#f3fbff',cursor:archiveBusy?'wait':'pointer',fontWeight:600,justifySelf:'start'}}>
          {archiveBusy?'REGISTRANDO Y ANALIZANDO…':'GUARDAR Y ANALIZAR CON FAD + MIHM'}
        </button>
        {archiveMessage && <p role="status" style={{margin:0,color:'#b5ddc9',fontSize:12}}>{archiveMessage}</p>}
        {archiveError && <p role="alert" style={{margin:0,color:'#ffbdad',fontSize:12}}>{archiveError}</p>}
        {storedObjectId && !archiveResult && <a href={'/studio?objectId='+encodeURIComponent(storedObjectId)} style={{color:'#a9e2ff',fontSize:12}}>El original ya está guardado: abrir su expediente aunque el análisis esté pendiente</a>}
        {archiveResult && <div style={{display:'grid',gap:8,padding:12,background:'rgba(255,255,255,.04)',fontSize:13}}>
          <strong>Resultados de la obra guardada</strong>
          <div>FAD · {String(archiveResult.fad.state ?? 'NO OBSERVADO')} · {typeof archiveResult.fad.value === 'number' ? 'Contraste acústico: '+archiveResult.fad.value : 'Sin medición verificable'}</div>
          <div>MIHM · {String(archiveResult.mihm.state ?? 'NO OBSERVADO')} · {typeof (archiveResult.mihm.result as Record<string,unknown> | undefined)?.ihg_raw === 'number' ? 'Cálculo acústico parcial: '+String((archiveResult.mihm.result as Record<string,unknown>).ihg_raw) : 'Sin resultado acústico verificable'}</div>
          <a href={'/studio?objectId='+encodeURIComponent(archiveResult.objectId)} style={{color:'#a9e2ff'}}>Abrir el expediente guardado</a>
          <span style={{fontSize:11,color:'#adc1ca'}}>FAD estructural no está calibrado como indicador de calidad. MIHM no declara IHG final ni NTI sin mediciones independientes.</span>
        </div>}
      </section>
      {status && <p role="status" style={{ margin: 0, color: '#a7d7ee', fontSize: 12 }}>{status}</p>}
      {error && <p role="alert" style={{ margin: 0, color: '#ffb4a8', fontSize: 12 }}>{error}</p>}
      {report && <section aria-live="polite" style={{ borderTop: '1px solid rgba(127,200,245,.2)', paddingTop: 12, color: '#dcecf4', fontSize: 12 }}>
        <strong>{report.name}</strong>
        {reportImported && <p style={{color:'#b7cde8',fontSize:11}}>Informe IMPORTADO, no reevaluado. Mediciones históricas sin verificación nueva. Para WAV y video se requiere seleccionar el audio original otra vez.</p>}
        {report.kind === 'audio_analysis' ? <>
          <div style={{ border: '1px solid rgba(127,200,245,.2)', background: 'rgba(127,200,245,.05)', padding: 12, marginBottom: 14 }}>
            <strong>Lectura técnica de la obra</strong>
            {observations.map((line, index) => <p key={index} style={{ margin: '8px 0', lineHeight: 1.5 }}>{line}</p>)}
          </div>
          <p style={{ color: '#9bc5d7' }}>{report.durationSeconds?.toFixed(2)} s · {report.sampleRateHz} Hz · {report.channels} canal(es)</p>
          <details style={{margin:'14px 0'}}><summary style={{cursor:'pointer',color:'#b7dff2'}}>Ver todas las mediciones técnicas ({readings.length})</summary><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop:12 }}>
            {readings.map(feature => <div key={feature.key} title={feature.explanation} style={{ border: '1px solid rgba(255,255,255,.1)', padding: 10, background: 'rgba(255,255,255,.025)' }}>
              <div style={{ color: '#9ab2c1', fontSize: 10 }}>{labelFor(feature.key) || feature.label}</div>
              <div style={{ fontSize: 15, marginTop: 4 }}>{typeof feature.value === 'number' ? Number(feature.value.toFixed(3)) : feature.value} {feature.unit ?? ''}</div>
              <div style={{ fontSize: 9, color: '#78919d' }}>{feature.status}</div>
            </div>)}
          </div></details>
        </> : <p>Archivo identificado; la extracción avanzada de documentos sigue sin habilitarse en el navegador.</p>}

        {report.kind === 'audio_analysis' && <details style={{
          padding: 14, margin: '14px 0',
          border: '1px solid rgba(127,200,245,.27)', background: 'rgba(44,86,99,.14)',
        }}>
          <summary style={{cursor:'pointer',fontSize:14,fontWeight:600}}>Crear portada, video y materiales de lanzamiento (opcional)</summary>
          <div style={{display:'grid',gap:10,marginTop:14}}>
          <strong>Creación editorial · el audio permanece en tu dispositivo</strong>
          <p style={{ margin: 0, color: '#9fb4c2', lineHeight: 1.5 }}>
            Produce portadas con fotografías reales y un expediente editorial preliminar. El sector es una hipótesis aportada por ti:
            todavía no se ha investigado ni validado como público objetivo.
          </p>
          <label htmlFor="release-title">Nombre de la obra</label>
          <input id="release-title" type="text" maxLength={90} value={release.title}
            placeholder="Ej. PHOSPHOROS" onChange={event => updateRelease('title', event.target.value)}
            style={{ padding: 9, color: '#eaf6fb', background: '#162836', border: '1px solid #4c6775' }} />
          <label htmlFor="release-artist">Artista</label>
          <input id="release-artist" type="text" maxLength={80} value={release.artist}
            placeholder="Ej. KXTXR" onChange={event => updateRelease('artist', event.target.value)}
            style={{ padding: 9, color: '#eaf6fb', background: '#162836', border: '1px solid #4c6775' }} />
          <label htmlFor="release-concept">Concepto o mensaje de la obra</label>
          <textarea id="release-concept" rows={2} maxLength={900} value={release.concept}
            placeholder="Qué quieres comunicar con esta pieza"
            onChange={event => updateRelease('concept', event.target.value)}
            style={{ padding: 9, color: '#eaf6fb', background: '#162836', border: '1px solid #4c6775' }} />
          <label htmlFor="release-sector">Público o sector propuesto (hipótesis, opcional)</label>
          <input id="release-sector" type="text" maxLength={240} value={release.sector}
            placeholder="Audiencia que quieres contrastar, no una audiencia ya verificada"
            onChange={event => updateRelease('sector', event.target.value)}
            style={{ padding: 9, color: '#eaf6fb', background: '#162836', border: '1px solid #4c6775' }} />
          <label htmlFor="release-palette">Dirección visual</label>
          <select id="release-palette" value={release.palette}
            onChange={event => updateRelease('palette', event.target.value as ReleaseDirection['palette'])}
            style={{ padding: 9, color: '#eaf6fb', background: '#162836', border: '1px solid #4c6775' }}>
            <option value="nocturnal">Nocturna · azul grisáceo</option>
            <option value="paper">Editorial · papel cálido</option>
            <option value="signal">Señal · verde oscuro</option>
          </select>
          <StudioPhotographicProposals direction={release} onCovers={handlePhotographicCovers} />
          {photographicCovers.length>0&&<label htmlFor="studio-video-cover" style={{display:'grid',gap:6}}>
            Imagen para el video musical (derivada fotográfica local)
            <select id="studio-video-cover" value={videoCoverId||photographicCovers[0].id}
              onChange={event=>setVideoCoverId(event.target.value)}
              style={{padding:9,color:'#eaf6fb',background:'#162836',border:'1px solid #4c6775'}}>
              {photographicCovers.map(cover=><option key={cover.id} value={cover.id}>{cover.sourceName}</option>)}
            </select>
          </label>}
          <StudioReleaseResearch direction={release} onDiscovery={setReleaseEvidence} />
          <StudioCampaignContrast direction={release} />
          <StudioReleasePackage
            original={file}
            analysis={report}
            metrics={releaseMetrics}
            direction={release}
            discovery={releaseEvidence}
            photographicCovers={photographicCovers}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" disabled={teaserBusy || !file || photographicCovers.length===0} onClick={exportTeaser} style={{
              padding: '10px 14px', color: '#e9fbff', background: '#34264f', border: '1px solid #7467a2',
              cursor: teaserBusy ? 'wait' : 'pointer',
            }}>{teaserBusy ? 'GENERANDO VIDEO…' : 'GENERAR VIDEO VERTICAL CON PORTADA Y AUDIO (12 S)'}</button>
            <button type="button" onClick={exportReleaseBrief} style={{
              padding: '10px 14px', color: '#e9fbff', background: '#23453d', border: '1px solid #4e8174', cursor: 'pointer',
            }}>DESCARGAR EXPEDIENTE DE LANZAMIENTO</button>
          </div>
          {releaseMessage && <p role="status" style={{ margin: 0, color: '#b4dcca' }}>{releaseMessage}</p>}
          <p style={{ margin: 0, fontSize: 11, color: '#9fb4c2' }}>
            Primero produce y selecciona una portada fotográfica; solo entonces se habilita el video vertical con audio. No se utiliza un fondo abstracto sustituto. Este proceso transforma fotos aportadas, no genera fotografías nuevas con IA. La generación de fotografías nuevas requiere un proveedor externo autorizado. Campaña: borrador sin estudio de mercado.
            No publica, no ejecuta FAD/MIHM y no genera cargos de proveedores.
          </p>
          </div></details>}
        <details style={{margin:'14px 0',color:'#9ccbb5',fontSize:12}}><summary style={{cursor:'pointer'}}>Privacidad y límites de este análisis</summary><p>Este análisis local no envía ni guarda el original. Para persistir el original y ejecutar los métodos FAD y MIHM utiliza la autorización y el botón «Guardar y analizar con FAD + MIHM» de arriba.</p>{report.notObserved?.length ? <p style={{color:'#bbad91'}}>Todavía fuera del análisis rápido: {report.notObserved.join(' · ')}</p> : null}</details>

        {report.kind === 'audio_analysis' && <details style={{padding:'10px 0'}}><summary style={{cursor:'pointer',fontSize:12,color:'#9dc1d5'}}>Conversión técnica opcional a WAV de 24 bits</summary>
          <button type="button" disabled={exportBusy || !file} onClick={downloadDerivedWav} style={{ background: '#1a3f4d', color: '#e4f7ff', border: '1px solid #547b92', padding: '8px 12px', cursor: exportBusy ? 'wait' : 'pointer', marginRight: 8 }}>
            {exportBusy ? 'GENERANDO WAV…' : 'GENERAR WAV TÉCNICO 24-BIT'}
          </button>
          <p style={{ color: '#97aebd', fontSize: 11 }}>
            Esta exportación es opcional. Sólo reduce el nivel si el pico de muestra supera −1 dBFS; no aumenta la sonoridad, no aplica limitación, no mide dBTP y no equivale a masterizar.
          </p>
          {exportMessage && <p role="status" style={{ color: '#b4dcca' }}>{exportMessage}</p>}
        </details>}
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
