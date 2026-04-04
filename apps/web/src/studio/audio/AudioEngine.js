export class AudioEngine {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.masterFilter = null
    this.masterDelay = null
    this.delayFeedback = null
    this.reverb = null
    this.reverbWet = null
    this.tracks = new Map()
    this.samplerBuffer = null
  }

  async init() {
    if (this.ctx) return
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    this.ctx = new AudioCtx()

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.8

    this.masterFilter = this.ctx.createBiquadFilter()
    this.masterFilter.type = 'lowpass'
    this.masterFilter.frequency.value = 14000

    this.masterDelay = this.ctx.createDelay(2)
    this.masterDelay.delayTime.value = 0.18

    this.delayFeedback = this.ctx.createGain()
    this.delayFeedback.gain.value = 0.22

    this.reverb = this.ctx.createConvolver()
    this.reverb.buffer = this.buildImpulseResponse(2.4)

    this.reverbWet = this.ctx.createGain()
    this.reverbWet.gain.value = 0.14

    this.masterFilter.connect(this.masterGain)
    this.masterFilter.connect(this.masterDelay)
    this.masterDelay.connect(this.delayFeedback)
    this.delayFeedback.connect(this.masterDelay)
    this.masterDelay.connect(this.masterGain)

    this.masterFilter.connect(this.reverb)
    this.reverb.connect(this.reverbWet)
    this.reverbWet.connect(this.masterGain)

    this.masterGain.connect(this.ctx.destination)

    this.samplerBuffer = this.buildSamplerBuffer()
  }

  async resume() {
    await this.init()
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  buildImpulseResponse(seconds) {
    const length = Math.floor(this.ctx.sampleRate * seconds)
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2.8)
        data[i] = (Math.random() * 2 - 1) * decay
      }
    }
    return buffer
  }

  buildSamplerBuffer() {
    const length = Math.floor(this.ctx.sampleRate * 0.6)
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const d = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      const t = i / this.ctx.sampleRate
      const env = Math.exp(-7 * t)
      d[i] = (Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 330 * t)) * env
    }
    return buffer
  }

  ensureTrack(track) {
    if (this.tracks.has(track.id)) return this.tracks.get(track.id)

    const gain = this.ctx.createGain()
    const pan = this.ctx.createStereoPanner()
    gain.gain.value = track.volume
    pan.pan.value = track.pan

    gain.connect(pan)
    pan.connect(this.masterFilter)

    const node = { gain, pan }
    this.tracks.set(track.id, node)
    return node
  }

  updateTrack(track) {
    if (!this.ctx) return
    const node = this.ensureTrack(track)
    node.gain.gain.setTargetAtTime(track.volume, this.ctx.currentTime, 0.01)
    node.pan.pan.setTargetAtTime(track.pan, this.ctx.currentTime, 0.01)
  }

  setMasterFx({ filterHz, delayMix, reverbMix }) {
    if (!this.ctx) return
    this.masterFilter.frequency.setTargetAtTime(filterHz, this.ctx.currentTime, 0.01)
    this.delayFeedback.gain.setTargetAtTime(delayMix * 0.8, this.ctx.currentTime, 0.01)
    this.reverbWet.gain.setTargetAtTime(reverbMix, this.ctx.currentTime, 0.01)
  }

  scheduleNote(track, note, when, duration) {
    const node = this.ensureTrack(track)
    if (track.sourceType === 'sampler') {
      const src = this.ctx.createBufferSource()
      src.buffer = this.samplerBuffer
      const gain = this.ctx.createGain()
      gain.gain.value = note.velocity
      src.connect(gain)
      gain.connect(node.gain)
      src.playbackRate.value = note.freq / 220
      src.start(when)
      src.stop(when + duration)
      return
    }

    const osc = this.ctx.createOscillator()
    osc.type = track.waveform
    osc.frequency.value = note.freq

    const env = this.ctx.createGain()
    env.gain.setValueAtTime(0.0001, when)
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, note.velocity), when + 0.01)
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration)

    osc.connect(env)
    env.connect(node.gain)
    osc.start(when)
    osc.stop(when + duration + 0.02)
  }
}
