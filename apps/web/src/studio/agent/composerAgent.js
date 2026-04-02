import { himhV3Generate } from '../himh/generator'

export function composeFromPrompt({ prompt, metrics, tempo, trackId }) {
  const bars = /long|4 bar/i.test(prompt) ? 4 : 2
  const generated = himhV3Generate({ prompt, metrics, bars })

  return {
    id: `clip-${Date.now()}`,
    name: `${generated.mood} loop`,
    trackId,
    startBeat: 0,
    lengthBeats: bars * 4,
    notes: generated.notes,
    color: generated.mood === 'dark' ? '#BE3A3A' : generated.mood === 'melancholic' ? '#C8A951' : '#177A5E',
    tempo,
  }
}
