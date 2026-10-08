'use client';

import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text } from 'pixi.js';

type FieldNode={id:string;label:string;type:string;tone:string;shape:'circle'|'rounded'|'diamond'|'hex'|'triangle'|'ring'|'pill';x:number;y:number;radius:number;selected:boolean};
type FieldEdge={id:string;source:string;target:string;weight:number;selected:boolean};

export function RootCognitiveFieldPixi({nodes,edges,width,height,onSelect}:{nodes:FieldNode[];edges:FieldEdge[];width:number;height:number;onSelect:(id:string)=>void}) {
  const host=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    if(!host.current) return;
    let disposed=false;
    const app=new Application();
    const mount=host.current;
    void (async()=>{
      await app.init({width,height,antialias:true,backgroundAlpha:0,resolution:Math.min(window.devicePixelRatio||1,2),autoDensity:true});
      if(disposed){app.destroy(true);return;}
      mount.replaceChildren(app.canvas);
      app.canvas.style.width='100%'; app.canvas.style.height='100%'; app.canvas.style.display='block';

      const world=new Container();
      app.stage.addChild(world);
      const edgeLayer=new Graphics();
      const nodeLayer=new Container();
      world.addChild(edgeLayer,nodeLayer);

      const state=new Map(nodes.map(n=>[n.id,{...n,tx:n.x,ty:n.y,vx:0,vy:0}]));
      const glyphs=new Map<string,{g:Graphics;t:Text}>();
      for(const n of nodes){
        const g=new Graphics();
        const r=n.radius+(n.selected?4:0);
        // Human-scale target: visual density may stay high without forcing pixel-perfect clicking.
        g.circle(0,0,Math.max(18,r+10)).fill({color:0xffffff,alpha:.001});
        if(n.shape==='diamond') g.poly([0,-r,r,0,0,r,-r,0]).fill({color:n.tone,alpha:n.selected?.95:.82});
        else if(n.shape==='hex') g.poly([-r*.86,-r*.5,0,-r,r*.86,-r*.5,r*.86,r*.5,0,r,-r*.86,r*.5]).fill({color:n.tone,alpha:n.selected?.95:.82});
        else if(n.shape==='triangle') g.poly([0,-r,r,r,-r,r]).fill({color:n.tone,alpha:n.selected?.95:.82});
        else if(n.shape==='rounded') g.roundRect(-r,-r,r*2,r*2,Math.max(2,r*.32)).fill({color:n.tone,alpha:n.selected?.95:.82});
        else if(n.shape==='pill') g.roundRect(-r*1.45,-r*.72,r*2.9,r*1.44,r).fill({color:n.tone,alpha:n.selected?.95:.82});
        else if(n.shape==='ring') g.circle(0,0,r).stroke({color:n.tone,width:Math.max(2,r*.28),alpha:n.selected?.95:.82});
        else g.circle(0,0,r).fill({color:n.tone,alpha:n.selected?.95:.82});
        g.circle(0,0,r+8).stroke({color:n.tone,width:n.selected?1.4:.45,alpha:n.selected?.5:.14});
        g.eventMode='static'; g.cursor='pointer'; g.on('pointertap',()=>onSelect(n.id));
        const t=new Text({text:n.label,style:{fontFamily:'Helvetica,Arial,sans-serif',fontSize:10,fill:0xd8d4cc}});
        t.alpha=n.selected?1:.7; t.x=10; t.y=-8;
        const group=new Container(); group.addChild(g,t); nodeLayer.addChild(group);
        glyphs.set(n.id,{g:group as unknown as Graphics,t});
      }

      let zoom=1;
      let panX=0,panY=0;
      const applyCamera=()=>{world.scale.set(zoom);world.position.set(panX,panY);};
      applyCamera();
      const wheel=(ev:WheelEvent)=>{
        ev.preventDefault();
        const rect=app.canvas.getBoundingClientRect();
        const mx=(ev.clientX-rect.left)*(width/rect.width), my=(ev.clientY-rect.top)*(height/rect.height);
        const beforeX=(mx-panX)/zoom,beforeY=(my-panY)/zoom;
        zoom=Math.max(.42,Math.min(4.5,zoom*Math.exp(-ev.deltaY*.0012)));
        panX=mx-beforeX*zoom; panY=my-beforeY*zoom; applyCamera();
      };
      app.canvas.addEventListener('wheel',wheel,{passive:false});

      app.ticker.add(()=>{
        const byId=state;
        for(const e of edges){
          const a=byId.get(e.source),b=byId.get(e.target); if(!a||!b) continue;
          const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy));
          const desired=88+(1-Math.max(0,Math.min(1,e.weight||0)))*115;
          const force=(d-desired)*(.00055+.0011*Math.max(0,Math.min(1,e.weight||0)));
          a.vx+=dx/d*force;a.vy+=dy/d*force;b.vx-=dx/d*force;b.vy-=dy/d*force;
        }
        // Coarse collision/repulsion keeps dense canonical fields selectable without erasing density.
        const cellSize=34;
        const buckets=new Map<string,any[]>();
        for(const n of state.values()){
          const key=`${Math.floor(n.x/cellSize)}:${Math.floor(n.y/cellSize)}`;
          const bucket=buckets.get(key)??[];
          bucket.push(n as any);buckets.set(key,bucket as any);
        }
        for(const n of state.values()){
          const cx=Math.floor(n.x/cellSize),cy=Math.floor(n.y/cellSize);
          for(let gx=cx-1;gx<=cx+1;gx+=1)for(let gy=cy-1;gy<=cy+1;gy+=1){
            const bucket=buckets.get(`${gx}:${gy}`)??[];
            for(const other of bucket as any[]){
              if(other.id===n.id)continue;
              const dx=n.x-other.x,dy=n.y-other.y;
              const distance=Math.max(.001,Math.hypot(dx,dy));
              const minDistance=18+n.radius+other.radius;
              if(distance<minDistance){
                const push=(minDistance-distance)*.006;
                n.vx+=dx/distance*push;n.vy+=dy/distance*push;
              }
            }
          }
          n.vx+=(n.tx-n.x)*.006;n.vy+=(n.ty-n.y)*.006;
          n.vx*=.91;n.vy*=.91;
          n.x=Math.max(24,Math.min(width-24,n.x+n.vx));
          n.y=Math.max(24,Math.min(height-24,n.y+n.vy));
        }
        edgeLayer.clear();
        const detail=zoom>.72;
        for(const e of edges){
          const a=state.get(e.source),b=state.get(e.target); if(!a||!b) continue;
          edgeLayer.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:e.selected?0xd5b36f:0x77736c,width:(e.selected?1.3:.35+Math.max(0,e.weight)*.8)/zoom,alpha:detail?(e.selected?.65:.22):.09});
        }
        for(const n of state.values()){
          const item=glyphs.get(n.id);if(!item)continue;
          (item.g as any).position.set(n.x,n.y);
          item.t.visible=zoom>1.75||n.selected;
          item.t.scale.set(1/Math.max(1,zoom*.72));
        }
      });
      mount.dataset.semanticZoom='active';
    })();
    return()=>{disposed=true;try{app.destroy(true,{children:true});}catch{}};
  },[nodes,edges,width,height,onSelect]);
  return <div ref={host} className="rootCognitivePixi" aria-label="System Friction Institute cognitive field"/>;
}
