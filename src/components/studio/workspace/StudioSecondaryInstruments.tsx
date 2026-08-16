'use client';

import { useState } from 'react';
import { StudioMasterAnalysisControl } from '@/components/studio/production/StudioMasterAnalysisControl';
import { StudioSessionReconstruction } from './StudioSessionReconstruction';
import './studio-secondary-instruments.css';

export function StudioSecondaryInstruments({
  sessionId,
  activeObjectId,
  objectCount,
  objectTitle,
  objectType,
  analysisStatus,
}: {
  sessionId: string | null;
  activeObjectId: string | null;
  objectCount: number;
  objectTitle: string;
  objectType: string;
  analysisStatus: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="studio-secondary-instruments" data-open={open}>
      <button type="button" className="studio-secondary-instruments__launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>INSTRUMENTS</span><strong>{open ? 'CLOSE' : 'RECONSTRUCT / MASTER'}</strong>
      </button>
      {open ? (
        <div className="studio-secondary-instruments__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <aside className="studio-secondary-instruments__panel" aria-label="Studio secondary analysis instruments">
            <header><div><span>STUDIO / SECONDARY INSTRUMENTS</span><strong>Reconstruction + finite master analysis</strong></div><button type="button" onClick={() => setOpen(false)}>×</button></header>
            <div className="studio-secondary-instruments__scroll">
              <StudioSessionReconstruction sessionId={sessionId} activeObjectId={activeObjectId} objectCount={objectCount}/>
              <StudioMasterAnalysisControl objectId={activeObjectId} objectTitle={objectTitle} objectType={objectType} analysisStatus={analysisStatus}/>
            </div>
            <footer>SECONDARY INSTRUMENT ≠ STUDIO ENTRY · FINITE EXECUTION · OWNER-SCOPED</footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
