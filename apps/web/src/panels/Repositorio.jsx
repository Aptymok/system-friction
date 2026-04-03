import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useStore, fmt2 } from '../store.jsx'
import { AudioEngine } from '../studio/audio/AudioEngine'
import { metricsFromSocsim, generationControls } from '../studio/metrics/systemFrictionMetrics'
import { composeFromPrompt } from '../studio/agent/composerAgent'
import { quantizeBeat } from '../studio/daw/timeline'

const GRID = 0.25
const PX_PER_BEAT = 54

const initialTracks = [
  { id: 'tr-1', name: 'SYNTH', volume: 0.75, pan: 0, sourceType: 'osc', waveform: 'sawtooth' },
  { id: 'tr-2', name: 'SAMPLER', volume: 0.65, pan: -0.1, sourceType: 'sampler', waveform: 'triangle' },
]

export default function Repositorio() {
  const { store } = useStore()
  const audioRef = useRef(new AudioEngine())
  const schedulerRef = useRef(null)
  const dragRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [playheadBeat, setPlayheadBeat] = useState(0)
  const [tempo, setTempo] = useState(108)
  const [tracks, setTracks] = useState(initialTracks)
  const [clips, setClips] = useState([])
  const [prompt, setPrompt] = useState('generate melancholic loop')
  const [fx, setFx] = useState({ filterHz: 12000, delayMix: 0.22, reverbMix: 0.18 })
  const [userProfile, setUserProfile] = useState('novato')
  const [editActions, setEditActions] = useState(0)

  const playheadRef = useRef(0)
  const tempoRef = useRef(tempo)
  const clipsRef = useRef(clips)
  const tracksRef = useRef(tracks)

  const metrics = useMemo(() => metricsFromSocsim(store.socsim), [store.socsim])
  const controls = useMemo(() => generationControls(metrics), [metrics])
  const profileConfig = useMemo(() => ({
    novato: { showFx: false, showPan: false, showSource: false, depth: 1, cognitiveThreshold: 0.35 },
    intermedio: { showFx: true, showPan: true, showSource: false, depth: 2, cognitiveThreshold: 0.62 },
    pro: { showFx: true, showPan: true, showSource: true, depth: 3, cognitiveThreshold: 0.9 },
  }), [])
  const uiMode = profileConfig[userProfile]


  useEffect(() => { playheadRef.current = playheadBeat }, [playheadBeat])
  useEffect(() => { tempoRef.current = tempo }, [tempo])
  useEffect(() => { clipsRef.current = clips }, [clips])
  useEffect(() => { tracksRef.current = tracks }, [tracks])
  useEffect(() => {
    setTempo(controls.tempo)
  }, [controls.tempo])

  useEffect(() => {
    if (editActions > 12) setUserProfile('pro')
    else if (editActions > 5) setUserProfile('intermedio')
  }, [editActions])

  useEffect(() => {
    tracks.forEach((track) => audioRef.current.updateTrack(track))
  }, [tracks])

  useEffect(() => {
    audioRef.current.setMasterFx(fx)
  }, [fx])

  useEffect(() => {
    return () => {
      if (schedulerRef.current) window.clearInterval(schedulerRef.current)
    }
  }, [])

  const initAudio = async () => {
    await audioRef.current.resume()
    tracks.forEach((track) => audioRef.current.updateTrack(track))
    audioRef.current.setMasterFx(fx)
    setReady(true)
  }

  const buildAndPlaceClip = () => {
    const trackId = tracks[clips.length % tracks.length].id
    const clip = composeFromPrompt({
      prompt,
      metrics,
      controls,
      tempo,
      trackId,
    })
    clip.startBeat = quantizeBeat(playheadBeat, GRID)
    setClips((prev) => [...prev, clip])
    setEditActions((n) => n + 1)
  }

  const scheduleWindow = () => {
    const engine = audioRef.current
    if (!engine.ctx) return

    const now = engine.ctx.currentTime
    const lookAheadSec = 0.16
    const currentBeat = playheadRef.current
    const currentTempo = tempoRef.current
    const endBeat = currentBeat + (currentTempo / 60) * lookAheadSec

    clipsRef.current.forEach((clip) => {
      const track = tracksRef.current.find((t) => t.id === clip.trackId)
      if (!track) return
      clip.notes.forEach((n) => {
        const noteBeat = clip.startBeat + n.step / 4
        if (noteBeat >= currentBeat && noteBeat < endBeat) {
          const offsetSec = ((noteBeat - currentBeat) * 60) / currentTempo
          const when = now + Math.max(0, offsetSec)
          const duration = (n.beats * 60) / currentTempo
          engine.scheduleNote(track, n, when, duration)
        }
      })
    })

    setPlayheadBeat(endBeat)
  }

  const startTransport = async () => {
    await initAudio()
    if (schedulerRef.current) window.clearInterval(schedulerRef.current)
    setPlaying(true)
    schedulerRef.current = window.setInterval(scheduleWindow, 40)
  }

  const stopTransport = () => {
    if (schedulerRef.current) window.clearInterval(schedulerRef.current)
    schedulerRef.current = null
    setPlaying(false)
  }

  const updateTrack = (id, patch) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    setEditActions((n) => n + 1)
  }

  const onClipPointerDown = (event, clipId) => {
    const clip = clips.find((c) => c.id === clipId)
    if (!clip) return
    dragRef.current = {
      clipId,
      startX: event.clientX,
      startY: event.clientY,
      baseBeat: clip.startBeat,
      baseTrack: tracks.findIndex((t) => t.id === clip.trackId),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onTimelinePointerMove = (event) => {
    if (!dragRef.current) return
    const d = dragRef.current
    const beatDelta = (event.clientX - d.startX) / PX_PER_BEAT
    const rawBeat = d.baseBeat + beatDelta

    const laneDelta = Math.round((event.clientY - d.startY) / 56)
    const trackIndex = Math.max(0, Math.min(tracks.length - 1, d.baseTrack + laneDelta))
    const newTrackId = tracks[trackIndex].id

    setClips((prev) => prev.map((c) => (c.id === d.clipId
      ? { ...c, startBeat: Math.max(0, quantizeBeat(rawBeat, GRID)), trackId: newTrackId }
      : c)))
    setEditActions((n) => n + 1)
  }

  const onTimelinePointerUp = () => {
    dragRef.current = null
  }

  const bars = 8
  const totalBeats = bars * 4

  return (
    <>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">01</span>
          <span className="sec-t">ScoreFriction STUDIO / DAW</span>
          <span className="pnl-st" style={{ marginLeft: 'auto' }}>{ready ? 'AUDIO READY' : 'AUDIO LOCKED'}</span>
        </div>
        <div className="sec-d">Browser DAW with HIMH v3 generation, live SystemFriction modulation, draggable clips, and real Web Audio routing.</div>
      </div>

      <div className="pnl" style={{ marginBottom: 12 }}>
        <div className="pnl-hd"><span className="pnl-lbl">ADAPTIVE UI LAYER</span></div>
        <div className="pnl-body">
          <div className="slider-row">
            <span className="slider-lbl">PROFILE</span>
            <select className="inp" value={userProfile} onChange={(e) => setUserProfile(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="novato">novato</option>
              <option value="intermedio">intermedio</option>
              <option value="pro">pro</option>
            </select>
            <span className="slider-val">Depth {uiMode.depth}</span>
          </div>
          <div className="row3" style={{ marginTop: 8 }}>
            <div className="cell"><div className="cell-lbl">VISIBLE CONTROLS</div><div className="cell-v">{uiMode.showFx ? 'FULL' : 'CORE'}</div></div>
            <div className="cell"><div className="cell-lbl">COGNITIVE THRESHOLD</div><div className="cell-v">{fmt2(uiMode.cognitiveThreshold)}</div></div>
            <div className="cell"><div className="cell-lbl">REAL-TIME FEEDBACK</div><div className="cell-v">{playing ? 'LIVE' : 'IDLE'}</div></div>
          </div>
        </div>
      </div>

      <div className="studio-grid">
        <div className="pnl">
          <div className="pnl-hd"><span className="pnl-lbl">TRANSPORT + AI COMPOSER</span></div>
          <div className="pnl-body">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button className="btn" onClick={initAudio}>INIT AUDIO</button>
              {!playing ? (
                <button className="btn btn-n" onClick={startTransport} disabled={!ready}>PLAY</button>
              ) : (
                <button className="btn btn-r" onClick={stopTransport}>STOP</button>
              )}
              <button className="btn btn-g" onClick={() => setPlayheadBeat(0)}>REWIND</button>
            </div>

            <div className="slider-row">
              <span className="slider-lbl">TEMPO</span>
              <input type="range" min="70" max="170" value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
              <span className="slider-val">{tempo}</span>
            </div>

            {uiMode.showFx && (
              <>
                <div className="slider-row">
                  <span className="slider-lbl">FILTER</span>
                  <input type="range" min="300" max="16000" step="10" value={fx.filterHz} onChange={(e) => setFx((f) => ({ ...f, filterHz: Number(e.target.value) }))} />
                  <span className="slider-val">{fx.filterHz}</span>
                </div>

                <div className="slider-row">
                  <span className="slider-lbl">DELAY</span>
                  <input type="range" min="0" max="0.95" step="0.01" value={fx.delayMix} onChange={(e) => setFx((f) => ({ ...f, delayMix: Number(e.target.value) }))} />
                  <span className="slider-val">{fx.delayMix.toFixed(2)}</span>
                </div>

                <div className="slider-row">
                  <span className="slider-lbl">REVERB</span>
                  <input type="range" min="0" max="0.95" step="0.01" value={fx.reverbMix} onChange={(e) => setFx((f) => ({ ...f, reverbMix: Number(e.target.value) }))} />
                  <span className="slider-val">{fx.reverbMix.toFixed(2)}</span>
                </div>
              </>
            )}

            <div style={{ marginTop: 12 }}>
              <label className="inp-lbl">AI PROMPT</label>
              <input className="inp" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <button className="btn" style={{ marginTop: 8 }} onClick={buildAndPlaceClip} disabled={!ready}>GENERATE CLIP</button>
            </div>
          </div>
        </div>

        <div className="pnl">
          <div className="pnl-hd"><span className="pnl-lbl">SYSTEMFRICTION METRICS (LIVE)</span></div>
          <div className="pnl-body">
            <div className="row3">
              <div className="cell"><div className="cell-lbl">COHERENCE (C)</div><div className="cell-v">{fmt2(metrics.C)}</div></div>
              <div className="cell"><div className="cell-lbl">TENSION (T)</div><div className="cell-v">{fmt2(metrics.T)}</div></div>
              <div className="cell"><div className="cell-lbl">ACTIVATION (A)</div><div className="cell-v">{fmt2(metrics.A)}</div></div>
            </div>
            <div className="row3" style={{ marginTop: 8 }}>
              <div className="cell"><div className="cell-lbl">TEMPO INFLUENCE</div><div className="cell-v">{controls.tempo}</div></div>
              <div className="cell"><div className="cell-lbl">DENSITY</div><div className="cell-v">{fmt2(controls.density)}</div></div>
              <div className="cell"><div className="cell-lbl">HARMONIC VAR.</div><div className="cell-v">{fmt2(controls.harmonicVariation)}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="sec" style={{ marginTop: '1rem' }}>
        <div className="sec-hd"><span className="sec-n">02</span><span className="sec-t">Timeline + Mixer</span></div>
        <div className="studio-grid">
          <div className="pnl">
            <div className="pnl-hd"><span className="pnl-lbl">TIMELINE</span><span className="pnl-st">Playhead: {fmt2(playheadBeat)} beats</span></div>
            <div className="pnl-body">
              <div className="timeline" onPointerMove={onTimelinePointerMove} onPointerUp={onTimelinePointerUp}>
                {Array.from({ length: totalBeats + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className={`timeline-gridline${i % 4 === 0 ? ' bar' : ''}`}
                    style={{ left: i * PX_PER_BEAT }}
                  />
                ))}

                <div className="playhead" style={{ left: playheadBeat * PX_PER_BEAT }} />

                {tracks.map((t, idx) => (
                  <div key={t.id} className="timeline-lane" style={{ top: idx * 56 }}>
                    <span className="timeline-lane-name">{t.name}</span>
                  </div>
                ))}

                {clips.map((clip) => {
                  const trackIndex = tracks.findIndex((t) => t.id === clip.trackId)
                  return (
                    <button
                      key={clip.id}
                      type="button"
                      className="clip"
                      style={{
                        left: clip.startBeat * PX_PER_BEAT,
                        top: trackIndex * 56 + 22,
                        width: clip.lengthBeats * PX_PER_BEAT,
                        borderColor: clip.color,
                      }}
                      onPointerDown={(e) => onClipPointerDown(e, clip.id)}
                    >
                      {clip.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="pnl">
            <div className="pnl-hd"><span className="pnl-lbl">MIXER</span></div>
            <div className="pnl-body">
              {tracks.map((t) => (
                <div key={t.id} style={{ borderBottom: '0.5px solid var(--bdr)', padding: '8px 0 12px' }}>
                  <div className="cell-lbl" style={{ marginBottom: 6 }}>{t.name} · {t.sourceType}</div>
                  <div className="slider-row">
                    <span className="slider-lbl">VOLUME</span>
                    <input type="range" min="0" max="1" step="0.01" value={t.volume} onChange={(e) => updateTrack(t.id, { volume: Number(e.target.value) })} />
                    <span className="slider-val">{t.volume.toFixed(2)}</span>
                  </div>
                  {uiMode.showPan && (
                    <div className="slider-row">
                      <span className="slider-lbl">PAN</span>
                      <input type="range" min="-1" max="1" step="0.01" value={t.pan} onChange={(e) => updateTrack(t.id, { pan: Number(e.target.value) })} />
                      <span className="slider-val">{t.pan.toFixed(2)}</span>
                    </div>
                  )}
                  {uiMode.showSource && (
                    <div className="slider-row">
                      <span className="slider-lbl">SOURCE</span>
                      <select className="inp" value={t.sourceType} onChange={(e) => updateTrack(t.id, { sourceType: e.target.value })} style={{ maxWidth: 160 }}>
                        <option value="osc">oscillator</option>
                        <option value="sampler">sampler</option>
                      </select>
                      <span className="slider-val">audio</span>
                    </div>
                  )}
                  {uiMode.showSource && t.sourceType === 'osc' && (
                    <div className="slider-row">
                      <span className="slider-lbl">WAVE</span>
                      <select className="inp" value={t.waveform} onChange={(e) => updateTrack(t.id, { waveform: e.target.value })} style={{ maxWidth: 160 }}>
                        <option value="sine">sine</option>
                        <option value="triangle">triangle</option>
                        <option value="square">square</option>
                        <option value="sawtooth">sawtooth</option>
                      </select>
                      <span className="slider-val">{t.waveform}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
