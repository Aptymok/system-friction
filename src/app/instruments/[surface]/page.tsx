import { notFound } from 'next/navigation';
import { PublicInstrumentSurface, type SurfaceId } from '@/components/sfi/PublicInstrumentSurface';

const SURFACES:readonly SurfaceId[]=['root','observatory','reality-chain','method-lab','world-vector','repository','timeline','access'];

export function generateStaticParams(){
  return SURFACES.map(surface=>({surface}));
}

export default async function PublicInstrumentPage({params}:{params:Promise<{surface:string}>}){
  const {surface}=await params;
  if(!SURFACES.includes(surface as SurfaceId))notFound();
  return <PublicInstrumentSurface surface={surface as SurfaceId}/>;
}
