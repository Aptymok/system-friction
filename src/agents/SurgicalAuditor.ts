export const analyzeSystemicRisk = (command: string, currentIhg: number) => {
  // Simulación de análisis de entropía semántica
  const entropy = Math.random(); 
  const riskFactor = (command.length / 100) * entropy;
  
  // Si la divergencia es muy alta, el sistema debe "bloquearse"
  const isDangerous = riskFactor > 0.8 && currentIhg < 0.2;

  return {
    isDangerous,
    riskLevel: riskFactor.toFixed(4),
    recommendation: isDangerous ? "BLOQUEO POR RIESGO SISTÉMICO" : "EJECUCIÓN PERMITIDA"
  };
};
