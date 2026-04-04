const SCALES = {
  melancholic: [0, 2, 3, 5, 7, 8, 10],
  uplifting: [0, 2, 4, 5, 7, 9, 11],
  dark: [0, 1, 3, 5, 6, 8, 10],
  neutral: [0, 2, 4, 7, 9],
}

const clamp = (n, a, b) => Math.max(a, Math.min(b, n))

export function promptToMood(prompt) {
  const p = prompt.toLowerCase()
  if (p.includes('melanch')) return 'melancholic'
  if (p.includes('dark') || p.includes('tense')) return 'dark'
  if (p.includes('happy') || p.includes('upbeat')) return 'uplifting'
  return 'neutral'
}

export function himhV3Generate({ prompt, metrics, bars = 2, seed = Date.now() }) {
  const mood = promptToMood(prompt)
  const scale = SCALES[mood]

  let s = seed >>> 0
  const rand = () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s / 2 ** 32
  }

  const coherence = clamp(metrics.C, 0, 1)
  const tension = clamp(metrics.T, 0, 1)
  const activation = clamp(metrics.A, 0, 1)

  const stepsPerBar = 16
  const totalSteps = bars * stepsPerBar
  const density = Math.max(2, Math.floor(2 + activation * 10))
  const varChance = 0.08 + tension * 0.5

  const rootMidi = mood === 'dark' ? 48 : mood === 'melancholic' ? 50 : 52
  const notes = []

  for (let step = 0; step < totalSteps; step++) {
    const gate = rand()
    if (gate > density / 16) continue

    const scalePick = Math.floor(rand() * scale.length)
    let interval = scale[scalePick]

    if (rand() < varChance) {
      interval += rand() > 0.5 ? 1 : -1
    }

    const octaveJump = rand() > 0.84 - tension * 0.2 ? 12 : 0
    const midi = rootMidi + interval + octaveJump
    const freq = 440 * 2 ** ((midi - 69) / 12)

    const stepDur = coherence > 0.7 ? 1 : coherence > 0.4 ? (rand() > 0.5 ? 1 : 2) : Math.ceil(rand() * 2)
    const beats = stepDur / 4

    notes.push({
      step,
      beats,
      freq,
      velocity: 0.3 + activation * 0.6,
    })
  }

  return { mood, notes }
}
