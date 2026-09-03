'use client';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

type Identity={userId:string;email:string|null;alias:string|null;role:string;displayTitle:string|null};
type State={session:Session|null;status:'hydrating'|'anonymous'|'authenticated'|'config-missing';identity:Identity|null};
const C=createContext<State>({session:null,status:'hydrating',identity:null});
const PRIVATE=new Set(['root','governance','agents','cases','twin']);
const sleep=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms));

async function readAccountIdentity(){
  let response=await fetch('/api/account/me',{cache:'no-store'});
  if(response.status===503){
    await sleep(450);
    response=await fetch('/api/account/me',{cache:'no-store'});
  }
  const json=await response.json().catch(()=>null);
  return {response,json};
}

export function AuthProvider({children}:{children:React.ReactNode}){
 const supabase=useMemo(()=>createBrowserSupabaseClient(),[]); const pathname=usePathname(); const router=useRouter();
 const [state,setState]=useState<State>({session:null,status:supabase?'hydrating':'config-missing',identity:null});
 useEffect(()=>{ if(!supabase)return; let live=true;
   const commit=async(session:Session|null)=>{ if(!live)return; if(!session){setState({session:null,status:'anonymous',identity:null});const k=pathname.split('/')[1];if(PRIVATE.has(k))router.replace('/login');return;}
     const metadata=session.user.user_metadata??{};
     let role='observer';
     let alias=typeof metadata.full_name==='string'&&metadata.full_name.trim()?metadata.full_name.trim():typeof metadata.name==='string'&&metadata.name.trim()?metadata.name.trim():session.user.email?.split('@')[0]||null;
     let displayTitle=typeof metadata.display_title==='string'&&metadata.display_title.trim()?metadata.display_title.trim():null;
     try{
       const {json}=await readAccountIdentity();
       if(json?.ok){
         role=json.data?.isRoot?'root':json.data?.role||json.data?.profile?.role||role;
         alias=json.data?.profile?.alias||alias;
         const title=json.data?.profile?.module_access?.display_title;
         if(typeof title==='string'&&title.trim())displayTitle=title.trim();
       }
     }catch{}
     if(!displayTitle&&(role==='root'||role==='system'))displayTitle='Founder — System Friction Institute';
     if(!live)return;
     setState({session,status:'authenticated',identity:{userId:session.user.id,email:session.user.email||null,alias,role,displayTitle}});
   };
   void supabase.auth.getSession().then(({data})=>commit(data.session)); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>void commit(s));
   return()=>{live=false;subscription.unsubscribe();};
 },[supabase,pathname,router]);
 return <C.Provider value={state}>{children}</C.Provider>;
}
export const useAuthState=()=>useContext(C);
