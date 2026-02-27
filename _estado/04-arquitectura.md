---
layout: estado
title: "04 · Arquitectura"
permalink: /estado/04-arquitectura/
---

<div class="section" id="s4">
  <div class="doc-label blue">Arquitectura · Propuesta v2.0</div>
  <h1>De repositorio<br>a consola de observación.</h1>
  <p class="doc-meta">Propuesta estructural · Implementable sin cambio de stack · Fases 0→3</p>

  <p>El sitio ya tiene la estructura correcta en su parte conceptual: Serie (patrones abstractos), Nodos (instanciación empírica), Core (metodología). Le falta una tercera capa que conecte ambas con datos verificables en tiempo real.</p>

  <div class="rule"></div>

  <h2>Documentos existentes — mantener</h2>
  <div class="doc-grid">
    <div class="doc-item">
      <div class="doc-num">core-0 · core-00 · core-bridge</div>
      <div class="doc-title">Capa metodológica</div>
      <div class="doc-sub">Mantener como están. Corregir solo los bugs de duplicidad y metadata. Son el umbral de lectura correcto.</div>
    </div>
    <div class="doc-item">
      <div class="doc-num">doc-01 — doc-10</div>
      <div class="doc-title">Serie de patrones</div>
      <div class="doc-sub">Completar rutas sugeridas. Añadir caja .mapeo-box a cada documento vinculando el patrón con su variable MIHM.</div>
    </div>
    <div class="doc-item">
      <div class="doc-num">nodo-ags · ags-01—06</div>
      <div class="doc-title">Nodo Aguascalientes</div>
      <div class="doc-sub">Vincular explícitamente con MIHM. Base del template para futuros nodos. El único caso con ags-06 validado.</div>
    </div>
  </div>

  <div class="rule"></div>

  <h2>Documentos nuevos — prioridad 1 (antes del 23 mar 2026)</h2>
  <div class="doc-grid">
    <a class="doc-item new" href="/estado/05-templates-mihm/">
      <div class="doc-num">nuevo · /mihm/ · Prioridad 1</div>
      <div class="doc-title">MIHM · Panel de estado</div>
      <div class="doc-sub">Panel central: IHG y NTI actuales de todos los nodos activos, escenarios Monte Carlo, enlaces a código Python. No explica el MIHM. Muestra su lectura de estado.</div>
    </a>
    <div class="doc-item new">
      <div class="doc-num">nuevo · /docs/core-patrones/ · Prioridad 1</div>
      <div class="doc-title">Catálogo de patrones SF ↔ MIHM</div>
      <div class="doc-sub">Mapeo explícito: cada patrón de System Friction con su variable MIHM, ecuación, condiciones de aparición y de refutación. El puente que falta entre la prosa y el motor.</div>
    </div>
    <div class="doc-item new">
      <div class="doc-num">nuevo · /docs/core-nti/ · Prioridad 1</div>
      <div class="doc-title">NTI · El sistema se auto-audita</div>
      <div class="doc-sub">Descripción técnica del NTI como instrumento de observación del propio ecosistema. Sin este documento el sistema describe fricción en otros pero no tiene protocolo para detectarla en sí mismo.</div>
    </div>
  </div>

  <h2>Documentos nuevos — prioridad 2 (antes del 23 may 2026)</h2>
  <div class="doc-grid">
    <div class="doc-item">
      <div class="doc-num">nuevo · /docs/core-falsabilidad/ · Prioridad 2</div>
      <div class="doc-title">Condiciones formales de refutación</div>
      <div class="doc-sub">Por patrón: "Si en 90 días IHG sube >0.30 sin intervención documentada, recalibrar." Cierra el ciclo científico del ecosistema.</div>
    </div>
    <div class="doc-item">
      <div class="doc-num">nuevo · /docs/bridge-codigo/ · Prioridad 2</div>
      <div class="doc-title">NODEX como implementación del marco</div>
      <div class="doc-sub">Cómo el código Python es implementación directa de los principios de core-00. El enlace entre la interfaz legible por instituciones y el código reproducible.</div>
    </div>
  </div>

  <div class="rule"></div>

  <h2>Cajas .mapeo-box — componente a añadir en cada doc-XX</h2>
  <p>Ejemplo de cómo se verá en <strong>doc-01</strong> ("Decisiones que nadie tomó"):</p>

  <div class="mapeo-box">
    <span class="mapeo-label">Mapeo MIHM · doc-01</span>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:0.7rem">
      <thead><tr>
        <th style="text-align:left;padding:0.3rem 0.8rem 0.5rem;border-bottom:1px solid var(--border);color:var(--accent-dim);font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase">Elemento del patrón</th>
        <th style="text-align:left;padding:0.3rem 0.8rem 0.5rem;border-bottom:1px solid var(--border);color:var(--accent-dim);font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase">Variable MIHM</th>
        <th style="text-align:left;padding:0.3rem 0.8rem 0.5rem;border-bottom:1px solid var(--border);color:var(--accent-dim);font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase">Proxy / Ecuación</th>
      </tr></thead>
      <tbody>
        <tr><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border);color:var(--text)">Decisión cristalizada por acumulación</td><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border)"><code style="color:var(--accent)">L_i</code> latencia</td><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border);color:var(--text-dim)">LDI = t_decisión_real / t_protocolo</td></tr>
        <tr><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border);color:var(--text)">Zona gris operativa aceptada</td><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border)"><code style="color:var(--accent)">E_i</code> carga</td><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border);color:var(--text-dim)">E_zona = ambigüedad_activa / capacidad</td></tr>
        <tr><td style="padding:0.4rem 0.8rem;color:var(--text)">Optimización de coherencia aparente</td><td style="padding:0.4rem 0.8rem"><code style="color:var(--accent)">M_i</code> coherencia</td><td style="padding:0.4rem 0.8rem;color:var(--text-dim)">M = 1 − |declarado − observable| / declarado</td></tr>
      </tbody>
    </table>
    </div>
  </div>

  <div class="limit-box amber">
    <span class="lb-label">Por qué esta arquitectura y no otra</span>
    <p>La función de la caja .mapeo-box no es explicar MIHM a lectores de System Friction. Es crear la trazabilidad bidireccional: desde cualquier patrón abstracto de la Serie hasta su variable cuantificable en el motor, y de vuelta. Sin esa trazabilidad, el MIHM y System Friction son dos sistemas paralelos que nunca se tocan formalmente.</p>
  </div>
</div>