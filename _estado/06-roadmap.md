---
layout: estado
title: Roadmap
permalink: /estado/06-roadmap/
---

<div class="section" id="s6">
  <div class="doc-label">Roadmap · 90 días</div>
  <h1>Estabilizar antes de postular.</h1>
  <p class="doc-meta">Fecha base: 23 feb 2026 · Revisión: 23 may 2026 · Hito: integración MIHM estructural</p>

  <p>La integración MIHM en el sitio requiere que el NTI del propio sistema supere 0.50. Con los 7 fixes activos, el NTI sube de 0.47 a ~0.61. Solo entonces el sistema puede reclamar coherentemente que audita la integridad de otros.</p>

  <div class="rule"></div>

  <h2>Fase 0 · Hoy (1–2 horas)</h2>
  <div class="priority-item">
    <div class="p-num">P0</div>
    <div class="p-content">
      <h3>FIX-01 · H1 duplicado</h3>
      <p>Eliminar la línea <code>{{ page.title }}</code> del layout. Afecta accesibilidad y SEO. Única línea, impacto total.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P0</div>
    <div class="p-content">
      <h3>FIX-02 · Texto "Rutas sugeridas abajo" visible</h3>
      <p>Borrar o comentar en cada archivo .md. 10 minutos con <code>grep -rn</code>.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P0</div>
    <div class="p-content">
      <h3>FIX-05 · Homepage bullets negativos</h3>
      <p>Reemplazar 4 bullets con una línea. El postulado central ya es suficiente.</p>
    </div>
  </div>

  <h2>Fase 1 · Semana 1 (esta semana)</h2>
  <div class="priority-item">
    <div class="p-num">P1</div>
    <div class="p-content">
      <h3>FIX-01 CSS · overflow-x: clip + z-index: 1</h3>
      <p>Patch-01 y Patch-07 del CSS. Sin efectos secundarios, solo correcciones.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P1</div>
    <div class="p-content">
      <h3>FIX-03 · Rutas sugeridas con datos reales</h3>
      <p>Añadir front-matter <code>related</code> a los 10 documentos de la Serie. Mínimo 2 enlaces por documento. Eleva K_i de 0.30 efectivo a ~0.75.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P1</div>
    <div class="p-content">
      <h3>FIX-06 · Changelog con sección de aprendizaje</h3>
      <p>Retroalimentar entrada 1.1.0 con sección "Aprendizaje sistémico". Una entrada establece el patrón para todas las futuras.</p>
    </div>
  </div>

  <h2>Fase 2 · Mes 1 (antes del 23 mar 2026)</h2>
  <div class="priority-item">
    <div class="p-num">P2</div>
    <div class="p-content">
      <h3>Publicar /mihm/</h3>
      <p>Template completo en Sección 05 de este documento. Panel de estado del ecosistema. IHG y NTI actuales. Links a documentación y GitHub. CSS: solo añadir PATCH-07.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P2</div>
    <div class="p-content">
      <h3>Publicar core-patrones</h3>
      <p>Template en Sección 05. Catálogo de patrones SF ↔ MIHM. El puente conceptual que falta. Establece la arquitectura antes de que lleguen lectores institucionales.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P2</div>
    <div class="p-content">
      <h3>Añadir .mapeo-box a doc-01 — doc-10</h3>
      <p>Una caja por documento. CSS: PATCH-06. Eleva K_i entre Serie y motor MIHM de forma explícita.</p>
    </div>
  </div>

  <h2>Fase 3 · Mes 3 (antes del 23 may 2026 · revisión de falsabilidad)</h2>
  <div class="priority-item">
    <div class="p-num">P3</div>
    <div class="p-content">
      <h3>Publicar core-nti</h3>
      <p>Template en Sección 05. El documento que convierte System Friction en sistema que se auto-audita. Condición para la adopción institucional del marco.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P3</div>
    <div class="p-content">
      <h3>Publicar bridge-codigo</h3>
      <p>Cómo NODEX implementa los principios de core-00. El enlace entre la interfaz legible por instituciones y el código reproducible por académicos.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P3</div>
    <div class="p-content">
      <h3>Segundo nodo geográfico</h3>
      <p>Calera (Zacatecas) o Irapuato-Valle (Guanajuato) como candidatos naturales por continuidad del corredor. Template de Nodo-AGS como base.</p>
    </div>
  </div>

  <div class="rule"></div>

  <h2>NTI del ecosistema: antes y después</h2>
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
        <td>CSR (rutas sugeridas vacías)</td>
        <td class="red mono">{{ site.data.estado.nti_components.csr_actual }}</td>
        <td class="green mono">{{ site.data.estado.nti_components.csr_post }}</td>
        <td class="green">+{{ site.data.estado.nti_components.csr_post | minus: site.data.estado.nti_components.csr_actual }}</td>
      </tr>
      <tr>
        <td>IRCI_norm (resiliencia técnica)</td>
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
        <td class="green"><strong>+0.34 → supera umbral estructural</strong></td>
      </tr>
    </tbody>
  </table>
  </div>

  <div class="limit-box amber">
    <span class="lb-label">Sentencia final del observador</span>
    <p>Los 7 bugs de implementación no invalidan el marco. Son exactamente el tipo de fenómeno que el marco describe en otros: la distancia entre el umbral oficial ("nada superfluo, clínico hasta el límite") y el umbral real (H1 duplicado, rutas prometidas vacías, texto de navegación impreso).</p>
    <p>System Friction ya puede medir esa distancia en sí mismo. Solo falta ejecutar la corrección. El NTI lo autoriza: de 0.47 a 0.81 con los 7 fixes. Eso desbloquea la integración estructural MIHM.</p>
    <p>El archivo continúa. La fricción también.</p>
  </div>
</div>