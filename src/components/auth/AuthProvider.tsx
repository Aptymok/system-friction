'use client';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

type Identity={userId:string;email:string|null;alias:string|null;role:string};
type State={session:Session|null;status:'hydrating'|'anonymous'|'authenticated'|'config-missing';identity:Identity|null};
const C=createContext<State>({session:null,status:'hydrating',identity:null});
const PRIVATE=new Set(['root','governance','agents']);
export function AuthProvider({children}:{children:React.ReactNode}){
 const supabase=useMemo(()=>createBrowserSupabaseClient(),[]); const pathname=usePathname(); const router=useRouter();
 const [state,setState]=useState<State>({session:null,status:supabase?'hydrating':'config-missing',identity:null});
 useEffect(()=>{ if(!supabase)return; let live=true;
   const commit=async(session:Session|null)=>{ if(!live)return; if(!session){setState({session:null,status:'anonymous',identity:null});const k=pathname.split('/')[1];if(PRIVATE.has(k))router.replace('/login');return;}
     let role='observer',alias=session.user.email?.split('@')[0]||null; try{const r=await fetch('/api/account/me',{cache:'no-store'});const j=await r.json();if(j?.ok){role=j.data?.isRoot?'root':j.data?.role||j.data?.profile?.role||role;alias=j.data?.profile?.alias||alias;}}catch{}
     setState({session,status:'authenticated',identity:{userId:session.user.id,email:session.user.email||null,alias,role}});
   };
   void supabase.auth.getSession().then(({data})=>commit(data.session)); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>void commit(s));
   return()=>{live=false;subscription.unsubscribe();};
 },[supabase,pathname,router]);
 return <C.Provider value={state}>{children}</C.Provider>;
}
export const useAuthState=()=>useContext(C);
