import { CalculatedMetrics } from '@/agents/metrics';

export interface ProjectState {
  tasks_completed: number;
  total_tasks: number;
  friction_multiplier: number;
}

export class ProjectManager {
  static calculateFPD(state: ProjectState, metrics: CalculatedMetrics): Date {
    const baseDays = (state.total_tasks - state.tasks_completed) * 2;
    // La fricción (IHG negativo) aumenta el tiempo de entrega exponencialmente
    const frictionDelay = Math.pow(Math.abs(metrics.ihg) + 1, 2);
    const totalDays = baseDays * frictionDelay;

    const fpd = new Date();
    fpd.setDate(fpd.getDate() + totalDays);
    return fpd;
  }

  static checkOperationalThreshold(metrics: CalculatedMetrics): boolean {
    // Si el riesgo es alto, el sistema devuelve 'false' para bloquear la UI
    return metrics.ihg > -0.75 && metrics.divergence < 0.8;
  }
}
