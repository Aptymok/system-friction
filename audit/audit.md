# Auditoría SF · Guía de extracción e integración

Documento operativo para convertir el modelo `audit/sf_auditoria_mihm_v2.html` en cambios integrables dentro del sitio Jekyll de System Friction.

## 1) Fuente de verdad

- Modelo base (HTML completo): `audit/sf_auditoria_mihm_v2.html`.
- Este archivo se usa como plantilla de contenido, tono y bloques visuales.
- La integración final debe repartirse entre:
  - `_docs/` (contenido documental)
  - `_nodo_ags/` (nodos empíricos)
  - `_layouts/` / `_includes/` (estructura reusable)
  - `assets/css/style.css` (estilos globales)

## 2) Extracción por secciones del modelo

Extraer del HTML por tabs (`00` a `06`) y transformar así:

1. **00 · Diagnóstico**
   - Convertir a resumen ejecutivo Markdown.
   - Conservar: IHG, NTI, bug count y prioridad de intervención.

2. **01 · Bugs UX/UI**
   - Convertir cada bug-card en issue técnico con:
     - ID
     - alcance
     - causa
     - fix propuesto
     - criterio de validación

3. **02 · CSS patches**
   - Pasar reglas nuevas/ajustes a `assets/css/style.css`.
   - Mantener bloques móviles y accesibilidad.

4. **03 · Jekyll fixes**
   - Convertir fragmentos de front matter y layouts en cambios reales de archivos.
   - Validar consistencia de `published/version/stability/type`.

5. **04 · Arquitectura**
   - Transformar roadmap en backlog por fases (0→3).
   - Cada fase debe incluir entregables verificables.

6. **05 · Templates MIHM**
   - Generar templates base para:
     - página MIHM central
     - catálogo SF ↔ MIHM
     - NTI auto-auditoría

7. **06 · Roadmap**
   - Publicar ruta priorizada: quick wins, deuda estructural, expansión.

## 3) Reglas de integración

- No duplicar layout completo del HTML de auditoría dentro del sitio principal.
- Reusar clases existentes del tema cuando sea posible.
- Encapsular nuevas clases con prefijos semánticos (`mihm-`, `audit-`, `sf-`).
- Evitar introducir JS adicional si se resuelve con Liquid + CSS.

## 4) Checklist de validación

- [ ] El sitio compila con Jekyll sin errores.
- [ ] No se rompe navegación en móvil (tabs/tablas/pre con scroll horizontal).
- [ ] Los metadatos front matter son consistentes en docs core.
- [ ] Existe trazabilidad explícita SF ↔ MIHM en contenido nuevo.
- [ ] El roadmap queda publicado en formato mantenible (Markdown).

## 5) Comandos sugeridos

```bash
# Ver estado de cambios
git status --short

# Levantar sitio local
bundle exec jekyll serve

# Regenerar metadata si cambia front matter
python3 generate_docs_json.py
```

## 6) Resultado esperado

Al finalizar, el HTML de auditoría deja de ser un artefacto aislado y pasa a ser una guía de implementación distribuida en el stack actual de System Friction.
