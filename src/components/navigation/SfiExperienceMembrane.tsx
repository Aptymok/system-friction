'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuthState } from '@/components/auth/AuthProvider';
import './sfi-experience-membrane.css';

const CONTEXT_KEYS = ['scene','focus','scope','mode','window','objectId','caseId'] as const;
const HOME_SCENES = ['signal','observation','system','friction','mihm','evidence','studio','twin','simulation','trajectories','governance','field','research','root','institute'] as const;
const FOCUS_ALIASES: Record<string,string> = {
  'world-state': 'state',
  topology: 'state',
  'public-reading': 'reading',
  longitudinal: 'trajectories',
  provenance: 'method',
};

function internalContext(pathname: string, searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  params.set('origin', pathname || '/');
  for (const key of CONTEXT_KEYS) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  return params;
}

function destination(path: string, context: URLSearchParams, additions?: Record<string,string>) {
  const params = new URLSearchParams(context);
  if (additions) Object.entries(additions).forEach(([key,value]) => params.set(key,value));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function roleHome(role: string | null) {
  if (role === 'root' || role === 'system') return { href: '/root', label: 'ENTER ROOT' };
  if (role === 'operator' || role === 'controller') return { href: '/member', label: 'RESUME' };
  return { href: '/studio', label: 'RESUME STUDIO' };
}

export function SfiExperienceMembrane() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const { status, userRole } = useAuthState();
  const [homeScene, setHomeScene] = useState<(typeof HOME_SCENES)[number]>('signal');
  const incomingOrigin = searchParams.get('origin');
  const scene = searchParams.get('scene');
  const focus = searchParams.get('focus') || searchParams.get('objectId') || searchParams.get('scope');

  useEffect(() => {
    if (pathname !== '/') {
      setHomeScene('signal');
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = (visible.target as HTMLElement).id as (typeof HOME_SCENES)[number];
      if (HOME_SCENES.includes(id)) setHomeScene(id);
    }, { threshold: [0.24,0.46,0.68] });
    document.querySelectorAll<HTMLElement>('.is-scene').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!incomingOrigin && !scene && !focus) return;
    const requested = focus ? (FOCUS_ALIASES[focus] ?? focus) : null;
    const sceneTarget = scene ? (FOCUS_ALIASES[scene] ?? scene) : null;
    const timer = window.setTimeout(() => {
      const target = (requested ? document.getElementById(requested) : null)
        ?? (sceneTarget ? document.getElementById(sceneTarget) : null);
      if (!target) return;
      target.setAttribute('data-sfi-arrival', 'true');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(() => target.removeAttribute('data-sfi-arrival'), 2600);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [focus, incomingOrigin, pathname, query, scene]);

  const authSurface = ['/login','/signup','/forgot','/reset','/verify'].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (authSurface) return null;

  const context = internalContext(pathname, new URLSearchParams(query));
  const observeHref = destination('/observatory', context, { source: 'membrane' });
  const engageHref = destination('/field', context, { intent: 'engage', source: 'membrane' });
  const roleDestination = roleHome(userRole);
  const accessTarget = destination(roleDestination.href, context, { source: 'membrane' });
  const accessHref = status === 'authenticated'
    ? accessTarget
    : `/login?next=${encodeURIComponent(accessTarget)}`;
  const accessLabel = status === 'authenticated' ? roleDestination.label : 'ACCESS';
  const homeIndex = HOME_SCENES.indexOf(homeScene);
  const showObserve = pathname !== '/' || homeIndex >= 1;
  const showEngage = pathname !== '/' || homeIndex >= 11;

  return (
    <aside className="sfi-membrane" data-private={pathname.startsWith('/root') || pathname.startsWith('/studio') || pathname.startsWith('/member') || pathname.startsWith('/clients')} data-home-scene={pathname === '/' ? homeScene : undefined}>
      <div className="sfi-membrane__identity">
        <Link href="/" aria-label="System Friction Institute home"><strong>SFI</strong><span>SYSTEM FRICTION INSTITUTE</span></Link>
        {incomingOrigin || scene || focus ? (
          <div className="sfi-membrane__context" title="Context transported from the previous surface">
            <span>CONTEXT</span>
            <strong>{[scene, focus].filter(Boolean).join(' / ') || incomingOrigin}</strong>
          </div>
        ) : null}
      </div>
      <nav aria-label="SFI experiential routing" data-count={1 + Number(showObserve) + Number(showEngage)}>
        {showObserve ? <Link href={observeHref}><span>OBSERVE</span><small>OBSERVATORY</small></Link> : null}
        {showEngage ? <Link href={engageHref}><span>ENGAGE</span><small>FIELD</small></Link> : null}
        <Link href={accessHref} className="sfi-membrane__access"><span>{accessLabel}</span><small>{status === 'authenticated' ? (userRole ?? 'PRIVATE') : 'SIGN IN'}</small></Link>
      </nav>
    </aside>
  );
}
