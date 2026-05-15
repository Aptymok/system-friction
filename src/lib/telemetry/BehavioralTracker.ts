export interface CognitiveState {
  hesitation_factor: number
  interaction_time: number
  risk_score: 'high' | 'nominal'
}

export function trackCognitiveResistance(answer: string, startTime: number, deletions: number): CognitiveState {
  const interaction_time = Math.max(1, (Date.now() - startTime) / 1000)
  const hesitation_factor = deletions / interaction_time
  const risk_score = hesitation_factor > 0.5 || answer.length < 60 ? 'high' : 'nominal'

  return {
    hesitation_factor,
    interaction_time,
    risk_score,
  }
}

export class BehavioralTracker {
  private startTime: number = 0;
  private deletions: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  trackInput(currentInput: string, key: string) {
    if (key === 'Backspace') {
      this.deletions++;
    }
  }

  getMetrics() {
    const duration = (Date.now() - this.startTime) / 1000;
    return {
      hesitation_factor: this.deletions / Math.max(1, duration),
      interaction_time: duration,
      risk_score: this.deletions > 10 ? 'high' : 'nominal'
    };
  }

  reset() {
    this.startTime = Date.now();
    this.deletions = 0;
  }
}