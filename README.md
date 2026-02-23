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

## Pipeline de procesamiento AGS (Fase C)

```bash
python3 scripts/extract_ags_metrics.py
# genera meta/ags_metrics.json usando meta/manifest.json
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
