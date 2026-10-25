'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import './PublicEntryGateway.css';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

const SURFACE_RAIL=[
  // Public explanatory sequence; access permissions remain governed by backend identity.
  {label:'OBSERVATORY',number:'01',sceneId:'observatory',href:'/instruments/observatory',line:'Sources · signals · World Vector · trajectories'},
  {label:'REPOSITORY',number:'02',sceneId:'repository',href:'/repository',line:'Source records · evidence · provenance · versions'},
  {label:'METHOD LAB',number:'03',sceneId:'method-lab',href:'/instruments/method-lab',line:'Protocols · tests · reproducibility'},
  {label:'ROOT',number:'04',sceneId:'root',href:'/instruments/root',line:'Governance · authority · cognitive field'},
  {label:'REALITY CHAIN',number:'05',sceneId:'reality-chain',href:'/instruments/reality-chain',line:'Reconstruction · execution · empirical RETURN'},
  {label:'TIMELINE',number:'06',sceneId:'timeline',href:'/timeline',line:'Contrast · epistemic time · reentry'},
  {label:'ACCESS',number:'07',sceneId:'access',href:'/instruments/access',line:'Institutional identity · scope · authority'},
] as const;

const CHAIN=['REAL WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN'] as const;

export function PublicEntryGateway(){
  const scroller=useRef<HTMLDivElement|null>(null);
  const [progress,setProgress]=useState(0);

  useEffect(()=>{
    // A misconfigured Supabase redirect allowlist can land an invite callback
    // on Home. Do not carry raw access/refresh tokens to another URL.
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const kind = fragment.get('type');
    const accessToken = fragment.get('access_token');
    const refreshToken = fragment.get('refresh_token');
    const code = query.get('code');
    const hasAuthTokens = ['invite', 'recovery', 'signup', 'email'].includes(kind || '') && Boolean(accessToken && refreshToken);
    if (!hasAuthTokens && !code) return;

    const supabase = createBrowserSupabaseClient();
    // Remove one-time credentials immediately, before any async verification.
    window.history.replaceState(window.history.state, '', window.location.pathname);
    if (!supabase) {
      window.location.replace('/reset?mode=invite&error=auth_unavailable');
      return;
    }

    let active = true;
    void (async()=>{
      try {
        const existing = await supabase.auth.getSession();
        const result = hasAuthTokens
          ? existing.data.session?.access_token === accessToken
            ? existing
            : await supabase.auth.setSession({access_token:accessToken!,refresh_token:refreshToken!})
          : existing.data.session?.user.user_metadata?.sfi_invitation === true
            ? existing
            : await supabase.auth.exchangeCodeForSession(code!);
        if (!active) return;
        if (result.error || !result.data.session) {
          window.location.replace('/reset?mode=invite&error=invalid_or_expired');
          return;
        }
        // Do not repurpose ordinary Supabase recovery/PKCE callbacks as
        // institutional invitations without an identity marked by SFI.
        const metadata = result.data.session.user.user_metadata ?? {};
        const eligibleResponse = await fetch('/api/account/invitation-session', {
          credentials: 'same-origin', cache: 'no-store',
        }).catch(() => null);
        const eligibility = eligibleResponse?.ok
          ? await eligibleResponse.json().catch(() => null) as { eligible?: boolean } | null
          : null;
        if (!active) return;
        if ((kind === 'invite' || kind === 'recovery' || metadata.sfi_invitation === true
          || eligibility?.eligible === true) && eligibility?.eligible === true) {
          window.location.replace('/reset?mode=invite');
        } else {
          // A public signup remains personal, unless a valid separate
          // institutional grant is already bound to the verified identity.
          window.location.replace('/entry');
        }
      } catch {
        if (active) window.location.replace('/reset?mode=invite&error=auth_unavailable');
      }
    })();
    return ()=>{active=false};
  },[]);

  useEffect(()=>{
    const host=scroller.current;
    if(!host)return;
    const onScroll=()=>{
      const max=Math.max(host.scrollWidth-host.clientWidth,1);
      setProgress(host.scrollLeft/max);
    };
    const onWheel=(event:WheelEvent)=>{
      const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
      if(Math.abs(delta)<2)return;
      event.preventDefault();
      host.scrollBy({left:delta*1.25,behavior:'auto'});
    };
    host.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('wheel',onWheel,{passive:false});
    onScroll();
    return()=>{
      host.removeEventListener('scroll',onScroll);
      window.removeEventListener('wheel',onWheel);
    };
  },[]);

  const go=(direction:-1|1)=>{
    const host=scroller.current;
    if(!host)return;
    host.scrollBy({left:host.clientWidth*direction,behavior:'smooth'});
  };

  return <main className="sfiHomeExperience">
    <div className="sfiHomePanoramaScroller" ref={scroller} aria-label="SFI horizontal panorama">
      <div className="sfiHomePanoramaTrack">
        <img
          src="/assets/sfi/instruments/SFI_HOME_PANORAMA.png"
          alt=""
          draggable={false}
        />
      </div>
    </div>

    <div className="sfiHomePanoramaVeil" aria-hidden="true"/>

    <header className="sfiHomeHeader">
      <Link href="/" className="sfiHomeBrand" aria-label="System Friction Institute home">
        <img src="/assets/sfi/ui/icons/00_sfi_canonical_mark.png" alt="" aria-hidden="true"/>
        <strong>SFI</strong><i>—</i><span>SYSTEM FRICTION INSTITUTE</span>
      </Link>
      <nav aria-label="SFI instruments">
        <Link href="/servicios" lang="es">SERVICIOS</Link>
        {SURFACE_RAIL.map((surface)=><Link key={surface.sceneId} href={surface.href}>{surface.label}</Link>)}
      </nav>
      <Link className="sfiHomeAccessDot" href="/instruments/access" aria-label="Access"><span>ACCESS</span></Link>
    </header>

    <aside className="sfiHomeChain" aria-label="Reality Chain">
      {CHAIN.map((stage)=><span key={stage}>{stage}</span>)}
    </aside>

    <section className="sfiHomeStatement">
      <small>SYSTEMS MEET HERE.</small>
      <h1>NOTHING ACTS ALONE.<br/><b>REALITY ANSWERS BACK.</b></h1>
      <p>SFI observes how signals become evidence, how evidence supports inference, how authority enables action, and what reality returns.</p>
      <em>TRACEABILITY ≠ JUSTIFICATION · EVIDENCE INDEPENDENCE · TEMPORAL STATE · AUTHORITY · RETURN</em>
    </section>

    <section className="sfiHomeRightNotes" aria-hidden="true">
      <p>MULTIPLE LAYERS<br/>OF REALITY.<br/><br/>INTERCONNECTED<br/>CONSEQUENCES.</p>
      <p>UNDERSTAND TODAY.<br/>RECONSTRUCT TOMORROW.</p>
    </section>

    <nav className="sfiHomeSurfaceRail" aria-label="Explore SFI">
      {SURFACE_RAIL.map((surface)=><Link key={surface.sceneId} href={surface.href}>
        <small>{surface.number}</small>
        <strong>{surface.label}</strong>
        <span>{surface.line}</span>
        <b>→</b>
      </Link>)}
    </nav>



    <button className="sfiHomePanoramaArrow sfiHomePanoramaArrow--left" type="button" onClick={()=>go(-1)} disabled={progress<.02} aria-label="Pan left">←</button>
    <button className="sfiHomePanoramaArrow sfiHomePanoramaArrow--right" type="button" onClick={()=>go(1)} disabled={progress>.98} aria-label="Pan right">→</button>
  </main>;
}
