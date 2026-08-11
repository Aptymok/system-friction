import { mixdownToMono } from '../audioDecode';
import { STUDIO_AUDIO_ENGINE_NAME, STUDIO_AUDIO_ENGINE_VERSION, type StudioAudioFeature, type StudioDecodedAudio } from '../audioTypes';
import { rms, zeroCrossingRate } from './basicFeatures';

function classified(key:string,label:string,status:StudioAudioFeature['status'],explanation:string,warnings:string[]=[]):StudioAudioFeature{
  return {key,label,value:null,unit:null,status,source:STUDIO_AUDIO_ENGINE_NAME,confidence:0,formulaVersion:STUDIO_AUDIO_ENGINE_VERSION,explanation,warnings};
}
function observed(key:string,label:string,value:number|string,unit:string|null,explanation:string,confidence:number,payload?:Record<string,unknown>):StudioAudioFeature{
  return {key,label,value,unit,status:'OBSERVED',source:STUDIO_AUDIO_ENGINE_NAME,confidence,formulaVersion:STUDIO_AUDIO_ENGINE_VERSION,explanation,warnings:[],...(payload?{payload}:{})};
}
function derived(key:string,label:string,value:number|string,unit:string|null,explanation:string,confidence:number,payload?:Record<string,unknown>):StudioAudioFeature{
  return {key,label,value,unit,status:'DERIVED',source:STUDIO_AUDIO_ENGINE_NAME,confidence,formulaVersion:STUDIO_AUDIO_ENGINE_VERSION,explanation,warnings:[],...(payload?{payload}:{})};
}

function voiceActivity(decoded:StudioDecodedAudio){
  const mono=mixdownToMono(decoded);const frame=Math.max(256,Math.floor(decoded.sampleRate*.03));const hop=frame;
  const energies:number[]=[];const zcrs:number[]=[];
  for(let start=0;start+frame<=mono.length;start+=hop){const window=mono.subarray(start,start+frame);energies.push(rms(window));zcrs.push(zeroCrossingRate(window));}
  if(!energies.length)return {ratio:0,activeFrames:0,totalFrames:0,threshold:0};
  const sorted=[...energies].sort((a,b)=>a-b);const noise=sorted[Math.floor(sorted.length*.2)]??0;const median=sorted[Math.floor(sorted.length*.5)]??0;
  const threshold=Math.max(noise*2.4,median*.35,1e-4);let active=0;
  for(let i=0;i<energies.length;i++){const speechLike=energies[i]>=threshold&&zcrs[i]>=.015&&zcrs[i]<=.35;if(speechLike)active++;}
  return {ratio:active/energies.length,activeFrames:active,totalFrames:energies.length,threshold};
}
function hashedEmbedding(text:string,size=64){
  const vector=Array.from({length:size},()=>0);const words=text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9áéíóúüñ\s]/gi,' ').split(/\s+/).filter(Boolean);
  for(const word of words){let h=2166136261;for(let i=0;i<word.length;i++){h^=word.charCodeAt(i);h=Math.imul(h,16777619)}const index=Math.abs(h)%size;vector[index]+=1;}
  const norm=Math.sqrt(vector.reduce((sum,v)=>sum+v*v,0))||1;return vector.map(v=>v/norm);
}
function mimeFromExtension(extension:string){
  const map:Record<string,string>={wav:'audio/wav',mp3:'audio/mpeg',m4a:'audio/mp4',mp4:'audio/mp4',mpeg:'audio/mpeg',mpga:'audio/mpeg',ogg:'audio/ogg',webm:'audio/webm',flac:'audio/flac'};
  return map[extension]??'application/octet-stream';
}

type GroqTranscript={text?:string;language?:string;segments?:Array<{id?:number;start?:number;end?:number;text?:string}>;x_groq?:{id?:string}};

async function transcribeWithGroq(bytes:Buffer,extension:string):Promise<{ok:true;data:GroqTranscript}|{ok:false;reason:string}>{
  const key=process.env.GROQ_API_KEY?.trim();if(!key)return {ok:false,reason:'GROQ_API_KEY_MISSING'};
  const maxBytes=100*1024*1024;if(bytes.byteLength>maxBytes)return {ok:false,reason:'GROQ_TRANSCRIPTION_FILE_OVER_100MB'};
  const form=new FormData();
  form.set('file',new Blob([bytes],{type:mimeFromExtension(extension)}),`studio-audio.${extension||'wav'}`);
  form.set('model',process.env.GROQ_TRANSCRIPTION_MODEL?.trim()||'whisper-large-v3-turbo');
  form.set('response_format','verbose_json');
  form.append('timestamp_granularities[]','segment');
  form.set('temperature','0');
  const response=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,cache:'no-store',signal:AbortSignal.timeout(120_000)}).catch(error=>null);
  if(!response)return {ok:false,reason:'GROQ_TRANSCRIPTION_NETWORK_FAILED'};
  if(!response.ok){const body=await response.text().catch(()=>String(response.status));return {ok:false,reason:`GROQ_TRANSCRIPTION_${response.status}:${body.slice(0,300)}`};}
  const data=await response.json().catch(()=>null) as GroqTranscript|null;if(!data?.text?.trim())return {ok:false,reason:'GROQ_TRANSCRIPTION_EMPTY'};
  return {ok:true,data};
}

export async function extractVoiceSemanticFeatures(input:{decoded:StudioDecodedAudio;sourceBytes:Buffer;sourceExtension:string;operatorText?:string|null}):Promise<StudioAudioFeature[]>{
  const vad=voiceActivity(input.decoded);
  const features:StudioAudioFeature[]=[observed('voice_activity','Voice Activity',vad.ratio,null,'Ratio of 30 ms PCM frames meeting bounded energy and zero-crossing speech-activity gates.',.68,{activeFrames:vad.activeFrames,totalFrames:vad.totalFrames,energyThreshold:vad.threshold,method:'bounded_energy_zcr_vad'})];
  const declared=input.operatorText?.trim();
  if(vad.ratio<.015&&!declared){
    return [...features,
      classified('transcript','Transcript','NOT_APPLICABLE','No sufficient speech activity was detected and no operator-declared text was supplied.',['INSTRUMENTAL_OR_NO_SPEECH_SIGNAL']),
      classified('language','Language','NOT_APPLICABLE','Language is not assigned without transcript evidence.',['TRANSCRIPT_REQUIRED']),
      classified('lyric_segments','Lyric / Speech Segments','NOT_APPLICABLE','Segments are not manufactured for instrumental/no-speech material.',['TRANSCRIPT_REQUIRED']),
      classified('semantic_embeddings','Semantic Embedding','NOT_APPLICABLE','No textual material exists to embed.',['TEXT_REQUIRED']),
    ];
  }
  let transcript=declared||'';let language='und';let segments:Array<{start:number|null;end:number|null;text:string}>=[];let source='OPERATOR_DECLARED_TEXT';let transcriptConfidence=.72;let warning:string|null=null;
  if(!transcript&&vad.ratio>=.015){
    const remote=await transcribeWithGroq(input.sourceBytes,input.sourceExtension);
    if(remote.ok){transcript=remote.data.text?.trim()||'';language=remote.data.language?.trim()||'und';segments=(remote.data.segments??[]).map(s=>({start:Number.isFinite(s.start)?Number(s.start):null,end:Number.isFinite(s.end)?Number(s.end):null,text:String(s.text??'').trim()})).filter(s=>s.text);source='GROQ_WHISPER_TRANSCRIPTION';transcriptConfidence=.8;}
    else warning=remote.reason;
  }
  if(!transcript){
    return [...features,
      classified('transcript','Transcript','DEGRADED','Speech-like activity was detected, but a real transcription engine did not return text.',warning?[warning]:['TRANSCRIPTION_UNAVAILABLE']),
      classified('language','Language','MISSING','Language cannot be inferred without transcript evidence.',['TRANSCRIPT_REQUIRED']),
      classified('lyric_segments','Lyric / Speech Segments','MISSING','Segments require a transcript or declared lyrics.',['TRANSCRIPT_REQUIRED']),
      classified('semantic_embeddings','Semantic Embedding','MISSING','Semantic vector requires transcript evidence.',['TRANSCRIPT_REQUIRED']),
    ];
  }
  if(declared){segments=[{start:null,end:null,text:transcript}];}
  const embedding=hashedEmbedding(transcript);
  features.push(
    observed('transcript','Transcript',transcript.slice(0,20000),null,source==='GROQ_WHISPER_TRANSCRIPTION'?'Speech-to-text transcript returned by the configured Groq Whisper endpoint.':'Text explicitly declared by the operator; it is not claimed as automatic transcription.',transcriptConfidence,{sourceKind:source,fullLength:transcript.length}),
    derived('language','Language',language,null,language==='und'?'Language remains unspecified for operator-declared text.':'Language label returned with the transcription.',language==='und'?.4:.76),
    derived('lyric_segments','Lyric / Speech Segments',segments.length,null,'Timestamped speech segments when supplied by transcription; operator text remains one untimed segment.',.74,{segments:segments.slice(0,500)}),
    derived('semantic_embeddings','Semantic Embedding',embedding.length,'dimensions','Local normalized hashed lexical embedding of transcript text. This is a deterministic retrieval vector, not a claim of semantic understanding.',.58,{vector:embedding,method:'hashed_bag_of_words_v1'}),
  );
  return features;
}
