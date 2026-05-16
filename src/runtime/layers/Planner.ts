// src/lib/layers/Planner.ts
import { Intent } from './IntentLayer';
import { WorldSpectrum } from '@/agents/world-spectrum';

export type Plan = {
  label: string;
  description: string;
  steps: any[];
  probability: number;
  riskLevel: 'low' | 'medium' | 'high';
  costEstimate: Record<string, number>;
  assumptions: string[];
};

export async function generatePlans(intent: Intent, currentMetrics: any): Promise<Plan[]> {
  // Obtener contexto mundial
  const world = await WorldSpectrum.getGlobalEntropy();
  const realityFrame = WorldSpectrum.calculateRealityFrame(world);
  
  // Generar 3 planes base (A, B, C) con diferente tolerancia al riesgo
  const plans: Plan[] = [];

  // Plan A: conservador (alta probabilidad, bajo riesgo)
  plans.push({
    label: 'A',
    description: 'Plan conservador: pasos pequeños, verificaciones frecuentes',
    steps: [{ action: 'validate', condition: 'metrics_stable' }, { action: 'execute_minimal' }],
    probability: 0.85,
    riskLevel: 'low',
    costEstimate: { time: 2, compute: 1 },
    assumptions: ['El usuario mantiene coherencia alta', 'WorldSpectrum estable'],
  });

  // Plan B: balanceado
  plans.push({
    label: 'B',
    description: 'Plan balanceado: aprovecha oportunidades de mercado',
    steps: [{ action: 'analyze_trends' }, { action: 'execute_moderate' }],
    probability: 0.65,
    riskLevel: 'medium',
    costEstimate: { time: 5, compute: 2 },
    assumptions: ['WorldSpectrum tiene tendencia positiva', 'NTI > 0.6'],
  });

  // Plan C: agresivo (solo si las métricas lo permiten)
  if (realityFrame > 0.7) {
    plans.push({
      label: 'C',
      description: 'Plan agresivo: rápido, alto riesgo, alta recompensa',
      steps: [{ action: 'bypass_checks' }, { action: 'execute_full' }],
      probability: 0.45,
      riskLevel: 'high',
      costEstimate: { time: 1, compute: 5 },
      assumptions: ['El usuario tiene alta energía ejecutiva', 'Entorno de alta fricción requiere acción rápida'],
    });
  }

  return plans;
}
