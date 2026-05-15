export class CulturalFeeling {
  static analyzeSemanticPulse(text: string): { opportunity: number; trend: string } {
    const triggers = ['disrupción', 'colapso', 'emergencia', 'nuevo', 'sistema'];
    const count = triggers.filter(t => text.toLowerCase().includes(t)).length;
    
    return {
      opportunity: Math.min(1, count * 0.25),
      trend: count > 2 ? 'Inestabilidad Fecunda' : 'Inercia Cultural'
    };
  }
}