# System Friction · Jekyll

Archivo de fricción sistémica. jekyll en GitHub Pages.

## Estructura

```
_docs/          → Serie principal + core docs (Markdown)
_nodo_ags/      → Nodo Aguascalientes (Markdown)
_layouts/       → default.html, doc.html, node.html
_includes/      → head, header, footer, doc-meta
assets/css/     → style.css
assets/js/      → recommendations.js
meta/           → docs.json, patterns.json, ecosystem.json, mihm_state.json, mihm_equations.json
```

## Deploy en GitHub Pages

1. Subir todo este directorio al repo `Aptymok/system-friction` (rama `main`)
2. Settings → Pages → Source: `main` / `/ (root)` → Save
3. En ~2 minutos: `https://aptymok.github.io/system-friction/`

## Regenerar docs.json desde front matter

```bash
python3 generate_docs_json.py
```

## Desarrollo local

```bash
gem install bundler
bundle install
bundle exec jekyll serve
# → http://localhost:4000/system-friction/
```

## Agregar nuevo documento

1. Crear `_docs/doc-11.md` con front matter consistente
2. Ejecutar `python3 generate_docs_json.py`
3. Commit y push

---
layout: default
title: "README — System Friction Framework"
version: "1.1"
status: validated
origin: vhpd
date: 2026-02-23
---

# System Friction Framework v1.1

**MIHM v2.0 — Multinodal Homeostatic Integration Model**  
*Validación ante Shock Exógeno — Nodo Aguascalientes*  
Juan Antonio Marín Liera (APTYMOK) // INEGI Aguascalientes

---

## Arquitectura

```
system-friction/
├── _core/
│   └── postulado-central.md     # Axioma f=(t/T)+O. Motor único.
├── _nodes/
│   └── ags/
│       ├── ags-01.md            # Corredor / Utilidad implícita
│       ├── ags-02.md            # Seguridad pública N4
│       ├── ags-03.md            # Acuífero N1
│       ├── ags-04.md            # Logística N3
│       ├── ags-05.md            # Coordinación federal N5
│       └── ags-06.md            # Síntesis post-fractura
├── _meta/
│   ├── manifest.json            # Árbol de archivos + órfanos
│   └── ags_metrics.json         # Métricas calibradas 23 feb 2026
├── _mihm/
│   ├── hub.md                   # Dashboard integrado
│   ├── catalogo.md              # Definición completa de componentes
│   └── nti.md                   # Nodo de Trazabilidad Institucional
├── assets/
│   ├── css/main.css             # Identidad clínica SF-Auditoría v2.0
│   ├── js/dashboard.js          # Lógica de dashboard (consume JSON)
│   └── data/
│       └── ags_metrics.json     # Copia para acceso JS
├── scripts/
│   ├── mihm_v2.py               # Motor Python: NODEX + Monte Carlo
│   └── validator.py             # Validador VHpD
├── _layouts/
│   └── audit.html               # Layout clínico único
├── index.md                     # Puerta de entrada. Dashboard.
├── _config.yml                  # Configuración Jekyll
└── README.md                    # Este archivo
```

## Fórmula Base

```
f = (t/T) + O
```

Todo cálculo en el repositorio deriva de esta fórmula.

## Ejecución rápida

```bash
python scripts/mihm_v2.py       # Calcular IHG, NTI, Monte Carlo
python scripts/validator.py     # Validar integridad VHpD
bundle exec jekyll serve        # Levantar site local
```

## Estado (23 feb 2026)

| Métrica | Valor | Umbral | Estado |
|---------|-------|--------|--------|
| IHG | −0.620 | −0.500 | EMERGENCY |
| NTI | 0.351 | 0.400 | BLIND MODE |
| Prob. colapso 2030 | 71% | — | Monte Carlo |

