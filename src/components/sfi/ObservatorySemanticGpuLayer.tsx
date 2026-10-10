'use client';

import { useEffect, useRef } from 'react';

type Position={x:number;y:number;geo:boolean};
type Row=Record<string,any>;
type Node={id:string;position:Position};
type Vector={id:string;label:string;value:number|null;sourceCount:number;trust:number|null};

type Props={
  lens:'field'|'sources'|'territories'|'hypotheses'|'trajectory'|'world-vector';
  nodes:readonly Node[];
  graphNodes:readonly Row[];
  selectedGraphEdges:readonly Row[];
  vectors:readonly Vector[];
};

const VIEW_W=1600;
const VIEW_H=900;
const CX=800;
const CY=470;

function text(value:unknown){return typeof value==='string'?value:''}
function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i+=1){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h>>>0)}
function orbital(id:string,kind:string):Position{
  const seed=hash(id);
  const angle=((seed%360)*Math.PI)/180;
  const inner=kind==='HYPOTHESIS';
  const rx=inner?230:455;
  const ry=inner?145:278;
  return{x:CX+Math.cos(angle)*rx,y:CY+Math.sin(angle)*ry,geo:false};
}
function edgeColor(edge:Row){
  const kind=text(edge.epistemicClass).toUpperCase();
  if(kind==='LINEAGE')return 0x5bd5ff;
  if(kind==='INFERRED')return 0xe56f5c;
  return 0xd7ae69;
}

export function ObservatorySemanticGpuLayer({lens,nodes,graphNodes,selectedGraphEdges,vectors}:Props){
  const hostRef=useRef<HTMLDivElement|null>(null);
  const canvasRef=useRef<HTMLCanvasElement|null>(null);

  useEffect(()=>{
    const host=hostRef.current;
    const canvas=canvasRef.current;
    if(!host||!canvas)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    // Touch screens and reduced-motion clients use the complete SVG/DOM field.
    // Avoid WebGL allocation and a permanent animation ticker during mobile startup.
    const touchClient=window.matchMedia('(pointer: coarse)').matches;
    const modestViewport=window.innerWidth<1100;
    const deviceMemory=(navigator as Navigator & {deviceMemory?:number}).deviceMemory;
    if(reduced.matches||touchClient||modestViewport||(typeof deviceMemory==='number'&&deviceMemory<8))return;

    let disposed=false;
    let app:any=null;

    void(async()=>{
      try{
        const pixi:any=await import('pixi.js');
        if(disposed)return;

        app=new pixi.Application();
        await app.init({
          canvas,
          resizeTo:host,
          backgroundAlpha:0,
          antialias:true,
          autoDensity:true,
          resolution:Math.min(window.devicePixelRatio||1,1.5),
        });
        if(disposed){app.destroy(false,{children:true});return}

        const graphics=new pixi.Graphics();
        app.stage.addChild(graphics);

        const positions=new Map<string,Position>(nodes.map((node)=>[node.id,node.position]));
        for(const graphNode of graphNodes){
          const id=text(graphNode.id);
          if(!id||positions.has(id))continue;
          const kind=text(graphNode.kind).toUpperCase();
          if(kind==='SYSTEM'||kind==='HYPOTHESIS')positions.set(id,orbital(id,kind));
        }

        const maxEdges=window.innerWidth<760?18:36;
        const edges=selectedGraphEdges.filter((edge)=>positions.has(text(edge.from))&&positions.has(text(edge.to))).slice(0,maxEdges);
        const activeVectors=(lens==='field'||lens==='trajectory'||lens==='world-vector')
          ? vectors.filter((vector)=>typeof vector.value==='number'&&Number.isFinite(vector.value)).slice(0,10)
          : [];

        const draw=()=>{
          graphics.clear();
          const sx=app.screen.width/VIEW_W;
          const sy=app.screen.height/VIEW_H;
          const now=performance.now();

          for(let index=0;index<activeVectors.length;index+=1){
            const vector=activeVectors[index];
            const value=Math.max(0,Math.min(1,Number(vector.value)));
            const trust=vector.trust==null?.35:Math.max(.18,Math.min(1,vector.trust));
            const angle=(-90+(index*(360/Math.max(1,activeVectors.length))))*Math.PI/180;
            const base=345;
            const length=40+(value*90);
            const x=(CX+Math.cos(angle)*(base+length))*sx;
            const y=(CY+Math.sin(angle)*((base+length)*.61))*sy;
            const pulse=.5+(.5*Math.sin((now/780)+(index*.72)));
            const radius=(7+(value*17)+(pulse*7))*Math.min(sx,sy);
            graphics.circle(x,y,radius).stroke({width:1,color:0xd5aa68,alpha:.08+(trust*.16)});
            graphics.circle(x,y,Math.max(2,3.5*Math.min(sx,sy))).fill({color:0xe0b472,alpha:.16+(trust*.34)});
          }

          for(let index=0;index<edges.length;index+=1){
            const edge=edges[index];
            const from=positions.get(text(edge.from));
            const to=positions.get(text(edge.to));
            if(!from||!to)continue;
            const offset=(hash(text(edge.id)||text(edge.from)+'>'+text(edge.to))%1000)/1000;
            const t=((now/2600)+offset)%1;
            const x=(from.x+((to.x-from.x)*t))*sx;
            const y=(from.y+((to.y-from.y)*t))*sy;
            const color=edgeColor(edge);
            graphics.circle(x,y,2.8*Math.min(sx,sy)).fill({color,alpha:.72});
            graphics.circle(x,y,8*Math.min(sx,sy)).stroke({width:1,color,alpha:.18});
          }
        };

        // GPU is a bounded decorative snapshot; the canonical SVG/DOM field is interactive.
        // Do not keep a perpetual Pixi render loop that competes with input and scrolling.
        app.ticker.stop();
        draw();
      }catch{
        // GPU enhancement is optional. SVG/DOM remains the complete canonical interaction surface.
      }
    })();

    return()=>{
      disposed=true;
      if(app){
        try{app.destroy(false,{children:true})}catch{}
      }
    };
  },[lens,nodes,graphNodes,selectedGraphEdges,vectors]);

  return <div
    ref={hostRef}
    className="semanticGpuLayer"
    aria-hidden="true"
    data-render-contract="GPU_OPTIONAL_SVG_CANONICAL"
    data-epistemic-boundary="GPU ENHANCEMENT ≠ EVIDENCE"
  >
    <canvas ref={canvasRef}/>
    <span>SVG/DOM REMAINS CANONICAL INTERACTION SURFACE</span>
  </div>;
}
