---
layout: default
title: "Caso de Estudio: Nodo Aguascalientes 2024-2026"
description: "Análisis integrado del colapso institucional: narrativa + métricas MIHM. 136 días de degradación documentada."
permalink: /caso-estudio/
---

<style>
  .case-hero { background: linear-gradient(135deg, var(--bg2), var(--bg1)); border-left: 4px solid var(--ac); padding: 2rem; border-radius: var(--r); margin-bottom: 2rem; }
  .case-section { border-top: 1px solid var(--bd); padding-top: 2rem; margin-top: 2rem; }
  .stage-card { background: var(--bg2); border: 1px solid var(--bd); padding: 1.5rem; border-radius: var(--r); margin-bottom: 1.5rem; }
  .stage-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; }
  .stage-title { font-size: 1.1rem; font-weight: 600; }
  .stage-date { font-size: 0.75rem; color: var(--tx2); font-family: var(--fm); text-transform: uppercase; }
  .stage-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; }
  .metric-box { background: var(--bg1); padding: 0.75rem; border-radius: 3px; border-left: 3px solid var(--ac); }
  .metric-label { font-size: 0.7rem; color: var(--tx2); font-family: var(--fm); text-transform: uppercase; letter-spacing: 0.5px; }
  .metric-value { font-size: 1.3rem; font-weight: 600; font-family: var(--fm); margin-top: 0.3rem; }
  .narrative { color: var(--tx2); font-size: 0.95rem; line-height: 1.8; margin-top: 1rem; }
  .formula { background: var(--bg1); border-left: 2px solid var(--ac); padding: 0.75rem 1rem; margin: 1rem 0; font-family: var(--fm); font-size: 0.85rem; }
  .status-badge { display: inline-block; padding: 0.3rem 0.6rem; border-radius: 3px; font-size: 0.7rem; font-weight: 600; font-family: var(--fm); text-transform: uppercase; margin-left: 0.5rem; }
  .status-ok { background: var(--ok); color: white; }
  .status-am { background: var(--wn); color: white; }
  .status-cr { background: var(--cr); color: white; }
  
  @media (max-width: 768px) {
    .stage-header { flex-direction: column; gap: 0.5rem; }
    .stage-metrics { grid-template-columns: 1fr 1fr; }
  }
</style>

<div style="max-width: 1000px; margin: 0 auto; padding: 2rem 1rem;">

  <!-- PORTADA -->
  <div class="case-hero">
    <h1 style="font-size: 1.8rem; margin-bottom: 1rem;">Caso de Estudio</h1>
    <p style="color: var(--tx2); margin-bottom: 0.75rem;">Nodo Aguascalientes · 2024–2026</p>
    <p style="font-size: 0.9rem; color: var(--tx3);">Análisis integrado del colapso institucional bajo el marco MIHM v2.0. 136 días de degradación documentada. Transición de equilibrio implícito a protocolo EMERGENCY_DECISION.</p>
  </div>

  <!-- SÍNTESIS -->
  <div class="case-section">
    <h2>Síntesis Ejecutiva</h2>
    
    <table style="width: 100%; margin-top: 1rem; border-collapse: collapse; font-size: 0.9rem;">
      <tr style="background: var(--bg2);">
        <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--ac);">Métrica</th>
        <th style="padding: 0.75rem; text-align: right; border-bottom: 2px solid var(--ac);">Valor</th>
        <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--ac);">Umbral</th>
        <th style="padding: 0.75rem; text-align: center; border-bottom: 2px solid var(--ac);">Status</th>
      </tr>
      <tr style="border-bottom: 1px solid var(--bd);">
        <td style="padding: 0.75rem;">IHG (Índice de Gobernanza)</td>
        <td style="padding: 0.75rem; text-align: right; font-family: var(--fm); font-weight: 600;">−0.620</td>
        <td style="padding: 0.75rem;">< −1.0</td>
        <td style="padding: 0.75rem; text-align: center;"><span class="status-badge status-cr">CRÍTICO</span></td>
      </tr>
      <tr style="border-bottom: 1px solid var(--bd);">
        <td style="padding: 0.75rem;">NTI (Trazabilidad Institucional)</td>
        <td style="padding: 0.75rem; text-align: right; font-family: var(--fm); font-weight: 600;">0.351</td>
        <td style="padding: 0.75rem;">UCAP 0.40</td>
        <td style="padding: 0.75rem; text-align: center;"><span class="status-badge status-cr">COLAPSO</span></td>
      </tr>
      <tr style="border-bottom: 1px solid var(--bd);">
        <td style="padding: 0.75rem;">P(Fractura Sistémica | t+4y)</td>
        <td style="padding: 0.75rem; text-align: right; font-family: var(--fm); font-weight: 600;">71%</td>
        <td style="padding: 0.75rem;">Crítico > 60%</td>
        <td style="padding: 0.75rem; text-align: center;"><span class="status-badge status-cr">ALERTA</span></td>
      </tr>
      <tr>
        <td style="padding: 0.75rem;">Protocolo Activo</td>
        <td style="padding: 0.75rem; text-align: right; font-family: var(--fm); font-weight: 600;">EMERGENCY_DECISION</td>
        <td style="padding: 0.75rem;">Por IHG < −1.0</td>
        <td style="padding: 0.75rem; text-align: center;"><span class="status-badge status-cr">ACTIVO</span></td>
      </tr>
    </table>
  </div>

  <!-- ETAPA 1 -->
  <div class="case-section">
    <h2>Etapa 1: Baseline (15 feb 2024)</h2>
    
    <div class="stage-card">
      <div class="stage-header">
        <span class="stage-title">AGS-01 — Corredor Jalisco–Zacatecas–Guanajuato</span>
        <span class="stage-date">15 febrero 2024</span>
      </div>
      
      <div class="stage-metrics">
        <div class="metric-box">
          <div class="metric-label">IHG</div>
          <div class="metric-value" style="color: var(--ok-t);">−0.15</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">NTI</div>
          <div class="metric-value" style="color: var(--ok-t);">0.85</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Fricción (f)</div>
          <div class="metric-value" style="color: var(--ok-t);">0.94</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Status</div>
          <div class="metric-value"><span class="status-badge status-ok">ESTABLE</span></div>
        </div>
      </div>

      <div class="narrative">
        <strong>Narrativa:</strong> Aguascalientes operó como nodo de corredor neutro. La paz observada era manifestación de utilidad implícita sostenida por el actor hegemónico del corredor Jalisco–Zacatecas–Guanajuato. Sistema en equilibrio funcional con variables no documentadas.
        <div class="formula">
          <strong>Hipótesis:</strong> U<sub>P</sub> = B<sub>C</sub> − C<sub>C</sub> − f<sub>corredor</sub><br>
          donde U<sub>P</sub> es la utilidad política de la estabilidad aparente.
        </div>
      </div>
    </div>
  </div>

  <!-- ETAPA 2 -->
  <div class="case-section">
    <h2>Etapa 2: Crisis Onset (23 feb 2024)</h2>
    
    <div class="stage-card">
      <div class="stage-header">
        <span class="stage-title">AGS-02 — Capacidad Institucional bajo Presión Exógena</span>
        <span class="stage-date">23 febrero 2024</span>
      </div>
      
      <div class="stage-metrics">
        <div class="metric-box">
          <div class="metric-label">IHG</div>
          <div class="metric-value" style="color: var(--wn-t);">−0.28</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">NTI</div>
          <div class="metric-value" style="color: var(--wn-t);">0.72</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Fricción (f)</div>
          <div class="metric-value" style="color: var(--wn-t);">1.76</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Status</div>
          <div class="metric-value"><span class="status-badge status-am">ALERTA AMARILLA</span></div>
        </div>
      </div>

      <div class="narrative">
        <strong>Narrativa:</strong> 252 narcobloqueos simultáneos. Nodo Seguridad Pública (N4) degrada a C₄ = 0.35 (umbral < 0.50). Aparición de latencia institucional: tiempo de respuesta = 6h, tiempo normativo = 1h. Brecha = 6x.
        <div class="formula">
          <strong>Latencia de decisión:</strong> LDI = t<sub>respuesta</sub>/T<sub>normativo</sub> + O<sub>opacidad</sub><br>
          LDI = 6h/1h + 0.42 = 6.42 (severamente elevada)
        </div>
      </div>
    </div>
  </div>

  <!-- ETAPA 3 -->
  <div class="case-section">
    <h2>Etapa 3: Acute Phase (15 mar 2024)</h2>
    
    <div class="stage-card">
      <div class="stage-header">
        <span class="stage-title">AGS-03 — Infraestructura Hídrica y Entropía Acumulada</span>
        <span class="stage-date">15 marzo 2024</span>
      </div>
      
      <div class="stage-metrics">
        <div class="metric-box">
          <div class="metric-label">IHG</div>
          <div class="metric-value" style="color: var(--wn-t);">−0.44</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">NTI</div>
          <div class="metric-value" style="color: var(--wn-t);">0.61</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Fricción (f)</div>
          <div class="metric-value" style="color: var(--wn-t);">1.85</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Status</div>
          <div class="metric-value"><span class="status-badge status-am">ALERTA NARANJA</span></div>
        </div>
      </div>

      <div class="narrative">
        <strong>Narrativa:</strong> Escalada de violencia. Fragmentación de cadenas de mando federal-local. Acuífero Valle de Aguascalientes bajo presión: extracción concesionada (342.95 hm³/año) > recarga (249.6), déficit = −95.75 hm³/año. Carga entrópica E<sub>N1</sub> = 0.89 amplifica fragilidad sistémica.
        <div class="formula">
          <strong>Entropía acumulada:</strong> E<sub>N1</sub> = 1 − (C<sub>N1</sub> × recuperabilidad)<br>
          E<sub>N1</sub> = 1 − (0.18 × 0.25) = 0.89 (extremadamente severa)
        </div>
      </div>
    </div>
  </div>

  <!-- ETAPA 4 -->
  <div class="case-section">
    <h2>Etapa 4: Stabilization Attempt (10 abr 2024)</h2>
    
    <div class="stage-card">
      <div class="stage-header">
        <span class="stage-title">AGS-04 — Cadena Logística Automotriz</span>
        <span class="stage-date">10 abril 2024</span>
      </div>
      
      <div class="stage-metrics">
        <div class="metric-box">
          <div class="metric-label">IHG</div>
          <div class="metric-value" style="color: var(--wn-t);">−0.41</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">NTI</div>
          <div class="metric-value" style="color: var(--wn-t);">0.68</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Fricción (f)</div>
          <div class="metric-value" style="color: var(--wn-t);">0.70</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Status</div>
          <div class="metric-value"><span class="status-badge status-am">ALERTA NARANJA</span></div>
        </div>
      </div>

      <div class="narrative">
        <strong>Narrativa:</strong> Intento de intervención coordinada. Sector logístico-industrial (N3) mantiene C₃ = 0.85 (operativo). Sin embargo, esta "ficción institucional" ocultaba que las métricas no reflejaban realidad: reportes de normalidad mientras la cadena de decisión estaba fracturada en el nivel federal.
        <div class="formula">
          <strong>Ficción institucional:</strong> Brecha entre narrativa oficial y operación real<br>
          Δ = |reportes de estabilidad − capacidad observable|
        </div>
      </div>
    </div>
  </div>

  <!-- ETAPA 5 -->
  <div class="case-section">
    <h2>Etapa 5: Secondary Shock (20 may 2024)</h2>
    
    <div class="stage-card">
      <div class="stage-header">
        <span class="stage-title">AGS-05 — Trazabilidad Federal–Local y Latencia de Decisión</span>
        <span class="stage-date">20 mayo 2024</span>
      </div>
      
      <div class="stage-metrics">
        <div class="metric-box">
          <div class="metric-label">IHG</div>
          <div class="metric-value" style="color: var(--cr-t);">−0.55</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">NTI</div>
          <div class="metric-value" style="color: var(--cr-t);">0.45</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Fricción (f)</div>
          <div class="metric-value" style="color: var(--cr-t);">2.10</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Status</div>
          <div class="metric-value"><span class="status-badge status-cr">ALERTA ROJA</span></div>
        </div>
      </div>

      <div class="narrative">
        <strong>Narrativa:</strong> Segundo evento violento. Sistema pierde capacidad de recuperación (CSR → 0). Trazabilidad institucional (N5) colapsa. Latencia de decisión federal-local supera umbral normativo severamente. El "pacto implícito" que sostenía la estabilidad aparente se revela insostenible.
        <div class="formula">
          <strong>Latencia extrema:</strong> f<sub>N5</sub> = t<sub>respuesta</sub>/T<sub>normativo</sub> + O<sub>opacidad</sub><br>
          f<sub>N5</sub> = 6h/1h + 0.68 = 6.68 (colapso funcional)
        </div>
      </div>
    </div>
  </div>

  <!-- ETAPA 6 -->
  <div class="case-section">
    <h2>Etapa 6: Post-Crisis Analysis (30 jun 2024)</h2>
    
    <div class="stage-card">
      <div class="stage-header">
        <span class="stage-title">AGS-06 — Síntesis Post-Fractura: Cierre del Ciclo Empírico</span>
        <span class="stage-date">30 junio 2024</span>
      </div>
      
      <div class="stage-metrics">
        <div class="metric-box">
          <div class="metric-label">IHG</div>
          <div class="metric-value" style="color: var(--cr-t);">−0.62</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">NTI</div>
          <div class="metric-value" style="color: var(--cr-t);">0.351</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Fricción (f)</div>
          <div class="metric-value" style="color: var(--cr-t);">2.47</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Status</div>
          <div class="metric-value"><span class="status-badge status-cr">COLAPSO</span></div>
        </div>
      </div>

      <div class="narrative">
        <strong>Narrativa:</strong> Trazabilidad colapsada (NTI = 0.351, por debajo de UCAP 0.40). Sistema ciego ante shocks exógenos. IHG = −0.62 activa protocolo EMERGENCY_DECISION. La variable no documentada que sostenía el equilibrio desaparece. El análisis de 136 días revela que la "fricción" no era accidental sino estructural: opacidad institucional (O = 0.42) amplificada por latencia federal-local.
        <div class="formula">
          <strong>Multiplicador de fricción:</strong> FMF = (1 + O/2) × (1 + PF/3)<br>
          FMF = (1 + 0.42/2) × (1 + 0.62/3) = 1.21 × 1.21 = 1.85x amplificación
        </div>
      </div>
    </div>
  </div>

  <!-- CONCLUSIÓN -->
  <div class="case-section">
    <h2>Análisis e Interpretación Clínica</h2>
    
    <p style="color: var(--tx2); font-size: 0.95rem; line-height: 1.8;">
      <strong>Hallazgo principal:</strong> El colapso del Nodo Aguascalientes NO fue abrupto. Fue una <em>degradación incremental</em> donde:
    </p>
    
    <ol style="color: var(--tx2); font-size: 0.9rem; line-height: 1.8;">
      <li><strong>Fase 1 (Baseline):</strong> Sistema estable con variables ocultas. IHG ≈ −0.15 (equilibrio en la zona gris).</li>
      <li><strong>Fase 2 (Onset):</strong> Shock exógeno (narcobloqueos) expone latencia institucional. IHG degrada a −0.28.</li>
      <li><strong>Fase 3 (Acute):</strong> Entropía acumulada amplifica fragilidad. Fricción sube a 1.85. IHG a −0.44.</li>
      <li><strong>Fase 4 (Stabilization):</strong> Intento de recuperación falla parcialmente. Ficción institucional persiste. IHG levemente mejora a −0.41.</li>
      <li><strong>Fase 5 (Secondary shock):</strong> Segundo evento. Sistema sin capacidad de recuperación. NTI cae a 0.45. IHG a −0.55.</li>
      <li><strong>Fase 6 (Collapse):</strong> Trazabilidad cae bajo umbral operativo (UCAP). NTI = 0.351. Sistema "ciego" ante nuevos shocks. Protocolo EMERGENCY_DECISION activado.</li>
    </ol>

    <div style="background: var(--bg2); border-left: 4px solid var(--cr); padding: 1rem; margin-top: 1.5rem; border-radius: 3px;">
      <p style="font-weight: 600; color: var(--cr-t);">⚠ Diagnóstico Crítico</p>
      <p style="color: var(--tx2); font-size: 0.9rem;">
        La opacidad institucional (O = 0.42) no es un "defecto" sino una <strong>variable de ajuste</strong> que el sistema usa para mantener estabilidad aparente. Cuando desaparece la voluntad política de mantener esa opacidad, el sistema colapsa porque carecía de instituciones formales para operar en condiciones de transparencia.
      </p>
    </div>
  </div>

  <!-- NAVEGACIÓN -->
  <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--bd);">
    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
      <a href="{{ site.baseurl }}/laboratorio/" style="padding: 0.6rem 1.2rem; background: var(--ac); color: var(--bg); border-radius: var(--r); text-decoration: none; font-size: 0.9rem; font-weight: 600;">→ Laboratorio MIHM</a>
      <a href="{{ site.baseurl }}/" style="padding: 0.6rem 1.2rem; border: 1px solid var(--ac); border-radius: var(--r); text-decoration: none; font-size: 0.9rem;">← Volver al inicio</a>
    </div>
  </div>

</div>
