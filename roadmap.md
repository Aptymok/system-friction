---
layout: default
title: "Roadmap de integración MIHM"
permalink: /roadmap/
---

<main>
  <div class="doc-container">
    <div class="doc-label">Integración · fases C→D</div>
    <h1>Mapa de operaciones prospectivo</h1>
    <p><strong>Fase actual:</strong> Fase C · Procesamiento (Data Liquidity). <strong>Tarea activa:</strong> extracción AGS + normalización por manifiesto + validación VHpD.</p>

    <h2>Mapa de errores sistémicos (lo que falta limpiar)</h2>
    <ul>
      <li><strong>Entropía de versiones:</strong> desalineación entre documentos v1.0 y v1.1 que degrada la trazabilidad.</li>
      <li><strong>Silencio de datos:</strong> AGS-06 contiene señal empírica, pero sin extracción automática hacia tableros.</li>
      <li><strong>Acoplamiento de presentación:</strong> mezclar HTML de visualización con contenido fuente aumenta fragilidad editorial.</li>
    </ul>

    <h2>Fase C · Procesamiento (Data Liquidity) 🔄 en curso</h2>
    <ul>
      <li><strong>C1 · Extracción:</strong> parser Python para leer <code>_nodo_ags/*.md</code> y extraer variables de tiempo/opacidad.</li>
      <li><strong>C2 · Normalización:</strong> <code>meta/manifest.json</code> como traductor universal de texto narrativo a métricas numéricas.</li>
      <li><strong>C3 · Validación VHpD:</strong> control humano de plausibilidad y trazabilidad para bloquear alucinaciones.</li>
    </ul>

    <h2>Fase D · Visualización (The Mirror) ⏳ pendiente</h2>
    <ul>
      <li><strong>D1 · Interface:</strong> dashboard (React o Streamlit) consumiendo salida estructurada y API de Gemini.</li>
      <li><strong>D2 · Representación:</strong> mapa de calor de entropía/costo de oportunidad en lugar de barras simples.</li>
    </ul>

    <h2>Roadmap 2026</h2>
    <div class="sf-table-wrap">
      <table class="sf-table">
        <thead>
          <tr>
            <th>Etapa</th>
            <th>Acción clave</th>
            <th>Herramienta</th>
            <th>Objetivo final</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sincronización</td>
            <td>Resolver error 403 y push final B2</td>
            <td>Git / PAT Token</td>
            <td>Estabilizar repositorio remoto</td>
          </tr>
          <tr>
            <td>Refactorización</td>
            <td>Migrar HTML acoplado a assets/js + Markdown limpio</td>
            <td>JavaScript / Markdown</td>
            <td>Pureza sistémica (Zero Errors)</td>
          </tr>
          <tr>
            <td>Conjuntado</td>
            <td>Vincular AGS-06 con trazabilidad-evidencia</td>
            <td>Manifest + parser</td>
            <td>Demostrar teoría con evidencia operacional</td>
          </tr>
          <tr>
            <td>Despliegue</td>
            <td>Lanzar dashboard interactivo</td>
            <td>Gemini API / Python</td>
            <td>Mostrar fricción para toma de decisión</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="limit-box" style="border-left-color: var(--accent); margin-top: 1.2rem;">
      <span class="lb-label">estrategia</span>
      Conjuntar sin mezclar archivos: el <code>manifest.json</code> funciona como pegamento para incorporar nuevos nodos sin reprogramar el sistema completo. La fricción debe mostrarse como costo de oportunidad (días de retraso y pérdidas operativas), no solo como etiqueta cualitativa.
    </div>
  </div>
</main>
