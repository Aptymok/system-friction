import type { ReleaseDirection } from './localReleaseMaterials';

function safeStem(name: string) {
  return name.normalize('NFKD').replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 75) || 'studio-teaser';
}

export async function createLocalAudioTeaser(
  file: File,
  direction: ReleaseDirection,
  onState: (message: string) => void,
  cover: Blob,
): Promise<{fileName: string; durationSeconds: number; mimeType: string}> {
  if(!cover || !cover.size)throw new Error('PHOTOGRAPHIC_COVER_REQUIRED');
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    throw new Error('MEDIA_RECORDER_UNAVAILABLE');
  }
  const preferred=['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm'];
  const mimeType=preferred.find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('NO_COMPATIBLE_WEBM_RECORDER');
  const context=new AudioContext();
  let stream:MediaStream|null=null;
  let raf=0;
  let source:AudioBufferSourceNode|null=null;
  let recorder:MediaRecorder|null=null;
  let stopped=false;
  let endTimer:ReturnType<typeof setTimeout>|null=null;
  let coverBitmap:ImageBitmap|null=null;
  try {
    onState('Decodificando audio local…');
    const decoded=await context.decodeAudioData(await file.arrayBuffer());
    const length=Math.min(12,Math.max(0,decoded.duration-0.15));
    if(length<1) throw new Error('AUDIO_TOO_SHORT_FOR_TEASER');
    const offset=Math.max(0,(decoded.duration-length)/2);
    const canvas=document.createElement('canvas');
    canvas.width=720;canvas.height=1280;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('CANVAS_CONTEXT_UNAVAILABLE');
    const palettes={
      nocturnal:['#0c1325','#e9eaf2','#90b8d6'],
      paper:['#eae4d9','#19222d','#88704f'],
      signal:['#0a1917','#e5faed','#66c9a9'],
    } as const;
    const [bg,fg]=palettes[direction.palette];
    if(!/^image\/(png|jpeg|webp)$/.test(cover.type))throw new Error('INVALID_STUDIO_COVER');
    onState('Preparando portada fotográfica local para el video…');
    coverBitmap=await createImageBitmap(cover);
    if(coverBitmap.width<256||coverBitmap.height<256)throw new Error('STUDIO_COVER_TOO_SMALL');
    const title=(direction.title.trim()||'UNTITLED').slice(0,90);
    const artist=(direction.artist.trim()||'STUDIO').slice(0,80);
    function paint() {
      if(!ctx)return;
      ctx.fillStyle=bg;ctx.fillRect(0,0,720,1280);
      if(coverBitmap){
        // The owner-provided photographic derivative is the visible video artwork.
        // A cover-crop preserves proportions without distorting the source.
        const scale=Math.max(720/coverBitmap.width,1280/coverBitmap.height);
        const w=coverBitmap.width*scale,h=coverBitmap.height*scale;
        ctx.drawImage(coverBitmap,(720-w)/2,(1280-h)/2,w,h);
        const shade=ctx.createLinearGradient(0,0,0,1280);
        shade.addColorStop(0,'rgba(0,0,0,.48)');
        shade.addColorStop(.35,'rgba(0,0,0,.10)');
        shade.addColorStop(1,'rgba(0,0,0,.70)');
        ctx.fillStyle=shade;ctx.fillRect(0,0,720,1280);
      }
      // The photographic export has no synthetic rings or abstract fallback.
      ctx.globalAlpha=1;ctx.fillStyle=fg;ctx.textAlign='center';
      ctx.font='400 22px sans-serif';ctx.fillText(artist.toUpperCase(),360,170,620);
      const lines:string[]=[];
      let row='';
      for(const word of title.toUpperCase().split(/\s+/)) {
        const next=row?row+' '+word:word;
        if(next.length>15&&row){lines.push(row);row=word;}else row=next;
      }
      if(row)lines.push(row);
      ctx.font='600 49px sans-serif';
      lines.slice(0,4).forEach((line,i)=>ctx.fillText(line,360,940+i*63,650));
      ctx.font='17px monospace';ctx.fillText('SFI STUDIO · VIDEO PROPOSAL',360,1195,650);
    }
    paint();
    const videoStream=canvas.captureStream(24);
    stream=new MediaStream(videoStream.getVideoTracks());
    const destination=context.createMediaStreamDestination();
    for(const track of destination.stream.getAudioTracks())stream.addTrack(track);
    const recorded:BlobPart[]=[];
    recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:1600000,audioBitsPerSecond:128000});
    const recording=new Promise<Blob>((resolve,reject)=>{
      if(!recorder)return reject(new Error('RECORDER_UNAVAILABLE'));
      recorder.onerror=()=>reject(new Error('MEDIA_RECORDER_FAILED'));
      recorder.ondataavailable=event=>{if(event.data.size>0)recorded.push(event.data);};
      recorder.onstop=()=>recorded.length?resolve(new Blob(recorded,{type:mimeType})):reject(new Error('RECORDER_OUTPUT_EMPTY'));
    });
    source=context.createBufferSource();
    source.buffer=decoded;source.connect(destination);
    recorder.start(500);
    onState('Grabando 12 segundos de video y audio en este dispositivo…');
    await context.resume();
    const start=context.currentTime+.08;
    const animate=()=>{
      if(stopped)return;
      paint();
      raf=requestAnimationFrame(animate);
    };
    raf=requestAnimationFrame(animate);
    source.start(start,offset,length);
    const finished=new Promise<void>((resolve,reject)=>{
      if(!source)return reject(new Error('SOURCE_UNAVAILABLE'));
      source.onended=()=>resolve();
      endTimer=setTimeout(()=>reject(new Error('AUDIO_TEASER_TIMED_OUT')),Math.ceil(length*1000)+8000);
    });
    try {await finished;}finally{
      if(endTimer){clearTimeout(endTimer);endTimer=null;}
      stopped=true;cancelAnimationFrame(raf);
      if(recorder.state!=='inactive')recorder.stop();
    }
    const blob=await recording;
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download=safeStem(title)+'-photographic-preview.webm';anchor.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),5000);
    return {fileName:anchor.download,durationSeconds:length,mimeType};
  } finally {
    stopped=true;cancelAnimationFrame(raf);
    if(endTimer)clearTimeout(endTimer);
    if(recorder && recorder.state!=='inactive')recorder.stop();
    source?.disconnect();
    coverBitmap?.close();
    stream?.getTracks().forEach(track=>track.stop());
    await context.close().catch(()=>undefined);
  }
}
