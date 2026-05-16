import { CognitiveTwin } from '@/agents/cognitive-twin';
import { WorldSpectrum } from '@/agents/world-spectrum';

export class AttractorLogic {
  constructor(private desiredOutcome: string, private userId: string) {}

  async distanceToAttractor(): Promise<number> {
    // Calcula distancia basada en sesgos cognitivos y estado del mundo
    const twin = await CognitiveTwin.extractSeed(this.desiredOutcome);
    const worldVars = await WorldSpectrum.getGlobalEntropy();
    const worldEntropy = worldVars.reduce((sum, v) => sum + v.value, 0) / (worldVars.length || 1);
    
    // A mayor evitación + mayor entropía mundial = mayor distancia
    const distance = (twin.avoidanceScore * 0.6) + (worldEntropy * 0.4);
    return Math.min(1, distance);
  }

  async generateCriticalSteps(): Promise<string[]> {
    const distance = await this.distanceToAttractor();
    if (distance < 0.3) return ['Mantener el rumbo', 'Refinar métricas semanales'];
    if (distance < 0.6) return ['Reducir fricción en nodo crítico', 'Revisar NTI cada 48h'];
    return ['Pausar ejecución expansiva', 'Alinear recursos con atractor', 'Re-definir objetivo mínimo verificable'];
  }
}