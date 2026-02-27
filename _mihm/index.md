---
layout: mihm
title: "MIHM v2.0 — Motor Cuantitativo"
description: "Multinodal Homeostatic Integration Model. Dashboard, NTI, patrones y laboratorio."
permalink: /mihm/
math: true
---

<!-- SECCIÓN 1: DASHBOARD EN VIVO -->
<section id="dashboard" class="mihm-section">
  <div class="section-label">01 · Estado en tiempo real</div>
  <h2>Dashboard del sistema</h2>
  
  <div class="sf-alert sf-alert--emergency">
    <strong>PROTOCOLO DE EMERGENCIA ACTIVO</strong> — IHG = −0.620. NTI = 0.351. Umbral UCAP superado. (23 feb 2026)
  </div>

  <div id="dashboard-system" class="sf-loading">Cargando métricas...</div>
  <div id="dashboard-nodes" class="sf-loading">Cargando tabla de nodos...</div>
  <div id="dashboard-scenarios" class="sf-loading">Cargando escenarios Monte Carlo (50k iteraciones)...</div>
</section>

<!-- SECCIÓN 2: NTI EN DETALLE -->
<section id="nti" class="mihm-section">
  <div class="section-label">02 · Trazabilidad institucional</div>
  <h2>Nodo de Trazabilidad Institucional</h2>
  
  <p class="section-intro">El NTI es la capa de auditoría del MIHM. Cuando NTI < UCAP (0.40), el sistema opera en modo ciego.</p>

  $$ \text{NTI} = \frac{1}{5}\left[(1 - \text{LDI}_n) + \text{ICC}_n + \text{CSR} + \text{IRCI}_n + \text{IIM}\right] = 0.351 $$

  <div id="dashboard-nti" class="sf-loading">Cargando componentes NTI...</div>

  <div class="nti-card">
    <h3>Protocolo de Recuperación</h3>
    <table class="sf-table">
      <thead>
        <tr><th>Acción</th><th>ΔNTI</th><th>Responsable</th></tr>
      </thead>
      <tbody>
        <tr><td>Protocolo anti-ICC</td><td>+0.08</td><td>Secretaría Seg. Pública</td></tr>
        <tr><td>Restauración IIM</td><td>+0.06</td><td>Mesa de Coordinación</td></tr>
        <tr><td>Reducción LDI</td><td>+0.05</td><td>Gobierno estatal</td></tr>
        <tr><td>Mejora CSR</td><td>+0.10</td><td>SSPC</td></tr>
      </tbody>
    </table>
    <p class="nti-target"><strong>NTI objetivo a 30 días:</strong> 0.60 (modo operativo estándar)</p>
  </div>
</section>

<!-- SECCIÓN 3: VARIABLES DEL SISTEMA -->
<section id="variables" class="mihm-section">
  <div class="section-label">03 · Variables fundamentales</div>
  <h2>Catálogo de variables MIHM</h2>

  <table class="sf-table">
    <thead>
      <tr>
        <th>Símbolo</th><th>Nombre</th><th>Dominio</th><th>Umbral crítico</th><th>Proxy observable</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>$C_i$</td><td>Capacidad adaptativa</td><td>$[0,1]$</td><td>$< 0.30$ → FRACTURE</td><td>Recursos / demanda</td></tr>
      <tr><td>$E_i$</td><td>Carga entrópica</td><td>$[0,1]$</td><td>$> 0.80$ → CRITICAL</td><td>1 − (eficiencia × capacidad)</td></tr>
      <tr><td>$L_i$</td><td>Latencia operativa</td><td>$[0,1]$</td><td>$> 0.85$ → DEGRADED</td><td>t_respuesta / t_normativo</td></tr>
      <tr><td>$K_i$</td><td>Conectividad funcional</td><td>$[0,1]$</td><td>—</td><td>Nodos conectados / total</td></tr>
      <tr><td>$R_i$</td><td>Redistribución</td><td>$[0,1]$</td><td>—</td><td>Capacidad de reasignación</td></tr>
      <tr><td>$M_i$</td><td>Coherencia institucional</td><td>$[0,1]$</td><td>$< 0.50$ → OPAQUE</td><td>1 − |declarado−observable|/declarado</td></tr>
      <tr><td>$O$</td><td>Opacidad sistémica</td><td>$[0,1]$</td><td>$O \to 1$ divergencia</td><td>Puntos ciegos / total procesos</td></tr>
      <tr><td>$f$</td><td>Fricción nodo</td><td>$[0,\infty)$</td><td>$> 1.0$ fuera umbral</td><td>(t/T) + O</td></tr>
    </tbody>
  </table>
</section>

<!-- SECCIÓN 4: PATRONES ↔ MIHM -->
<section id="patrones" class="mihm-section">
  <div class="section-label">04 · Mapeo patrones → variables</div>
  <h2>Patrones estructurales y su expresión cuantitativa</h2>

  <p class="section-intro">Cada documento de la serie describe un patrón observable. Este mapa conecta cada patrón con la variable MIHM que modifica y el nodo donde se observó.</p>

  <div id="sf-pattern-bridge" data-sf-load="true">—</div>
  <div id="sf-recommendations" data-sf-load="true">—</div>
</section>

<!-- SECCIÓN 5: CATÁLOGO COMPLETO -->
<section id="catalogo" class="mihm-section">
  <div class="section-label">05 · Componentes del framework</div>
  <h2>Catálogo MIHM v2.0</h2>

  <h3>Métricas Maestras</h3>
  <table class="sf-table">
    <thead>
      <tr><th>Componente</th><th>Símbolo</th><th>Definición</th><th>Umbral UCAP</th></tr>
    </thead>
    <tbody>
      <tr><td>IHG</td><td>IHG</td><td>$\frac{1}{N}\sum(C_i-E_i)(1-L_i^{\text{eff}})$</td><td>$< -0.50$</td></tr>
      <tr><td>NTI</td><td>NTI</td><td>$\frac{1}{5}[(1-\text{LDI}_n)+\text{ICC}_n+\text{CSR}+\text{IRCI}_n+\text{IIM}]$</td><td>$< 0.40$</td></tr>
      <tr><td>ICE</td><td>ICE</td><td>$\max(E_i)/\sum(E_i)$</td><td>$> 0.30$</td></tr>
      <tr><td>Fricción</td><td>$f$</td><td>$(t/T) + O$</td><td>$> 1.00$</td></tr>
    </tbody>
  </table>

  <h3>Nodos del Sistema — Aguascalientes</h3>
  <table class="sf-table">
    <thead>
      <tr><th>ID</th><th>Descripción</th><th>Documento</th></tr>
    </thead>
    <tbody>
      <tr><td>N1</td><td>Agua/Ambiente</td><td><a href="/nodo-ags/ags-03/">AGS-03</a></td></tr>
      <tr><td>N2</td><td>Capital Social</td><td><a href="/nodo-ags/ags-01/">AGS-01</a></td></tr>
      <tr><td>N3</td><td>Logística</td><td><a href="/nodo-ags/ags-04/">AGS-04</a></td></tr>
      <tr><td>N4</td><td>Seguridad</td><td><a href="/nodo-ags/ags-02/">AGS-02</a></td></tr>
      <tr><td>N5</td><td>Coordinación</td><td><a href="/nodo-ags/ags-05/">AGS-05</a></td></tr>
      <tr><td>N6</td><td>Seguridad Exógena</td><td><a href="/nodo-ags/ags-06/">AGS-06</a></td></tr>
    </tbody>
  </table>

  <h3>Gates de Validación (H1–H3)</h3>
  <table class="sf-table">
    <thead>
      <tr><th>Gate</th><th>Criterio</th><th>Método</th></tr>
    </thead>
    <tbody>
      <tr><td>H1 — Coherencia</td><td>Datos AGS vs realidad</td><td>Desviación < 15%</td></tr>
      <tr><td>H2 — Trazabilidad</td><td>Cadena federal→local</td><td>Evidencia textual VHpD</td></tr>
      <tr><td>H3 — Homeostasis</td><td>IHG > −0.30 @ 180d</td><td>Monte Carlo</td></tr>
    </tbody>
  </table>
</section>

<!-- SECCIÓN 6: RECURSOS DESCARGABLES -->
<section class="mihm-section">
  <div class="section-label">06 · Recursos técnicos</div>
  <h2>Datos y código</h2>

  <div class="sf-downloads">
    <a href="/assets/data/ags_metrics.json" class="sf-download-link" download>
      <span class="sf-download-link__icon">[JSON]</span>
      <span class="sf-download-link__name">ags_metrics.json — Métricas Post-Fractura</span>
    </a>
    <a href="/scripts/mihm_v2.py" class="sf-download-link" download>
      <span class="sf-download-link__icon">[PY]</span>
      <span class="sf-download-link__name">mihm_v2.py — Motor NODEX + Monte Carlo</span>
    </a>
    <a href="/assets/data/MIHM_v2_manuscrito_completo.pdf" class="sf-download-link" download>
      <span class="sf-download-link__icon">[PDF]</span>
      <span class="sf-download-link__name">MIHM v2.0 — Manuscrito Completo</span>
    </a>
    <a href="/scripts/validator.py" class="sf-download-link" download>
      <span class="sf-download-link__icon">[PY]</span>
      <span class="sf-download-link__name">validator.py — Validador VHpD</span>
    </a>
  </div>
</section>