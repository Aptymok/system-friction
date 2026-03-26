---
title: "MIHM v2.0 — Motor Cuantitativo"
description: "Multinodal Homeostatic Integration Model. Fórmulas, variables, umbrales."
permalink: /mihm/
math: true
---

<!-- ======================================================
     ENCABEZADO - Usando clases existentes
====================================================== -->
<div class="section">
  <div class="section__label">MIHM v2.0 · Multinodal Homeostatic Integration Model</div>
  <h1>Motor Cuantitativo</h1>
  <p class="t-dim" style="margin-top: 0.5rem; font-family: var(--mono); font-size: 0.7rem;">
    seed 42 · Monte Carlo 50k · v2.0 · validated
  </p>
</div>

<!-- ======================================================
     FÓRMULAS BASE
====================================================== -->
<div class="section">
  <div class="section__label">Fórmulas base</div>
  
  <div style="overflow-x: auto; padding: 1rem 0;">
    $$f = \frac{t}{T} + O$$
    
    $$\text{IHG} = \frac{1}{N}\sum_{i=1}^{N}(C_i - E_i)(1 - L_i^{\text{eff}})$$
    
    $$L_i^{\text{eff}} = \min\!\left(L_i \cdot (1 + (1 - M_i)),\; 1\right)$$
    
    $$\text{NTI} = \frac{1}{5}\left[(1-\text{LDI}_n) + \text{ICC}_n + \text{CSR} + \text{IRCI}_n + \text{IIM}\right]$$
  </div>
</div>

<!-- ======================================================
     VARIABLES DEL SISTEMA - Usando dim-table
====================================================== -->
<div class="section">
  <div class="section__label">Variables del sistema</div>
  
  <div style="overflow-x: auto;">
    <table class="dim-table">
      <thead>
        <tr>
          <th>Símbolo</th>
          <th>Nombre</th>
          <th>Dominio</th>
          <th>Umbral crítico</th>
          <th>Proxy observable</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>$C_i$</td><td>Capacidad adaptativa</td><td>$[0,1]$</td><td>$< 0.30$ → FRACTURE</td><td>Recursos disponibles / demanda</td></tr>
        <tr><td>$E_i$</td><td>Carga entrópica</td><td>$[0,1]$</td><td>$> 0.80$ → CRITICAL</td><td>1 − (eficiencia × capacidad)</td></tr>
        <tr><td>$L_i$</td><td>Latencia operativa</td><td>$[0,1]$</td><td>$> 0.85$ → DEGRADED</td><td>t_respuesta / t_normativo</td></tr>
        <tr><td>$K_i$</td><td>Conectividad funcional</td><td>$[0,1]$</td><td>—</td><td>Nodos conectados / total</td></tr>
        <tr><td>$R_i$</td><td>Redistribución</td><td>$[0,1]$</td><td>—</td><td>Capacidad de reasignación</td></tr>
        <tr><td>$M_i$</td><td>Coherencia institucional</td><td>$[0,1]$</td><td>$< 0.50$ → OPAQUE</td><td>1 − \|declarado−observable\|/declarado</td></tr>
        <tr><td>$O$</td><td>Opacidad sistémica</td><td>$[0,1]$</td><td>$O \to 1$ divergencia</td><td>Puntos ciegos / total procesos</td></tr>
        <tr><td>$f$</td><td>Fricción nodo</td><td>$[0,\infty)$</td><td>$> 1.0$ fuera umbral</td><td>(t/T) + O</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ======================================================
     COMPONENTES NTI - Usando dim-table
====================================================== -->
<div class="section">
  <div class="section__label">Componentes del NTI</div>
  
  <div style="overflow-x: auto;">
    <table class="dim-table">
      <thead>
        <tr><th>Componente</th><th>Fórmula</th><th>Descripción</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>LDI_norm</strong></td><td>min(t_real / t_referencia, 1.0)</td><td>Latencia de decisión institucional</td></tr>
        <tr><td><strong>ICC_norm</strong></td><td>1 − Σ_j f_j²</td><td>Desconcentración de conocimiento</td></tr>
        <tr><td><strong>CSR</strong></td><td>acciones_ejecutadas / señales_detectadas</td><td>Cobertura de señales de riesgo</td></tr>
        <tr><td><strong>IRCI_norm</strong></td><td>función_base / función_tras_pérdida</td><td>Resiliencia de capital institucional</td></tr>
        <tr><td><strong>IIM</strong></td><td>1 − \|reportado−verificado\|/reportado</td><td>Integridad de información medida</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ======================================================
     APLICACIÓN EN NODOS ACTIVOS
====================================================== -->
<div class="section">
  <div class="section__label">Aplicación en nodos activos</div>
  
  <p>El estado actual del sistema (IHG, NTI, proyecciones) se encuentra en el <a href="{{ site.baseurl }}/">Dashboard principal →</a></p>
  
  <p>Para ver la aplicación empírica completa del MIHM en un caso geográfico:</p>
  <ul>
    <li><a href="{{ site.baseurl }}/nodo-ags/"><strong>Nodo Aguascalientes</strong></a> · Validación post-fractura 2026</li>
  </ul>
</div>

<!-- ======================================================
     DESCARGAS - Usando estructura simple
====================================================== -->
<div class="section">
  <div class="section__label">Descargas</div>
  
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-top: 1.5rem;">
    <a href="{{ site.baseurl }}/assets/data/ags_metrics.json" style="display: block; padding: 1rem; border: 1px solid var(--border); border-radius: var(--r); text-decoration: none;">
      <div style="font-family: var(--mono); font-size: 0.6rem; color: var(--gold-dim); margin-bottom: 0.3rem;">JSON</div>
      <div style="font-weight: 500;">ags_metrics.json</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">métricas completas nodo AGS</div>
    </a>
    
    <a href="{{ site.baseurl }}/assets/data/patterns.json" style="display: block; padding: 1rem; border: 1px solid var(--border); border-radius: var(--r); text-decoration: none;">
      <div style="font-family: var(--mono); font-size: 0.6rem; color: var(--gold-dim); margin-bottom: 0.3rem;">JSON</div>
      <div style="font-weight: 500;">patterns.json</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">patrones ↔ MIHM</div>
    </a>
    
    <a href="{{ site.baseurl }}/scripts/mihm_v2.py" style="display: block; padding: 1rem; border: 1px solid var(--border); border-radius: var(--r); text-decoration: none;">
      <div style="font-family: var(--mono); font-size: 0.6rem; color: var(--gold-dim); margin-bottom: 0.3rem;">PY</div>
      <div style="font-weight: 500;">mihm_v2.py</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">motor Python · seed 42</div>
    </a>
    
    <a href="{{ site.baseurl }}/assets/data/MIHM_v2_manuscrito_completo.pdf" style="display: block; padding: 1rem; border: 1px solid var(--border); border-radius: var(--r); text-decoration: none;">
      <div style="font-family: var(--mono); font-size: 0.6rem; color: var(--gold-dim); margin-bottom: 0.3rem;">PDF</div>
      <div style="font-weight: 500;">Manuscrito completo</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">MIHM v2.0 · CC BY 4.0</div>
    </a>
  </div>
</div>

<!-- ======================================================
     NAVEGACIÓN - Usando doc-footer-nav
====================================================== -->
<div class="doc-footer-nav" style="margin-top: 3rem;">
  <a href="https://aptymok.github.io/systemfrictionlab/index.html">System Friction Lab v.Beta</a>
</div>
