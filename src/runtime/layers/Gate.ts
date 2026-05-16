// src/lib/layers/Gate.ts
import { Plan } from './Planner';
import { SimulationResult } from './Simulator';
import { GlobalLearningAgent } from '@/agents/GlobalLearningAgent';

const BASE_THRESHOLD = 0.95;
const SENSITIVITY = 0.3;        // Cuánto influye ERW (0..1)
const MIN_THRESHOLD = 0.6;
const MAX_THRESHOLD = 0.98;

export type GateDecision = {
  approved: boolean;
  source: 'human' | 'auto_high_confidence' | 'auto_rejected';
  justification: string;
  dynamicThreshold: number;
  erwUsed: number;
};

export async function evaluatePlan(
  plan: Plan,
  simulation: SimulationResult,
  nodeId: string,
  userId: string
): Promise<GateDecision> {
  // Obtener el último ERW (puede ser específico del nodo o global)
  const erw = await GlobalLearningAgent.getLatestERW(nodeId);
  
  // Calcular umbral dinámico
  let dynamicThreshold = BASE_THRESHOLD - (erw * SENSITIVITY);
  dynamicThreshold = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, dynamicThreshold));
  
  const confidence = simulation.successProbability;
  
  // Auto-aprobación si confianza >= umbral dinámico
  if (confidence >= dynamicThreshold) {
    return {
      approved: true,
      source: 'auto_high_confidence',
      justification: `Confianza ${confidence.toFixed(2)} ≥ umbral dinámico ${dynamicThreshold.toFixed(3)} (ERW=${erw.toFixed(3)})`,
      dynamicThreshold,
      erwUsed: erw,
    };
  }
  
  // Auto-rechazo si confianza muy baja
  if (confidence < 0.5) {
    return {
      approved: false,
      source: 'auto_rejected',
      justification: `Confianza muy baja (${confidence.toFixed(2)}). Se requiere replanificación.`,
      dynamicThreshold,
      erwUsed: erw,
    };
  }
  
  // Confianza intermedia: escalar a humano (por ahora auto-rechazo)
  console.log(`[Gate] Plan ${plan.label} requiere revisión humana. Confianza=${confidence}, umbral=${dynamicThreshold}`);
  return {
    approved: false,
    source: 'auto_rejected',
    justification: `Revisión humana requerida (confianza ${confidence.toFixed(2)} < umbral ${dynamicThreshold.toFixed(3)}).`,
    dynamicThreshold,
    erwUsed: erw,
  };
}