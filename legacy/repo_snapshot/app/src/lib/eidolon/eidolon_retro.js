// ============================================================================
// EIDOLON RETRO-SIMULATION ENGINE v4.0
// Cartografía cognitiva retrospectiva · Retrocausalidad operativa
// - Reconstrucción inferencial del pasado
// - Basado en Campo Cognitivo Φ, MIHM v3.1, APTYMOK-Semantic
// - Genera retro_cartografia.json dinámico
// - Soporte para UI modo “retrocausal” (pantalla blanca + acetato)
// ============================================================================

export class EidolonRetroFull {

  constructor(state) {
    this.state = state;

    // Parámetros de retrocausalidad
    this.lambdaDecay = 0.32;   // atenuación temporal
    this.maxSteps = 6;         // máximo Δt hacia atrás
    this.semanticBoost = 0.4;  // influencia de resonancia cognitiva
    this.patternBoost = 0.3;   // influencia de patrones activados
    this.phiReversal = true;   // invertir Φ
  }

  // ==========================================================================
  // 1. Activador visual retrocausal (UI)
  // ==========================================================================
  retroVisualSwitch() {
    const evt = new CustomEvent("eidolon-retro-switch");
    window.dispatchEvent(evt);
  }

  // ==========================================================================
  // 2. Cálculo del gradiente Φ invertido (campo cognitivo)
  // ==========================================================================
  reversePhi(phiField = {}) {
    const reversed = {};
    for (const k in phiField) {
      reversed[k] = phiField[k] * -1;  // inversión semántica
    }
    return reversed;
  }

  // ==========================================================================
  // 3. Score semántico hacia atrás (basado en Aptymok Cognitive Process)
  // ==========================================================================
  computeBackwardSemantic(tokens, cognitiveProcess) {
    const vocab = cognitiveProcess?.evolucion_temporal?.bloque_0?.vocabulario || {};
    let score = 0;

    for (const t of tokens) {
      if (vocab[t]) score += vocab[t];
    }

    return score;
  }

  // ==========================================================================
  // 4. Evaluación MIHM retroactiva (MIHM v3.1 + PON)
  // ==========================================================================
  computeMIHMBackwards(currentIHG, currentNTI, step) {

    // Modelo sencillo basado en decaimiento exponencial + ruido controlado
    const decay = Math.exp(-this.lambdaDecay * step);

    const ihgPast = currentIHG * decay + (Math.random() * 0.08 - 0.04);
    const ntiPast = currentNTI * decay + (Math.random() * 0.1 - 0.05);

    return {
      ihg: parseFloat(ihgPast.toFixed(3)),
      nti: parseFloat(ntiPast.toFixed(3))
    };
  }

  // ==========================================================================
  // 5. Reconstrucción nodal retrospectiva
  // ==========================================================================
  mapNodesBackward(nodes, phiReversed, semanticStrength, step) {

    const out = [];
    const factor = (1 / (step + 1)) + semanticStrength * 0.0004;

    for (const nodeId of Object.keys(nodes)) {
      const base = nodes[nodeId];
      out.push({
        id: base.nodeId || nodeId,
        // perturbación retro-activa
        influence: ((phiReversed[nodeId] || 0) * factor).toFixed(4),
        uncertainty: Math.min(1, 0.25 + step * 0.12 + Math.random() * 0.1)
      });
    }

    return out;
  }

  // ==========================================================================
  // 6. RETRO-SIMULACIÓN COMPLETA
  // ==========================================================================
  runRetroSimulation({
    text,
    embeddings,
    patternsDetected,
    cognitiveProcess,
    mihm
  }) {

    // 1. Extraer tokens del texto original
    const tokens = text.toLowerCase().split(/\s+/);

    // 2. Score semántico (lo que más “arrastra” hacia atrás)
    const semanticStrength = this.computeBackwardSemantic(tokens, cognitiveProcess);

    // 3. Campo cognitivo Φ actual
    const phiField = this.state.S?.phi || {};

    // 4. Campo invertido (retrocausalidad)
    const phiReversed = this.reversePhi(phiField);

    const steps = [];

    for (let t = 1; t <= this.maxSteps; t++) {

      // a) MIHM hacia atrás
      const mihmPast = this.computeMIHMBackwards(mihm.ihg, mihm.nti, t);

      // b) Estado nodal retroactivo
      const nodesPast = this.mapNodesBackward(
        this.state.N?.mihm_v3_engine?.variables || {},
        phiReversed,
        semanticStrength,
        t
      );

      // c) Patrones retroactivados
      const patternsPast = patternsDetected.map(p => ({
        id: p,
        reversed: true,
        weight: (Math.random() * 0.5 + 0.2).toFixed(3)
      }));

      // d) Ensamble del timestep
      steps.push({
        t: -t,
        mihm: mihmPast,
        nodes: nodesPast,
        patterns: patternsPast,
        semanticStrength: semanticStrength,
        phi_field_reversed: phiReversed,
        uncertainty: Math.min(1, 0.15 + t * 0.12)
      });
    }

    // Ensamble final del JSON
    const retroJSON = {
      version: "1.0",
      generated_at: new Date().toISOString(),
      seed_text: text,
      timesteps: steps
    };

    return retroJSON;
  }

}