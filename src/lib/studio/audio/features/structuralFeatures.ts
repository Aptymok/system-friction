import type { EnergySegment, StudioAudioFeature } from '../audioTypes';
import { feature, missingFeature } from './basicFeatures';

function clamp01(value:number){return Math.max(0,Math.min(1,value))}
function normalize(values:number[]){const min=Math.min(...values),max=Math.max(...values),span=Math.max(1e-12,max-min);return values.map(v=>(v-min)/span)}
function cosine(a:number[],b:number[]){let dot=0,aa=0,bb=0;for(let i=0;i<Math.min(a.length,b.length);i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return aa>0&&bb>0?clamp01(dot/Math.sqrt(aa*bb)):0}

export function extractStructuralFeatures(segments:EnergySegment[]):StudioAudioFeature[]{
  if(segments.length<4)return [missingFeature('novelty_curve','Novelty / Repetition','At least four time-aligned spectral-energy segments are required.',['INSUFFICIENT_TIME_ALIGNED_FEATURES'])];
  const rmsN=normalize(segments.map(s=>s.rms));
  const peakN=normalize(segments.map(s=>s.peak));
  const centroidN=normalize(segments.map(s=>s.centroidHz??0));
  const vectors=segments.map((_,i)=>[rmsN[i],peakN[i],centroidN[i]]);
  const matrix=vectors.map(a=>vectors.map(b=>cosine(a,b)));
  const novelty=vectors.map((vector,i)=>i===0?0:clamp01(1-cosine(vector,vectors[i-1])));
  let recurrenceSum=0,recurrenceCount=0;
  for(let i=0;i<matrix.length;i++)for(let j=i+2;j<matrix.length;j++){recurrenceSum+=matrix[i][j];recurrenceCount++}
  const repetition=recurrenceCount?recurrenceSum/recurrenceCount:0;
  const symmetry=matrix.reduce((sum,row,i)=>sum+(row[matrix.length-1-i]??0),0)/matrix.length;
  const score=segments.map((s,i)=>.7*rmsN[i]+.2*peakN[i]+.1*centroidN[i]);
  const climaxIndex=score.reduce((best,value,i)=>value>(score[best]??-Infinity)?i:best,0);
  const climax=segments[climaxIndex];
  const noveltyMean=novelty.reduce((a,b)=>a+b,0)/novelty.length;
  return [
    {...feature('novelty_curve','Novelty Curve',noveltyMean,null,'Frame-to-frame novelty from cosine distance over normalized RMS, peak and spectral-centroid vectors.',.72),payload:{values:novelty,timesSeconds:segments.map(s=>s.startSeconds),featureVector:['rms','peak','spectral_centroid']}},
    {...feature('self_similarity_matrix','Self Similarity Matrix',repetition,null,'Pairwise cosine self-similarity over time-aligned bounded audio feature vectors.',.72),payload:{matrix,size:matrix.length,featureVector:['rms','peak','spectral_centroid']}},
    feature('repetition_score','Repetition Score',repetition,null,'Mean non-adjacent self-similarity; higher values indicate repeated structural states, not semantic repetition.',.7),
    feature('formal_symmetry','Formal Symmetry',symmetry,null,'Mean similarity between mirrored positions in the bounded structural feature sequence.',.66),
    {...feature('climax_estimate','Climax Estimate',climax.startSeconds,'s','Location of the maximum bounded energy/peak/brightness proxy. It is a structural estimate, not a perceptual label.',.62),payload:{segmentIndex:climaxIndex,endSeconds:climax.endSeconds,score:score[climaxIndex]}},
  ];
}
