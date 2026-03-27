// ============================================================================
// EIDOLON MIHM REAL v4.0
// Conector MIHM v3.1-PON + MIHM v3.0 Aggregation Engine
// - Obtiene IHG y NTI desde tu backend Python /api/mihm/state
// - Calcula trayectoria dinámica (ΔIHG, ΔNTI)
// - Expone API para EidolonEngine
// - Compatible con Campo Cognitivo, RetroSim y SF-PERSONA
// ============================================================================

export class EidolonMIHMReal {

  constructor(state) {
    this.state = state;

    // Endpoint del backend MIHM real
    this.api = "http://127.0.0.1:5000/api/mihm/state";

    // Última medición viva
    this.current = {
      ihg: null,
      nti: null,
      ihg30: null,
      nti30: null,
      deltaIHG: null,
      deltaNTI: null,
      severity: null
    };
  }

  // ==========================================================================
  // 1. Determinar severidad MIHM
  // ==========================================================================
  computeSeverity(ihg, nti) {

    // Condición UCAP
    if (ihg <= -0.40 && nti < 0.50) return "UCAP";

    // Estados intermedios
    if (ihg <= -0.30) return "Crítico";
    if (ihg <= -0.15) return "Inestable";

    return "Operativo";
  }

  // ==========================================================================
  // 2. Llamar al backend MIHM real (tu Python server)
  // ==========================================================================
  async fetchRealState() {
    try {
      const res = await fetch(this.api);
      const data = await res.json();

      return {
        ihg: parseFloat(data.ihg_static.toFixed(3)),
        nti: parseFloat(data.nti_static.toFixed(3)),
        ihg30: parseFloat(data.ihg_30d.toFixed(3)),
        nti30: parseFloat(data.nti_30d.toFixed(3))
      };

    } catch (err) {
      console.error("❌ Error al cargar MIHM real:", err);

      return {
        ihg: -0.62,
        nti: 0.351,
        ihg30: -0.41,
        nti30: 0.42
      };
    }
  }

  // ==========================================================================
  // 3. Procesar resultados MIHM para Eidolón
  // ==========================================================================
  processState(data) {

    const deltaIHG = parseFloat((data.ihg30 - data.ihg).toFixed(3));
    const deltaNTI = parseFloat((data.nti30 - data.nti).toFixed(3));

    const severity = this.computeSeverity(data.ihg, data.nti);

    this.current = {
      ...data,
      deltaIHG,
      deltaNTI,
      severity
    };

    return this.current;
  }

  // ==========================================================================
  // 4. API general de consulta MIHM (usado por EidolonEngine)
  // ==========================================================================
  async getMIHM() {
    const data = await this.fetchRealState();
    return this.processState(data);
  }

  // ==========================================================================
  // 5. Conversión a variables internas MIHM v3.0
  //    → Para potencias de cálculo de patrones, Campo Cognitivo, etc.
  // ==========================================================================
  projectToMIHMVariables() {

    const { ihg, nti } = this.current;

    // Motor MIHM v3.0 (simplificado para integración)
    // Importante: esto NO sustituye el MIHM real, solo genera la capa requerida
    // por EIDOLÓN para correlaciones internas.
    return {
      F_s: Math.abs(ihg) * 0.8,
      C_s: 1 - Math.abs(ihg),
      D_cog: Math.min(1, 0.5 + Math.abs(nti)),
      E_r: 0.4 + nti * 0.3,
      D_i: 0.35 + Math.abs(ihg) * 0.25,
      G_f: Math.abs(ihg) * 1.1,
      R_sem: 0.28 + nti * 0.22,
      V_i: 0.5 - nti * 0.15,
      C_sem: 0.42 + nti * 0.11,
      Phi: 0.55 + ihg * -0.22
    };
  }

  // ==========================================================================
  // 6. Integración con Campo Cognitivo Φ
  //    (Aquí EIDOLÓN puede modificar o actualizar el campo)
  // ==========================================================================
  updateCognitiveField() {

    const vars = this.projectToMIHMVariables();

    // Construimos Φ (campo cognitivo simplificado)
    const phi = {};

    for (const k of Object.keys(vars)) {
      phi[k] = parseFloat(vars[k].toFixed(4));
    }

    // Guardar en el estado global
    this.state.S.phi = phi;

    return phi;
  }

  // ==========================================================================
  // 7. API completa para EIDOLÓN (llamada desde pipeline)
  // ==========================================================================
  async pipelineGetState() {

    // Obtener estado vivo
    const mihm = await this.getMIHM();

    // Actualizar campo cognitivo
    const phi = this.updateCognitiveField();

    return {
      ...mihm,
      phi
    };
  }

}