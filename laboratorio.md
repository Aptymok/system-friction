---
layout: default
title: "Laboratorio MIHM v2.0"
description: "Explorador interactivo del Modelo Homeostático Multinodal"
permalink: /laboratorio/
math: true
---

<style>
  /* Variables de respaldo */
  :root {
    --tx2: #2d3a4a;
    --tx3: #6b7b8c;
    --bg2: #f2f5f9;
    --bd: #d9e0e8;
    --ac: #0266b3;
    --ok: #1e7b4c;
    --ok-t: #1e7b4c;
    --wn-t: #b45f2b;
    --cr-t: #b13e3e;
    --cr: #b13e3e;
    --bg: #ffffff;
    --fm: "SF Mono", "Cascadia Code", "Roboto Mono", monospace;
    --r: 4px;
  }

  /* Estilos específicos del laboratorio */
  .lab-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .lab-section {
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--bd);
  }
  .lab-section:last-child {
    border-bottom: none;
  }
  .lab-section h2 {
    font-size: 1.6rem;
    font-weight: 500;
    margin-bottom: 1rem;
    color: var(--tx2);
    border-left: 4px solid var(--ac);
    padding-left: 1rem;
  }

  /* Calculadoras */
  .calc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
  }
  .calc-input {
    background: var(--bg2);
    padding: 1.25rem;
    border-radius: var(--r);
  }
  .calc-input label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--tx3);
    margin-bottom: 0.75rem;
  }
  .calc-input input[type=range] {
    width: 100%;
    margin: 0.5rem 0;
  }
  .calc-input .value {
    font-family: var(--fm);
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--ac);
    margin-top: 0.5rem;
  }

  /* Resultados */
  .result-box {
    background: var(--bg);
    border: 2px solid var(--bd);
    padding: 1.5rem;
    border-radius: var(--r);
    margin-top: 1.5rem;
    text-align: center;
  }
  .result-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--tx3);
    margin-bottom: 0.5rem;
  }
  .result-value {
    font-size: 2.5rem;
    font-weight: 600;
    font-family: var(--fm);
    line-height: 1.2;
    color: var(--tx2);
  }
  .result-status {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.3rem 1rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  /* Timeline horizontal */
  .timeline-horizontal {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin: 2rem 0;
    flex-wrap: wrap;
  }
  .timeline-point {
    flex: 1;
    min-width: 80px;
    background: var(--bg);
    border: 1px solid var(--bd);
    border-radius: var(--r);
    padding: 1rem 0.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  .timeline-point:hover {
    border-color: var(--ac);
    transform: translateY(-2px);
  }
  .timeline-point.active {
    border: 2px solid var(--ac);
    background: var(--bg2);
  }
  .timeline-point-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--tx3);
    margin-bottom: 0.25rem;
  }
  .timeline-point-value {
    font-family: var(--fm);
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0.25rem 0;
  }

  /* Tablas de métricas */
  .metrics-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  .metrics-table th {
    background: var(--bg2);
    padding: 0.75rem;
    text-align: left;
    border-bottom: 2px solid var(--ac);
    font-weight: 600;
  }
  .metrics-table td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--bd);
  }

  /* Badges de estado */
  .status-ok, .status-am, .status-cr {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  .status-ok { background: #e3f3e9; color: #1e7b4c; }
  .status-am { background: #fff0e0; color: #b45f2b; }
  .status-cr { background: #fceaea; color: #b13e3e; }

  /* Navegación */
  .nav-footer {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--bd);
  }
</style>

<div class="lab-container">
  
  <!-- PORTADA -->
  <div class="lab-section">
    <h1 style="font-size: 2rem; margin-bottom: 1rem;">Laboratorio MIHM v2.0</h1>
    <p style="color: var(--tx2); font-size: 1.05rem; margin-bottom: 1rem;">
      Explorador interactivo del <strong>Modelo Homeostático Multinodal</strong>. 
      Caso de estudio: Aguascalientes 2024–2026.
    </p>
    <p style="color: var(--tx3); font-size: 0.95rem;">
      Manipula las variables, observa cómo cambian las métricas, entiende la dinámica del colapso institucional.
    </p>
  </div>

  <!-- SECCIÓN 1: Calculadora de Fricción -->
  <div class="lab-section">
    <h2>Fricción Homeostática</h2>
    <p style="color: var(--tx2); margin-bottom: 1.5rem; font-size: 0.95rem;">
      <code>f = (t/T) + O</code><br>
      Mide cuánto se aleja el sistema de su punto de equilibrio.
    </p>
    
    <div class="calc-grid">
      <div class="calc-input">
        <label>Tiempo transcurrido (t) — horas</label>
        <input type="range" id="t-input" min="0" max="72" value="24" step="1">
        <div class="value"><span id="t-display">24</span> h</div>
      </div>
      <div class="calc-input">
        <label>Tiempo esperado (T) — horas</label>
        <input type="range" id="T-input" min="4" max="48" value="24" step="1">
        <div class="value"><span id="T-display">24</span> h</div>
      </div>
      <div class="calc-input">
        <label>Opacidad (O) — [0, 0.5]</label>
        <input type="range" id="O-input" min="0" max="0.5" value="0.42" step="0.05">
        <div class="value"><span id="O-display">0.42</span></div>
      </div>
    </div>

    <div class="result-box">
      <div class="result-label">Fricción calculada</div>
      <div class="result-value" id="f-result">1.425</div>
      <span class="result-status status-cr" id="f-status">Crítico</span>
      <div style="color: var(--tx3); font-size: 0.85rem; margin-top: 1rem;">
        Rango: [-1, 1] · Umbral crítico: > 0.7
      </div>
    </div>
  </div>

  <!-- SECCIÓN 2: Calculadora IHG -->
  <div class="lab-section">
    <h2>Índice de Gobernanza Homeostática (IHG)</h2>
    <p style="color: var(--tx2); margin-bottom: 1.5rem; font-size: 0.95rem;">
      <code>IHG = 0.50(NTI − 0.40) + 0.30(PF) + 0.20(CSR − 0.75)</code><br>
      Métrica maestra que sintetiza el estado del sistema.
    </p>
    
    <div class="calc-grid">
      <div class="calc-input">
        <label>NTI — Trazabilidad [0, 1]</label>
        <input type="range" id="NTI-input" min="0" max="1" value="0.351" step="0.05">
        <div class="value"><span id="NTI-display">0.351</span></div>
        <div style="font-size: 0.75rem; color: var(--tx3); margin-top: 0.25rem;">UCAP: 0.40</div>
      </div>
      <div class="calc-input">
        <label>PF — Pasos Fantasma [0, 1]</label>
        <input type="range" id="PF-input" min="0" max="1" value="0.62" step="0.05">
        <div class="value"><span id="PF-display">0.62</span></div>
      </div>
      <div class="calc-input">
        <label>CSR — Recuperación [0, 1]</label>
        <input type="range" id="CSR-input" min="0" max="1" value="0.05" step="0.05">
        <div class="value"><span id="CSR-display">0.05</span></div>
      </div>
    </div>

    <div class="result-box">
      <div class="result-label">Índice de Gobernanza Homeostática</div>
      <div class="result-value" id="IHG-result" style="color: var(--cr-t);">−0.620</div>
      <span class="result-status status-cr" id="ihg-status">ALERTA ROJA</span>
      <div style="color: var(--tx3); font-size: 0.85rem; margin-top: 1rem;">
        Umbral crítico: < −1.0 · Protocolo: EMERGENCY_DECISION
      </div>
    </div>
  </div>

  <!-- SECCIÓN 3: Caso de Estudio AGS -->
  <div class="lab-section">
    <h2>Caso de Estudio: Nodo Aguascalientes 2024-2026</h2>
    <p style="color: var(--tx2); margin-bottom: 1.5rem; font-size: 0.95rem;">
      Análisis integrado del colapso institucional. 136 días documentados de degradación desde equilibrio implícito hasta protocolo EMERGENCY_DECISION.
    </p>
    
    <div style="background: var(--bg2); border: 1px solid var(--bd); padding: 1.5rem; border-radius: var(--r); margin-bottom: 1.5rem;">
      <p style="color: var(--tx2); margin-bottom: 1rem;">
        Lea el <strong>análisis completo</strong> que amalgama la narrativa de cada etapa AGS con sus métricas MIHM correspondientes.
      </p>
      <a href="{{ site.baseurl }}/MIHM/caso-estudio/" style="display: inline-block; padding: 0.6rem 1.2rem; background: var(--ac); color: white; border-radius: var(--r); text-decoration: none; font-weight: 600;">Abrir Caso de Estudio Completo →</a>
    </div>
    
    <div class="timeline-horizontal">
      <div class="timeline-point active" onclick="loadAGSStage('ags-01')">
        <div class="timeline-point-label">AGS-01</div>
        <div class="timeline-point-value">−0.15</div>
        <div style="font-size: 0.65rem; color: var(--ok);">✓ Estable</div>
      </div>
      <div class="timeline-point" onclick="loadAGSStage('ags-02')">
        <div class="timeline-point-label">AGS-02</div>
        <div class="timeline-point-value">−0.28</div>
        <div style="font-size: 0.65rem; color: var(--wn-t);">⚠ Amarilla</div>
      </div>
      <div class="timeline-point" onclick="loadAGSStage('ags-03')">
        <div class="timeline-point-label">AGS-03</div>
        <div class="timeline-point-value">−0.44</div>
        <div style="font-size: 0.65rem; color: var(--wn-t);">🔶 Naranja</div>
      </div>
      <div class="timeline-point" onclick="loadAGSStage('ags-04')">
        <div class="timeline-point-label">AGS-04</div>
        <div class="timeline-point-value">−0.41</div>
        <div style="font-size: 0.65rem; color: var(--wn-t);">🔶 Naranja</div>
      </div>
      <div class="timeline-point" onclick="loadAGSStage('ags-05')">
        <div class="timeline-point-label">AGS-05</div>
        <div class="timeline-point-value">−0.55</div>
        <div style="font-size: 0.65rem; color: var(--cr-t);">🔴 Roja</div>
      </div>
      <div class="timeline-point" onclick="loadAGSStage('ags-06')">
        <div class="timeline-point-label">AGS-06</div>
        <div class="timeline-point-value">−0.62</div>
        <div style="font-size: 0.65rem; color: var(--cr-t);">❌ Colapso</div>
      </div>
    </div>

    <div id="ags-content" style="background: var(--bg2); border: 1px solid var(--bd); padding: 1.5rem; border-radius: var(--r); margin-top: 1rem;">
      <div style="font-size: 0.85rem; color: var(--tx3);">Cargando datos...</div>
    </div>
  </div>

  <!-- SECCIÓN 4: Validación Monte Carlo -->
  <div class="lab-section">
    <h2>Validación Probabilística</h2>
    <p style="color: var(--tx2); margin-bottom: 1.5rem; font-size: 0.95rem;">
      50,000 iteraciones de simulación de Monte Carlo con seed=42 (Mersenne Twister).
    </p>
    
    <table class="metrics-table">
      <tr>
        <th>Métrica</th>
        <th>Valor</th>
        <th>Descripción</th>
      </tr>
      <tr>
        <td style="font-family: var(--fm); font-weight: 600;">Iteraciones</td>
        <td style="font-family: var(--fm);">50,000</td>
        <td>Escenarios simulados</td>
      </tr>
      <tr>
        <td style="font-family: var(--fm); font-weight: 600;">P(D|A ∪ B)</td>
        <td style="font-family: var(--fm); color: var(--cr-t);">0.31</td>
        <td>Probabilidad condicional de colapso</td>
      </tr>
      <tr>
        <td style="font-family: var(--fm); font-weight: 600;">IC 95%</td>
        <td style="font-family: var(--fm);">[0.306, 0.314]</td>
        <td>Intervalo de confianza</td>
      </tr>
      <tr>
        <td style="font-family: var(--fm); font-weight: 600;">Seed</td>
        <td style="font-family: var(--fm);">42</td>
        <td>Reproducibilidad garantizada</td>
      </tr>
    </table>
  </div>

  <!-- SECCIÓN 5: Tabla de Referencia -->
  <div class="lab-section">
    <h2>Umbrales Críticos</h2>
    
    <table class="metrics-table">
      <tr>
        <th>Métrica</th>
        <th>Rango</th>
        <th>Umbral</th>
        <th>Significado</th>
      </tr>
      <tr>
        <td style="font-weight: 600;">IHG</td>
        <td style="font-family: var(--fm);">[-2, 2]</td>
        <td style="font-family: var(--fm); color: var(--cr-t);">< -1.0</td>
        <td>Alerta roja / Protocolo emergencia</td>
      </tr>
      <tr>
        <td style="font-weight: 600;">NTI</td>
        <td style="font-family: var(--fm);">[0, 1]</td>
        <td style="font-family: var(--fm); color: var(--cr-t);">< 0.40</td>
        <td>Capacidad operativa crítica</td>
      </tr>
      <tr>
        <td style="font-weight: 600;">PF</td>
        <td style="font-family: var(--fm);">[0, 1]</td>
        <td style="font-family: var(--fm); color: var(--cr-t);">> 0.40</td>
        <td>Inacción estructural severa</td>
      </tr>
      <tr>
        <td style="font-weight: 600;">CSR</td>
        <td style="font-family: var(--fm);">[0, 1]</td>
        <td style="font-family: var(--fm); color: var(--cr-t);">< 0.20</td>
        <td>Recuperación nula en +24h</td>
      </tr>
    </table>
  </div>

  <!-- Navegación -->
  <div class="nav-footer">
    <a href="{{ site.baseurl }}/mihm/" style="padding: 0.6rem 1.2rem; background: var(--ac); color: white; border-radius: var(--r); text-decoration: none; font-weight: 600;">← Motor Cuantitativo</a>
    <a href="{{ site.baseurl }}/nodo_ags/" style="padding: 0.6rem 1.2rem; border: 1px solid var(--ac); border-radius: var(--r); text-decoration: none;">Caso AGS completo</a>
    <a href="{{ site.baseurl }}/" style="padding: 0.6rem 1.2rem; border: 1px solid var(--bd); border-radius: var(--r); text-decoration: none;">Inicio</a>
  </div>

</div>

<script>
  // Datos AGS integrados
  const agsData = {
    'ags-01': { label: 'AGS-01: Baseline', date: '2024-02-15', ihg: -0.15, nti: 0.85, pf: 0.08, csr: 0.92, desc: 'Estado operativo normal. Sistema en equilibrio.' },
    'ags-02': { label: 'AGS-02: Crisis Onset', date: '2024-02-23', ihg: -0.28, nti: 0.72, pf: 0.22, csr: 0.65, desc: 'Narcobloqueos reportados. Primeras grietas en coherencia institucional.' },
    'ags-03': { label: 'AGS-03: Acute Phase', date: '2024-03-15', ihg: -0.44, nti: 0.61, pf: 0.38, csr: 0.42, desc: 'Escalada de violencia. Fragmentación de cadenas de mando.' },
    'ags-04': { label: 'AGS-04: Stabilization', date: '2024-04-10', ihg: -0.41, nti: 0.68, pf: 0.25, csr: 0.55, desc: 'Intento de intervención coordinada. Recuperación parcial.' },
    'ags-05': { label: 'AGS-05: Secondary Shock', date: '2024-05-20', ihg: -0.55, nti: 0.45, pf: 0.48, csr: 0.28, desc: 'Segundo evento violento. Sistema pierde capacidad de recuperación.' },
    'ags-06': { label: 'AGS-06: Post-Crisis', date: '2024-06-30', ihg: -0.62, nti: 0.351, pf: 0.62, csr: 0.05, desc: 'Análisis final: trazabilidad colapsada, protocolo EMERGENCY_DECISION activado.' }
  };

  // Calculadora Fricción
  function updateFriction() {
    const t = parseFloat(document.getElementById('t-input').value);
    const T = parseFloat(document.getElementById('T-input').value);
    const O = parseFloat(document.getElementById('O-input').value);
    
    document.getElementById('t-display').textContent = t;
    document.getElementById('T-display').textContent = T;
    document.getElementById('O-display').textContent = O.toFixed(2);
    
    const f = (t / T) + O;
    const fClamped = Math.max(-1, Math.min(1, f));
    document.getElementById('f-result').textContent = fClamped.toFixed(3);
    
    let status = fClamped < 0.3 ? 'OK' : fClamped < 0.6 ? 'Alerta Amarilla' : fClamped < 0.8 ? 'Alerta Naranja' : 'Crítico';
    let statusClass = fClamped < 0.3 ? 'status-ok' : fClamped < 0.6 ? 'status-am' : 'status-cr';
    let elem = document.getElementById('f-status');
    elem.textContent = status;
    elem.className = 'result-status ' + statusClass;
  }

  ['t-input', 'T-input', 'O-input'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateFriction);
  });

  // Calculadora IHG
  function updateIHG() {
    const NTI = parseFloat(document.getElementById('NTI-input').value);
    const PF = parseFloat(document.getElementById('PF-input').value);
    const CSR = parseFloat(document.getElementById('CSR-input').value);
    
    document.getElementById('NTI-display').textContent = NTI.toFixed(3);
    document.getElementById('PF-display').textContent = PF.toFixed(3);
    document.getElementById('CSR-display').textContent = CSR.toFixed(3);
    
    const IHG = 0.50 * (NTI - 0.40) + 0.30 * PF + 0.20 * (CSR - 0.75);
    document.getElementById('IHG-result').textContent = IHG.toFixed(3);
    
    let status = IHG >= -0.2 ? 'OK' : IHG >= -0.5 ? 'ALERTA AMARILLA' : IHG >= -1.0 ? 'ALERTA NARANJA' : 'ALERTA ROJA';
    let statusClass = IHG >= -0.2 ? 'status-ok' : IHG >= -0.5 ? 'status-am' : 'status-cr';
    let elem = document.getElementById('ihg-status');
    elem.textContent = status;
    elem.className = 'result-status ' + statusClass;
  }

  ['NTI-input', 'PF-input', 'CSR-input'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateIHG);
  });

  // Cargar etapa AGS
  function loadAGSStage(stage) {
    const data = agsData[stage];
    
    // Actualizar active state
    document.querySelectorAll('.timeline-point').forEach(el => el.classList.remove('active'));
    event.target.closest('.timeline-point').classList.add('active');
    
    const html = `
      <div style="border-bottom: 1px solid var(--bd); padding-bottom: 1rem; margin-bottom: 1rem;">
        <div style="font-family: var(--fm); font-size: 0.75rem; color: var(--tx3); text-transform: uppercase; margin-bottom: 0.25rem;">${data.date}</div>
        <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">${data.label}</h3>
        <p style="color: var(--tx2);">${data.desc}</p>
      </div>
      <table class="metrics-table" style="margin-top: 0;">
        <tr>
          <th>Métrica</th>
          <th>Valor</th>
          <th>Estado</th>
        </tr>
        <tr>
          <td style="font-weight: 600;">IHG</td>
          <td style="font-family: var(--fm); font-weight: 600;">${data.ihg.toFixed(3)}</td>
          <td><span class="status-${data.ihg >= -0.2 ? 'ok' : data.ihg >= -0.5 ? 'am' : 'cr'}">${data.ihg >= -0.2 ? '✓ Estable' : data.ihg >= -0.5 ? '⚠ Alerta' : '❌ Crítico'}</span></td>
        </tr>
        <tr>
          <td style="font-weight: 600;">NTI</td>
          <td style="font-family: var(--fm); font-weight: 600;">${data.nti.toFixed(3)}</td>
          <td><span class="status-${data.nti >= 0.4 ? 'ok' : 'cr'}">${data.nti >= 0.4 ? 'Operativo' : 'CRÍTICO'}</span></td>
        </tr>
        <tr>
          <td style="font-weight: 600;">PF</td>
          <td style="font-family: var(--fm); font-weight: 600;">${data.pf.toFixed(3)}</td>
          <td><span class="status-${data.pf < 0.3 ? 'ok' : data.pf < 0.4 ? 'am' : 'cr'}">${data.pf < 0.3 ? 'Normal' : data.pf < 0.4 ? 'Alerta' : 'Severo'}</span></td>
        </tr>
        <tr>
          <td style="font-weight: 600;">CSR</td>
          <td style="font-family: var(--fm); font-weight: 600;">${data.csr.toFixed(3)}</td>
          <td><span class="status-${data.csr >= 0.75 ? 'ok' : data.csr >= 0.5 ? 'am' : 'cr'}">${data.csr >= 0.75 ? 'Rápida' : data.csr >= 0.5 ? 'Moderada' : 'Nula'}</span></td>
        </tr>
      </table>
    `;
    document.getElementById('ags-content').innerHTML = html;
  }

  // Inicializar
  window.onload = function() {
    updateFriction();
    updateIHG();
    loadAGSStage('ags-01');
  };
</script>
