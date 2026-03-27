// ============================================================================
// EIDOLON SEMANTIC ENGINE v4.0
// Modelo semántico completo para:
// - SF-PERSONA
// - Observador Total
// - Campo Cognitivo Φ
// - RetroSim
// - Patrones
// Basado en tu archivo AptymokCognitiveProcess.json
// ============================================================================

export class EidolonSemanticFull {

  constructor(state) {
    this.state = state;

    // Pesos globales
    this.embeddingWeight = 1.0;
    this.resonanceWeight = 1.2;
    this.contextWeight = 0.8;
    this.noiseFloor = 0.015;

    // Diccionarios
    this.vocab = {};
    this.totalTokens = 0;

    // Dimensión del vector semántico simbólico
    this.embeddingDim = 64;
  }

  // ==========================================================================
  // 1. Cargar proceso cognitivo Aptymok
  // ==========================================================================
  loadCognitiveProcess(cognitiveJSON) {
    this.cognitive = cognitiveJSON;

    // Extraer vocabulario raíz
    this.vocab =
      cognitiveJSON?.evolucion_temporal?.bloque_0?.vocabulario || {};

    // Precalcular suma total de frecuencias
    this.totalTokens = Object.values(this.vocab).reduce(
      (acc, v) => acc + v,
      0
    );
  }

  // ==========================================================================
  // 2. Tokenizar texto
  // ==========================================================================
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-záéíóúüñ0-9 ]+/gi, "")
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  // ==========================================================================
  // 3. Generar embedding simbólico basado en tu propio campo semántico
  // ==========================================================================
  symbolicEmbedding(tokens) {
    const vec = Array(this.embeddingDim).fill(0);

    for (const t of tokens) {
      const freq = this.vocab[t] || 0;

      // hash simbólico → índice
      const h = [...t].reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const idx = h % this.embeddingDim;

      vec[idx] += freq / (this.totalTokens || 1);
    }

    // Normalización
    const norm =
      Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1;

    return vec.map((v) => v / norm);
  }

  // ==========================================================================
  // 4. Calcular resonancia semántica
  // ==========================================================================
  computeResonance(tokens) {
    let score = 0;
    const details = {};

    for (const t of tokens) {
      if (this.vocab[t]) {
        details[t] = this.vocab[t];
        score += this.vocab[t];
      }
    }

    return {
      score,
      details,
      normalized: score / (this.totalTokens || 1)
    };
  }

  // ==========================================================================
  // 5. Contexto semántico expandido
  //    (Busca términos relacionados en el campo cognitivo)
  // ==========================================================================
  computeContext(tokens) {
    const ctx = {};

    for (const t of tokens) {
      if (this.vocab[t]) {
        const h = [...t].reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const relatedKey = Object.keys(this.vocab)[h % Object.keys(this.vocab).length];

        ctx[relatedKey] = this.vocab[relatedKey] || 0;
      }
    }

    return ctx;
  }

  // ==========================================================================
  // 6. Generar “firma semántica” completa
  // ==========================================================================
  generateSignature(text) {
    const tokens = this.tokenize(text);
    const embedding = this.symbolicEmbedding(tokens);
    const resonance = this.computeResonance(tokens);
    const context = this.computeContext(tokens);

    // fuerza total del campo
    const fieldStrength =
      resonance.normalized * this.resonanceWeight +
      (Object.values(context).reduce((a, b) => a + b, 0) /
        this.totalTokens) *
        this.contextWeight +
      this.noiseFloor;

    return {
      tokens,
      embedding,
      resonance,
      context,
      fieldStrength
    };
  }

  // ==========================================================================
  // 7. Actualizar Campo Cognitivo Φ basado en semántica
  // ==========================================================================
  updatePhi(signature) {
    if (!this.state.S.phi) this.state.S.phi = {};

    // Aplicar influencia del embedding sobre Φ
    const phi = this.state.S.phi;

    signature.embedding.forEach((val, i) => {
      const key = `Φ_${i}`;
      if (!phi[key]) phi[key] = 0;

      phi[key] = parseFloat(
        (phi[key] * 0.9 + val * signature.fieldStrength).toFixed(5)
      ); // amortiguador exponencial
    });

    return phi;
  }

  // ==========================================================================
  // 8. API principal: procesar texto
  // ==========================================================================
  process(text) {
    const signature = this.generateSignature(text);
    const phi = this.updatePhi(signature);

    return {
      ...signature,
      phi
    };
  }
}