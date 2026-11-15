'use client';

import { useState } from 'react';
import { createReleaseCoverBlob, makeReleaseBrief,
  type ReleaseMetrics, type ReleaseDirection, type ReleaseDiscoveryEvidence } from './localReleaseMaterials';
import { exportPcm24Wav, samplePeak } from './localPcmWavExport';
import { proposeCampaignVariants } from './localCampaignContrast';
import { makeStudioLocalZip, downloadStudioLocalZip, type StudioLocalZipEntry } from './localZipPackage';

type LocalAnalysis = {
  name: string;
  sizeBytes: number;
  durationSeconds?: number;
  analyzedAt: string;
  features?: Array<{
    key: string; label: string; value: string | number | null;
    unit: string | null; status: string; source: string;
    formulaVersion: string; explanation: string; warnings: string[];
  }>;
  limitations?: string[];
  notObserved?: string[];
  originalTransferred: false;
  originalStored: false;
};

async function sha256(entry: Blob | string): Promise<string> {
  const bytes = typeof entry === 'string' ? new TextEncoder().encode(entry) : await entry.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function audioExcerpt(file: File): Promise<{ wav: Blob; startSeconds: number; durationSeconds: number; sampleRateHz: number; gainDb: number }> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    if(buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) {
      throw new Error('LOCAL_PREVIEW_MONO_STEREO_ONLY');
    }
    const duration = Math.min(12, buffer.duration);
    const length = Math.round(duration * buffer.sampleRate);
    if(length < 128) throw new Error('AUDIO_TOO_SHORT');
    const begin = Math.max(0, Math.floor((buffer.length - length) / 2));
    const channels = Array.from({length:buffer.numberOfChannels},
      (_,index) => buffer.getChannelData(index).slice(begin, begin+length));
    const peak = samplePeak(channels);
    // Only attenuate if decoded sample peaks exceed -1 dBFS; not a mastering operation.
    const ceiling = Math.pow(10, -1/20);
    const gainDb = peak > ceiling ? 20*Math.log10(ceiling/peak) : 0;
    const wav = exportPcm24Wav(channels,buffer.sampleRate,gainDb);
    return {wav,startSeconds:begin/buffer.sampleRate,durationSeconds:length/buffer.sampleRate,sampleRateHz:buffer.sampleRate,gainDb};
  } finally {
    await context.close().catch(()=>undefined);
  }
}

export default function StudioReleasePackage({original,analysis,metrics,direction,discovery}:{
  original: File | null;
  analysis: LocalAnalysis;
  metrics: ReleaseMetrics;
  direction: ReleaseDirection;
  discovery: ReleaseDiscoveryEvidence | null;
}) {
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState('');
  async function createPackage() {
    if(busy)return;
    setBusy(true);setStatus('');
    try {
      if(!direction.title.trim() || !direction.artist.trim()) {
        throw new Error('Completa el nombre de la obra y el artista para producir el paquete.');
      }
      setStatus('Preparando portada y archivos de campaña en memoria…');
      const cover=await createReleaseCoverBlob(direction,metrics);
      const campaign=JSON.stringify({
        contract:'SFI-STUDIO-LOCAL-CAMPAIGN-CONTRAST-1.0',
        status:'DRAFT_NOT_PUBLISHED',
        generatedAt:new Date().toISOString(),
        title:direction.title,artist:direction.artist,
        sectorHypothesis:direction.sector || null,
        variants:proposeCampaignVariants(direction),
        publicationAuthorized:false,
        realAudienceObserved:false,
        causalEffectMeasured:false,
      },null,2);
      const brief=makeReleaseBrief(direction,metrics,discovery);
      const report=JSON.stringify(analysis,null,2);
      const files:StudioLocalZipEntry[]=[
        {name:'01-analysis/studio-local-analysis.json',data:report},
        {name:'02-editorial/release-brief.txt',data:brief},
        {name:'03-artwork/cover-proposal-3000.png',data:cover},
        {name:'04-campaign/draft-A-B.json',data:campaign},
      ];
      if(discovery)files.push({name:'04-campaign/public-discovery.json',data:JSON.stringify(discovery,null,2)});
      let preview:Awaited<ReturnType<typeof audioExcerpt>> | null=null;
      if(original){
        setStatus('Extrayendo un fragmento local del audio…');
        preview=await audioExcerpt(original);
        files.push({name:'05-audio/short-reference-24bit.wav',data:preview.wav});
      }
      const manifestItems=[];
      setStatus('Calculando huellas SHA-256 de los entregables…');
      for (const item of files) {
        manifestItems.push({
          path:item.name,
          bytes:typeof item.data === 'string' ? new TextEncoder().encode(item.data).length : item.data.size,
          sha256:await sha256(item.data),
        });
      }
      const manifest=JSON.stringify({
        contract:'SFI-STUDIO-LOCAL-RELEASE-PACKAGE-1.0',
        generatedAt:new Date().toISOString(),
        original:{included:false,transferred:false,stored:false,sourceFilename:analysis.name,availableInCurrentSession:original!==null},
        outputs:manifestItems,
        audioPreview:preview?{
          status:'DERIVED_FROM_LOCAL_ORIGINAL',
          provenance:'Browser-decoded PCM, centered excerpt; no mastering or true-peak verification',
          startSeconds:preview.startSeconds,
          durationSeconds:preview.durationSeconds,
          decodedSampleRateHz:preview.sampleRateHz,
          appliedGainDb:preview.gainDb,
          sourceEncodingPreserved:false,
        }:{
          status:'NOT_AVAILABLE',
          reason:'Original media was not provided in this session. No audio excerpt fabricated.',
        },
        evidencePolicy:{
          acousticMetrics:'Local observations from prior analysis, not independently validated',
          publicDiscovery:discovery?'INDEXED_SOURCES_CANDIDATE_ONLY':'NOT_EXECUTED',
          FAD:'NOT_OBSERVED',MIHM:'NOT_OBSERVED',
          releasePublication:'NOT_AUTHORIZED',audienceEffect:'NOT_OBSERVED',
        },
        totalProviderApiCalls:0,
        originalIncludedInArchive:false,
        automaticServerPersistence:false,
      },null,2);
      files.push({name:'00-manifest.json',data:manifest});
      setStatus('Empaquetando archivos localmente…');
      const zip=await makeStudioLocalZip(files);
      downloadStudioLocalZip(zip,direction.title);
      setStatus('Paquete ZIP generado y descargado. Contiene '+files.length+
        ' archivos derivados y huellas SHA-256. '+(preview?'Incluye fragmento WAV. ':'Sin audio: original no disponible. ')+'El original no se incluye.');
    } catch(error) {
      setStatus('No se generó el paquete: '+(error instanceof Error?error.message:String(error)));
    } finally {setBusy(false);}
  }
  return <section style={{
    border:'1px solid rgba(155,215,198,.3)',padding:12,display:'grid',gap:8,
    background:'rgba(33,80,68,.11)',
  }}>
    <strong>Entrega integral · paquete ZIP privado</strong>
    <p style={{margin:0,fontSize:11,color:'#a9c9bd',lineHeight:1.5}}>
      Incluye informe medido, expediente, portada PNG, campaña A/B,
      fuentes recuperadas si se consultaron y manifiesto SHA-256. Incluye un fragmento WAV únicamente cuando el original está disponible en esta sesión.
      No incluye el máster original. Los documentos son borradores y no autorizan publicación.
    </p>
    <button type="button" disabled={busy || !direction.title.trim() || !direction.artist.trim()}
      onClick={createPackage} style={{padding:'11px 14px',background:'#225346',
        border:'1px solid #609c87',color:'#edfff7',
        cursor:busy?'wait':'pointer',justifySelf:'start'}}>
      {busy?'PREPARANDO PAQUETE…':'GENERAR Y DESCARGAR PAQUETE COMPLETO'}
    </button>
    {status&&<p role="status" style={{margin:0,color:'#bbdbc9',fontSize:12}}>{status}</p>}
  </section>;
}
