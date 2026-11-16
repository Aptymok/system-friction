/** Confidential browser-only photographic cover production.
 * Input must be an actual JPEG/PNG/WebP photograph. It is decoded locally,
 * composited with professional typography and exported as derived 3000px PNG.
 * No remote service, synthetic geometry or original file persistence.
 */
import type { ReleaseDirection } from './localReleaseMaterials';

export type StudioPhotographicCover = {
  id: string;
  sourceName: string;
  filename: string;
  blob: Blob;
  width: 3000;
  height: 3000;
  provenance: 'USER_PROVIDED_PHOTOGRAPH_LOCAL_DERIVATIVE';
};
const MIME=new Set(['image/jpeg','image/png','image/webp']);
const maximum=20*1024*1024;
const dimension=3000;
const safe=(input:string)=>input.normalize('NFKD').replace(/[^a-zA-Z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,75)||'studio-photo';
export function checkStudioPhotographs(files:File[]):void{
  if(!files.length||files.length>6)throw new Error('Selecciona entre una y seis fotografías.');
  const names=new Set<string>();
  for(const file of files){
    if(!MIME.has(file.type)||file.size===0||file.size>maximum){
      throw new Error('Cada imagen debe ser JPEG, PNG o WebP de hasta 20 MB.');
    }
    // Reject accidental exact re-selection of the same browser File.
    const identity=[file.name,file.size,file.lastModified].join('|');
    if(names.has(identity))throw new Error('La misma fotografía fue seleccionada más de una vez.');
    names.add(identity);
  }
}
function wrapTitle(ctx:CanvasRenderingContext2D,title:string,maxWidth:number,maxLines:number){
  const tokens=title.trim().toLocaleUpperCase().split(/\s+/);
  let size=154;
  for(let step=0;step<15;step++){
    ctx.font='700 '+size+'px sans-serif';
    const lines:string[]=[];
    let line='';
    for(const token of tokens){
      const text=line?line+' '+token:token;
      if(line&&ctx.measureText(text).width>maxWidth){lines.push(line);line=token;}
      else line=text;
    }
    if(line)lines.push(line);
    if(lines.length<=maxLines)return {lines,size};
    size=Math.max(43,Math.floor(size*.82));
  }
  return {lines:[title.toLocaleUpperCase()],size:43};
}
async function decode(file:File):Promise<ImageBitmap>{
  try{
    const image=await createImageBitmap(file,{imageOrientation:'from-image'});
    if(image.width<256||image.height<256) {
      image.close();throw new Error('La fotografía tiene resolución insuficiente para portada.');
    }
    return image;
  }catch(error){
    if(error instanceof Error&&error.message.includes('resolución insuficiente'))throw error;
    throw new Error('No se pudo leer una fotografía válida: '+file.name);
  }
}
export async function createPhotographicCovers(files:File[],direction:ReleaseDirection):Promise<StudioPhotographicCover[]>{
  checkStudioPhotographs(files);
  if(!direction.title.trim()||!direction.artist.trim())throw new Error('Faltan título o artista.');
  const output:StudioPhotographicCover[]=[];
  for(const [index,file] of files.entries()){
    const image=await decode(file);
    try{
      const canvas=document.createElement('canvas');
      canvas.width=dimension;canvas.height=dimension;
      const ctx=canvas.getContext('2d');
      if(!ctx)throw new Error('CANVAS_NOT_AVAILABLE');
      // Center crop: no stretching or fabricated pixels.
      const ratio=Math.max(dimension/image.width,dimension/image.height);
      const drawW=image.width*ratio,drawH=image.height*ratio;
      ctx.drawImage(image,(dimension-drawW)/2,(dimension-drawH)/2,drawW,drawH);
      const shadows=ctx.createLinearGradient(0,1400,0,dimension);
      shadows.addColorStop(0,'rgba(0,0,0,0)');
      shadows.addColorStop(.42,'rgba(0,0,0,.27)');
      shadows.addColorStop(1,'rgba(0,0,0,.78)');
      ctx.fillStyle=shadows;ctx.fillRect(0,0,dimension,dimension);
      // No geometric substitute: each output retains a distinct source photograph.
      ctx.fillStyle='#fff';ctx.textBaseline='alphabetic';
      ctx.textAlign='left';ctx.font='500 50px sans-serif';
      ctx.fillText(direction.artist.trim().toLocaleUpperCase().slice(0,90),185,240,2630);
      const typography=wrapTitle(ctx,direction.title.trim(),2600,4);
      ctx.font='700 '+typography.size+'px sans-serif';
      const lineHeight=typography.size*1.2;
      const baseline=2585-(typography.lines.length-1)*lineHeight;
      for(const [lineNo,line] of typography.lines.entries()){
        ctx.fillText(line,175,baseline+lineNo*lineHeight,2650);
      }
      ctx.font='26px monospace';ctx.fillText('PHOTOGRAPHIC COVER · USER SOURCE',185,2890);
      const blob=await new Promise<Blob>((resolve,reject)=>{
        canvas.toBlob(result=>result&&result.size>0?resolve(result):reject(new Error('PNG_EXPORT_FAILED')),'image/png');
      });
      const id='photo-'+String(index+1).padStart(2,'0');
      output.push({
        id,sourceName:file.name,
        filename:id+'-'+safe(direction.title)+'-3000.png',
        blob,width:3000,height:3000,
        provenance:'USER_PROVIDED_PHOTOGRAPH_LOCAL_DERIVATIVE',
      });
    }finally{image.close();}
  }
  return output;
}
