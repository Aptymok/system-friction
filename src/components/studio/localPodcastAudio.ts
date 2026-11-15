/** Studio local audio production. Does not submit audio or text to SFI servers.
 * System-voice export requires a locally installed browser voice AND explicit
 * browser tab-audio capture permission. The Web Speech API alone does not expose PCM.
 */
export type StudioPodcastAudio = {
  blob: Blob;
  mimeType: string;
  source: 'LOCAL_SYSTEM_VOICE_TAB_CAPTURE' | 'USER_MICROPHONE_RECORDING';
  durationSeconds: number;
  voiceName: string | null;
  voiceLanguage: string | null;
  localVoice: boolean | null;
  originalUploaded: false;
  persistence: 'MEMORY_ONLY';
};

export function localBrowserVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  // Remote voices may send script contents to a service. Never use them in local mode.
  return speechSynthesis.getVoices().filter(voice => voice.localService === true);
}

export function supportedAudioRecordingType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ].find(type => MediaRecorder.isTypeSupported(type)) ?? null;
}

function normalizedScript(script: string): string {
  const trimmed = script.trim();
  if (trimmed.length < 20 || trimmed.length > 9000) throw new Error('El guion debe tener entre 20 y 9000 caracteres.');
  return trimmed;
}

function audioRecorder(stream: MediaStream, mimeType: string) {
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
  let resolved = false;
  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
    recorder.onerror = () => { if (!resolved) {resolved=true; reject(new Error('La grabación local falló.'));} };
    recorder.onstop = () => {
      if (resolved) return;
      resolved=true;
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) reject(new Error('La grabación local resultó vacía.'));
      else resolve(blob);
    };
  });
  return {recorder, finished};
}

export async function captureLocalSystemVoice(input: {
  script: string;
  voiceUri: string;
  rate: number;
  onProgress: (text: string) => void;
}): Promise<StudioPodcastAudio> {
  const script = normalizedScript(input.script);
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Este navegador no admite captura de audio de pestaña.');
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    throw new Error('El navegador no dispone de síntesis de voz.');
  }
  const voice = localBrowserVoices().find(candidate => candidate.voiceURI === input.voiceUri);
  if (!voice) throw new Error('La voz no está instalada localmente. Selecciona una voz disponible.');
  const mimeType = supportedAudioRecordingType();
  if (!mimeType) throw new Error('Este navegador no permite grabar audio WebM, Ogg o MP4.');
  if (!Number.isFinite(input.rate) || input.rate < 0.75 || input.rate > 1.25) {
    throw new Error('Velocidad de locución fuera del intervalo autorizado.');
  }
  input.onProgress('Elige esta misma pestaña y activa «Compartir audio de la pestaña».');
  // Must be called while the browser still recognizes the original click gesture.
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: {displaySurface:'browser'},
    audio: true,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    systemAudio: 'exclude',
  } as DisplayMediaStreamOptions);
  let monitor: AudioContext | null = null;
  let analyserTimer: ReturnType<typeof setInterval> | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let recorder: MediaRecorder | null = null;
  let meaningfulAudioFrames = 0;
  let durationSeconds = 0;
  try {
    const audioTrack = display.getAudioTracks()[0];
    const videoTrack = display.getVideoTracks()[0];
    if (!audioTrack || !videoTrack) throw new Error('No se compartió audio. Selecciona esta pestaña y marca «Compartir audio».');
    if (videoTrack.getSettings().displaySurface !== 'browser') {
      throw new Error('Por privacidad, selecciona una pestaña del navegador, no la pantalla completa.');
    }
    const audioOnly = new MediaStream([audioTrack]);
    monitor = new AudioContext();
    const source = monitor.createMediaStreamSource(audioOnly);
    const analyser = monitor.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser); // No connection to speakers: prevent feedback.
    const spectrum = new Float32Array(analyser.fftSize);
    analyserTimer = setInterval(() => {
      analyser.getFloatTimeDomainData(spectrum);
      let power = 0;
      for (const value of spectrum) power += value * value;
      if (Math.sqrt(power / spectrum.length) > 0.0003) meaningfulAudioFrames++;
    }, 130);
    const capture = audioRecorder(audioOnly, mimeType);
    recorder = capture.recorder;
    let speechStarted = false;
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = input.rate;
    const spoken = new Promise<void>((resolve, reject) => {
      utterance.onstart = () => {speechStarted=true;input.onProgress('Sintetizando voz local y capturando audio en memoria…');};
      utterance.onend = () => resolve();
      utterance.onerror = event => reject(new Error('La voz local falló: ' + event.error));
    });
    recorder.start(350);
    const begin = performance.now();
    // Some browsers suspend audio-context playback until explicitly resumed.
    await monitor.resume();
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    const expiration = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(speechStarted
        ? 'La locución superó el límite de 8 minutos.'
        : 'La voz local no comenzó a reproducirse.')), 480000);
    });
    const shareEnded = new Promise<never>((_, reject) => {
      audioTrack.addEventListener('ended', () => reject(new Error('Se interrumpió el audio compartido.')), {once:true});
      videoTrack.addEventListener('ended', () => reject(new Error('Se canceló la captura de pestaña.')), {once:true});
    });
    await Promise.race([spoken, expiration, shareEnded]);
    await new Promise(resolve => setTimeout(resolve, 380)); // Capture final syllables.
    durationSeconds = (performance.now() - begin) / 1000;
    if (recorder.state !== 'inactive') recorder.stop();
    const blob = await capture.finished;
    if (meaningfulAudioFrames === 0) {
      throw new Error('La pista compartida permaneció en silencio. No se entregará un archivo de voz vacío.');
    }
    input.onProgress('Voz sintetizada y audio comprobado; archivo disponible para descargar.');
    return {
      blob, mimeType, source:'LOCAL_SYSTEM_VOICE_TAB_CAPTURE',
      durationSeconds, voiceName:voice.name, voiceLanguage:voice.lang,
      localVoice:true, originalUploaded:false, persistence:'MEMORY_ONLY',
    };
  } finally {
    if (timeout) clearTimeout(timeout);
    if (analyserTimer) clearInterval(analyserTimer);
    speechSynthesis.cancel();
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    display.getTracks().forEach(track => track.stop());
    if (monitor) await monitor.close().catch(() => undefined);
  }
}

export function podcastFilename(title:string, mimeType:string) {
  const extension = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm';
  const stem = title.normalize('NFKD').replace(/[^a-z0-9-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,75) || 'studio-podcast';
  return stem+'.'+extension;
}

export function downloadLocalPodcastAudio(audio: StudioPodcastAudio, title:string) {
  const url = URL.createObjectURL(audio.blob);
  const link = document.createElement('a');
  link.href = url; link.download = podcastFilename(title,audio.mimeType); link.click();
  window.setTimeout(() => URL.revokeObjectURL(url),2500);
}

export function makePodcastManifest(audio: StudioPodcastAudio,title:string,author:string,script:string) {
  return {
    contract:'SFI-STUDIO-LOCAL-PODCAST-1.0',
    createdAt:new Date().toISOString(),
    title,author,
    scriptCharacters:script.length,
    audioFile:podcastFilename(title,audio.mimeType),
    audioBytes:audio.blob.size,
    durationSeconds:audio.durationSeconds,
    voiceOrigin:audio.source,
    voiceName:audio.voiceName,
    voiceLanguage:audio.voiceLanguage,
    localBrowserVoiceVerified:audio.localVoice,
    originalUploaded:false, originalStored:false,
    persistence:'MEMORY_ONLY',
    publication:'NOT_AUTHORIZED',
    scientificVerification:'NOT_PERFORMED',
    claim:'Browser audio capture, not studio mastering or independently verified voice fidelity',
  };
}
