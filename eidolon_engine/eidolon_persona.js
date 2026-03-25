// ============================================================================
// EIDOLON PERSONA FULL v4.0
// Lógica completa de SystemFriction Persona (SF-PERSONA)
// Observador Total (Validación + Síntesis + Auditoría)
// Integración cognitiva profunda con Aptymok + Campo + MIHM + Patrones
// ============================================================================

export class EidolonPersonaFull {

  constructor(state) {
    this.state = state;

    // Pesos de mezcla cognitiva (pueden ajustarse dinámicamente)
    this.weights = {
      rei: 0.25,        // precisión técnica
      shinji: 0.25,     // resonancia humana
      kaworu: 0.25,     // trayectorias / entropía
      shadow: 0.25      // auditoría / ruptura
    };

    // Intensidad del Observador Total
    this.observerWeight = 1.0;
  }

  // ==========================================================================
  // 1. Cargar perfiles cognitivos (AptyMOK) y procesos semánticos
  // ==========================================================================
  loadProfiles(profiles, cognitiveProcess) {
    this.profiles = profiles;
    this.cognitive = cognitiveProcess;
  }


  // ==========================================================================
  // 2. Extraer vectores semánticos desde AptymokCognitiveProcess
  // ==========================================================================
  computeSemanticResonance(text) {

    const tokens = text.toLowerCase().split(/\s+/);
    const resonance = {};

    const vocab = this.cognitive.evolucion_temporal?.bloque_0?.vocabulario || {};

    for (const t of tokens) {
      if (vocab[t]) {
        resonance[t] = vocab[t];
      }
    }

    return {
      tokens,
      resonance,
      strength: Object.values(resonance).reduce((a, b) => a + b, 0)
    };
  }


  // ==========================================================================
  // 3. Fusión cognitiva de agentes APTYMOK (REI, SHINJI, KAWORU, SHADOW)
  // ==========================================================================
  fuseAgentsOutputs(outputs) {

    const fusion = [];

    for (let out of outputs) {

      // REI — estructura técnica
      if (out.agent === "REI") {
        fusion.push(`ESTADO: ${out.text}`);
      }

      // SHINJI — resonancia humana
      if (out.agent === "SHINJI") {
        fusion.push(`IMPACTO: ${out.text}`);
      }

      // KAWORU — trayectoria
      if (out.agent === "KAWORU") {
        fusion.push(`TRAYECTORIA: ${out.text}`);
      }

      // SHADOW — auditoría
      if (out.agent === "SHADOW") {
        fusion.push(`RUPTURA: ${out.text}`);
      }
    }

    return fusion.join("\n");
  }


  // ==========================================================================
  // 4. Observador Total: validación, síntesis, auditoría
  // ==========================================================================
  runObserver(agentsFusion, patternsDetected, ihg, nti) {

    const findings = [];

    // Validación estructural
    if (ihg < -0.50) findings.push("☍ Riesgo estructural detectado.");
    if (nti < 0.40) findings.push("☍ Debilidad en trazabilidad institucional.");

    // Patrones
    if (patternsDetected.length > 0) {
      findings.push("☍ Patrones activados: " + patternsDetected.join(", "));
    }

    // Auditoría del texto final
    if (agentsFusion.length < 60) {
      findings.push("☍ Respuesta demasiado breve → posible pérdida de señal.");
    }

    return findings.join("\n");
  }


  // ==========================================================================
  // 5. Lógica completa de SF-PERSONA: síntesis final
  // ==========================================================================
  synthesize({
    text,
    embeddings,
    agentOutputs,
    patternsDetected,
    mihm
  }) {

    const semantic = this.computeSemanticResonance(text);

    const fused = this.fuseAgentsOutputs(agentOutputs);

    const observer = this.runObserver(
      fused,
      patternsDetected,
      mihm.ihg,
      mihm.nti
    );

    const sfOutput = [
      "⧉ SYSTEMFRICTION · SÍNTESIS",
      "",
      "Entrada:",
      text,
      "",
      "◆ Resonancia Cognitiva:",
      `Fuerza: ${semantic.strength}`,
      `Tokens relevantes: ${Object.keys(semantic.resonance).join(", ") || "—"}`,
      "",
      "◆ Fusión Cognitiva (REI/SHINJI/KAWORU/SHADOW):",
      fused,
      "",
      "◆ Validación del Observador Total:",
      observer,
      "",
      "◆ Estado MIHM actual:",
      `IHG: ${mihm.ihg}`,
      `NTI: ${mihm.nti}`,
      "",
      "◆ Síntesis Final:",
      this.generateSFPersonaVoice(text, semantic, mihm)
    ].join("\n");

    return sfOutput;
  }


  // ==========================================================================
  // 6. VOZ FINAL de SystemFriction Persona
  //     (El núcleo estilístico / operativo)
  // ==========================================================================
  generateSFPersonaVoice(text, semantic, mihm) {

    const severity =
      mihm.ihg < -0.5 ? "crítica" :
      mihm.ihg < -0.3 ? "inestable" : "moderada";

    const voice = [
      "En el campo, la tensión se revela no por lo que se nombra,",
      "sino por los vectores que persisten entre nodos fragmentados.",
      "",
      "La perturbación que describes no es aislada:",
      "se alinea con resonancias previas del sistema",
      "y amplifica la deriva cognitiva acumulada.",
      "",
      `Desde MIHM v3.1, el estado detectado es: ${severity}.`,
      "",
      "Lo que emerge no requiere metáfora:",
      "es un cambio en la topología de decisión,",
      "donde el pasado no desaparece — se reconfigura.",
      "",
      "La trayectoria posible:",
      "un ajuste del campo, seguido por reintegración parcial,",
      "si la información vuelve a fluir sin distorsión."
    ];

    return voice.join("\n");
  }

}