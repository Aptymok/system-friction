'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ParticipantWindow = {
  id: string;
  status: 'ACTIVE' | 'CLOSED';
  watched_thoughts: string[];
  started_at: string;
  expected_close_at: string;
  closed_at: string | null;
  mark_count: number;
};

type ParticipantMark = {
  id: string;
  day_number: number;
  moment_at: string;
  note: string | null;
};

type WindowState = {
  window: ParticipantWindow;
  marks: ParticipantMark[];
  canClose: boolean;
  hoursRemaining: number | null;
};

type ReflectionForm = {
  whatChanged: string;
  whatNoticed: string;
  whatAvoided: string;
  whatWasMine: string;
  whatWasNotMine: string;
  neededToday: string;
};

const EMPTY_REFLECTION: ReflectionForm = {
  whatChanged: '',
  whatNoticed: '',
  whatAvoided: '',
  whatWasMine: '',
  whatWasNotMine: '',
  neededToday: '',
};

const inputClass =
  'border border-[#312b1d] bg-[#050504] px-4 py-3 text-sm text-[#eee4cb] outline-none placeholder:text-[#5d574a] focus:border-[#c9aa54]';
const labelClass = 'font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]';
const buttonClass =
  'border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951] disabled:cursor-not-allowed disabled:opacity-40';

function dayFromStart(startedAt: string) {
  const elapsedHours = (Date.now() - new Date(startedAt).getTime()) / (60 * 60 * 1000);
  if (elapsedHours < 24) return 1;
  if (elapsedHours < 48) return 2;
  return 3;
}

function ReflectionField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className={labelClass}>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        className={`${inputClass} resize-y`}
      />
    </label>
  );
}

export function ParticipantWindowConsole({ authenticated }: { authenticated: boolean }) {
  const [loading, setLoading] = useState(authenticated);
  const [windows, setWindows] = useState<ParticipantWindow[]>([]);
  const [activeState, setActiveState] = useState<WindowState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thoughts, setThoughts] = useState(['', '', '']);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reflection, setReflection] = useState<ReflectionForm>(EMPTY_REFLECTION);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/field/participant/windows');
        const body = await response.json();
        if (cancelled) return;
        if (body.ok) {
          setWindows(body.windows);
          const active = body.windows.find((item: ParticipantWindow) => item.status === 'ACTIVE');
          if (active) {
            const stateResponse = await fetch(`/api/field/participant/windows/${active.id}`);
            const stateBody = await stateResponse.json();
            if (!cancelled && stateBody.ok) setActiveState(stateBody);
          }
        } else {
          setError(body.details || body.error);
        }
      } catch {
        if (!cancelled) setError('NETWORK_ERROR');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  async function refreshActive(windowId: string) {
    const response = await fetch(`/api/field/participant/windows/${windowId}`);
    const body = await response.json();
    if (body.ok) setActiveState(body);
  }

  async function startWindow() {
    const watchedThoughts = thoughts.map((item) => item.trim()).filter(Boolean);
    if (watchedThoughts.length === 0) {
      setError('WATCHED_THOUGHTS_REQUIRED');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/field/participant/windows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchedThoughts }),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.details || body.error);
        return;
      }
      setThoughts(['', '', '']);
      setWindows((current) => [body.window, ...current]);
      await refreshActive(body.window.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function addMark() {
    if (!activeState) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/field/participant/windows/${activeState.window.id}/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayNumber: dayFromStart(activeState.window.started_at),
          note: note.trim() || null,
        }),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.details || body.error);
        return;
      }
      setNote('');
      await refreshActive(activeState.window.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function closeWindow() {
    if (!activeState) return;
    const reflectionValues = Object.values(reflection) as string[];
    if (reflectionValues.some((value) => !value.trim())) {
      setError('REFLECTION_INCOMPLETE');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/field/participant/windows/${activeState.window.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reflection),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.details || body.error);
        return;
      }
      setWindows((current) => current.map((item) => (item.id === body.window.id ? body.window : item)));
      setActiveState(null);
      setReflection(EMPTY_REFLECTION);
    } finally {
      setSubmitting(false);
    }
  }

  const hoursRemainingLabel = useMemo(() => {
    if (activeState?.hoursRemaining === null || activeState?.hoursRemaining === undefined) return null;
    return `${Math.floor(activeState.hoursRemaining)}h remaining in window`;
  }, [activeState]);

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Participant Field</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#f5eedc]">
            72-hour marks without technical interpretation.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#9f9788]">
            Record repeated thoughts, events or marks during the 72-hour window. Reflect on what changed, what was
            noticed, what was avoided and what was yours. No phenotype interpretation, diagnosis or operator
            inference happens by default. Technical interpretation remains operator/ROOT governed.
          </p>
          <Link
            href="/library/SFI-WB-002_Participant_Workbook.html"
            className="mt-5 inline-block border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]"
          >
            Open WB-002 (paper version)
          </Link>
        </header>

        {!authenticated && (
          <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5 text-sm leading-6 text-[#9f9788]">
            <p>Digital capture requires an account so marks stay private and yours.</p>
            <Link href="/login?next=%2Ffield%2Fparticipant" className={`mt-4 inline-block ${buttonClass}`}>
              Login to start a window
            </Link>
          </section>
        )}

        {authenticated && loading && (
          <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5 text-sm text-[#9f9788]">Loading…</section>
        )}

        {authenticated && !loading && error && (
          <section className="border border-[#5a2a1e] bg-[#0b0b09] p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d98a6a]">
            {error}
          </section>
        )}

        {authenticated && !loading && !activeState && (
          <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <p className={labelClass}>Start a 72-hour window</p>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]">
              Name up to three repeated thoughts you want to mark when they appear. Do not try to force a decision.
            </p>
            <div className="mt-4 grid gap-3">
              {thoughts.map((value, index) => (
                <input
                  key={index}
                  value={value}
                  onChange={(event) =>
                    setThoughts((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                    )
                  }
                  placeholder={`Thought ${index + 1}`}
                  className={inputClass}
                />
              ))}
            </div>
            <button type="button" onClick={startWindow} disabled={submitting} className={`mt-5 ${buttonClass}`}>
              {submitting ? 'Starting…' : 'Start window'}
            </button>
          </section>
        )}

        {authenticated && !loading && activeState && activeState.window.status === 'ACTIVE' && (
          <section className="space-y-5 border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={labelClass}>Active window</p>
                <p className="mt-2 text-2xl font-semibold text-[#f5eedc]">{activeState.window.mark_count} marks</p>
              </div>
              {hoursRemainingLabel && (
                <span className="border border-[#2f2a1e] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">
                  {hoursRemainingLabel}
                </span>
              )}
            </div>

            <ul className="grid gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[#c8a951]">
              {activeState.window.watched_thoughts.map((thought, index) => (
                <li key={index} className="border border-[#2f2a1e] px-3 py-2">
                  {thought}
                </li>
              ))}
            </ul>

            <div className="grid gap-3">
              <label className={labelClass}>Optional note (what happened)</label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                className={`${inputClass} resize-y`}
                placeholder="Optional. Keep it low-friction."
              />
              <button type="button" onClick={addMark} disabled={submitting} className={buttonClass}>
                {submitting ? 'Marking…' : `Mark now — day ${dayFromStart(activeState.window.started_at)}`}
              </button>
            </div>

            {activeState.marks.length > 0 && (
              <div className="border-t border-[#2f2a1e] pt-4">
                <p className={labelClass}>Marks so far</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#9f9788]">
                  {activeState.marks
                    .slice()
                    .reverse()
                    .map((mark) => (
                      <li key={mark.id} className="border border-[#241f16] px-3 py-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8f8878]">
                          Day {mark.day_number} · {new Date(mark.moment_at).toLocaleString()}
                        </span>
                        {mark.note && <p className="mt-1">{mark.note}</p>}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="border-t border-[#2f2a1e] pt-5">
              <p className={labelClass}>
                Close of 72 hours{activeState.canClose ? '' : ' (early close — window has not elapsed yet)'}
              </p>
              <div className="mt-3 grid gap-3">
                <ReflectionField
                  label="What changed?"
                  value={reflection.whatChanged}
                  onChange={(value) => setReflection((current) => ({ ...current, whatChanged: value }))}
                />
                <ReflectionField
                  label="What did I notice?"
                  value={reflection.whatNoticed}
                  onChange={(value) => setReflection((current) => ({ ...current, whatNoticed: value }))}
                />
                <ReflectionField
                  label="What did I not want to see?"
                  value={reflection.whatAvoided}
                  onChange={(value) => setReflection((current) => ({ ...current, whatAvoided: value }))}
                />
                <ReflectionField
                  label="What was mine?"
                  value={reflection.whatWasMine}
                  onChange={(value) => setReflection((current) => ({ ...current, whatWasMine: value }))}
                />
                <ReflectionField
                  label="What was not mine?"
                  value={reflection.whatWasNotMine}
                  onChange={(value) => setReflection((current) => ({ ...current, whatWasNotMine: value }))}
                />
                <ReflectionField
                  label="What do I need today?"
                  value={reflection.neededToday}
                  onChange={(value) => setReflection((current) => ({ ...current, neededToday: value }))}
                />
              </div>
              <button type="button" onClick={closeWindow} disabled={submitting} className={`mt-4 ${buttonClass}`}>
                {submitting ? 'Closing…' : 'Close window'}
              </button>
            </div>
          </section>
        )}

        {authenticated && !loading && !activeState && windows.some((item) => item.status === 'CLOSED') && (
          <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <p className={labelClass}>Previous windows</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#9f9788]">
              {windows
                .filter((item) => item.status === 'CLOSED')
                .map((item) => (
                  <li key={item.id} className="border border-[#241f16] px-3 py-2">
                    {new Date(item.started_at).toLocaleDateString()} — {item.mark_count} marks
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
