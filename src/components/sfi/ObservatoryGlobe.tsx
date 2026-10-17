'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

/* The globe is a real GPU-rendered sphere, not an animated flat PNG. OBSERVATORY_MAPS
   is a temporary ART texture only; geographic coordinates are derived mathematically.
   No location, evidence or World Vector record is synthesized by this renderer. */
const OBSERVATORY_GLOBE_TEXTURE='/assets/sfi/instruments/OBSERVATORY_MAPS.png';
type GlobePick={lat:number;lng:number;observationId?:string};
type GlobeSourcePin={id:string;lat:number;lng:number};
export function ObservatoryGlobe({onPick,pins}:{onPick:(location:GlobePick)=>void;pins:GlobeSourcePin[]}){
  const canvas=useRef<HTMLCanvasElement|null>(null);
  const pinsCanvas=useRef<HTMLCanvasElement|null>(null);
  const pinsRef=useRef(pins);pinsRef.current=pins;
  const yaw=useRef(-1.45),pitch=useRef(0),zoom=useRef(1);
  const pointer=useRef<{id:number;x:number;y:number;moved:boolean}|null>(null);
  const onPickRef=useRef(onPick);onPickRef.current=onPick;
  const[scale,setScale]=useState(1),[paused,setPaused]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const isPaused=useRef(false);
  const adjustZoom=useCallback((change:number)=>{
    zoom.current=Math.max(.78,Math.min(1.65,zoom.current+change));
    setScale(zoom.current);
  },[]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    const overlay=pinsCanvas.current;const ink=overlay?.getContext('2d')??null;
    const gl=el.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
    if(!gl){setFailed(true);return;}
    let stopped=false,frame=0,last=0,textureReady=false,visible=true;
    const observer=new IntersectionObserver(([entry])=>{visible=Boolean(entry?.isIntersecting);},{threshold:0.02});
    observer.observe(el);
    const vs=gl.createShader(gl.VERTEX_SHADER)!,fs=gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(vs,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
    gl.shaderSource(fs,String.raw`
precision highp float;
uniform vec2 res;uniform sampler2D map;uniform float yaw;uniform float tilt;uniform float size;
const float PI=3.141592653589793;
void main(){
  vec2 p=(gl_FragCoord.xy/res-.5)*2.0;
  float rad=length(p)/size;
  if(rad>1.01){discard;}
  float r=min(rad,.9999);
  vec3 n=normalize(vec3(p/size,sqrt(max(.0001,1.0-r*r))));
  float cp=cos(tilt),sp=sin(tilt);
  vec3 q=vec3(n.x,n.y*cp+n.z*sp,-n.y*sp+n.z*cp);
  float cy=cos(yaw),sy=sin(yaw);
  q=vec3(q.x*cy+q.z*sy,q.y,-q.x*sy+q.z*cy);
  vec2 uv=vec2(fract(.5+atan(q.x,q.z)/(2.0*PI)),clamp(.5-asin(clamp(q.y,-1.,1.))/PI,.003,.997));
  vec3 earth=texture2D(map,uv).rgb;
  vec3 cold=vec3(.018,.057,.085);
  vec3 color=mix(cold,earth,.72);
  float rim=pow(1.0-max(.0,n.z),3.5);
  float light=.58+.38*max(0.,dot(n,normalize(vec3(-.45,.5,.85))));
  color=color*light+vec3(.45,.67,.78)*rim*.78;
  color+=vec3(.23,.18,.08)*pow(max(0.,dot(n,normalize(vec3(.3,-.25,.92)))),10.)*.16;
  float alpha=(1.0-smoothstep(.978,1.01,rad))*.93;
  gl_FragColor=vec4(color,alpha);
}`);
    for(const shader of [vs,fs]){gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){setFailed(true);gl.deleteShader(vs);gl.deleteShader(fs);return;}}
    const program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){setFailed(true);return;}
    gl.useProgram(program);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    // NPOT media textures are legal in WebGL1 only with CLAMP_TO_EDGE.
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([15,32,45,255]));
    const img=new Image();
    img.onload=()=>{if(stopped)return;gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);textureReady=true;setReady(true)};
    img.onerror=()=>{if(!stopped)setFailed(true)};
    img.src=OBSERVATORY_GLOBE_TEXTURE;
    const uniform=(name:string)=>gl.getUniformLocation(program,name);
    const resolution=uniform('res'),heading=uniform('yaw'),tilt=uniform('tilt'),size=uniform('size'),map=uniform('map');
    const render=(now:number)=>{
      if(stopped)return;
      frame=requestAnimationFrame(render);
      if(!visible||document.hidden||now-last<33)return;
      const dt=Math.min((now-last)/1000,.1);last=now;
      if(textureReady&&!isPaused.current)yaw.current=(yaw.current+dt*.022)%(Math.PI*2);
      const pixels=Math.min(960,Math.max(256,Math.floor(el.clientWidth*Math.min(devicePixelRatio||1,1.6))));
      if(el.width!==pixels||el.height!==pixels){el.width=pixels;el.height=pixels;}
      gl.viewport(0,0,pixels,pixels);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(resolution,pixels,pixels);gl.uniform1f(heading,yaw.current);gl.uniform1f(tilt,pitch.current);gl.uniform1f(size,.94);gl.uniform1i(map,0);
      gl.drawArrays(gl.TRIANGLES,0,6);
      if(ink&&overlay){
        if(overlay.width!==pixels||overlay.height!==pixels){overlay.width=pixels;overlay.height=pixels;}
        ink.clearRect(0,0,pixels,pixels);
        const cy=Math.cos(yaw.current),sy=Math.sin(yaw.current),cp=Math.cos(pitch.current),sp=Math.sin(pitch.current);
        for(const pin of pinsRef.current.slice(0,160)){
          if(!Number.isFinite(pin.lat)||!Number.isFinite(pin.lng))continue;
          const lat=pin.lat*Math.PI/180,lng=pin.lng*Math.PI/180;
          const qx=Math.cos(lat)*Math.sin(lng),qy=Math.sin(lat),qz=Math.cos(lat)*Math.cos(lng);
          const xx=qx*cy-qz*sy,zz=qx*sy+qz*cy;
          const yy=qy*cp-zz*sp,depth=qy*sp+zz*cp;
          if(depth<=0.03)continue;
          const x=pixels*(.5+.47*xx),y=pixels*(.5-.47*yy);
          ink.beginPath();ink.arc(x,y,3.2,0,Math.PI*2);
          ink.fillStyle='rgba(226,188,114,.9)';ink.fill();
          ink.beginPath();ink.arc(x,y,7,0,Math.PI*2);
          ink.strokeStyle='rgba(130,205,228,.54)';ink.lineWidth=1;ink.stroke();
        }
      }
    };
    frame=requestAnimationFrame(render);
    return()=>{stopped=true;observer.disconnect();cancelAnimationFrame(frame);img.onload=null;img.onerror=null;gl.deleteTexture(tex);gl.deleteBuffer(buf);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs)};
  },[]);
  const endPointer=(e:PointerEvent<HTMLCanvasElement>)=>{
    const p=pointer.current;if(!p||p.id!==e.pointerId)return;
    pointer.current=null;
    if(p.moved)return;
    const rect=e.currentTarget.getBoundingClientRect();
    const x=(e.clientX-rect.left-rect.width/2)/(rect.width/2)/.94;
    const y=(rect.height/2-(e.clientY-rect.top))/(rect.height/2)/.94;
    if(x*x+y*y>=1)return;
    const z=Math.sqrt(1-x*x-y*y);
    const cp=Math.cos(pitch.current),sp=Math.sin(pitch.current);
    const qy=y*cp+z*sp,qz=-y*sp+z*cp;
    const cy=Math.cos(yaw.current),sy=Math.sin(yaw.current);
    const xx=x*cy+qz*sy,zz=-x*sy+qz*cy;
    const lng=((Math.atan2(xx,zz)*180/Math.PI+540)%360)-180;
    const lat=Math.asin(Math.max(-1,Math.min(1,qy)))*180/Math.PI;
    const closest=pinsRef.current.reduce<{id:string;distance:number}|null>((best,pin)=>{
      if(!Number.isFinite(pin.lat)||!Number.isFinite(pin.lng))return best;
      const angle=Math.acos(Math.max(-1,Math.min(1,Math.sin(pin.lat*Math.PI/180)*Math.sin(lat*Math.PI/180)+Math.cos(pin.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.cos((pin.lng-lng)*Math.PI/180))));
      return !best||angle<best.distance?{id:pin.id,distance:angle}:best;
    },null);
    onPickRef.current({lat,lng,observationId:closest&&closest.distance<.11?closest.id:undefined});
  };
  return <div className="obsGlobeInstrument" style={{'--globe-scale':scale} as CSSProperties}>
    <div className="obsGlobeCage" aria-hidden="true"><i/><i/><i/><i/></div>
    {failed?<img className="obsGlobeFallback" src={OBSERVATORY_GLOBE_TEXTURE} alt="Illustrative world map; 3D unavailable"/>:
      <canvas ref={canvas} className={ready?'obsGlobeCanvas is-ready':'obsGlobeCanvas'} role="img" aria-label="Interactive rotating holographic Earth. Drag to rotate, scroll to zoom, click to inspect geographical coordinates."
        onPointerDown={e=>{pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};e.currentTarget.setPointerCapture(e.pointerId)}}
        onPointerMove={e=>{const p=pointer.current;if(!p||p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)+Math.abs(dy)>2)p.moved=true;if(p.moved){yaw.current-=dx*.006;pitch.current=Math.max(-.9,Math.min(.9,pitch.current+dy*.004));p.x=e.clientX;p.y=e.clientY}}}
        onPointerUp={endPointer} onPointerCancel={()=>{pointer.current=null}}
        onWheel={e=>{adjustZoom(e.deltaY<0?.08:-.08)}}/>}
    <canvas ref={pinsCanvas} className="obsGlobeSourcePins" aria-hidden="true"/>
    {!ready&&!failed?<div className="obsGlobeLoading">MATERIALIZING EARTH · VISUAL TEXTURE</div>:null}
    <div className="obsGlobeControlRail">
      <button type="button" onClick={()=>adjustZoom(.12)} aria-label="Zoom toward Earth">+</button>
      <button type="button" onClick={()=>adjustZoom(-.12)} aria-label="Zoom away from Earth">−</button>
      <button type="button" onClick={()=>{isPaused.current=!isPaused.current;setPaused(isPaused.current)}} aria-label={paused?'Resume rotation':'Pause rotation'}>{paused?'▶':'Ⅱ'}</button>
      <span>×{scale.toFixed(2)}</span>
    </div>
    <span className="obsGlobeEpistemic">ILLUSTRATIVE ART TEXTURE · TRUE SPHERICAL ROTATION · NOT VERIFIED CARTOGRAPHY</span>
  </div>;
}

