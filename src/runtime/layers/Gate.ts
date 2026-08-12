// src/runtime/layers/Gate.ts
import { Plan } from './Planner';
import { SimulationResult } from './Simulator';

const BASE_THRESHOLD = 0.95;
const SENSITIVITY = 0.3;        // Cuánto influye ERW (0..1)
const MIN_THRESHOLD = 0.6;
const MAX_THRESHOLD = 0.98;

export type GateDecision = {
  approved: boolean;
  source: 'human' | 'auto_high_confidence' | 'auto_rejected';
  justification: string;
  dynamicThreshold: number;
  calibrationSignal: number | null;
};

export async function evaluatePlan(
  plan: Plan,
  simulation: SimulationResult,
  nodeId: string,
  userId: string
): Promise<GateDecision> {
  // No calibrated external-reality signal is currently canonical. Missing stays missing.
  const calibrationSignal: number | null = null;
  const dynamicThreshold = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, BASE_THRESHOLD));
  
  const confidence = simulation.successProbability;
  
  // Auto-aprobación si confianza >= umbral gobernado
  if (confidence >= dynamicThreshold) {
    return {
      approved: true,
      source: 'auto_high_confidence',
      justification: `Confianza ${confidence.toFixed(2)} ≥ umbral gobernado ${dynamicThreshold.toFixed(3)} (sin señal de calibración canónica)`,
      dynamicThreshold,
      calibrationSignal,
    };
  }
  
  // Auto-rechazo si confianza muy baja
  if (confidence < 0.5) {
    return {
      approved: false,
      source: 'auto_rejected',
      justification: `Confianza muy baja (${confidence.toFixed(2)}). Se requiere replanificación.`,
      dynamicThreshold,
      calibrationSignal,
    };
  }
  
  // Confianza intermedia: escalar a humano (por ahora auto-rechazo)
  console.log(`[Gate] Plan ${plan.label} requiere revisión humana. Confianza=${confidence}, umbral=${dynamicThreshold}`);
  return {
    approved: false,
    source: 'auto_rejected',
    justification: `Revisión humana requerida (confianza ${confidence.toFixed(2)} < umbral ${dynamicThreshold.toFixed(3)}).`,
    dynamicThreshold,
    calibrationSignal,
  };
}
