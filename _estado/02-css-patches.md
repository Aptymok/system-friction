---
layout: estado
title: "02 Â· CSS PARCHES"
permalink: /estado/02-css-patches/
---

<div class="section" id="s2">
  <div class="doc-label green">CSS patches Â· Aplicar en orden</div>
  <h1>Correcciones al stylesheet existente.</h1>
  <p class="doc-meta">Aplicar sobre el CSS actual Â· Sin romper nada existente Â· Tiempo estimado: 15 minutos</p>

  <h2>PATCH-01 Â· overflow-x + z-index (BUG-06 + BUG-07)</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-01 Â· Buscar y reemplazar en el CSS global</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment">/* â”€â”€ ANTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */</span>
<span class="c-del">body {
  overflow-x: hidden;
}</span>

<span class="c-del">body::before {
  ...
  z-index: 100;
  opacity: 0.4;
}</span>

<span class="c-comment">/* â”€â”€ DESPUÃ‰S â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */</span>
<span class="c-ins">body {
  overflow-x: clip;
  /* clip en lugar de hidden:
     - no crea contexto de scroll
     - no bloquea position:fixed en iOS Safari
     - permite overflow-x:auto en hijos */
}</span>

<span class="c-ins">body::before {
  ...
  z-index: 1;        /* de 100 a 1: deja espacio para UI */
  opacity: 0.4;
}</span>

<span class="c-comment">/* â”€â”€ AÃ‘ADIR al bloque de tablas/pre â”€â”€â”€â”€â”€â”€â”€ */</span>
<span class="c-ins">/* Scroll horizontal en elementos con desbordamiento legÃ­timo */
.sf-table-wrap,
pre,
.code-block,
code {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* iOS momentum scroll */
}

/* En el markup: envolver tablas en <div class="sf-table-wrap"> */</span></pre></div>

  <h2>PATCH-02 Â· Eliminar el H1 del layout (BUG-01)</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-02 Â· Solo si el layout usa un h1 para el tÃ­tulo â€” NO es cambio CSS sino de template</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment">/* OpciÃ³n de emergencia si no puedes tocar el template ahora:
   ocultar el H1 que genera el layout (el primero del doc-container) */</span>
<span class="c-ins">.doc-container > h1:first-of-type + h1,
.nodo-entry > h1:first-of-type + h1 {
  display: none;
}
/* Esto oculta el SEGUNDO h1 en cualquier contenedor.
   SoluciÃ³n de emergencia: aplicar mientras se corrige el template. */</span></pre></div>

  <h2>PATCH-03 Â· Rutas sugeridas condicionales (BUG-03)</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-03 Â· CSS para .related vacÃ­o â€” el fix real estÃ¡ en el template</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment">/* Ocultar la secciÃ³n related si no tiene hijos */</span>
<span class="c-ins">.related:not(:has(.related-item)) {
  display: none;
}

/* Fallback para navegadores sin :has() */
.related-empty {
  display: none;
}
/* En el template: aÃ±adir clase .related-empty si no hay items */</span></pre></div>

  <h2>PATCH-04 Â· Texto "Rutas sugeridas abajo" (BUG-02)</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-04 Â· Si el texto ya estÃ¡ renderizado, supresiÃ³n CSS de emergencia</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment">/* Si el texto aparece como pÃ¡rrafo justo antes de .related,
   y no hay manera de borrarlo del Markdown inmediatamente: */</span>
<span class="c-ins">.related-nav-hint {
  display: none; /* AÃ±adir esta clase al pÃ¡rrafo en el template */
}

/* O si es un p directamente antes del h2 de rutas: */
.related ~ .related-nav-hint,
h2#rutas-sugeridas + p.hint {
  display: none;
}</span>

<span class="c-comment">/* La soluciÃ³n correcta es borrar el texto del Markdown:
   ver SecciÃ³n 03 Â· Jekyll fixes */</span></pre></div>

  <h2>PATCH-05 Â· Variables nuevas para el mÃ³dulo MIHM</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-05 Â· AÃ±adir al bloque :root â€” sin tocar nada existente</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">/* â”€â”€ EXTENSIÃ“N :root para mÃ³dulo MIHM â”€â”€â”€â”€ */
:root {
  /* Variables existentes no se tocan */

  /* Nuevas para estados de IHG */
  --ihg-critical: #c86e6e;   /* IHG < -0.50 */
  --ihg-risk:     #c8a96e;   /* IHG -0.30 a -0.50 */
  --ihg-stable:   #6ec88a;   /* IHG > -0.30 */
  --ihg-optimal:  #6e9ac8;   /* IHG > 0 */

  /* Para cajas de mapeo MIHM en documentos */
  --mapeo-bg:     #0f0d05;
  --mapeo-border: #4a3a10;
}</span></pre></div>

  <h2>PATCH-06 Â· Componente .mapeo-box (nuevo, para doc-XX y ags-XX)</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-06 Â· AÃ±adir al final del CSS â€” nuevo componente</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">/* â”€â”€ MAPEO MIHM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* Caja que conecta cada patrÃ³n SF con su variable MIHM.
   AÃ±adir al final de cada doc-XX y ags-XX en Markdown:
   {: .mapeo-box }  */

.mapeo-box {
  border: 1px solid var(--mapeo-border, #4a3a10);
  background: var(--mapeo-bg, #0f0d05);
  padding: 1.4rem 1.5rem;
  margin: 2.5rem 0;
  font-family: var(--mono);
}

.mapeo-box-label {
  font-size: 0.56rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 1rem;
  display: block;
}

.mapeo-box table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.68rem;
}
.mapeo-box th {
  text-align: left;
  color: var(--accent-dim);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.3rem 0.8rem 0.5rem;
  border-bottom: 1px solid var(--border);
}
.mapeo-box td {
  padding: 0.45rem 0.8rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  line-height: 1.5;
}
.mapeo-box tr:last-child td { border-bottom: none; }
.mapeo-box code {
  color: var(--accent);
  font-size: 0.68rem;
  background: none;
}</span></pre></div>

  <h2>PATCH-07 Â· MÃ³dulo MIHM panel (nueva pÃ¡gina /mihm/)</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-07 Â· AÃ±adir al final del CSS â€” solo activo en layout mihm</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">/* â”€â”€ MIHM PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.mihm-panel {
  max-width: 680px;
  margin: 0 auto;
  padding: 6rem 2rem 8rem;
  animation: fadeUp 2.4s ease both;
}

.mihm-nodos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.mihm-nodo-card {
  border: 1px solid var(--border);
  padding: 1.5rem;
  background: var(--surface);
  transition: border-color 0.2s;
}
.mihm-nodo-card:hover { border-color: var(--accent); }
.mihm-nodo-card.inactive { opacity: 0.35; pointer-events: none; }

.mihm-nodo-id {
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
}

.mihm-ihg-value {
  font-family: var(--mono);
  font-size: 1.6rem;
  line-height: 1;
  margin-bottom: 0.3rem;
}
.mihm-ihg-value.critical { color: var(--ihg-critical, #c86e6e); }
.mihm-ihg-value.risk     { color: var(--ihg-risk,     #c8a96e); }
.mihm-ihg-value.stable   { color: var(--ihg-stable,   #6ec88a); }
.mihm-ihg-value.pending  { color: var(--text-dim); }

.mihm-nti-value {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--text-dim);
  margin-bottom: 0.4rem;
}

.mihm-nodo-status {
  font-family: var(--mono);
  font-size: 0.6rem;
  color: var(--text-dim);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.mihm-nodo-link {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: var(--accent);
  border: 1px solid var(--border);
  padding: 0.35rem 0.7rem;
  display: inline-block;
  transition: border-color 0.2s;
}
.mihm-nodo-link:hover { border-color: var(--accent); color: var(--text-bright); }</span></pre></div>
</div>