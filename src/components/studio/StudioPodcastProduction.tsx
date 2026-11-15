'use client';

import { useEffect, useRef, useState } from 'react';
import type { StudioDocumentInput } from './localDocumentProduction';
import {
  makeStudioDocumentPdf, makeStudioDocumentMarkdown,
} from './localDocumentProduction';
import {
  captureLocalSystemVoice, downloadLocalPodcastAudio, localBrowserVoices,
  makePodcastManifest, podcastFilename, supportedAudioRecordingType,
  type StudioPodcastAudio,
} from './localPodcastAudio';
import { makeStudioLocalZip, downloadStudioLocalZip } from './localZipPackage';

export default function StudioPodcastProduction({document}: {document: StudioDocumentInput}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState('');
  const [rate, setRate] = useState(1);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [audio, setAudio] = useState<StudioPodcastAudio | null>(null);
  const [audioUrl,setAudioUrl] = useState<string | null>(null);
  const [recordedScript, setRecordedScript] = useState('');
  const [recordedTitle, setRecordedTitle] = useState('');
  const [packaging, setPackaging] = useState(false);
  const live = useRef<{
    recorder: MediaRecorder; stream: MediaStream;
    started: number; chunks: Blob[];
    maxTimer: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    const refresh = () => {
      const available = localBrowserVoices();
      setVoices(available);
      setVoiceUri(current => available.some(v => v.voiceURI === current)
        ? current
        : available.find(v => /^es[-_]/i.test(v.lang))?.voiceURI ?? available[0]?.voiceURI ?? '');
    };
    refresh();
    if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => {
      if ('speechSynthesis' in window) {
        speechSynthesis.removeEventListener('voiceschanged', refresh);
        speechSynthesis.cancel();
      }
      if (live.current) {
        clearTimeout(live.current.maxTimer);
        const current = live.current;
        if (current.recorder.state !== 'inactive') current.recorder.stop();
        current.stream.getTracks().forEach(track => track.stop());
        live.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!audio) {setAudioUrl(null);return;}
    const url = URL.createObjectURL(audio.blob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  const script = document.body.trim();
  const ready = script.length >= 20 && script.length <= 9000 && Boolean(document.title.trim());
  const matches = audio !== null && recordedScript === script && recordedTitle === document.title.trim();

  function readWithLocalVoice() {
    if (!ready || !voiceUri || busy || recording || !('speechSynthesis' in window)) return;
    const voice = localBrowserVoices().find(item => item.voiceURI === voiceUri);
    if (!voice) {setStatus('La voz seleccionada dejó de estar disponible localmente.');return;}
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = rate;
    utterance.onerror = event => setStatus('No pudo reproducirse la voz local: ' + event.error);
    speechSynthesis.speak(utterance);
    setStatus('Vista previa con voz instalada en este dispositivo. No se está grabando.');
  }

  async function synthesizeAndRecord() {
    if (!ready || !voiceUri || busy || recording) return;
    setBusy(true);setStatus('');setAudio(null);
    try {
      // getDisplayMedia is invoked within this click flow; selection belongs to the browser.
      const produced = await captureLocalSystemVoice({
        script,voiceUri,rate,onProgress:setStatus,
      });
      setAudio(produced);setRecordedScript(script);setRecordedTitle(document.title.trim());
      setStatus('Audio generado y capturado en memoria. Descárgalo o empaquétalo.');
    } catch (error) {
      setStatus('No se produjo audio: ' + (error instanceof Error ? error.message : String(error)));
    } finally {setBusy(false);}
  }

  async function recordMicrophone() {
    if (!ready || busy || recording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Este navegador no admite acceso al micrófono.');return;
    }
    const mimeType = supportedAudioRecordingType();
    if (!mimeType) {setStatus('Este navegador no puede exportar audio grabado.');return;}
    setBusy(true);setStatus('Solicitando permiso para grabar micrófono…');
    let stream:MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({audio:{
        echoCancellation:true,noiseSuppression:true,autoGainControl:false,
      },video:false});
      const chunks:Blob[]=[];
      const recorder = new MediaRecorder(stream,{mimeType,audioBitsPerSecond:128000});
      const started = performance.now();
      recorder.ondataavailable = event => {if(event.data.size>0)chunks.push(event.data);};
      recorder.onerror = () => setStatus('Error de grabación de micrófono: no hay archivo válido.');
      recorder.onstop = () => {
        const duration = (performance.now()-started)/1000;
        const output = new Blob(chunks,{type:mimeType});
        if(output.size > 0) {
          setAudio({
            blob:output,mimeType,source:'USER_MICROPHONE_RECORDING',durationSeconds:duration,
            voiceName:null,voiceLanguage:null,localVoice:null,originalUploaded:false,persistence:'MEMORY_ONLY',
          });
          setRecordedScript(script);setRecordedTitle(document.title.trim());
          setStatus('Narración grabada localmente. Audio listo para descarga.');
        } else setStatus('No se registraron muestras de audio. Intenta nuevamente.');
        stream?.getTracks().forEach(track=>track.stop());
        live.current=null;setRecording(false);setBusy(false);
      };
      const maxTimer=setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, 15*60*1000);
      live.current={recorder,stream,started,chunks,maxTimer};
      recorder.start(500);
      setAudio(null);
      setRecording(true);setBusy(false);
      setStatus('Grabando micrófono en memoria. Pulsa «Terminar grabación» al acabar.');
    } catch(error) {
      stream?.getTracks().forEach(track=>track.stop());
      setStatus('Micrófono no disponible: ' + (error instanceof Error?error.message:String(error)));
      setBusy(false);setRecording(false);
    }
  }

  function stopRecording(){
    const entry=live.current;
    if(!entry)return;
    clearTimeout(entry.maxTimer);
    setStatus('Finalizando grabación local…');
    if(entry.recorder.state !== 'inactive')entry.recorder.stop();
  }

  async function downloadPackage(){
    if(!audio || !matches || packaging)return;
    setPackaging(true);setStatus('Preparando paquete descargable con audio y guion…');
    try {
      const input:StudioDocumentInput={...document,kind:'podcast_script'};
      const pdf=makeStudioDocumentPdf(input);
      const markdown=makeStudioDocumentMarkdown(input);
      const manifest=makePodcastManifest(audio,document.title,document.author,script);
      const hash=await crypto.subtle.digest('SHA-256',await audio.blob.arrayBuffer());
      const sha256=Array.from(new Uint8Array(hash)).map(i=>i.toString(16).padStart(2,'0')).join('');
      const zip=await makeStudioLocalZip([
        {name:'podcast/'+podcastFilename(document.title,audio.mimeType),data:audio.blob},
        {name:'documentacion/guion.pdf',data:pdf},
        {name:'documentacion/guion.md',data:markdown},
        {name:'manifest.json',data:JSON.stringify({...manifest,audioSha256:sha256},null,2)},
      ]);
      downloadStudioLocalZip(zip,document.title);
      setStatus('Paquete de podcast descargado con audio, guion y huella SHA-256. Sin subir archivos.');
    } catch(error) {
      setStatus('No se generó el paquete: '+(error instanceof Error?error.message:String(error)));
    } finally {setPackaging(false);}
  }

  const inputStyle={background:'#14232b',border:'1px solid rgba(127,200,245,.27)',
    color:'#e8f5fb',padding:'8px',width:'100%'};
  const buttonStyle={background:'#215166',color:'#e8f8ff',border:'1px solid #5c91a3',
    padding:'9px 11px',cursor:'pointer'};

  return <section style={{border:'1px solid rgba(145,205,236,.3)',padding:14,
    display:'grid',gap:12,background:'rgba(22,52,80,.13)'}}>
    <strong>Podcast · voz y audio descargable</strong>
    <p style={{margin:0,color:'#adc4d3',fontSize:12,lineHeight:1.6}}>
      Usa el guion de arriba. Elige una voz instalada en tu dispositivo y permite capturar
      <b> esta pestaña con su audio</b>, o graba tu propia voz con el micrófono.
      El resultado se genera en memoria y se descarga como WebM, Ogg o M4A según el navegador.
      Ningún archivo se envía a SFI.
    </p>
    <label htmlFor="studio-podcast-voice">Voz disponible sin servicio remoto</label>
    <select id="studio-podcast-voice" value={voiceUri}
      onChange={event=>setVoiceUri(event.target.value)} style={inputStyle}>
      {!voices.length && <option value="">No hay voces locales disponibles</option>}
      {voices.map(voice=><option key={voice.voiceURI} value={voice.voiceURI}>
        {voice.name} ({voice.lang})
      </option>)}
    </select>
    <label htmlFor="studio-podcast-rate">Velocidad de voz ({rate.toFixed(2)}×)</label>
    <input id="studio-podcast-rate" type="range" min=".75" max="1.25" step=".05" value={rate}
      onChange={event=>setRate(Number(event.target.value))}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
      <button type="button" disabled={!ready||!voices.length||busy||recording}
        onClick={readWithLocalVoice} style={buttonStyle}>ESCUCHAR VOZ</button>
      <button type="button" disabled={!ready||!voices.length||busy||recording}
        onClick={synthesizeAndRecord} style={buttonStyle}>
        {busy?'PRODUCIENDO…':'GENERAR AUDIO CON VOZ LOCAL'}
      </button>
      <button type="button" onClick={()=>{if('speechSynthesis' in window)speechSynthesis.cancel();}}
        style={buttonStyle}>DETENER LOCUCIÓN</button>
    </div>
    <p style={{fontSize:11,color:'#b8a88d',margin:0,lineHeight:1.5}}>
      La captura de voz del sistema requiere compartir la pestaña actual y activar su audio.
      El navegador puede rechazar esta operación. No compartas toda la pantalla ni otras pestañas.
      Si no funciona, usa la grabación directa; no se fabricará un audio vacío.
    </p>
    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
      <button type="button" disabled={!ready||recording||busy} onClick={recordMicrophone}
        style={{...buttonStyle,background:'#244c42'}}>GRABAR VOZ CON MICRÓFONO</button>
      <button type="button" disabled={!recording} onClick={stopRecording}
        style={{...buttonStyle,background:'#5a3434'}}>TERMINAR GRABACIÓN</button>
    </div>
    {!ready&&<p style={{margin:0,color:'#bdb6a5',fontSize:11}}>
      Completa título y guion con al menos 20 caracteres (máximo 9000) para producir audio.
    </p>}
    {audio&&<div style={{display:'grid',gap:10,padding:12,border:'1px solid #53786b'}}>
      <strong>Audio disponible en esta sesión</strong>
      <p style={{fontSize:11,color:'#a8c4bb',margin:0}}>
        {Math.round(audio.blob.size/1024)} KB · {audio.durationSeconds.toFixed(1)} s ·
        {audio.source==='LOCAL_SYSTEM_VOICE_TAB_CAPTURE'?'Voz sintetizada local':'Grabación de micrófono'}
      </p>
      <audio controls src={audioUrl ?? undefined} style={{width:'100%'}} />
      {!matches&&<p style={{color:'#f2c2a0',margin:0,fontSize:11}}>
        Cambió el título o guion desde la grabación. Vuelve a producir el audio antes de descargar el paquete.
      </p>}
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button type="button" onClick={()=>downloadLocalPodcastAudio(audio,document.title)} style={buttonStyle}>
          DESCARGAR AUDIO
        </button>
        <button type="button" disabled={!matches||packaging} onClick={downloadPackage}
          style={{...buttonStyle,background:'#235244'}}>
          {packaging?'EMPACANDO…':'DESCARGAR PODCAST + GUION PDF'}
        </button>
      </div>
    </div>}
    {status&&<p role="status" style={{margin:0,color:'#a9ddcf',fontSize:12}}>{status}</p>}
    <p style={{color:'#94b2c0',fontSize:11,margin:0}}>
      Esto produce una grabación real, no mastering ni verificación de locución.
      La ruta de voz local depende del soporte de tu navegador y los permisos de captura.
      El micrófono sólo se activa con tu autorización.
    </p>
  </section>;
}
