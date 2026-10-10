import { redirect } from 'next/navigation';

export default async function PublicationCompatibilityRoute({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  redirect('/repository?object='+encodeURIComponent(slug));
}
