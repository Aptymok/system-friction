'use client';

import { useState } from 'react';
import type { StudioArtifactInput, StudioArtifactKind } from '@/lib/studio/cultural-lab/types';

const KINDS: StudioArtifactKind[] = ['song', 'album', 'podcast', 'article', 'book', 'video', 'campaign', 'speech', 'research', 'policy_document', 'other'];

export function StudioArtifactIntake({ onRun, loading }: { onRun: (input: StudioArtifactInput) => void; loading: boolean }) {
  const [input, setInput] = useState<StudioArtifactInput>({
    kind: 'song',
    title: 'Untitled artifact',
    notes: '',
    text: '',
    targetAudience: '',
    desiredShift: '',
  });

  return (
    <section className="rounded-[2rem] border border-[#2d2a28] bg-[#080706]/90 p-5">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.24em] text-[#9c8c70]">Artifact Intake</div>
        <h2 className="mt-2 text-xl text-[#f1dfb1]">Cultural intervention object</h2>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1 text-xs uppercase tracking-[0.16em] text-[#7f735d]">
          Kind
          <select className="rounded-xl border border-[#2d2a28] bg-[#0b0a08] p-3 text-sm normal-case tracking-normal text-[#d0c6b0]" value={input.kind} onChange={(event) => setInput({ ...input, kind: event.target.value as StudioArtifactKind })}>
            {KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </select>
        </label>

        <label className="grid gap-1 text-xs uppercase tracking-[0.16em] text-[#7f735d]">
          Title
          <input className="rounded-xl border border-[#2d2a28] bg-[#0b0a08] p-3 text-sm normal-case tracking-normal text-[#d0c6b0]" value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} />
        </label>

        <label className="grid gap-1 text-xs uppercase tracking-[0.16em] text-[#7f735d]">
          Notes / Context
          <textarea className="min-h-24 rounded-xl border border-[#2d2a28] bg-[#0b0a08] p-3 text-sm normal-case tracking-normal text-[#d0c6b0]" value={input.notes ?? ''} onChange={(event) => setInput({ ...input, notes: event.target.value })} />
        </label>

        <label className="grid gap-1 text-xs uppercase tracking-[0.16em] text-[#7f735d]">
          Text / Artifact fragment
          <textarea className="min-h-32 rounded-xl border border-[#2d2a28] bg-[#0b0a08] p-3 text-sm normal-case tracking-normal text-[#d0c6b0]" value={input.text ?? ''} onChange={(event) => setInput({ ...input, text: event.target.value })} />
        </label>

        <button
          type="button"
          disabled={loading}
          onClick={() => onRun({ ...input, createdAt: new Date().toISOString() })}
          className="rounded-2xl border border-[#d7bd73] bg-[#d7bd73] px-4 py-3 text-xs uppercase tracking-[0.18em] text-black disabled:opacity-50"
        >
          {loading ? 'Running pipeline…' : 'Run Studio Pipeline'}
        </button>
      </div>
    </section>
  );
}
