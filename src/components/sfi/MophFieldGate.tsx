'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AmvChat } from '@/components/amv/AmvChat';
import { MOPH_BEHAVIOR_NODES, MOPH_STORY, type MophChapter } from '@/lib/moph/story';

type Letter = { ch: string; x: number; y: number; color: number; hidden: boolean };
type Mark = { x: number; y: number; text: string; at: number };
type ChapterEvent = { opens: number; startedAt: number; readTime: number; skipped: boolean };
type Choice = { chapter: string; value: string; latencyMs: number };
type TextAnswer = { chapter: string; length: number; latencyMs: number };
type Metrics = { IHG: number; NTI: number; LDI: number; GO: number; epsilon: number; phi: number; reason: string[] };

type SessionState = {
  startedAt: number;
  letters: Letter[];
  marks: Mark[];
  done: string[];
  activeKey: string;
  color: number;
  choices: Choice[];
  texts: TextAnswer[];
  final: boolean;
};

type ObservedStats = {
  chapterEvents: Record<string, ChapterEvent>;
  mouseTotal: number;
  mousePath: Array<{ x: number; y: number; at: number }>;
  idleCount: number;
  pauses: number;
  lastMoveAt: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  selectedAt: number;
};

const STORAGE_KEY = 'sfi-moph-field-gate-v1';
const TITLE = 'LA SUTURA DEL OBSERVADOR';
const PALETTE = ['#e8ddc3', '#b99648', '#718ca6', '#d9d0b9', '#8d3830'];

function initialLetters(width = 1280, height = 720): Letter[] {
  return Array.from(TITLE).map((ch, index) => ({
    ch,
    x: width * 0.09 + (index % 10) * 42,
    y: height * 0.12 + Math.floor(index / 10) * 64,
    color: 0,
    hidden: false,
  }));
}

function loadSession(): SessionState {
  if (typeof window === 'undefined') {
    return { startedAt: Date.now(), letters: initialLetters(), marks: [], done: [], activeKey: 'carta', color: 0, choices: [], texts: [], final: false };
  }
  const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<SessionState> | null;
  if (parsed?.letters?.length) {
    return {
      startedAt: parsed.startedAt ?? Date.now(),
      letters: parsed.letters,
      marks: parsed.marks ?? [],
      done: parsed.done ?? [],
      activeKey: parsed.activeKey ?? 'carta',
      color: parsed.color ?? 0,
      choices: parsed.choices ?? [],
      texts: parsed.texts ?? [],
      final: parsed.final ?? false,
    };
  }
  return { startedAt: Date.now(), letters: initialLetters(window.innerWidth, window.innerHeight), marks: [], done: [], activeKey: 'carta', color: 0, choices: [], texts: [], final: false };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function newStats(): ObservedStats {
  const now = Date.now();
  return { chapterEvents: {}, mouseTotal: 0, mousePath: [], idleCount: 0, pauses: 0, lastMoveAt: now, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, selectedAt: now };
}

function computeMetrics(stats: ObservedStats, session: SessionState): Metrics {
  const events = Object.values(stats.chapterEvents);
  const readChapters = events.length;
  const totalRead = events.reduce((sum, event) => sum + event.readTime, 0);
  const avgRead = readChapters ? totalRead / readChapters : 0;
  const shortReads = events.filter((event) => event.readTime > 0 && event.readTime < 4).length;
  const reopens = events.reduce((sum, event) => sum + Math.max(0, event.opens - 1), 0);
  const skipped = events.filter((event) => event.skipped).length;
  const area = Number.isFinite(stats.maxX - stats.minX) && Number.isFinite(stats.maxY - stats.minY)
    ? Math.max(0, stats.maxX - stats.minX) * Math.max(0, stats.maxY - stats.minY)
    : 0;
  const viewportArea = typeof window === 'undefined' ? 1_000_000 : Math.max(1, window.innerWidth * window.innerHeight);
  const hiddenLetters = session.letters.filter((letter) => letter.hidden).length;
  const emptyTexts = session.texts.filter((item) => item.length < 8).length;

  const IHG = clamp01(shortReads * 0.1 + stats.pauses * 0.07 + (readChapters < 3 ? 0.28 : 0) + (avgRead > 0 && avgRead < 5 ? 0.18 : 0));
  const NTI = clamp01(1 - stats.idleCount * 0.035 - emptyTexts * 0.09 - skipped * 0.05);
  const LDI = clamp01(skipped * 0.13 + reopens * 0.09 + stats.pauses * 0.035);
  const GO = clamp01(shortReads * 0.08 + hiddenLetters * 0.035 + skipped * 0.08);
  const epsilon = clamp01(area / viewportArea);
  const phi = clamp01(((1 / (IHG + 0.1)) * NTI * (1 / (LDI + 0.1)) + epsilon) / 12);

  const reason = [
    readChapters ? 'lectura narrativa registrada' : 'no calculable: falta lectura narrativa',
    stats.mouseTotal ? 'recorrido del mouse registrado' : 'no calculable: falta recorrido del mouse',
    session.choices.length || session.texts.length ? 'decisiones o texto registrados' : 'decision de salida aun sin respuesta',
  ];
  return { IHG, NTI, LDI, GO, epsilon, phi, reason };
}

function seconds(ms: number) {
  return `${Math.max(0, Math.floor(ms / 1000)).toString().padStart(2, '0')}s`;
}

export function MophFieldGate() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statsRef = useRef<ObservedStats>(newStats());
  const dragLetterRef = useRef<number | null>(null);
  const lastDragRef = useRef({ x: 0, y: 0 });
  const [session, setSession] = useState<SessionState>(() => loadSession());
  const [selectedLetter, setSelectedLetter] = useState<number | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [metricsTick, setMetricsTick] = useState(0);
  const [persistStatus, setPersistStatus] = useState<string | null>(null);

  const activeIndex = Math.max(0, MOPH_STORY.findIndex((chapter) => chapter.key === session.activeKey));
  const active = MOPH_STORY[activeIndex] ?? MOPH_STORY[0];
  const metrics = useMemo(() => computeMetrics(statsRef.current, session), [session, metricsTick]);

  const persist = useCallback((next: SessionState) => {
    setSession(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateSession = useCallback((recipe: (current: SessionState) => SessionState) => {
    setSession((current) => {
      const next = recipe(current);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const openChapter = useCallback((chapter: MophChapter) => {
    const now = Date.now();
    const existing = statsRef.current.chapterEvents[chapter.key];
    statsRef.current.chapterEvents[chapter.key] = {
      opens: (existing?.opens ?? 0) + 1,
      startedAt: now,
      readTime: existing?.readTime ?? 0,
      skipped: existing?.skipped ?? false,
    };
    statsRef.current.selectedAt = now;
    setTextDraft('');
    updateSession((current) => ({ ...current, activeKey: chapter.key }));
  }, [updateSession]);

  useEffect(() => {
    openChapter(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const idleSeconds = (Date.now() - statsRef.current.lastMoveAt) / 1000;
      if (idleSeconds > 7) statsRef.current.idleCount += 1;
      setMetricsTick((tick) => tick + 1);
    }, 2000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    const targetCanvas = canvas;
    const ctx = context;

    let width = 0;
    let height = 0;
    let frame = 0;
    let animation = 0;
    const ripples: Array<{ x: number; y: number; r: number; a: number; gold: boolean }> = [];
    const particles: Array<{ x: number; y: number; vx: number; vy: number; a: number; gold: boolean }> = [];

    function resize() {
      width = targetCanvas.width = window.innerWidth;
      height = targetCanvas.height = window.innerHeight;
    }

    function perturb(x: number, y: number, gold = false) {
      ripples.push({ x, y, r: 4, a: 0.8, gold });
      for (let index = 0; index < 12; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.8;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, a: 0.8, gold });
      }
    }

    function drawTree() {
      const cx = width * 0.5;
      const cy = height * 0.68;
      ctx.save();
      ctx.strokeStyle = 'rgba(185,150,72,.5)';
      ctx.lineWidth = 1.4;
      function branch(x: number, y: number, angle: number, length: number, depth: number) {
        if (depth > 8 || length < 5) return;
        const nx = x + Math.cos(angle) * length;
        const ny = y + Math.sin(angle) * length;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        branch(nx, ny, angle - 0.34 - Math.sin(frame * 0.01 + depth) * 0.04, length * 0.68, depth + 1);
        branch(nx, ny, angle + 0.34 + Math.cos(frame * 0.01 + depth) * 0.04, length * 0.68, depth + 1);
      }
      branch(cx, cy, -Math.PI / 2, 96, 0);
      ctx.restore();
    }

    function drawForm(form: MophChapter['form']) {
      const x = width * 0.48;
      const y = height * 0.52;
      const pulse = Math.sin(frame * 0.025) * 10;
      ctx.save();
      ctx.strokeStyle = 'rgba(185,150,72,.22)';
      ctx.lineWidth = 1;
      if (form === 'circle') {
        ctx.beginPath();
        ctx.arc(x, y, 90 + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (form === 'fracture') {
        ctx.beginPath();
        ctx.moveTo(x - 120, y);
        for (let index = 0; index < 10; index += 1) ctx.lineTo(x - 120 + index * 26, y + Math.sin(index + frame * 0.03) * 30);
        ctx.stroke();
      }
      if (form === 'spiral') {
        ctx.beginPath();
        for (let index = 0; index < 130; index += 1) {
          const angle = index * 0.13 + frame * 0.01;
          const radius = index * 0.6;
          const px = x + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius * 0.7;
          if (index === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      if (form === 'door') ctx.strokeRect(x - 55, y - 95, 110, 180);
      ctx.restore();
    }

    function draw() {
      frame += 1;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#020202';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(185,150,72,.055)';
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      drawForm(active.form);
      if (active.treeVisible) drawTree();
      session.marks.forEach((mark, index) => {
        ctx.beginPath();
        ctx.arc(mark.x, mark.y, 7 + Math.sin(frame * 0.03 + index) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(232,221,195,.35)';
        ctx.stroke();
        ctx.fillStyle = 'rgba(232,221,195,.45)';
        ctx.font = '10px monospace';
        ctx.fillText(mark.text, mark.x + 10, mark.y - 8);
      });
      ripples.forEach((ripple) => {
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2);
        ctx.strokeStyle = ripple.gold ? `rgba(185,150,72,${ripple.a})` : `rgba(232,221,195,${ripple.a * 0.45})`;
        ctx.stroke();
        ripple.r += 1.6;
        ripple.a *= 0.96;
      });
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.a -= 0.012;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.gold ? 2 : 1.2, 0, Math.PI * 2);
        ctx.fillStyle = particle.gold ? `rgba(185,150,72,${particle.a})` : `rgba(232,221,195,${particle.a * 0.5})`;
        ctx.fill();
      });
      animation = window.requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    const handler = (event: PointerEvent) => perturb(event.clientX, event.clientY, event.detail > 1);
    targetCanvas.addEventListener('pointerdown', handler);
    return () => {
      window.cancelAnimationFrame(animation);
      window.removeEventListener('resize', resize);
      targetCanvas.removeEventListener('pointerdown', handler);
    };
  }, [active.form, active.treeVisible, session.marks]);

  const trackMove = useCallback((x: number, y: number) => {
    const stats = statsRef.current;
    stats.mouseTotal += 1;
    stats.lastMoveAt = Date.now();
    stats.minX = Math.min(stats.minX, x);
    stats.maxX = Math.max(stats.maxX, x);
    stats.minY = Math.min(stats.minY, y);
    stats.maxY = Math.max(stats.maxY, y);
    if (stats.mousePath.length < 900 && stats.mouseTotal % 5 === 0) stats.mousePath.push({ x, y, at: Date.now() });
  }, []);

  function completeChapter(action: string) {
    const now = Date.now();
    const current = statsRef.current.chapterEvents[active.key] ?? { opens: 1, startedAt: statsRef.current.selectedAt, readTime: 0, skipped: false };
    const readTime = (now - current.startedAt) / 1000;
    statsRef.current.chapterEvents[active.key] = { ...current, readTime: current.readTime + readTime, skipped: current.skipped || readTime < 3 };
    if (now - statsRef.current.selectedAt > 6000 && session.choices.length + session.texts.length === 0) statsRef.current.pauses += 1;

    const nextIndex = Math.min(activeIndex + 1, MOPH_STORY.length - 1);
    const next = MOPH_STORY[nextIndex];
    updateSession((currentSession) => ({
      ...currentSession,
      done: Array.from(new Set([...currentSession.done, active.key])),
      activeKey: next.key,
      final: currentSession.final || active.final || action.includes('conservar'),
    }));
    openChapter(next);
  }

  function choose(value: string) {
    updateSession((current) => ({
      ...current,
      choices: [...current.choices, { chapter: active.key, value, latencyMs: Date.now() - statsRef.current.selectedAt }],
    }));
  }

  function saveText() {
    updateSession((current) => ({
      ...current,
      texts: [...current.texts, { chapter: active.key, length: textDraft.trim().length, latencyMs: Date.now() - statsRef.current.selectedAt }],
    }));
  }

  function resetLocal() {
    window.localStorage.removeItem(STORAGE_KEY);
    const next = { startedAt: Date.now(), letters: initialLetters(window.innerWidth, window.innerHeight), marks: [], done: [], activeKey: 'carta', color: 0, choices: [], texts: [], final: false };
    statsRef.current = newStats();
    persist(next);
    openChapter(MOPH_STORY[0]);
  }

  async function movementDigest() {
    const stats = statsRef.current;
    const payload = JSON.stringify({
      mouseTotal: stats.mouseTotal,
      idleCount: stats.idleCount,
      pauses: stats.pauses,
      bounds: [Math.round(stats.minX), Math.round(stats.maxX), Math.round(stats.minY), Math.round(stats.maxY)],
      chapters: Object.keys(stats.chapterEvents).sort(),
      choices: session.choices.length,
      texts: session.texts.length,
    });
    const bytes = new TextEncoder().encode(payload);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function persistAnonymousSession() {
    setPersistStatus('persistiendo');
    try {
      const digest = await movementDigest();
      const response = await fetch('/api/moph/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionKey: `moph_${session.startedAt.toString(36)}`,
          consentState: 'anonymous_persisted',
          movementTraceDigest: digest,
          choices: session.choices,
          texts: session.texts.map((item) => ({ chapter: item.chapter, length: item.length, editRatio: 0 })),
          behavioralNodes: behaviorNodes.map((node) => node.id),
          metrics: {
            ihg: metrics.IHG,
            nti: metrics.NTI,
            ldi: metrics.LDI,
            go: metrics.GO,
            epsilon: metrics.epsilon,
            phi: metrics.phi,
          },
          publicSummary: {
            chaptersRead: session.done.length,
            marks: session.marks.length,
            hiddenLetters: session.letters.filter((letter) => letter.hidden).length,
          },
        }),
      });
      const json = await response.json() as { ok?: boolean; session?: { stored?: boolean; warnings?: string[] }; error?: string };
      if (!json.ok) throw new Error(json.error ?? 'moph_session_failed');
      setPersistStatus(json.session?.stored ? 'sesion anonima persistida' : `sesion anonima retenida localmente / ${json.session?.warnings?.[0] ?? 'store degradado'}`);
    } catch (error) {
      setPersistStatus(error instanceof Error ? error.message : 'moph_session_failed');
    }
  }

  const behaviorNodes = useMemo(() => {
    const events = Object.values(statsRef.current.chapterEvents);
    const shortReads = events.filter((event) => event.readTime > 0 && event.readTime < 4).length;
    const reopens = events.reduce((sum, event) => sum + Math.max(0, event.opens - 1), 0);
    const area = Number.isFinite(statsRef.current.maxX - statsRef.current.minX) ? Math.hypot(statsRef.current.maxX - statsRef.current.minX, statsRef.current.maxY - statsRef.current.minY) : 0;
    return MOPH_BEHAVIOR_NODES.filter((node) => {
      if (node.id === 'errancia') return area > 520 && session.done.length < 4;
      if (node.id === 'persistencia') return statsRef.current.idleCount > 2 || events.some((event) => event.readTime > 24);
      if (node.id === 'fuga') return shortReads > 2;
      if (node.id === 'resonancia') return reopens > 0;
      if (node.id === 'hesitacion') return statsRef.current.pauses > 1;
      return false;
    });
  }, [metricsTick, session.done.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'c') {
        updateSession((current) => {
          const nextColor = (current.color + 1) % PALETTE.length;
          return {
            ...current,
            color: nextColor,
            letters: current.letters.map((letter, index) => selectedLetter === null || selectedLetter === index ? { ...letter, color: nextColor } : letter),
          };
        });
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedLetter !== null) {
        event.preventDefault();
        updateSession((current) => ({ ...current, letters: current.letters.map((letter, index) => index === selectedLetter ? { ...letter, hidden: !letter.hidden } : letter) }));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedLetter, updateSession]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020202] text-[#e8ddc3]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair"
        onPointerMove={(event) => trackMove(event.clientX, event.clientY)}
        onDoubleClick={(event) => {
          const label = `marca ${session.marks.length + 1}`;
          updateSession((current) => ({ ...current, marks: [...current.marks, { x: event.clientX, y: event.clientY, text: label, at: Date.now() }] }));
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,.72)_100%)]" />
      <div className="pointer-events-none absolute inset-[22px] border border-[#b9964820]" />

      <header className="absolute left-8 right-8 top-7 z-20 flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-[#b9964866]">
        <div>MOP-H Field Gate / evidencia local</div>
        <nav className="flex gap-2">
          <Link href="/repository" className="border border-[#b9964830] px-3 py-2 text-[#b99648]">Repositorio</Link>
          <Link href="/scorefriction" className="border border-[#b9964830] px-3 py-2 text-[#b99648]">ScoreFriction</Link>
          <Link href="/root" className="border border-[#b9964830] px-3 py-2 text-[#b99648]">ROOT</Link>
        </nav>
      </header>

      <aside className="absolute right-8 top-24 z-30 w-[min(390px,34vw)]">
        <AmvChat
          module="moph"
          sessionId="moph-field-gate"
          title="AMV / MOP-H"
          context={{
            activeChapter: active.key,
            done: session.done.length,
            metrics,
            behaviorNodes: behaviorNodes.map((node) => node.id),
          }}
          compact
        />
      </aside>

      <div className="absolute inset-0 z-10">
        {session.letters.map((letter, index) => letter.ch === ' ' ? null : (
          <button
            key={`${letter.ch}-${index}`}
            onPointerDown={(event) => {
              dragLetterRef.current = index;
              lastDragRef.current = { x: event.clientX, y: event.clientY };
              setSelectedLetter(index);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (dragLetterRef.current !== index) return;
              const dx = event.clientX - lastDragRef.current.x;
              const dy = event.clientY - lastDragRef.current.y;
              lastDragRef.current = { x: event.clientX, y: event.clientY };
              trackMove(event.clientX, event.clientY);
              updateSession((current) => ({ ...current, letters: current.letters.map((item, itemIndex) => itemIndex === index ? { ...item, x: item.x + dx, y: item.y + dy } : item) }));
            }}
            onPointerUp={() => { dragLetterRef.current = null; }}
            className={`absolute z-20 cursor-grab border-0 bg-transparent p-0 font-serif text-[clamp(2.4rem,6.5vw,5.8rem)] uppercase leading-none tracking-[0.05em] transition-opacity ${selectedLetter === index ? 'drop-shadow-[0_0_24px_rgba(185,150,72,.5)]' : ''} ${letter.hidden ? 'opacity-10' : 'opacity-95'}`}
            style={{ left: letter.x, top: letter.y, color: PALETTE[letter.color] }}
          >
            {letter.ch}
          </button>
        ))}
      </div>

      <section className="absolute left-[min(7vw,72px)] top-[24vh] z-30 max-h-[68vh] w-[min(720px,86vw)] overflow-auto border border-[#b9964847] bg-[#090907f2] p-6 shadow-[0_28px_80px_rgba(0,0,0,.88)] md:p-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#b99648]">{active.kicker}</div>
        <h1 className="mt-3 font-serif text-[clamp(1.7rem,3.4vw,3rem)] uppercase leading-none tracking-[0.04em]">{active.title}</h1>
        <div className="mt-6 space-y-4 font-serif text-[1rem] leading-7 text-[#e8ddc399]">
          {active.parts.map((part) => <p key={part}>{part}</p>)}
        </div>

        {active.question ? (
          <div className="mt-6 border border-[#e8ddc31a] bg-black/25 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8ddc380]">{active.question.prompt}</div>
            <p className="mt-2 text-sm italic text-[#e8ddc370]">{active.question.detail}</p>
            {active.question.type === 'choice' ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {active.question.options.map((option) => (
                  <button key={option} onClick={() => choose(option)} className="border border-[#e8ddc324] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#e8ddc3aa] hover:border-[#b99648] hover:text-[#b99648]">
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <textarea value={textDraft} onChange={(event) => setTextDraft(event.target.value)} className="min-h-[96px] w-full resize-y border border-[#b9964838] bg-black/40 p-3 font-serif text-sm leading-6 text-[#e8ddc3] outline-none" />
                <button onClick={saveText} className="mt-2 border border-[#b9964866] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#b99648]">Registrar respuesta</button>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-[#b9964820] pt-4">
          {active.actions.map((action) => (
            <button key={action} onClick={() => completeChapter(action)} className="border border-[#b996484d] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#b99648] hover:bg-[#b9964812]">
              {action}
            </button>
          ))}
          <button onClick={() => openChapter(active)} className="border border-[#e8ddc31a] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8ddc366]">Reabrir</button>
        </div>
        <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[#e8ddc344]">
          {activeIndex + 1}/{MOPH_STORY.length} / leidos {session.done.length} / sesion {seconds(Date.now() - session.startedAt)}
        </div>
      </section>

      <aside className="absolute bottom-16 right-8 z-30 text-right font-mono text-[9px] uppercase leading-6 tracking-[0.14em] text-[#b9964870]">
        <div><span className="text-[#e8ddc344]">IHG</span> {metrics.IHG.toFixed(2)}</div>
        <div><span className="text-[#e8ddc344]">NTI</span> {metrics.NTI.toFixed(2)}</div>
        <div><span className="text-[#e8ddc344]">LDI</span> {metrics.LDI.toFixed(2)}</div>
        <div><span className="text-[#e8ddc344]">G.O.</span> {metrics.GO.toFixed(2)}</div>
        <div><span className="text-[#e8ddc344]">epsilon</span> {metrics.epsilon.toFixed(2)}</div>
        <div className="mt-1 text-[11px] text-[#b99648]">Phi(t) = {metrics.phi.toFixed(3)}</div>
      </aside>

      <div className="absolute bottom-8 left-8 z-30 flex max-w-[560px] flex-wrap gap-2">
        {behaviorNodes.map((node, index) => (
          <div key={node.id} className="border border-[#b9964833] bg-black/40 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: node.color, transform: `translateY(${index % 2 ? -10 : 0}px)` }}>
            {node.label} <span className="text-[#e8ddc344]">/ {node.description}</span>
          </div>
        ))}
      </div>

      {(session.final || active.final) ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
          <section className="w-[min(880px,90vw)] border border-[#b996484d] bg-[#080806fa] p-8 md:p-14">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#b99648]">System Friction Institute / MOP-H session complete</p>
            <h2 className="mt-4 font-serif text-[clamp(2rem,4vw,3.2rem)] uppercase leading-none">El campo te ha visto.</h2>
            <p className="mt-5 max-w-2xl font-serif text-base leading-7 text-[#e8ddc399]">No solo leiste una historia. Produjiste evidencia local: recorrido, pausas, marcas, decisiones, texto y latencias. Por defecto queda local; si aceptas, se envia una sesion anonima sin texto completo ni coordenadas crudas.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              {Object.entries({ IHG: metrics.IHG, NTI: metrics.NTI, LDI: metrics.LDI, GO: metrics.GO, epsilon: metrics.epsilon }).map(([label, value]) => (
                <div key={label} className="border border-[#b9964824] bg-black/35 p-4 text-center">
                  <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#e8ddc355]">{label}</div>
                  <div className="mt-2 font-mono text-xl text-[#b99648]">{value.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 font-mono text-[10px] uppercase leading-5 tracking-[0.12em] text-[#e8ddc360]">{metrics.reason.join(' / ')}</div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/repository" className="border border-[#b9964866] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#b99648]">Repositorio</Link>
              <Link href="/scorefriction" className="border border-[#b9964866] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#b99648]">ScoreFriction</Link>
              <Link href="/root" className="border border-[#b9964866] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#b99648]">ROOT</Link>
              <button onClick={() => void persistAnonymousSession()} className="border border-[#b9964866] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#b99648]">Persistir anonimo</button>
              <button onClick={resetLocal} className="border border-[#e8ddc326] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8ddc380]">Reiniciar local</button>
            </div>
            {persistStatus ? <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#b99648]">{persistStatus}</div> : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
