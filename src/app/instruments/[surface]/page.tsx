import { notFound, redirect } from 'next/navigation';
import { PublicInstrumentSurface, type SurfaceId } from '@/components/sfi/PublicInstrumentSurface';

const SURFACES:readonly SurfaceId[]=['root','observatory','reality-chain','method-lab','repository','timeline','access'];

export function generateStaticParams(){
  return SURFACES.map(surface=>({surface}));
}

export default async function PublicInstrumentPage({params}:{params:Promise<{surface:string}>}){
  const {surface}=await params;
  if(surface==='world-vector')redirect('/instruments/observatory');
  if(!SURFACES.includes(surface as SurfaceId))notFound();
  return <PublicInstrumentSurface surface={surface as SurfaceId}/>;
}
