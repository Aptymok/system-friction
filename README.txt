README.md - CC BY 4.0

```markdown
# System Friction
Repositorio técnico sobre fricción sistémica  
v1.0 · Publicado 2026-02-02

─────────────────────────────────────────

## QUÉ ES ESTO

Conjunto de documentos diseñados para extracción, no para lectura completa.  
Cada documento describe un patrón de fricción en sistemas institucionales.

El repositorio está estructurado para permitir reutilización modular, indexación semántica y procesamiento automatizado.

─────────────────────────────────────────

## CÓMO USARLO

1. Leer el índice  
2. Abrir el documento relevante  
3. Extraer el bloque que sirve  
4. Reutilizar respetando la licencia (ver sección LICENCIA)

─────────────────────────────────────────

## ESTRUCTURA

```

/
├── assets/          → CSS centralizado
├── docs/            → Documentos individuales (html)
├── nodo-ags/        → Serie AGS (html)
├── meta/            → Metadatos en JSON
│   ├── docs.json      → Información de todos los documentos
│   └── patterns.json  → Vocabulario controlado de patrones
├── index.html       → Página principal
└── LICENSE.txt      → Texto plano de licencia

```

─────────────────────────────────────────

## LICENCIA

**Creative Commons Attribution 4.0 International (CC BY 4.0)**

Puedes:

- **Compartir** — copiar y redistribuir el material en cualquier medio o formato
- **Adaptar** — remezclar, transformar y construir a partir del material
- Para cualquier propósito, incluso comercial

Bajo la condición de:

- **Atribución** — Debe otorgarse crédito adecuado a "System Friction", incluir enlace al sitio y a la licencia, e indicar si se realizaron cambios.

Texto legal completo:  
[https://creativecommons.org/licenses/by/4.0/legalcode.es](https://creativecommons.org/licenses/by/4.0/legalcode.es)

Sitio oficial del proyecto:  
[https://systemfriction.netlify.app](https://systemfriction.netlify.app)

─────────────────────────────────────────

## CONTACTO

Observaciones que desafíen este marco:  
[aptymok@gmail.com](mailto:aptymok@gmail.com)

No se responden consultas generales.

─────────────────────────────────────────

## DEPLOYMENT

Para GitHub Pages:

```bash
git init
git add .
git commit -m "v1.0 · Conjunto cerrado"
git tag v1.0
git remote add origin [url]
git push -u origin main
git push --tags
```

Habilitar Pages en Settings → Pages → Source: main branch

Para dominio custom:
Settings → Pages → Custom domain → https://systemfriction.netlify.app

─────────────────────────────────────────

VERSIONING

· v1.0 = Conjunto cerrado
· v2.0 = Solo si evidencia invalida un patrón completo

No hay v1.1, v1.2, etc.
Los documentos no se actualizan. Se reemplazan.

─────────────────────────────────────────

METADATOS

Los archivos JSON en /meta/ son legibles por máquina.
Permiten indexación semántica y búsqueda por patrón.

· docs.json → Metadata de cada documento
· patterns.json → Vocabulario de tipos de patrón

─────────────────────────────────────────

MARCADO SEMÁNTICO

Cada documento HTML incluye atributos data-* para facilitar extracción:

· data-doc-id → Identificador único del documento
· data-pattern-type → Tipo(s) de patrón que describe
· data-extractable → Marca bloques diseñados para extracción
· data-block-id → Identificador único del bloque
· data-stability → Estabilidad del patrón (alta/media/baja)

Estos atributos permiten procesamiento automático sin alterar presentación.

─────────────────────────────────────────

DOCUMENTOS

ID Título Patrón
00 Cómo leer este ecosistema meta, metodología
Ø Desde dónde observa el observador posición, marco
0 Sistemas que no pueden permitirse fallar umbral, latencia
01 Decisiones que nadie tomó decisión emergente, cristalización
02 Costo real de "adoptable" fricción institucional
03 Compliance como narrativa auditabilidad, proxy
04 Dinero como estructura temporal opcionalidad, horizonte
05 Escritura sin intención visible estructura funcional
06 Sistemas de alerta que nadie revisa dashboard, detección
07 Contexto perdido decaimiento, transmisión
08 Personas en alta incertidumbre operador, adaptación
09 Deuda de decisión diferimiento, costo
10 Incentivos bien diseñados que fallan Goodhart, proxy

─────────────────────────────────────────

NODO AGUASCALIENTES

Serie aplicada · caso geográfico

ID Título Patrón
01 La distancia que no se mide umbral real vs oficial
02 El costo de la latencia latencia federal
03 El agua que no se ve rentismo hídrico
04 El pacto no escrito variable implícita
05 La ficción institucional narrativa, umbral

─────────────────────────────────────────

QUÉ NO HACER

· No promocionar en redes sociales
· No pedir feedback público
· No añadir analytics
· No crear newsletter
· No escribir "making of"
· No explicar el proyecto

El sitio existe.
Puede ser citado, reutilizado y adaptado bajo CC BY 4.0.
La atribución es obligatoria.

─────────────────────────────────────────

INTEGRIDAD

Este repositorio está firmado digitalmente.
Verificación: git tag -v v1.0

El conjunto es cerrado.
No se aceptan contribuciones externas.
No se responden issues.

─────────────────────────────────────────

CITA

```
System Friction (2026). Archivo de fricción sistémica v1.0.
https://systemfriction.netlify.app
Licencia: CC BY 4.0
```

─────────────────────────────────────────

Sistema estable.
Marco legal alineado.

```

---

## Archivo `/LICENSE.txt`

```

System Friction · Archivo de fricción sistémica
v1.0 · Publicado 2026-02-02

Este trabajo está bajo licencia Creative Commons Atribución 4.0 Internacional (CC BY 4.0).

Usted es libre de:

· Compartir — copiar y redistribuir el material en cualquier medio o formato
· Adaptar — remezclar, transformar y construir a partir del material
  para cualquier propósito, incluso comercialmente.

Bajo las siguientes condiciones:

· Atribución — Debe reconocer el crédito de manera adecuada, proporcionar un enlace a la licencia e indicar si se realizaron cambios. Puede hacerlo de cualquier forma razonable, pero no de manera que sugiera que el licenciante lo apoya a usted o su uso.

Texto legal completo:
https://creativecommons.org/licenses/by/4.0/legalcode.es

Sitio oficial del proyecto:
https://systemfriction.netlify.app

```

---

## Footer actualizado para todos los HTML

**Para `/index.html`:**

```html
<footer class="license">
  <div class="footer-left">
    System Friction · v1.0 · 2026<br>
    <a href="https://systemfriction.netlify.app">systemfriction.netlify.app</a>
  </div>
  <div class="footer-right">
    <a href="docs/licencia.html">CC BY 4.0</a> · 
    <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">Creative Commons</a>
  </div>
</footer>
```

**Para `/docs/*.html`:**

```html
<footer class="license">
  <div class="footer-left">
    System Friction · v1.0 · 2026<br>
    <a href="https://systemfriction.netlify.app">systemfriction.netlify.app</a>
  </div>
  <div class="footer-right">
    <a href="licencia.html">CC BY 4.0</a> · 
    <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">Creative Commons</a>
  </div>
</footer>
```

Para /nodo-ags/*.html:

```html
<footer class="license">
  <div class="footer-left">
    System Friction · v1.0 · 2026<br>
    <a href="https://systemfriction.netlify.app">systemfriction.netlify.app</a>
  </div>
  <div class="footer-right">
    <a href="../../docs/licencia.html">CC BY 4.0</a> · 
    <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">Creative Commons</a>
  </div>
</footer>
```