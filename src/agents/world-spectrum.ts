// WorldSpectrum – cliente que consume la API real (servicio Python)
export interface WorldVariable {
  label: string;
  value: number;
  volatility: number;
}

export class WorldSpectrum {
  static async getGlobalEntropy(): Promise<WorldVariable[]> {
    try {
      const res = await fetch('/api/worldspect/global');
      const data = await res.json();
      // data.sources es un array con las fuentes (worldbank, bbc, etc.)
      if (data.sources && Array.isArray(data.sources)) {
        return data.sources.map((src: any) => ({
          label: src.label || src.key,
          value: src.value ?? 0.5,
          volatility: src.error ? 0.3 : 0.1
        }));
      }
      throw new Error('Respuesta inválida');
    } catch (error) {
      console.error('WorldSpectrum error:', error);
      // No simulamos, devolvemos array vacío y se maneja en el componente
      return [];
    }
  }

  static calculateRealityFrame(variables: WorldVariable[]): number {
    if (!variables.length) return 0.5;
    return variables.reduce((acc, v) => acc + (v.value * (1 + v.volatility)), 0) / variables.length;
  }
}

