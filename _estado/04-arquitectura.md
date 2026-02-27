---
layout: estado
title: "04 Â· Arquitectura"
permalink: /estado/04-arquitectura/
---

<div class="section" id="s4">
  <div class="doc-label blue">Arquitectura Â· Propuesta v2.0</div>
  <h1>De repositorio<br>a consola de observaciÃ³n.</h1>
  <p class="doc-meta">Propuesta estructural Â· Implementable sin cambio de stack Â· Fases 0â†’3</p>

  <p>El sitio ya tiene la estructura correcta en su parte conceptual: Serie (patrones abstractos), Nodos (instanciaciÃ³n empÃ­rica), Core (metodologÃ­a). Le falta una tercera capa que conecte ambas con datos verificables en tiempo real.</p>

  <div class="rule"></div>

  <h2>Documentos existentes â€” mantener</h2>
  <div class="doc-grid">
    <div class="doc-item">
      <div class="doc-num">core-0 Â· core-00 Â· core-bridge</div>
      <div class="doc-title">Capa metodolÃ³gica</div>
      <div class="doc-sub">Mantener como estÃ¡n. Corregir solo los bugs de duplicidad y metadata. Son el umbral de lectura correcto.</div>
    </div>
    <div class="doc-item">
      <div class="doc-num">doc-01 â€” doc-10</div>
      <div class="doc-title">Serie de patrones</div>
      <div class="doc-sub">Completar rutas sugeridas. AÃ±adir caja .mapeo-box a cada documento vinculando el patrÃ³n con su variable MIHM.</div>
    </div>
    <div class="doc-item">
      <div class="doc-num">nodo-ags Â· ags-01â€”06</div>
      <div class="doc-title">Nodo Aguascalientes</div>
      <div class="doc-sub">Vincular explÃ­citamente con MIHM. Base del template para futuros nodos. El Ãºnico caso con ags-06 validado.</div>
    </div>
  </div>

  <div class="rule"></div>

  <h2>Documentos nuevos â€” prioridad 1 (antes del 23 mar 2026)</h2>
  <div class="doc-grid">
    <a class="doc-item new" href="/estado/05-templates-mihm/">
      <div class="doc-num">nuevo Â· /mihm/ Â· Prioridad 1</div>
      <div class="doc-title">MIHM Â· Panel de estado</div>
      <div class="doc-sub">Panel central: IHG y NTI actuales de todos los nodos activos, escenarios Monte Carlo, enlaces a cÃ³digo Python. No explica el MIHM. Muestra su lectura de estado.</div>
    </a>
    <div class="doc-item new">
      <div class="doc-num">nuevo Â· /docs/core-patrones/ Â· Prioridad 1</div>
      <div class="doc-title">CatÃ¡logo de patrones SF â†” MIHM</div>
      <div class="doc-sub">Mapeo explÃ­cito: cada patrÃ³n de System Friction con su variable MIHM, ecuaciÃ³n, condiciones de apariciÃ³n y de refutaciÃ³n. El puente que falta entre la prosa y el motor.</div>
    </div>
    <div class="doc-item new">
      <div class="doc-num">nuevo Â· /docs/core-nti/ Â· Prioridad 1</div>
      <div class="doc-title">NTI Â· El sistema se auto-audita</div>
      <div class="doc-sub">DescripciÃ³n tÃ©cnica del NTI como instrumento de observaciÃ³n del propio ecosistema. Sin este documento el sistema describe fricciÃ³n en otros pero no tiene protocolo para detectarla en sÃ­ mismo.</div>
    </div>
  </div>

  <h2>Documentos nuevos â€” prioridad 2 (antes del 23 may 2026)</h2>
  <div class="doc-grid">
    <div class="doc-item">
      <div class="doc-num">nuevo Â· /docs/core-falsabilidad/ Â· Prioridad 2</div>
      <div class="doc-title">Condiciones formales de refutaciÃ³n</div>
      <div class="doc-sub">Por patrÃ³n: "Si en 90 dÃ­as IHG sube >0.30 sin intervenciÃ³n documentada, recalibrar." Cierra el ciclo cientÃ­fico del ecosistema.</div>
    </div>
    <div class="doc-item">
      <div class="doc-num">nuevo Â· /docs/bridge-codigo/ Â· Prioridad 2</div>
      <div class="doc-title">NODEX como implementaciÃ³n del marco</div>
      <div class="doc-sub">CÃ³mo el cÃ³digo Python es implementaciÃ³n directa de los principios de core-00. El enlace entre la interfaz legible por instituciones y el cÃ³digo reproducible.</div>
    </div>
  </div>

  <div class="rule"></div>

  <h2>Cajas .mapeo-box â€” componente a aÃ±adir en cada doc-XX</h2>
  <p>Ejemplo de cÃ³mo se verÃ¡ en <strong>doc-01</strong> ("Decisiones que nadie tomÃ³"):</p>

  <div class="mapeo-box">
    <span class="mapeo-label">Mapeo MIHM Â· doc-01</span>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:0.7rem">
      <thead><tr>
        <th style="text-align:left;padding:0.3rem 0.8rem 0.5rem;border-bottom:1px solid var(--border);color:var(--accent-dim);font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase">Elemento del patrÃ³n</th>
        <th style="text-align:left;padding:0.3rem 0.8rem 0.5rem;border-bottom:1px solid var(--border);color:var(--accent-dim);font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase">Variable MIHM</th>
        <th style="text-align:left;padding:0.3rem 0.8rem 0.5rem;border-bottom:1px solid var(--border);color:var(--accent-dim);font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase">Proxy / EcuaciÃ³n</th>
      </tr></thead>
      <tbody>
        <tr><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border);color:var(--text)">DecisiÃ³n cristalizada por acumulaciÃ³n</td><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border)"><code style="color:var(--accent)">L_i</code> latencia</td><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border);color:var(--text-dim)">LDI = t_decisiÃ³n_real / t_protocolo</td></tr>
        <tr><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border);color:var(--text)">Zona gris operativa aceptada</td><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border)"><code style="color:var(--accent)">E_i</code> carga</td><td style="padding:0.4rem 0.8rem;border-bottom:1px solid var(--border);color:var(--text-dim)">E_zona = ambigÃ¼edad_activa / capacidad</td></tr>
        <tr><td style="padding:0.4rem 0.8rem;color:var(--text)">OptimizaciÃ³n de coherencia aparente</td><td style="padding:0.4rem 0.8rem"><code style="color:var(--accent)">M_i</code> coherencia</td><td style="padding:0.4rem 0.8rem;color:var(--text-dim)">M = 1 âˆ’ |declarado âˆ’ observable| / declarado</td></tr>
      </tbody>
    </table>
    </div>
  </div>

  <div class="limit-box amber">
    <span class="lb-label">Por quÃ© esta arquitectura y no otra</span>
    <p>La funciÃ³n de la caja .mapeo-box no es explicar MIHM a lectores de System Friction. Es crear la trazabilidad bidireccional: desde cualquier patrÃ³n abstracto de la Serie hasta su variable cuantificable en el motor, y de vuelta. Sin esa trazabilidad, el MIHM y System Friction son dos sistemas paralelos que nunca se tocan formalmente.</p>
  </div>
</div>