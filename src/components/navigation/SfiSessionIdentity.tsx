'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';
import './sfi-session-identity.css';

type SfiSessionIdentityProps = {
  variant?: 'standard' | 'root';
};

function normalizeIdentifier(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, ' ').toUpperCase();
  return normalized || 'USUARIO';
}

export function SfiSessionIdentity({ variant = 'standard' }: SfiSessionIdentityProps) {
  const router = useRouter();
  const { session, status, userRole, identity } = useAuthState();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', closeOutside);
    window.addEventListener('keydown', closeWithEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('keydown', closeWithEscape);
    };
  }, [open]);

  if (status !== 'authenticated' || !session) return null;

  const email = identity?.email || session.user.email || null;
  const fallbackAlias = email?.split('@')[0] || null;
  const identifier = normalizeIdentifier(identity?.alias || fallbackAlias);
  const role = normalizeIdentifier(identity?.role || userRole || 'observer');

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase?.auth.signOut();
    } finally {
      setOpen(false);
      router.replace('/login');
      router.refresh();
      setSigningOut(false);
    }
  }

  return (
    <div ref={containerRef} className={`ssi-identity ssi-${variant}`}>
      <button
        type="button"
        className="ssi-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <i aria-hidden="true" />
        <span>ID {identifier}</span>
        <small>{role}</small>
        <b aria-hidden="true">⌄</b>
      </button>

      {open ? (
        <div className="ssi-menu" role="menu" aria-label="Sesión institucional">
          <span className="ssi-eyebrow">SESIÓN INSTITUCIONAL ACTIVA</span>
          <strong>ID {identifier}</strong>
          <p>{email || 'Correo no disponible'}</p>
          <div className="ssi-metadata">
            <span>ROL</span>
            <b>{role}</b>
          </div>
          <button type="button" role="menuitem" className="ssi-signout" onClick={signOut} disabled={signingOut}>
            {signingOut ? 'CERRANDO SESIÓN…' : 'CERRAR SESIÓN'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
