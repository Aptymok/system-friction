# System Friction Framework · v1.1

Archivo de fricción sistémica. Jekyll + GitHub Pages.

```
f = (t/T) + O
```

**Live:** [systemfriction.org](https://systemfriction.org)

---

## Arquitectura v1.1

```
_docs/           → 3 core + 10 patrones (doc-01 a doc-10)
_nodo_ags/       → AGS-01 a AGS-06 (validación empírica)
_layouts/        → default, doc, node, mihm
assets/
  css/main.css   → diseño clínico mobile-first
  js/dashboard.js→ motor de visualización MIHM
  data/          → ags_metrics.json, docs.json, patterns.json
scripts/
  mihm_v2.py     → motor Python (IHG, NTI, Monte Carlo)
```

## Estado del sistema · Nodo AGS

| Métrica | Valor | UCAP |
|---------|-------|------|
| IHG post-fractura | −0.620 | −0.500 |
| NTI | 0.351 | 0.400 |
| P(colapso 2030) | 71% | — |
| Protocolo | EMERGENCY_DECISION | — |

Evento: muerte actor hegemónico + 252 narcobloqueos · 22–23 feb 2026

## Deploy local

```bash
gem install bundler
bundle install
bundle exec jekyll serve
# → http://localhost:4000/
```

## Actualizar métricas

```bash
python3 scripts/mihm_v2.py --mc
```

## Licencia

CC BY 4.0 · Juan Antonio Marín Liera · aptymok@gmail.com