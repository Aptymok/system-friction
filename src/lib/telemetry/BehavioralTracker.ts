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