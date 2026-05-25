export class AttractorLogic {
  static generateBacktrack(objective: string, currentIhg: number): string[] {
    const steps = [
      `Anclaje final: ${objective}`,
      "Neutralización de bloqueos detectados por el Auditor",
      "Ajuste de NTI para coherencia interna",
      "Ejecución de variable bridge"
    ];

    // Si el IHG es muy bajo, los pasos se vuelven más rudos (quirúrgicos)
    return currentIhg < -0.3 ? steps.map(s => `[CRÍTICO] ${s}`) : steps;
  }
}