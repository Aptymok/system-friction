// src/runtime/layers/Simulator.ts
import { Plan } from './Planner';
import { Intent } from './IntentLayer';

export type SimulationResult = {
  successProbability: number;
  failureModes: string[];
  sensitivity: Record<string, number>;
  adversarialBreaks: string[];
};

export async function simulatePlan(
  plan: Plan,
  intent: Intent,
  historicalMetrics: any[],
  nScenarios: number = 5000
): Promise<SimulationResult> {
  // Simulación Monte Carlo real (sin autoreferencia)
  const volatility = calculateVolatility(historicalMetrics);
  let success = 0;
  let failures: string[] = [];
  const sensitivities: Record<string, number> = {};

  for (let i = 0; i < nScenarios; i++) {
    // Factor de ruido externo (no basado en el sistema)
    const externalNoise = Math.random() * volatility;
    const baseProb = plan.probability;
    const finalProb = Math.min(0.99, Math.max(0.01, baseProb - externalNoise));
    if (Math.random() < finalProb) {
      success++;
    } else {
      if (Math.random() < 0.3) failures.push('external_market_shock');
      else if (Math.random() < 0.5) failures.push('user_incoherence');
      else failures.push('execution_latency');
    }
  }
  const successProbability = success / nScenarios;
  
  // Análisis de sensibilidad simple
  sensitivities['volatility'] = volatility;
  sensitivities['initial_prob'] = plan.probability;
  
  // Adversarial testing: intentar romper el plan con casos extremos
  const adversarialBreaks = [];
  if (plan.riskLevel === 'high' && volatility > 0.3) adversarialBreaks.push('high_volatility_breaks_aggressive_plan');
  if (plan.assumptions.some(a => a.includes('coherencia alta')) && historicalMetrics.slice(-3).some(m => m.nti < 0.4))
    adversarialBreaks.push('assumption_violation_low_nti');

  return {
    successProbability,
    failureModes: [...new Set(failures)],
    sensitivity: sensitivities,
    adversarialBreaks,
  };
}

function calculateVolatility(historicalMetrics: any[]): number {
  if (historicalMetrics.length < 2) return 0.2;
  const ihgValues = historicalMetrics.map(m => m.ihg).filter(v => v !== undefined);
  if (ihgValues.length < 2) return 0.2;
  const mean = ihgValues.reduce((a,b) => a+b,0) / ihgValues.length;
  const variance = ihgValues.reduce((sum, val) => sum + Math.pow(val - mean,2),0) / ihgValues.length;
  return Math.min(0.8, Math.sqrt(variance));
}
