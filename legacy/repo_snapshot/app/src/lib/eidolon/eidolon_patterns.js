// ============================================================================
// EIDOLON PATTERNS FULL v4.0
// Activación Real de Patrones (patterns_v3.json)
// Basado en:
// - Campo Cognitivo (Φ)
// - Aptymok Semantic Process
// - MIHM v3.1-PON
// - Vectores semánticos "embedding" del usuario
// - Intensidad de resonancia cognitiva
// ============================================================================

export class EidolonPatternsFull {

  constructor(state) {
    this.state = state;

    // Sensibilidad global a patrones
    this.sensitivity = 0.55;      

    // Influencia del campo cognitivo
    this.phiInfluence = 0.35;

    // Influencia del MIHM en patrones
    this.mihmInfluence = 0.45;

    // Resonancia basada en lenguaje del usuario
    this.semanticInfluence = 0.65;
  }

  // ==========================================================================
  // 1. Cargar catálogo de patrones (patterns_v3.json)
  // ==========================================================================
  loadPatterns(patternsJSON) {
    this.patterns = patternsJSON.patterns || {};
  }

  // ==========================================================================
  // 2. Detectar patrones basados en semántica del usuario
  // ==========================================================================
  detectSemanticMatches(tokens) {
    const matches = [];

    for (const patId in this.patterns) {
      const pattern = this.patterns[patId];

      const keywords = [
        ...(pattern?.definition?.toLowerCase().split(/\s+/) || []),
        ...(pattern?.conditions?.toLowerCase().split(/\s+/) || [])
      ];

      const intersection = tokens.filter(t => keywords.includes(t));

      if (intersection.length > 0) {
        matches.push({
          id: patId,
          type: "semantic",
          strength: intersection.length
        });
      }
    }

    return matches;
  }

  // ==========================================================================
  // 3. Activación por Campo Cognitivo (Φ)
  // ==========================================================================
  detectPhiBased(phiField) {

    const list = [];

    for (const patId in this.patterns) {

      // Cada patrón mapea a variables MIHM → esas variables existen en nodos Φ
      const vars = this.patterns[patId]?.mihm_v3_variables || {};
      const primary = vars.primary;

      // Si la variable primaria aparece en el campo cognitivo, activar
      if (primary && phiField[primary] !== undefined) {
        const phiValue = Math.abs(phiField[primary]);

        if (phiValue > 0.20) {  // umbral arbitrario ajustable
          list.push({
            id: patId,
            type: "phi",
            strength: parseFloat((phiValue * 10).toFixed(3))
          });
        }
      }
    }

    return list;
  }

  // ==========================================================================
  // 4. Activación por MIHM (estado operativo del sistema)
  // ==========================================================================
  detectMIHMState(mihm) {

    const out = [];

    for (const patId in this.patterns) {
      const vars = this.patterns[patId]?.mihm_v3_variables;
      if (!vars) continue;

      const primary = vars.primary;
      const secondaries = vars.secondary || [];

      let score = 0;

      // Revisar variable primaria
      if (primary && mihm[primary] !== undefined) {
        score += Math.abs(mihm[primary]) * 2;
      }

      // Revisar variables secundarias
      for (const s of secondaries) {
        if (mihm[s] !== undefined) score += Math.abs(mihm[s]) * 1.5;
      }

      if (score >= this.sensitivity) {
        out.push({
          id: patId,
          type: "mihm",
          strength: parseFloat(score.toFixed(3))
        });
      }
    }

    return out;
  }

  // ==========================================================================
  // 5. Fusión de señales → score final por patrón
  // ==========================================================================
  mergeSignals(semanticList, phiList, mihmList) {

    const combined = {};

    const add = (item) => {
      if (!combined[item.id]) combined[item.id] = { id: item.id, strength: 0 };
      combined[item.id].strength += item.strength;
    };

    semanticList.forEach(add);
    phiList.forEach(add);
    mihmList.forEach(add);

    return Object.values(combined).sort((a, b) => b.strength - a.strength);
  }

  // ==========================================================================
  // 6. API principal: detectar patrones
  // ==========================================================================
  detectPatterns({ text, embeddings, tokens, mihm }) {

    // Campo cognitivo actual
    const phiField = this.state.S?.phi || {};

    // 1) semántica del usuario
    const semanticMatches = this.detectSemanticMatches(tokens);

    // 2) campo cognitivo
    const phiMatches = this.detectPhiBased(phiField);

    // 3) MIHM state
    const mihmMatches = this.detectMIHMState(mihm);

    // 4) Fusión final
    const merged = this.mergeSignals(
      semanticMatches,
      phiMatches,
      mihmMatches
    );

    return merged;
  }

}