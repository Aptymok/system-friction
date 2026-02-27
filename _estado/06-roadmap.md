---
layout: estado
title: "06 Â· Roadmap"
permalink: /estado/06-roadmap/
---

<div class="section" id="s6">
  <div class="doc-label">Roadmap Â· 90 dÃ­as</div>
  <h1>Estabilizar antes de postular.</h1>
  <p class="doc-meta">Fecha base: 23 feb 2026 Â· RevisiÃ³n: 23 may 2026 Â· Hito: integraciÃ³n MIHM estructural</p>

  <p>La integraciÃ³n MIHM en el sitio requiere que el NTI del propio sistema supere 0.50. Con los 7 fixes activos, el NTI sube de 0.47 a ~0.61. Solo entonces el sistema puede reclamar coherentemente que audita la integridad de otros.</p>

  <div class="rule"></div>

  <h2>Fase 0 Â· Hoy (1â€“2 horas)</h2>
  <div class="priority-item">
    <div class="p-num">P0</div>
    <div class="p-content">
      <h3>FIX-01 Â· H1 duplicado</h3>
      <p>Eliminar la lÃ­nea <code>{{ page.title }}</code> del layout. Afecta accesibilidad y SEO. Ãšnica lÃ­nea, impacto total.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P0</div>
    <div class="p-content">
      <h3>FIX-02 Â· Texto "Rutas sugeridas abajo" visible</h3>
      <p>Borrar o comentar en cada archivo .md. 10 minutos con <code>grep -rn</code>.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P0</div>
    <div class="p-content">
      <h3>FIX-05 Â· Homepage bullets negativos</h3>
      <p>Reemplazar 4 bullets con una lÃ­nea. El postulado central ya es suficiente.</p>
    </div>
  </div>

  <h2>Fase 1 Â· Semana 1 (esta semana)</h2>
  <div class="priority-item">
    <div class="p-num">P1</div>
    <div class="p-content">
      <h3>FIX-01 CSS Â· overflow-x: clip + z-index: 1</h3>
      <p>Patch-01 y Patch-07 del CSS. Sin efectos secundarios, solo correcciones.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P1</div>
    <div class="p-content">
      <h3>FIX-03 Â· Rutas sugeridas con datos reales</h3>
      <p>AÃ±adir front-matter <code>related</code> a los 10 documentos de la Serie. MÃ­nimo 2 enlaces por documento. Eleva K_i de 0.30 efectivo a ~0.75.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P1</div>
    <div class="p-content">
      <h3>FIX-06 Â· Changelog con secciÃ³n de aprendizaje</h3>
      <p>Retroalimentar entrada 1.1.0 con secciÃ³n "Aprendizaje sistÃ©mico". Una entrada establece el patrÃ³n para todas las futuras.</p>
    </div>
  </div>

  <h2>Fase 2 Â· Mes 1 (antes del 23 mar 2026)</h2>
  <div class="priority-item">
    <div class="p-num">P2</div>
    <div class="p-content">
      <h3>Publicar /mihm/</h3>
      <p>Template completo en SecciÃ³n 05 de este documento. Panel de estado del ecosistema. IHG y NTI actuales. Links a documentaciÃ³n y GitHub. CSS: solo aÃ±adir PATCH-07.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P2</div>
    <div class="p-content">
      <h3>Publicar core-patrones</h3>
      <p>Template en SecciÃ³n 05. CatÃ¡logo de patrones SF â†” MIHM. El puente conceptual que falta. Establece la arquitectura antes de que lleguen lectores institucionales.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P2</div>
    <div class="p-content">
      <h3>AÃ±adir .mapeo-box a doc-01 â€” doc-10</h3>
      <p>Una caja por documento. CSS: PATCH-06. Eleva K_i entre Serie y motor MIHM de forma explÃ­cita.</p>
    </div>
  </div>

  <h2>Fase 3 Â· Mes 3 (antes del 23 may 2026 Â· revisiÃ³n de falsabilidad)</h2>
  <div class="priority-item">
    <div class="p-num">P3</div>
    <div class="p-content">
      <h3>Publicar core-nti</h3>
      <p>Template en SecciÃ³n 05. El documento que convierte System Friction en sistema que se auto-audita. CondiciÃ³n para la adopciÃ³n institucional del marco.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P3</div>
    <div class="p-content">
      <h3>Publicar bridge-codigo</h3>
      <p>CÃ³mo NODEX implementa los principios de core-00. El enlace entre la interfaz legible por instituciones y el cÃ³digo reproducible por acadÃ©micos.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P3</div>
    <div class="p-content">
      <h3>Segundo nodo geogrÃ¡fico</h3>
      <p>Calera (Zacatecas) o Irapuato-Valle (Guanajuato) como candidatos naturales por continuidad del corredor. Template de Nodo-AGS como base.</p>
    </div>
  </div>

  <div class="rule"></div>

  <h2>NTI del ecosistema: antes y despuÃ©s</h2>
  <div style="overflow-x:auto">
  <table class="sf-table">
    <thead><tr><th>Componente</th><th>NTI actual</th><th>NTI post-fixes</th><th>Cambio</th></tr></thead>
    <tbody>
      <tr>
        <td>LDI_norm (bugs conocidos sin corregir)</td>
        <td class="red mono">{{ site.data.estado.nti_components.ldi_norm_actual }}</td>
        <td class="green mono">{{ site.data.estado.nti_components.ldi_norm_post }}</td>
        <td class="green">+{{ site.data.estado.nti_components.ldi_norm_post | minus: site.data.estado.nti_components.ldi_norm_actual }}</td>
      </tr>
      <tr>
        <td>ICC_norm (conocimiento un autor)</td>
        <td class="mono">{{ site.data.estado.nti_components.icc_norm }}</td>
        <td class="mono">{{ site.data.estado.nti_components.icc_norm }}</td>
        <td class="dim">sin cambio</td>
      </tr>
      <tr>
        <td>CSR (rutas sugeridas vacÃ­as)</td>
        <td class="red mono">{{ site.data.estado.nti_components.csr_actual }}</td>
        <td class="green mono">{{ site.data.estado.nti_components.csr_post }}</td>
        <td class="green">+{{ site.data.estado.nti_components.csr_post | minus: site.data.estado.nti_components.csr_actual }}</td>
      </tr>
      <tr>
        <td>IRCI_norm (resiliencia tÃ©cnica)</td>
        <td class="mono">{{ site.data.estado.nti_components.irci_norm }}</td>
        <td class="mono">{{ site.data.estado.nti_components.irci_norm }}</td>
        <td class="dim">sin cambio</td>
      </tr>
      <tr>
        <td>IIM (coherencia declarado/implementado)</td>
        <td class="amber mono">{{ site.data.estado.nti_components.iim_actual }}</td>
        <td class="green mono">{{ site.data.estado.nti_components.iim_post }}</td>
        <td class="green">+{{ site.data.estado.nti_components.iim_post | minus: site.data.estado.nti_components.iim_actual }}</td>
      </tr>
      <tr style="background:var(--surface)">
        <td><strong>NTI total</strong></td>
        <td class="red mono"><strong>{{ site.data.estado.nti_sistema }}</strong></td>
        <td class="green mono"><strong>0.81</strong></td>
        <td class="green"><strong>+0.34 â†’ supera umbral estructural</strong></td>
      </tr>
    </tbody>
  </table>
  </div>

  <div class="limit-box amber">
    <span class="lb-label">Sentencia final del observador</span>
    <p>Los 7 bugs de implementaciÃ³n no invalidan el marco. Son exactamente el tipo de fenÃ³meno que el marco describe en otros: la distancia entre el umbral oficial ("nada superfluo, clÃ­nico hasta el lÃ­mite") y el umbral real (H1 duplicado, rutas prometidas vacÃ­as, texto de navegaciÃ³n impreso).</p>
    <p>System Friction ya puede medir esa distancia en sÃ­ mismo. Solo falta ejecutar la correcciÃ³n. El NTI lo autoriza: de 0.47 a 0.81 con los 7 fixes. Eso desbloquea la integraciÃ³n estructural MIHM.</p>
    <p>El archivo continÃºa. La fricciÃ³n tambiÃ©n.</p>
  </div>
</div>