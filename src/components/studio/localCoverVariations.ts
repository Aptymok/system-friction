/** Six independent 3000px procedural art directions for a Studio release.
 * Pure local Canvas rendering; no original media upload, server state or paid image API.
 * These are design proposals, not AI-generated photographs or measured audience results.
 */
import type { ReleaseDirection, ReleaseMetrics } from './localReleaseMaterials';

export const STUDIO_COVER_VARIANTS = [
  { id: 'orbital', label: 'Orbital / escultórica', description: 'Órbitas desplazadas, trazo espacial y tipografía limpia' },
  { id: 'editorial', label: 'Editorial / tipográfica', description: 'Retícula editorial, letras monumentales y blancos amplios' },
  { id: 'topographic', label: 'Topográfica / cartográfica', description: 'Relieve de líneas, densidad y anotaciones visuales' },
  { id: 'signal', label: 'Señal / interferencia', description: 'Barras de modulación, dislocación cromática y código visual' },
  { id: 'monolith', label: 'Monolito / minimal', description: 'Volumen geométrico, sombra y tensión de escala' },
  { id: 'constellation', label: 'Constelación / archivo', description: 'Puntos conectados, azar reproducible y mapa de relaciones' },
] as const;
export type StudioCoverVariantId = typeof STUDIO_COVER_VARIANTS[number]['id'];
export type StudioCoverMetrics = ReleaseMetrics;

export function studioCoverVariantFilename(id: StudioCoverVariantId) {
  return 'cover-' + id + '-3000.png';
}
export function studioCoverVariantMetadata() {
  return STUDIO_COVER_VARIANTS.map(({id,label,description})=>({id,label,description,width:3000,height:3000}));
}
function hash(input:string){
  let value=2166136261>>>0;
  for (let i=0;i<input.length;i++){value=Math.imul(value^input.charCodeAt(i),16777619)>>>0;}
  return value;
}
function random(seed:number){
  let state=seed||1;
  return () => {state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
}
function bounded(value:number,fallback:number,minimum:number,maximum:number){
  return Number.isFinite(value)?Math.min(maximum,Math.max(minimum,value)):fallback;
}
function writeTitle(ctx:CanvasRenderingContext2D,title:string,x:number,y:number,maxWidth:number,maxLines:number,fontSize:number,lineHeight:number,alignment:CanvasTextAlign='center'){
  ctx.textAlign=alignment;
  const words=title.toLocaleUpperCase().split(/\s+/).filter(Boolean);
  const lines:string[]=[];
  let current='';
  for(const word of words){
    const test=current?current+' '+word:word;
    if(current && ctx.measureText(test).width>maxWidth){lines.push(current);current=word;}
    else current=test;
  }
  if(current)lines.push(current);
  // Shrink long titles instead of clipping the canvas or silently deleting words.
  if(lines.length>maxLines){
    const size=bounded(fontSize*maxLines/lines.length,55,44,fontSize);
    ctx.font='700 '+Math.floor(size)+'px sans-serif';
    return writeTitle(ctx,title,x,y,maxWidth,maxLines,size,lineHeight,alignment);
  }
  const top=y-(lines.length-1)*lineHeight/2;
  for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],x,top+i*lineHeight,maxWidth);
}
function palette(style:ReleaseDirection['palette']){
  if(style==='paper')return {background:'#e8e4d9',foreground:'#15252f',accent:'#bb6045',soft:'#a9a69a'};
  if(style==='signal')return {background:'#071a16',foreground:'#ecf6ee',accent:'#72dcad',soft:'#355e52'};
  return {background:'#0b1224',foreground:'#eff1f7',accent:'#9ed0e6',soft:'#425876'};
}
function complete(ctx:CanvasRenderingContext2D,artist:string,title:string,style:StudioCoverVariantId,
  colors:ReturnType<typeof palette>){
  ctx.globalAlpha=1;ctx.fillStyle=colors.foreground;
  ctx.font='500 50px sans-serif';
  ctx.textAlign='left';ctx.fillText(artist.toLocaleUpperCase(),155,165,2550);
  ctx.textAlign='right';ctx.font='30px monospace';
  ctx.fillText('SFI STUDIO  /  '+style.toUpperCase(),2830,166);
  ctx.textAlign='center';ctx.font='700 126px sans-serif';
  writeTitle(ctx,title,1500,2640,2690,4,126,142);
  ctx.font='26px monospace';ctx.fillText('VISUAL PROPOSAL · NOT PUBLISHED',1500,2900,2680);
}
export async function createStudioCoverVariant(
  direction:ReleaseDirection, metrics:StudioCoverMetrics, id:StudioCoverVariantId
):Promise<Blob>{
  if(!STUDIO_COVER_VARIANTS.some(item=>item.id===id))throw new Error('STUDIO_COVER_VARIANT_INVALID');
  const canvas=document.createElement('canvas');canvas.width=3000;canvas.height=3000;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('STUDIO_COVER_CANVAS_UNAVAILABLE');
  const colors=palette(direction.palette);
  const title=direction.title.trim().slice(0,100)||'UNTITLED';
  const artist=direction.artist.trim().slice(0,90)||'STUDIO';
  const rng=random(hash(title+'|'+artist+'|'+direction.concept+'|'+id));
  const tempo=bounded(metrics.tempoBpm??0,90,45,250);
  const motion=bounded(metrics.loudnessRangeLu??0,7,0,25);
  const density=bounded(tempo/90,1,0.4,2.5);
  const radius=520+motion*24;
  ctx.fillStyle=colors.background;ctx.fillRect(0,0,3000,3000);
  if(id==='orbital'){
    const g=ctx.createRadialGradient(1480,1260,40,1450,1270,1600);
    g.addColorStop(0,colors.soft);g.addColorStop(1,colors.background);
    ctx.fillStyle=g;ctx.fillRect(0,250,3000,2300);
    for(let i=0;i<52;i++){
      ctx.save();ctx.translate(1500+(rng()-.5)*200,1320+(rng()-.5)*200);
      ctx.rotate((i/52)*Math.PI*2+(rng()-.5)*.45);
      ctx.lineWidth=1.2+i%8;ctx.strokeStyle=i%4===0?colors.foreground:colors.accent;
      ctx.globalAlpha=.12+.48*(i/52);
      ctx.beginPath();ctx.ellipse(0,0,radius+i*8,radius*.27+i*3,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
  } else if(id==='editorial'){
    ctx.fillStyle=colors.accent;ctx.fillRect(140,320,50,1990);
    ctx.strokeStyle=colors.soft;ctx.lineWidth=2;
    for(let x=290;x<2860;x+=315){ctx.beginPath();ctx.moveTo(x,340);ctx.lineTo(x,2390);ctx.stroke();}
    for(let y=340;y<2400;y+=310){ctx.beginPath();ctx.moveTo(290,y);ctx.lineTo(2790,y);ctx.stroke();}
    ctx.fillStyle=colors.foreground;ctx.textAlign='left';
    ctx.font='900 1050px sans-serif';ctx.globalAlpha=.85;
    ctx.fillText(title.toLocaleUpperCase().replace(/\s/g,'').slice(0,1),260,1680,2250);
    ctx.globalAlpha=1;ctx.fillStyle=colors.accent;ctx.fillRect(2120,360,650,130);
    ctx.fillStyle=colors.background;ctx.font='bold 32px monospace';ctx.fillText('EDITION  /  01',2170,450);
    ctx.strokeStyle=colors.foreground;ctx.lineWidth=12;ctx.strokeRect(290,1850,2500,470);
  } else if(id==='topographic'){
    ctx.fillStyle=colors.soft;ctx.globalAlpha=.11;ctx.fillRect(0,230,3000,2250);
    for(let contour=0;contour<94;contour++){
      ctx.beginPath();ctx.globalAlpha=.13+.55*(contour/94);
      ctx.lineWidth=1.3+(contour%6===0?2:0);
      ctx.strokeStyle=contour%7===0?colors.accent:colors.foreground;
      const offset=contour*19;
      for(let p=0;p<=360;p++){
        const theta=p/360*Math.PI*2;
        const irregular=1+0.12*Math.sin(theta*5+contour*.11)+0.07*Math.cos(theta*11-contour*.13);
        const r=(120+offset)*irregular;
        const x=1500+r*Math.cos(theta);
        const y=1280+r*.67*Math.sin(theta);
        if(!p)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.closePath();ctx.stroke();
    }
    ctx.globalAlpha=1;ctx.fillStyle=colors.accent;ctx.font='35px monospace';
    ctx.fillText('RANGE / '+motion.toFixed(1),200,2250);
  } else if(id==='signal'){
    ctx.globalAlpha=1;const columns=108;
    for(let i=0;i<columns;i++){
      const amp=.2+.78*rng();
      const x=190+i*24;
      const a=240+amp*1770;
      ctx.fillStyle=i%9===0?colors.foreground:colors.accent;
      ctx.globalAlpha=.22+.45*rng();
      ctx.fillRect(x,1380-a/2,10+(i%4)*3,a);
      if(i%6===0){ctx.fillStyle=colors.background;ctx.fillRect(x,840+rng()*950,32,120+rng()*320);}
    }
    ctx.globalAlpha=1;ctx.strokeStyle=colors.foreground;ctx.lineWidth=7;
    ctx.beginPath();ctx.moveTo(180,1340);ctx.lineTo(2840,1340);ctx.stroke();
    ctx.fillStyle=colors.accent;ctx.font='bold 90px monospace';
    ctx.fillText('S I G N A L    /    '+tempo.toFixed(0),220,2220);
  } else if(id==='monolith'){
    const shadow=ctx.createLinearGradient(750,400,2450,2050);
    shadow.addColorStop(0,colors.foreground);shadow.addColorStop(.52,colors.soft);shadow.addColorStop(1,colors.background);
    ctx.fillStyle=shadow;
    ctx.beginPath();ctx.moveTo(1180,390);ctx.lineTo(2200,750);
    ctx.lineTo(2110,2100);ctx.lineTo(1080,2230);ctx.closePath();ctx.fill();
    ctx.strokeStyle=colors.accent;ctx.lineWidth=12;
    ctx.beginPath();ctx.moveTo(1180,390);ctx.lineTo(1080,2230);ctx.stroke();
    ctx.globalAlpha=.75;ctx.fillStyle=colors.background;
    ctx.beginPath();ctx.moveTo(1500,650);ctx.lineTo(1820,760);ctx.lineTo(1780,2010);ctx.lineTo(1460,2070);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;ctx.fillStyle=colors.accent;ctx.fillRect(155,2150,710,12);
  } else {
    const nodes=Array.from({length:90},()=>({
      x:300+rng()*2420,y:370+rng()*1760,size:2+rng()*12,
    }));
    ctx.strokeStyle=colors.accent;
    for(let i=0;i<nodes.length;i++){
      const node=nodes[i];
      const close=nodes.map((other,j)=>({other,j,dist:Math.hypot(node.x-other.x,node.y-other.y)}))
        .filter(item=>item.j!==i&&item.dist<470).sort((a,b)=>a.dist-b.dist).slice(0,3);
      for(const edge of close){
        ctx.globalAlpha=.12+.28*(1-edge.dist/470);ctx.lineWidth=1.3;
        ctx.beginPath();ctx.moveTo(node.x,node.y);ctx.lineTo(edge.other.x,edge.other.y);ctx.stroke();
      }
    }
    for(const node of nodes){
      ctx.globalAlpha=.35+.65*rng();ctx.fillStyle=rng()>.65?colors.accent:colors.foreground;
      ctx.beginPath();ctx.arc(node.x,node.y,node.size,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.globalAlpha=1;complete(ctx,artist,title,id,colors);
  return new Promise<Blob>((resolve,reject)=>{
    canvas.toBlob(blob=>blob&&blob.size>0?resolve(blob):reject(new Error('STUDIO_COVER_ENCODING_FAILED')),'image/png');
  });
}
export async function createAllStudioCoverVariants(direction:ReleaseDirection,metrics:ReleaseMetrics){
  const output: Array<{id:StudioCoverVariantId;label:string;blob:Blob}>=[];
  // Sequential renders bound memory use: one 3000x3000 canvas per variant.
  for(const definition of STUDIO_COVER_VARIANTS){
    const blob=await createStudioCoverVariant(direction,metrics,definition.id);
    output.push({id:definition.id,label:definition.label,blob});
  }
  return output;
}
