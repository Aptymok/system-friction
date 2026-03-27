// ============================================================================
// EIDOLON UI FULL v4.0
// Interfaz completa para la Sala EIDOLÓN
// - Render de síntesis
// - Render de MIHM
// - Render de patrones
// - Render de agentes
// - Render de retro-cartografía
// - Animación retrocausal (pantalla blanca + acetato)
// - Vínculo directo HTML ↔ Engine
// ============================================================================

export class EidolonUIFull {

  constructor(engine) {
    this.engine = engine;

    // Elementos UI (deberás asegurarte de que existan en HTML)
    this.dom = {
      output: document.getElementById("eidolon-output"),
      patterns: document.getElementById("eidolon-patterns"),
      mihm: document.getElementById("eidolon-mihm"),
      agents: document.getElementById("eidolon-agents"),
      synthesis: document.getElementById("eidolon-synthesis"),
      retro: document.getElementById("eidolon-retro"),
      container: document.getElementById("eidolon-container"),
    };
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  init() {
    console.log("✅ Eidolon UI FULL inicializada.");

    // Escuchar animación de retro-simulación
    window.addEventListener("eidolon-retro-switch", () => {
      this.activateRetroSkin();
    });
  }

  // ==========================================================================
  // SKIN NORMAL (negro/dorado)
  // ==========================================================================
  activateNormalSkin() {
    if (!this.dom.container) return;
    this.dom.container.classList.remove("eidolon-retro-skin");
    this.dom.container.classList.add("eidolon-normal-skin");
  }

  // ==========================================================================
  // SKIN RETRO (blanco + acetato)
  // ==========================================================================
  activateRetroSkin() {
    if (!this.dom.container) return;

    this.dom.container.classList.remove("eidolon-normal-skin");
    this.dom.container.classList.add("eidolon-retro-skin");

    // Animación sutil
    this.dom.container.style.transition = "background 0.8s ease-out";
  }

  // ==========================================================================
  // RENDER • MIHM
  // ==========================================================================
  renderMIHM(mihm) {
    if (!this.dom.mihm) return;

    this.dom.mihm.innerHTML = `
      <div class="t-mono c-gold">MIHM v3.1 · Estado Actual</div>
      <div class="metric-row">
        <div class="metric-box">
          <div class="metric-val">${mihm.ihg}</div>
          <div class="metric-lbl">IHG</div>
        </div>
        <div class="metric-box">
          <div class="metric-val">${mihm.nti}</div>
          <div class="metric-lbl">NTI</div>
        </div>
      </div>
      <div class="metric-row">
        <div class="metric-box">
          <div class="metric-val">${mihm.ihg30}</div>
          <div class="metric-lbl">IHG · 30d</div>
        </div>
        <div class="metric-box">
          <div class="metric-val">${mihm.nti30}</div>
          <div class="metric-lbl">NTI · 30d</div>
        </div>
      </div>
      <div class="t-mono c-dim">Severidad: ${mihm.severity}</div>
    `;
  }

  // ==========================================================================
  // RENDER • PATRONES
  // ==========================================================================
  renderPatterns(patterns) {
    if (!this.dom.patterns) return;

    this.dom.patterns.innerHTML = `
      <div class="t-mono c-gold">Patrones Activados</div>
      ${patterns
        .map(
          (p) => `
        <div class="t-body">
          <span class="c-gold">${p.id}</span> 
          <span class="c-dim">· ${p.strength}</span>
        </div>
      `
        )
        .join("")}
    `;
  }

  // ==========================================================================
  // RENDER • AGENTES
  // ==========================================================================
  renderAgents(agents) {
    if (!this.dom.agents) return;

    this.dom.agents.innerHTML = `
      <div class="t-mono c-gold">Agentes APTYMOK</div>
      ${agents
        .map(
          (a) => `
        <div class="t-body">
          <strong>${a.agent}</strong><br>
          <span class="c-dim">${a.text}</span>
        </div>
      `
        )
        .join("")}
    `;
  }

  // ==========================================================================
  // RENDER • SÍNTESIS FINAL (SF-PERSONA)
  // ==========================================================================
  renderSynthesis(synthesis) {
    if (!this.dom.synthesis) return;

    this.dom.synthesis.innerHTML = `
      <div class="t-mono c-gold">SF-PERSONA · Síntesis Final</div>
      <pre class="t-mono" style="white-space: pre-wrap;">${synthesis}</pre>
    `;
  }

  // ==========================================================================
  // RENDER • RETRO-CARTOGRAFÍA
  // ==========================================================================
  renderRetro(retro) {
    if (!this.dom.retro) return;

    if (!retro) {
      this.dom.retro.innerHTML = `<div class="t-mono c-dim">RetroSim desactivado.</div>`;
      return;
    }

    this.dom.retro.innerHTML = `
      <div class="t-mono c-gold">Retro‑Cartografía Cognitiva</div>
      ${retro.timesteps
        .map(
          (step) => `
          <div class="t-body pad-sm" style="border-bottom:1px solid rgba(200,169,81,0.15)">
            <div class="t-mono">Δt = ${step.t}</div>
            <div class="t-mono c-dim">Uncertainty: ${step.uncertainty}</div>
            <div class="t-mono c-dim">IHG: ${step.mihm.ihg} · NTI: ${step.mihm.nti}</div>
            <div class="t-mono c-dim">Patrones retro: ${step.patterns
              .map((x) => x.id)
              .join(", ") || "—"}</div>
          </div>
      `
        )
        .join("")}
    `;
  }

  // ==========================================================================
  // RENDER GLOBAL DEL PIPELINE EIDOLÓN
  // ==========================================================================
  renderPipeline(output) {

    // Skin según modo
    if (output.retro) this.activateRetroSkin();
    else this.activateNormalSkin();

    // Render internos
    this.renderMIHM(output.mihm);
    this.renderPatterns(output.patterns);
    this.renderAgents(output.agents);
    this.renderSynthesis(output.synthesis);
    this.renderRetro(output.retro);

    // Zona global
    if (this.dom.output) {
      this.dom.output.innerHTML = `
        <div class="t-mono c-gold pad-sm">EIDOLÓN RESULT</div>
        <div class="t-body c-paper">
          <strong>Input:</strong> ${output.input}
        </div>
        <div class="t-mono c-dim">Timestamp: ${output.timestamp}</div>
      `;
    }
  }
}