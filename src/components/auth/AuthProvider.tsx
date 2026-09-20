'use client';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

type Identity={userId:string;email:string|null;alias:string|null;role:string;displayTitle:string|null};
type State={session:Session|null;status:'hydrating'|'anonymous'|'authenticated'|'config-missing';identity:Identity|null};
const C=createContext<State>({session:null,status:'hydrating',identity:null});
const sleep=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms));

async function readAccountIdentity(){
  let response=await fetch('/api/account/me',{cache:'no-store'});
  if(response.status===503){
    await sleep(900+Math.floor(Math.random()*700));
    response=await fetch('/api/account/me',{cache:'no-store'});
  }
  const json=await response.json().catch(()=>null);
  return {response,json};
}

function accountIdentity(json:any):Identity|null{
  if(!json?.ok||!json.data?.user?.id)return null;
  const role=json.data?.isRoot?'root':json.data?.role||json.data?.profile?.role||'observer';
  const alias=json.data?.profile?.alias||json.data?.user?.email?.split('@')?.[0]||null;
  const title=json.data?.profile?.module_access?.display_title;
  const displayTitle=typeof title==='string'&&title.trim()?title.trim():((role==='root'||role==='system')?'Founder — System Friction Institute':null);
  return {
    userId:String(json.data.user.id),
    email:typeof json.data.user.email==='string'?json.data.user.email:null,
    alias:typeof alias==='string'?alias:null,
    role:String(role),
    displayTitle,
  };
}

function metadataIdentity(session:Session):Identity{
  const metadata=session.user.user_metadata??{};
  const alias=typeof metadata.full_name==='string'&&metadata.full_name.trim()?metadata.full_name.trim():typeof metadata.name==='string'&&metadata.name.trim()?metadata.name.trim():session.user.email?.split('@')[0]||null;
  const displayTitle=typeof metadata.display_title==='string'&&metadata.display_title.trim()?metadata.display_title.trim():null;
  return {userId:session.user.id,email:session.user.email||null,alias,role:'observer',displayTitle};
}

export function AuthProvider({children}:{children:React.ReactNode}){
 const supabase=useMemo(()=>createBrowserSupabaseClient(),[]);
 const [state,setState]=useState<State>({session:null,status:supabase?'hydrating':'config-missing',identity:null});
 useEffect(()=>{ if(!supabase)return; let live=true; const identityCache=new Map<string,Identity>();
   const commit=async(session:Session|null)=>{
     if(!live)return;
     if(!session){
       try{
         const {response,json}=await readAccountIdentity();
         const identity=accountIdentity(json);
         if(response.ok&&identity){
           if(!live)return;
           identityCache.set(identity.userId,identity);
           setState({session:null,status:'authenticated',identity});
           return;
         }
       }catch{}
       if(live)setState({session:null,status:'anonymous',identity:null});
       return;
     }
     const cached=identityCache.get(session.user.id);
     if(cached){setState({session,status:'authenticated',identity:{...cached,email:session.user.email||cached.email}});return;}
     const base=metadataIdentity(session);
     let identity=base;
     try{
       const {json}=await readAccountIdentity();
       const serverIdentity=accountIdentity(json);
       if(serverIdentity){
         identity={...serverIdentity,email:serverIdentity.email||base.email,alias:serverIdentity.alias||base.alias,displayTitle:serverIdentity.displayTitle||base.displayTitle};
       }
     }catch{}
     if(!identity.displayTitle&&(identity.role==='root'||identity.role==='system'))identity={...identity,displayTitle:'Founder — System Friction Institute'};
     if(!live)return;
     identityCache.set(identity.userId,identity);
     setState({session,status:'authenticated',identity});
   };
   void supabase.auth.getSession().then(({data})=>commit(data.session));
   const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
     if(event==='TOKEN_REFRESHED'&&session){
       const cached=identityCache.get(session.user.id);
       if(cached){setState({session,status:'authenticated',identity:{...cached,email:session.user.email||cached.email}});return;}
     }
     void commit(session);
   });
   return()=>{live=false;subscription.unsubscribe();};
 },[supabase]);
 return <C.Provider value={state}>{children}</C.Provider>;
}
export const useAuthState=()=>useContext(C);
