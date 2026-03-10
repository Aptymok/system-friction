// recommendations.js — System Friction Framework v1.1
// Motor de recomendaciones. Consume meta/patterns.json + meta/ags_metrics.json.
// Diseñado para inyectarse en cualquier página del sitio.
// Reemplaza la versión anterior con trazabilidad MIHM.

(function () {
  'use strict';

  // El bloque de recomendaciones se inyecta en cualquier elemento con:
  // <div id="sf-recommendations" data-sf-load="true"></div>
  // Ya manejado por mihm-dashboard.js

  // Función standalone para páginas que no cargan el dashboard completo
  window.SF = window.SF || {};
  window.SF.loadRecommendations = async function (containerId, basePath) {
    const base = basePath || '';
    const el = document.getElementById(containerId);
    if (!el) return;

    try {
      const [m, p] = await Promise.all([
        fetch(base + '/meta/ags_metrics.json').then(r => r.json()),
        fetch(base + '/meta/patterns.json').then(r => r.json())
      ]);
      const pats = p.patterns || [];
      // Find patterns relevant to current page (by URL matching doc id)
      const path = window.location.pathname;
      const currentDocId = path.split('/').filter(Boolean).pop();
      const related = pats.filter(p =>
        p.id !== currentDocId &&
        p.friction_contribution !== 'none' &&
        (p.friction_contribution === 'critical' || p.friction_contribution === 'high')
      ).slice(0, 3);

      if (!related.length) return;

      el.innerHTML = `<div class="sf-recs-inline">
        <div class="sf-recs-inline__label">patrones relacionados</div>
        ${related.map(r => `<a class="sf-recs-inline__link" href="${r.url}">${r.id} — ${r.title}</a>`).join('')}
      </div>`;
    } catch (_) {
      // Silent fail: recommendations are supplementary
    }
  };
})();
