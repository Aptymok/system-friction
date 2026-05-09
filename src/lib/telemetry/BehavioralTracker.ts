export interface CognitiveState {
  latency: number;
  deletions: number;
  speed: number;
  pattern: 'SINCERO' | 'EVASIVO' | 'CRÍTICO';
}

export const trackCognitiveResistance = (
  input: string, 
  startTime: number, 
  deletions: number
): CognitiveState => {
  const duration = (Date.now() - startTime) / 1000;
  const speed = input.length / (duration || 1);

  let pattern: CognitiveState['pattern'] = 'SINCERO';
  if (deletions > 2 || duration > 20) pattern = 'EVASIVO';
  if (deletions > 5 && duration > 40) pattern = 'CRÍTICO';

  return { latency: duration, deletions, speed, pattern };
};