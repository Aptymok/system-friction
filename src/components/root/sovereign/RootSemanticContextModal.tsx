'use client';

import { useEffect } from 'react';
import type { RootSelection } from './sovereignTypes';
import { RootSemanticContext } from './RootSemanticContext';

export function RootSemanticContextModal({ selection, onClose }: { selection: RootSelection; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="rsc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="rsc-modal" role="dialog" aria-modal="true" aria-labelledby="rsc-modal-title">
      <header>
        <div><span>{selection.kind.toUpperCase()} · CONTEXTO RECONSTRUIDO</span><h2 id="rsc-modal-title">{selection.title}</h2></div>
        <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      <div className="rsc-modal-scroll"><RootSemanticContext selection={selection} /></div>
    </section>
  </div>;
}
