'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmergentParticleField, type EmergentAnchor } from '@/components/sfi/emergent/EmergentParticleField';
import './root-native-surfaces.css';

export function RootNativeFrame({
  organ,
  code,
  state,
  generatedAt,
  anchors,
  children,
  accent = 'gold',
  namespace = 'SFI / ROOT',
  returnHref = '/root',
  returnLabel = 'RETURN TO ROOT FIELD ↖',
  invariant = 'READ ≠ EXECUTE ≠ GOVERN ≠ CANONICAL WRITE',
}: {
  organ: string;
  code: string;
  state: string;
  generatedAt: string | null;
  anchors: EmergentAnchor[];
  children: ReactNode;
  accent?: 'gold' | 'cyan' | 'violet' | 'amber' | 'red';
  namespace?: string;
  returnHref?: string;
  returnLabel?: string;
  invariant?: string;
}) {
  return (
    <main className="root-native" data-accent={accent}>
      <EmergentParticleField anchors={anchors} density={230} />
      <header className="root-native__header">
        <Link href={returnHref} className="root-native__brand"><span>{namespace}</span><strong>{organ}</strong></Link>
        <div className="root-native__code"><span>{code}</span><b>{state}</b></div>
        <div className="root-native__time"><span>OBSERVED STATE</span><time>{generatedAt ? new Date(generatedAt).toLocaleString('es-MX') : 'NO_VALUE'}</time></div>
      </header>
      <div className="root-native__body">{children}</div>
      <footer className="root-native__footer"><span>{invariant}</span><Link href={returnHref}>{returnLabel}</Link></footer>
    </main>
  );
}
