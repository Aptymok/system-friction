// ============================================================================
// EIDOLON ENGINE v4.0 — MOTOR CENTRAL UNIFICADO
// Coordina todos los módulos:
//
// - eidolon_semantic.js      (semántica profunda Aptymok)
// - eidolon_mihm.js          (conector MIHM v3.1-PON real)
// - eidolon_patterns.js      (activación real de patrones)
// - eidolon_retro.js         (retro‑simulación completa)
// - eidolon_persona.js       (SF‑PERSONA + Observador Total)
// - eidolon_ui.js                 (UI / skins / animación)
// - eidolon_bridge.js             (interfaz HTML)
//
// ESTE ARCHIVO ES EL CEREBRO DEL SISTEMA.
// ============================================================================

// IMPORTS DE TODOS LOS MÓDULOS (asegúrate de que los archivos existen)
import { EidolonSemanticFull } from './eidolon_semantic.js';
import { EidolonMIHMReal } from './eidolon_mihm.js';
import { EidolonPatternsFull } from './eidolon_patterns.js';
import { EidolonRetroFull } from './eidolon_retro.js';
import { EidolonPersonaFull } from './eidolon_persona.js';
import { EidolonUI } from './eidolon_ui.js';

// ============================================================================
// ESTADO GLOBAL DEL ENGINE
// ============================================================================
class EidolonState {
  constructor() {
    this.S = {}; // Campo Cognitivo Φ
    this.M = {}; // Memoria semántica (Aptymok)
    this.P = {}; // Patrones detectados
    this.O = {}; // Observador / SF-PERSONA
    this.N = {}; // Nodos
    this.V = {}; // Variables MIHM
    this.R = {}; // Reglas MIHM
    this.T = {}; // Tensores retro
    this.H = []; // Historial de interacciones
  }
}

// ============================================================================
// EIDOLÓN ENGINE — PIPELINE
// ============================================================================
export class EidolonEngine {

  constructor() {
    this.state = new EidolonState();

    // Instanciar módulos
    this.semantic = new EidolonSemanticFull(this.state);
    this.mihm = new EidolonMIHMReal(this.state);
    this.patterns = new EidolonPatternsFull(this.state);
    this.retro = new EidolonRetroFull(this.state);
    this.persona = new EidolonPersonaFull(this.state);
    this.ui = new EidolonUI(this);

    // Modo activo
    this.mode = "sf";          // default: SystemFriction Persona
    this.singleAgent = null;   // usado en modo "single"
  }

  // ==========================================================================
  // 1. Inicialización general del motor
  // ==========================================================================
  async init({ cognitive, mihm, patterns, nodes, profiles }) {

    // Cargar semántica
    this.semantic.loadCognitiveProcess(cognitive);

    // Cargar patrones
    this.patterns.loadPatterns(patterns);

    // Cargar nodos
    this.state.N = nodes;

    // Cargar perfiles (APTYMOK)
    this.persona.loadProfiles(profiles, cognitive);

    // Inicialización de UI
    this.ui.init();

    console.log("EIDOLON completamente inicializado.");
  }

  // ==========================================================================
  // 2. Ejecutar pipeline completo
  // ==========================================================================
  async run(text, options = {}) {

    const {
      mode = "sf",
      singleAgent = "SF-PERSONA",
      enableRetro = false
    } = options;

    // Guardar modo
    this.mode = mode;
    this.singleAgent = singleAgent;

    // Guardar historial
    this.state.H.push({
      t: new Date().toISOString(),
      input: text
    });

    // 1) SEMÁNTICA PROFUNDA
    const semanticSig = this.semantic.process(text);

    // 2) MIHM REAL v3.1-PON + actualización campo Φ
    const mihmState = await this.mihm.pipelineGetState();

    // 3) DETECCIÓN DE PATRONES (con semántica + Φ + MIHM)
    const patternList = this.patterns.detectPatterns({
      text,
      embeddings: semanticSig.embedding,
      tokens: semanticSig.tokens,
      mihm: mihmState.phi
    });

    this.state.P = patternList;

    // ------------------------------------------------------------------------
    // 4) AGENTES
    // ------------------------------------------------------------------------
    let agentOutputs = [];

    if (mode === "single") {

      // Modo agente único
      agentOutputs.push({
        agent: singleAgent,
        text: `(${singleAgent}) → output generado por placeholder interno.`
      });

    } else {

      // Modo multi-agente → REI, SHINJI, KAWORU, SHADOW
      const AGENTS = ["REI", "SHINJI", "KAWORU", "SHADOW"];

      agentOutputs = AGENTS.map(a => ({
        agent: a,
        text: `(${a}) → respuesta sintética basada en semántica (${semanticSig.resonance.score})`
      }));
    }

    // ------------------------------------------------------------------------
    // 5) OBSERVADOR TOTAL (validación + síntesis + auditoría)
    // ------------------------------------------------------------------------
    const finalSynthesis = this.persona.synthesize({
      text,
      embeddings: semanticSig.embedding,
      agentOutputs,
      patternsDetected: patternList.map(p => p.id),
      mihm: mihmState
    });

    // ------------------------------------------------------------------------
    // 6) RETRO-SIMULACIÓN
    // ------------------------------------------------------------------------
    let retroMap = null;

    if (enableRetro === true) {
      this.retro.retroVisualSwitch(); // Dispara animación "blanco + acetato"
      retroMap = this.retro.runRetroSimulation({
        text,
        embeddings: semanticSig.embedding,
        patternsDetected: patternList.map(p => p.id),
        cognitiveProcess: this.semantic.cognitive,
        mihm: mihmState
      });
    }

    // ========================================================================
    // SALIDA FINAL DEL PIPELINE
    // ========================================================================
    const output = {
      input: text,
      semantic: semanticSig,
      mihm: mihmState,
      patterns: patternList,
      agents: agentOutputs,
      synthesis: finalSynthesis,
      retro: retroMap,
      timestamp: new Date().toISOString()
    };

    return output;
  }
}