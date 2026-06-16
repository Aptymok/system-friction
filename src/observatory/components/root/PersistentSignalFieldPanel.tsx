'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PersistentSignalState, SignalManifestation, PersistentSignal } from '@/lib/signals/types';

type SignalStateResponse = PersistentSignalState | { ok: false; error: string; details?: string };

function formatMetric(value: number | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function formatDate(value: string | undefined) {
  if (!value) return 'sin fecha';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

function shortHash(value: string | undefined) {
  return value ? value.slice(0, 12) : 'sin-hash';
}

function signalTitle(signal: PersistentSignal | null | undefined) {
  if (!signal) return 'sin senal';
  return signal.label || shortHash(signal.signal_hash);
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-[#1e1c17] bg-[#090806] p-2">
      <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#4d4639]">{label}</div>
      <div className="mt-1 font-mono text-[13px] text-[#c8a951]">{value}</div>
    </div>
  );
}

function SignalRow({ signal }: { signal: PersistentSignal }) {
  return (
    <div className="border border-[#1e1c17] bg-[#080706] p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#c8a951]">{signalTitle(signal)}</div>
          <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#4d4639]">{shortHash(signal.signal_hash)}</div>
        </div>
        <span className="shrink-0 border border-[#2e2c24] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a7035]">{signal.state}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a7568]">
        <span>ocurrencias: <b className="text-[#ccc8bc]">{signal.occurrence_count}</b></span>
        <span>persistencia: <b className="text-[#ccc8bc]">{formatMetric(signal.persistence_score)}</b></span>
        <span>cross-modal: <b className="text-[#ccc8bc]">{formatMetric(signal.cross_modal_score)}</b></span>
        <span>modalidades: <b className="text-[#ccc8bc]">{signal.modalities.join(', ') || 'unknown'}</b></span>
      </div>
      <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[#4d4639]">ultima lectura: {formatDate(signal.last_seen)}</div>
    </div>
  );
}

function ManifestationRow({ manifestation }: { manifestation: SignalManifestation }) {
  return (
    <div className="border-l border-[#1e1c17] py-2 pl-2 font-mono text-[9px] uppercase tracking-[0.1em]">
      <div className="text-[#ccc8bc]">{manifestation.source_type}</div>
      <div className="mt-1 text-[#6f6658]">
        {manifestation.modality} - similitud {formatMetric(manifestation.similarity)} - {formatDate(manifestation.observed_at)}
      </div>
    </div>
  );
}

export function PersistentSignalFieldPanel() {
  const [state, setState] = useState<SignalStateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/signals/state?ts=${Date.now()}`, { credentials: 'include' })
      .then((response) => response.json())
      .then((payload: SignalStateResponse) => {
        if (!cancelled) setState(payload);
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ ok: false, error: 'signals_state_fetch_failed', details: error.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7a7568]">cargando senales persistentes...</div>;
    }

    if (!state) {
      return <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#c87060]">sin lectura PSI</div>;
    }

    if (!state.ok) {
      return (
        <div className="border border-[#3a241f] bg-[#110b09] p-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#c87060]">
          <div>{state.error}</div>
          {state.details ? <div className="mt-2 text-[#7a7568]">{state.details}</div> : null}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="senales" value={state.fieldSummary.totalSignals} />
          <Stat label="persistencia media" value={formatMetric(state.fieldSummary.averagePersistence)} />
          <Stat label="cross-modal media" value={formatMetric(state.fieldSummary.averageCrossModal)} />
          <Stat label="cristalizando" value={state.fieldSummary.crystallizingCount} />
          <Stat label="degradadas" value={state.fieldSummary.degradedCount} />
          <Stat label="senal fuerte" value={signalTitle(state.fieldSummary.strongestSignal)} />
        </div>

        <section>
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a7035]">Campo PSI</div>
          <div className="space-y-2">
            {state.signals.length ? state.signals.map((signal) => <SignalRow key={signal.id} signal={signal} />) : (
              <div className="border border-[#1e1c17] p-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#6f6658]">sin senales registradas</div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a7035]">Manifestaciones recientes</div>
          <div className="space-y-1">
            {state.recentManifestations.length ? state.recentManifestations.map((manifestation) => (
              <ManifestationRow key={manifestation.id} manifestation={manifestation} />
            )) : (
              <div className="border border-[#1e1c17] p-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#6f6658]">sin manifestaciones</div>
            )}
          </div>
        </section>
      </div>
    );
  }, [loading, state]);

  return (
    <div className="min-h-0 bg-[#060605] text-[#ccc8bc]">
      <div className="mb-3 border-b border-[#1e1c17] pb-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">SFI-PSI</div>
        <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#6f6658]">Persistent Signal Instrument</div>
      </div>
      {content}
    </div>
  );
}
