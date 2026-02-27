# Descarga el archivo corregido (o crÃ©alo manualmente)
$content = @'
---
layout: estado
title: DiagnÃ³stico del Sistema
permalink: /estado/
---

<div class="section active" id="s0">
  <div class="doc-label">NODEX 50 ticks Â· sistema auditado</div>
  <h1>La fricciÃ³n existe<br>dentro del sistema<br>que la describe.</h1>
  <p class="doc-meta">Vector de estado: systemfriction.org Â· v1.1 Â· 23-02-2026</p>

  <p>System Friction describe con precisiÃ³n la distancia entre umbral oficial y umbral real en sistemas institucionales. El sitio tiene esa misma distancia en su capa de implementaciÃ³n: el diseÃ±o declara "nada superfluo, clÃ­nico hasta el lÃ­mite", pero el DOM tiene tÃ­tulos duplicados, texto de navegaciÃ³n impreso como contenido, y secciones prometidas que no existen.</p>
  <p>Eso no es una falla fatal. Es la prueba de que el marco funciona: el observador tambiÃ©n estÃ¡ dentro del sistema que observa. Pero antes de postular la integraciÃ³n MIHM, el sistema debe cerrar esa brecha.</p>

  <div class="ihg-banner">
    <div class="ihg-stat">
      <div class="ihg-val critical">âˆ’0.31</div>
      <div class="ihg-label">IHG sistema</div>
    </div>
    <div class="ihg-stat">
      <div class="ihg-val">0.47</div>
      <div class="ihg-label">NTI Â· bajo umbral estructural (0.50)</div>
    </div>
    <div class="ihg-stat">
      <div class="ihg-val">7</div>
      <div class="ihg-label">Bugs confirmados</div>
    </div>
    <div class="ihg-stat">
      <div class="ihg-val">6</div>
      <div class="ihg-label">Documentos faltantes</div>
    </div>
  </div>

  <h2>Vector de estado Â· capas del sistema</h2>
  <div style="overflow-x:auto">
  <table class="sf-table">
    <thead><tr>
      <th>Capa</th><th>E_i</th><th>C_i</th><th>L_i</th><th>K_i</th><th>R_i</th><th>DiagnÃ³stico</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>Core meta<br><span class="mono dim">core-0 Â· core-00 Â· bridge Â· about</span></td>
        <td class="amber mono">0.68</td><td class="mono">0.82</td>
        <td class="red mono">0.55</td><td class="mono">0.75</td><td class="mono">0.40</td>
        <td>Duplicidad funcional. L_i elevada. H1 Ã— 2 en cada pÃ¡gina.</td>
      </tr>
      <tr>
        <td>Serie patrones<br><span class="mono dim">doc-01 â€” doc-10</span></td>
        <td class="green mono">0.45</td><td class="mono">0.90</td>
        <td class="green mono">0.30</td><td class="mono">0.65</td><td class="mono">0.85</td>
        <td>Alta coherencia interna. K_i baja: rutas sugeridas vacÃ­as.</td>
      </tr>
      <tr>
        <td>Nodo Aguascalientes<br><span class="mono dim">ags-01 â€” ags-06</span></td>
        <td class="red mono">0.92</td><td class="mono">0.78</td>
        <td class="green mono">0.42</td><td class="mono">0.88</td><td class="mono">0.70</td>
        <td>Nodo mÃ¡s maduro. Bajo estrÃ©s activo post-fractura.</td>
      </tr>
      <tr>
        <td>Changelog + Licencia<br><span class="mono dim">/changelog Â· /licencia</span></td>
        <td class="green mono">0.35</td><td class="mono">0.95</td>
        <td class="green mono">0.20</td><td class="mono">0.50</td><td class="mono">0.60</td>
        <td>Changelog: log de versiones, no de aprendizaje sistÃ©mico.</td>
      </tr>
    </tbody>
  </table>
  </div>

  <div class="rule"></div>

  <h2>Bugs confirmados en producciÃ³n</h2>
  <ul>
    <li><strong>BUG-01 Â· CRÃTICO</strong> â€” H1 duplicado en cada pÃ¡gina. Template Jekyll imprime <code>{{ page.title }}</code> y el markdown repite <code># TÃ­tulo</code>. Dos <code>&lt;h1&gt;</code> en el DOM.</li>
    <li><strong>BUG-02 Â· MODERADO</strong> â€” Texto "<code>Rutas sugeridas abajo</code>" impreso como pÃ¡rrafo visible. Nota de navegaciÃ³n interna que no estÃ¡ marcada como comentario.</li>
    <li><strong>BUG-03 Â· MODERADO</strong> â€” SecciÃ³n "Rutas sugeridas" presente pero sin enlaces. <code>.related-grid</code> renderiza vacÃ­o en todos los documentos.</li>
    <li><strong>BUG-04 Â· MENOR</strong> â€” <code>core-0</code> sin campos Publicado / Estabilidad / Tipo. Rompe la consistencia tipogrÃ¡fica del encabezado.</li>
    <li><strong>BUG-05 Â· MODERADO</strong> â€” Homepage: tres bullets negativos ("No es un blogâ€¦") violan core-00 ("nada superfluo"). Aumentan E_i cognitivo antes del primer documento.</li>
    <li><strong>BUG-06 Â· MENOR</strong> â€” <code>overflow-x: hidden</code> en body oculta scroll horizontal de tablas y bloques <code>pre</code> en mobile. Cortar contenido sin escape.</li>
    <li><strong>BUG-07 Â· ESTRUCTURAL</strong> â€” <code>body::before</code> (ruido fractal) tiene <code>z-index: 100</code> con <code>pointer-events: none</code>: correcto, pero puede interferir con tooltips o dropdowns futuros que necesiten <code>z-index &gt; 100</code>. Mover a <code>z-index: 1</code>.</li>
  </ul>

  <div class="rule"></div>

  <h2>FunciÃ³n Ã³ptima del sitio</h2>

  <div class="limit-box amber">
    <span class="lb-label">DiagnÃ³stico NODEX</span>
    <p>System Friction no debe ser un blog de patrones ni un repositorio acadÃ©mico. Debe ser la <strong>interfaz canÃ³nica de referencia para validaciones MIHM</strong>: los documentos de la Serie como metodologÃ­a, los Nodos como instancias empÃ­ricas, el motor MIHM como la capa que los conecta con datos verificables en tiempo real. El sitio no explica el MIHM. Es la interfaz a travÃ©s de la cual el MIHM se hace legible para actores que no pueden leer cÃ³digo Python.</p>
    <p>Eso requiere primero estabilizar el sistema. Los 7 bugs activos son la fricciÃ³n que impide la integraciÃ³n.</p>
  </div>
</div>
'@

[System.IO.File]::WriteAllText("$pwd\_estado\00-diagnostico.md", $content, [System.Text.UTF8Encoding]::new($false))