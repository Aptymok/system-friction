'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';
import { featurePayload, metricByKey, objectAudioHref } from './workspaceModel';

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function num(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function payloadArray(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return Array.isArray(value) ? value : [];
}

export function StudioWaveform({ state }: { state: StudioProductionState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const href = objectAudioHref(state);
  const waveform = state.audioFeatures.waveform;
  const activeLayers = useStudioWorkspaceStore((store) => store.activeLayers);
  const currentTime = useStudioWorkspaceStore((store) => store.currentTimeSeconds);
  const setCurrentTime = useStudioWorkspaceStore((store) => store.setCurrentTime);
  const isPlaying = useStudioWorkspaceStore((store) => store.isPlaying);
  const setPlaying = useStudioWorkspaceStore((store) => store.setPlaying);
  const selection = useStudioWorkspaceStore((store) => store.selection);
  const setSelection = useStudioWorkspaceStore((store) => store.setSelection);
  const zoom = useStudioWorkspaceStore((store) => store.zoom);
  const loopEnabled = useStudioWorkspaceStore((store) => store.loopEnabled);
  const duration = Number(metricByKey(state, 'duration_seconds')?.value ?? 0);
  const momentary = useMemo(() => payloadArray(featurePayload(state, 'momentary_lufs_summary'), 'summaryWindows'), [state]);
  const shortTerm = useMemo(() => payloadArray(featurePayload(state, 'short_term_lufs_summary'), 'summaryWindows'), [state]);
  const truePeak = metricByKey(state, 'true_peak_dbtp');
  const truePeakPayload = featurePayload(state, 'true_peak_dbtp');
  const truePeakLocation = ((truePeakPayload.details as Record<string, unknown> | undefined)?.peakLocation ?? {}) as Record<string, unknown>;
  const truePeakTime = num(truePeakLocation.timestampSeconds);
  const rhythmEvidence = featurePayload(state, 'rhythm_onset_count').evidence as Record<string, unknown> | undefined;
  const onsets = asRecords((rhythmEvidence?.onsetSummary as Record<string, unknown> | undefined)?.strongest);
  const beats = asRecords((rhythmEvidence?.beats as Record<string, unknown> | undefined)?.sample);
  const harmonyEvidence = featurePayload(state, 'harmonic_change_count').evidence as Record<string, unknown> | undefined;
  const harmonicChanges = asRecords((harmonyEvidence?.harmonicChanges as Record<string, unknown> | undefined)?.sample);
  const pitchFrames = asRecords(((featurePayload(state, 'fundamental_frequency_hz').pitch as Record<string, unknown> | undefined)?.frames));
  const chromaFrames = asRecords(((featurePayload(state, 'chroma_distribution').chroma as Record<string, unknown> | undefined)?.frames));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#030302';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = 'rgba(193, 143, 71, 0.14)';
    ctx.lineWidth = 1;
    for (let index = 0; index <= 12; index += 1) {
      const x = (index / 12) * rect.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let index = 0; index <= 4; index += 1) {
      const y = (index / 4) * rect.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    const visible = Math.max(1, Math.floor(waveform.length / zoom));
    const start = Math.max(0, Math.min(waveform.length - visible, Math.floor((currentTime / Math.max(1, duration)) * waveform.length) - Math.floor(visible / 2)));
    const slice = waveform.slice(start, start + visible);
    const center = rect.height * 0.48;
    const amp = rect.height * 0.37;
    if (activeLayers.includes('WAVEFORM') && slice.length) {
      ctx.strokeStyle = '#d8ad68';
      ctx.lineWidth = 1;
      ctx.beginPath();
      slice.forEach((value, index) => {
        const x = (index / Math.max(1, slice.length - 1)) * rect.width;
        const y = center - Math.max(0, Math.min(1, value)) * amp;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      for (let index = slice.length - 1; index >= 0; index -= 1) {
        const x = (index / Math.max(1, slice.length - 1)) * rect.width;
        const y = center + Math.max(0, Math.min(1, slice[index])) * amp;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(216, 173, 104, 0.18)';
      ctx.fill();
      ctx.stroke();
    }

    const drawCurve = (rows: unknown[], color: string) => {
      const points = asRecords(rows)
        .map((row) => ({ t: num(row.startSeconds) ?? num(row.t0), v: num(row.loudnessLufs) }))
        .filter((point): point is { t: number; v: number } => point.t !== null && point.v !== null);
      if (points.length < 2 || duration <= 0) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      points.forEach((point, index) => {
        const x = (point.t / duration) * rect.width;
        const y = rect.height * 0.18 + Math.max(0, Math.min(1, (point.v + 60) / 50)) * rect.height * 0.42;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    if (activeLayers.includes('MOMENTARY_LUFS')) drawCurve(momentary, '#f0c47d');
    if (activeLayers.includes('SHORT_TERM_LUFS')) drawCurve(shortTerm, '#a8793c');

    const marker = (time: number, color: string, height = rect.height) => {
      if (duration <= 0) return;
      const x = (time / duration) * rect.width;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    };
    if (activeLayers.includes('ONSETS')) onsets.forEach((onset) => marker(num(onset.timestampSeconds) ?? 0, 'rgba(246, 190, 105, 0.82)', rect.height * 0.72));
    if (activeLayers.includes('BEATS') && zoom >= 2.2) beats.forEach((beat) => marker(num(beat.timestampSeconds) ?? 0, 'rgba(174, 126, 58, 0.55)', rect.height));
    if (activeLayers.includes('HARMONIC_CHANGES') && zoom >= 2.2) {
      harmonicChanges.forEach((event) => {
        const strength = num(event.strength) ?? 0.4;
        marker(num(event.timestampSeconds) ?? 0, `rgba(255, 111, 72, ${Math.max(0.35, Math.min(0.95, strength))})`, rect.height * 0.86);
      });
    }
    if (activeLayers.includes('PITCH') && zoom >= 6 && pitchFrames.length && duration > 0) {
      const points = pitchFrames
        .map((frame) => ({ t: num(frame.timestampSeconds), f: num(frame.frequencyHz), c: num(frame.confidence) ?? 0 }))
        .filter((point): point is { t: number; f: number; c: number } => point.t !== null && point.f !== null && point.c >= 0.4);
      if (points.length > 1) {
        const minPitch = Math.min(...points.map((point) => point.f));
        const maxPitch = Math.max(...points.map((point) => point.f));
        ctx.strokeStyle = 'rgba(248, 219, 160, 0.82)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        points.forEach((point, index) => {
          const x = (point.t / duration) * rect.width;
          const y = rect.height * 0.86 - ((point.f - minPitch) / Math.max(1e-9, maxPitch - minPitch)) * rect.height * 0.24;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }
    if (activeLayers.includes('CHROMA') && zoom >= 2.2 && chromaFrames.length && duration > 0) {
      const laneTop = rect.height * 0.05;
      const laneHeight = rect.height * 0.08;
      chromaFrames.slice(0, 512).forEach((frame) => {
        const t = num(frame.timestampSeconds);
        const values = Array.isArray(frame.values) ? frame.values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) : [];
        if (t === null || values.length !== 12) return;
        const max = Math.max(...values);
        const hue = values.indexOf(max) * 30;
        const x = (t / duration) * rect.width;
        ctx.fillStyle = `hsla(${hue}, 62%, 58%, ${Math.max(0.14, Math.min(0.55, max * 3))})`;
        ctx.fillRect(x, laneTop, Math.max(1, rect.width / Math.max(1, chromaFrames.length)), laneHeight);
      });
    }
    if (activeLayers.includes('TRUE_PEAK_EVENTS') && zoom >= 6 && typeof truePeak?.value === 'number' && truePeak.value > 0 && truePeakTime !== null) marker(truePeakTime, 'rgba(255, 82, 58, 0.94)');

    if (selection && duration > 0) {
      const x0 = (selection.startSeconds / duration) * rect.width;
      const x1 = (selection.endSeconds / duration) * rect.width;
      ctx.fillStyle = 'rgba(216, 173, 104, 0.13)';
      ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), rect.height);
    }

    marker(currentTime, '#f8dba0', rect.height);
  }, [activeLayers, beats, chromaFrames, currentTime, duration, harmonicChanges, momentary, onsets, pitchFrames, selection, shortTerm, state, truePeak, truePeakTime, waveform, zoom]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [isPlaying, setPlaying]);

  function pointerTime(event: { currentTarget: HTMLCanvasElement; clientX: number }) {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(duration || 0, ((event.clientX - rect.left) / rect.width) * (duration || 0)));
  }

  return (
    <section className="studio-waveform" aria-label="Waveform and temporal overlays">
      {href ? (
        <audio
          ref={audioRef}
          src={href}
          preload="metadata"
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            setCurrentTime(audio.currentTime);
            if (loopEnabled && selection && audio.currentTime >= selection.endSeconds) audio.currentTime = selection.startSeconds;
          }}
          onEnded={() => setPlaying(false)}
        />
      ) : null}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Real waveform with enabled metric overlays"
        onPointerDown={(event) => {
          const start = pointerTime(event);
          setSelection({ startSeconds: start, endSeconds: start });
          if (audioRef.current) audioRef.current.currentTime = start;
          setCurrentTime(start);
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 1 || !selection) return;
          setSelection({ startSeconds: selection.startSeconds, endSeconds: pointerTime(event) });
        }}
        onClick={(event) => {
          const time = pointerTime(event);
          if (audioRef.current) audioRef.current.currentTime = time;
          setCurrentTime(time);
        }}
      />
    </section>
  );
}
