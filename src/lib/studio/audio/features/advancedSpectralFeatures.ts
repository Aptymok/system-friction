import { mixdownToMono } from '../audioDecode';
import type { StudioAudioFeature, StudioDecodedAudio } from '../audioTypes';
import { feature, missingFeature } from './basicFeatures';

const FRAME_SIZE = 1024;
const MAX_FRAMES = 56;
const MEL_FILTERS = 26;
const MFCC_COUNT = 13;

function hzToMel(hz:number){return 2595*Math.log10(1+hz/700)}
function melToHz(mel:number){return 700*(Math.pow(10,mel/2595)-1)}
function window(index:number,size:number){return 0.5-0.5*Math.cos((2*Math.PI*index)/Math.max(1,size-1))}
function offsets(length:number){
  if(length<32)return [];
  if(length<=FRAME_SIZE)return [0];
  const available=Math.floor((length-FRAME_SIZE)/(FRAME_SIZE/2))+1;
  const count=Math.min(MAX_FRAMES,available);
  return Array.from({length:count},(_,i)=>Math.floor(i*(length-FRAME_SIZE)/Math.max(1,count-1)));
}
function spectrum(samples:Float32Array,start:number){
  const bins=FRAME_SIZE/2+1;const result=new Float64Array(bins);
  for(let k=0;k<bins;k++){
    let real=0,imag=0;
    for(let n=0;n<FRAME_SIZE;n++){
      const x=(samples[start+n]??0)*window(n,FRAME_SIZE);const a=(-2*Math.PI*k*n)/FRAME_SIZE;
      real+=x*Math.cos(a);imag+=x*Math.sin(a);
    }
    result[k]=Math.sqrt(real*real+imag*imag);
  }
  return result;
}
function melBank(magnitudes:Float64Array,sampleRate:number){
  const minMel=hzToMel(20);const maxMel=hzToMel(Math.min(sampleRate/2,20000));
  const points=Array.from({length:MEL_FILTERS+2},(_,i)=>melToHz(minMel+i*(maxMel-minMel)/(MEL_FILTERS+1)));
  const bins=points.map(hz=>Math.max(0,Math.min(magnitudes.length-1,Math.floor((FRAME_SIZE+1)*hz/sampleRate))));
  const energies:number[]=[];
  for(let m=1;m<=MEL_FILTERS;m++){
    let sum=0;const left=bins[m-1],center=bins[m],right=bins[m+1];
    for(let k=left;k<center;k++)sum+=magnitudes[k]*Math.max(0,(k-left)/Math.max(1,center-left));
    for(let k=center;k<=right;k++)sum+=magnitudes[k]*Math.max(0,(right-k)/Math.max(1,right-center));
    energies.push(Math.log(Math.max(1e-12,sum*sum)));
  }
  return energies;
}
function dct(values:number[]){
  return Array.from({length:MFCC_COUNT},(_,c)=>values.reduce((sum,value,n)=>sum+value*Math.cos(Math.PI*c*(n+0.5)/values.length),0));
}
function quantile(values:number[],q:number){if(!values.length)return 0;const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.max(0,Math.floor(q*(s.length-1))))]}

export function extractAdvancedSpectralFeatures(decoded:StudioDecodedAudio):StudioAudioFeature[]{
  const mono=mixdownToMono(decoded);const starts=offsets(mono.length);
  if(!starts.length)return [missingFeature('mfcc','MFCC','No decoded samples were available for advanced spectral analysis.',['AUDIO_SAMPLES_REQUIRED'])];
  const mfccFrames:number[][]=[];const flatness:number[]=[];const contrast:number[]=[];const brightness:number[]=[];const harmonicity:number[]=[];const roughness:number[]=[];
  const spectra:Float64Array[]=[];
  for(const start of starts){
    const mag=spectrum(mono,start);spectra.push(mag);mfccFrames.push(dct(melBank(mag,decoded.sampleRate)));
    const nonzero=Array.from(mag.slice(1)).map(v=>Math.max(1e-12,v));
    const arithmetic=nonzero.reduce((a,b)=>a+b,0)/Math.max(1,nonzero.length);
    const geometric=Math.exp(nonzero.reduce((a,b)=>a+Math.log(b),0)/Math.max(1,nonzero.length));
    flatness.push(arithmetic>0?geometric/arithmetic:0);
    const db=nonzero.map(v=>20*Math.log10(v));contrast.push(quantile(db,.9)-quantile(db,.1));
    let total=0,bright=0;for(let k=1;k<mag.length;k++){const e=mag[k]*mag[k];total+=e;if(k*decoded.sampleRate/FRAME_SIZE>=1500)bright+=e}brightness.push(total>0?bright/total:0);
    let peakEnergy=0;for(let k=2;k<mag.length-2;k++){if(mag[k]>mag[k-1]&&mag[k]>=mag[k+1])peakEnergy+=mag[k]*mag[k]}
    harmonicity.push(total>0?Math.min(1,peakEnergy/total):0);
    let rough=0,weight=0;for(let k=2;k<mag.length-2;k++){const a=mag[k];if(a<=mag[k-1]||a<mag[k+1])continue;for(let j=k+1;j<Math.min(mag.length,k+24);j++){const b=mag[j];if(b<=mag[j-1]||b<mag[Math.min(mag.length-1,j+1)])continue;const f1=k*decoded.sampleRate/FRAME_SIZE,f2=j*decoded.sampleRate/FRAME_SIZE;const minF=Math.max(20,Math.min(f1,f2));const critical=1.72*Math.pow(minF,.65);const x=Math.abs(f2-f1)/Math.max(1,critical);const pair=a*b*(Math.exp(-3.5*x)-Math.exp(-5.75*x));rough+=Math.max(0,pair);weight+=a*b}}
    roughness.push(weight>0?rough/weight:0);
  }
  const mean=(values:number[])=>values.reduce((a,b)=>a+b,0)/Math.max(1,values.length);
  const mfccMean=Array.from({length:MFCC_COUNT},(_,i)=>mean(mfccFrames.map(frame=>frame[i]??0)));
  const hpRatio=mean(harmonicity);const percussiveRatio=Math.max(0,1-hpRatio);
  return [
    {...feature('mfcc','MFCC',mean(mfccMean.map(Math.abs)),null,'13-coefficient mel-frequency cepstral analysis over bounded PCM frames.',.82),payload:{coefficients:mfccMean,frameCount:mfccFrames.length,frameSize:FRAME_SIZE}},
    feature('spectral_contrast','Spectral Contrast',mean(contrast),'dB','Mean 90th–10th percentile spectral contrast over bounded frames.',.8),
    feature('spectral_flatness','Spectral Flatness',mean(flatness),null,'Geometric-to-arithmetic mean ratio of spectral magnitudes.',.84),
    {...feature('hpss','Harmonic / Percussive Separation',hpRatio,null,'Bounded peak-energy harmonicity estimate; percussive residual is retained explicitly and is not source separation.',.64),payload:{harmonicRatio:hpRatio,percussiveRatio,method:'spectral_peak_energy_ratio'}},
    feature('roughness','Spectral Roughness',mean(roughness),null,'Normalized pairwise spectral-peak beating estimate using critical-band distance.',.66),
    feature('brightness','Spectral Brightness',mean(brightness),null,'Fraction of spectral energy at or above 1500 Hz.',.82),
  ];
}
