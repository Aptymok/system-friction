# Reporte de Logs — system-friction · branch main
# Generado: 2026-02-25

## ACCESO VIA API

GitHub no permite fetch directo sin token desde este entorno.
Para generar el reporte completo con hashes, ejecuta localmente:

```bash
git clone https://github.com/aptymok/system-friction.git
cd system-friction
git log main --pretty=format:"%H|%ai|%s|%an" --name-only > REPORTE_LOGS_LOCAL.txt
```

## DATOS OBTENIDOS (via web scraping)

Repo: aptymok/system-friction
Branch: main
Total commits: 178
Lenguajes: HTML 86.5% · CSS 8.8% · JavaScript 3.6% · Other 1.1%

## ESTRUCTURA ACTUAL (v1.0 — estado previo al reset)

```
_audit/          → audit collection (redundante con audit/)
_docs/           → serie principal core + doc-01 a doc-10
_includes/       → head, header, footer, doc-meta
_layouts/        → default.html, doc.html, node.html
_nodo_ags/       → AGS-01 a AGS-06
assets/          → css/style.css + js/recommendations.js
audit/           → DUPLICADO de _audit/
meta/            → docs.json, patterns.json, ecosystem.json, mihm_state.json, mihm_equations.json
mihm/            → mihm pages (incompleto)
CHANGELOG.md
CNAME            → systemfriction.org
Gemfile
README.md
_config.yml
about.md         → OBSOLETO (fusionado en footer)
generate_docs_json.py
index.md
licencia.md      → OBSOLETO (fusionado en footer)
mihm.md          → OBSOLETO (reemplazado por mihm/)
roadmap.md       → OBSOLETO
```

## ANÁLISIS DE ENTROPÍA ESTRUCTURAL

| Dimensión              | Estado v1.0        | Nivel de fricción |
|------------------------|--------------------|-------------------|
| Carpetas duplicadas    | audit/ + _audit/   | ALTO              |
| Meta fuera de assets/  | meta/ en raíz      | MEDIO             |
| Archivos obsoletos     | about, licencia, roadmap, mihm.md | ALTO |
| Dashboard funcional    | AUSENTE            | CRÍTICO           |
| Métricas renderizadas  | Solo en README     | CRÍTICO           |
| JS operativo           | recommendations.js sin MIHM | ALTO   |
| Colección _mihm/       | AUSENTE            | ALTO              |

## HISTORIAL DE EVOLUCIÓN (inferido de estructura)

v1.0-alpha: Jekyll base + _docs + _nodo_ags + style.css
v1.0-beta:  Adición de _layouts, _includes, meta/
v1.0-rc:    CHANGELOG, about.md, licencia.md (ahora obsoletos)
v1.0:       audit/, mihm/, roadmap.md (sin terminar)
→ v1.1:     RESET — arquitectura MIHM v2.0 completa

## ACCIÓN REQUERIDA

Ver comandos de reset en DEPLOY_INSTRUCTIONS.md
