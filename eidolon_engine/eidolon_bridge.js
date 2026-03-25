// ============================================================================
// EIDOLON BRIDGE v4.0
// Conecta HTML ←→ Motor EidolonEngine
// ============================================================================

import { EidolonEngine } from './eidolon_engine.js';
import { EidolonUI } from './eidolon_ui.js';

export class EidolonBridge {

  constructor() {
    this.engine = new EidolonEngine({});
    this.ui = new EidolonUI(this.engine);
  }

  async loadAll({
    semantic,
    mihm,
    patterns,
    nodes,
    profiles
  }) {
    await this.engine.init({
      semantic,
      mihm,
      patterns,
      nodes,
      profiles
    });

    this.ui.init();

    console.log("✅ EidolonBridge: All systems loaded.");
  }

  // Ejecuta pipeline Eidolón
  async run(text, {
    mode = "sf",
    agent = "SF-PERSONA",
    retro = false
  } = {}) {

    const result = await this.engine.runPipeline(text, mode, agent, retro);

    // Aquí puedes imprimir, rellenar elementos HTML o enviar al UI
    console.log("✅ Eidolon Output:", result);

    return result;
  }
}