Entiendo el enfoque. No lo convertiría en un README técnico convencional. Por la naturaleza de SFI, el README funciona más como **documento de entrada institucional / manifiesto operativo del sistema**: describe qué es, qué observa, cuáles son sus límites, cómo se organiza y qué principios gobiernan su ejecución.

Propongo esta versión con un tono más cercano a tus Mediums: descriptivo, longitudinal, observacional y con lenguaje de arquitectura de sistemas.

```md
# System Friction · Terminal Operacional

## Instrumento de observación, trazabilidad y navegación dentro de sistemas complejos

System Friction Terminal Operacional es una infraestructura experimental construida bajo el paradigma de observación sistémica continua.

No funciona como una aplicación convencional orientada únicamente a interacción de usuario. Su propósito es operar como una capa de lectura, registro y organización de fenómenos donde múltiples variables interactúan simultáneamente: comportamiento humano, estructuras institucionales, señales digitales, evidencia documental, patrones emergentes y procesos de transformación.

La arquitectura parte de un principio fundamental:

> Todo sistema deja rastros de su estado interno mediante sus interacciones, decisiones, tensiones y adaptaciones.

El Terminal Operacional convierte esos rastros en estructuras observables.

La aplicación está construida sobre Next.js App Router y toma `systemprompt.html` como contrato operativo inicial: un documento base que define identidad, límites, comportamiento esperado y relación entre componentes.

No es únicamente una interfaz.

Es una frontera entre observación y acción.

---

# Arquitectura Operacional

El sistema se organiza mediante capas funcionales que representan diferentes estados del ciclo de observación:

```

Captura → Registro → Contextualización → Comparación → Evidencia → Gobernanza

```

Cada módulo tiene una responsabilidad específica y límites definidos.

La separación no es únicamente técnica.

Es una condición de estabilidad.

Un sistema que observa no debe confundirse con un sistema que decide.

Un sistema que aprende no debe confundirse con un sistema que modifica su propia estructura.

Un sistema que registra evidencia no debe confundirse con uno que genera conclusiones definitivas.

---

# Rutas Operacionales

## `/`

### Landing Operacional

Punto inicial de acceso al ecosistema.

Presenta la identidad del Terminal y establece la relación entre usuario, instrumento y sistema observado.

No funciona como página promocional tradicional.

Es una superficie de orientación: una primera capa donde se define qué tipo de espacio está siendo abierto.

---

## `/library`

### Biblioteca Técnica Estática y Salud Pasiva de Paquete

La Biblioteca representa la memoria documental estructurada del sistema.

Su función es preservar:

- especificaciones técnicas,
- documentos fundacionales,
- esquemas,
- manifiestos,
- registros de arquitectura,
- referencias operativas.

La biblioteca no interpreta.

Conserva.

Su agente asociado valida existencia, integridad y disponibilidad de los elementos publicados dentro del paquete estático.

La función principal es mantener continuidad documental.

---

## `/world-vector`

### Observatorio World Vector

World Vector representa una capa de contextualización dinámica.

Su función es observar relaciones entre señales, estados y movimientos dentro de un campo determinado.

No predice por sí mismo.

No determina resultados.

Organiza vectores de información para permitir lectura longitudinal.

El panel funciona bajo una condición fundamental:

**observación antes que intervención.**

---

## `/field`

### Frontera Pública de Captura

El Field representa el punto donde un fenómeno puede ingresar al sistema.

Es la superficie de captura inicial.

Aquí pueden registrarse:

- observaciones,
- eventos,
- señales,
- evidencia inicial,
- información contextual.

El campo no valida automáticamente.

Recibe.

La validación ocurre posteriormente mediante capas especializadas.

---

## `/root/agents`

### Frontera ROOT para Agentes Pasivos

ROOT representa la capa de gobernanza.

Los agentes operan dentro de límites definidos:

- observan,
- clasifican,
- reportan,
- estructuran información.

No gobiernan.

No sustituyen criterio humano.

No ejecutan cierres definitivos.

ROOT mantiene la separación entre inteligencia auxiliar y autoridad operacional.

---

## `/root/predictions`

### Registro Privado de Predicciones

Espacio destinado al almacenamiento de hipótesis antes de la perturbación del sistema observado.

Una predicción dentro de SFI no representa una afirmación absoluta.

Representa una estructura temporal:

```

Hipótesis → Espera → Retorno → Comparación → Aprendizaje

````

La importancia no está únicamente en acertar.

Está en conservar el estado previo, observar la trayectoria y comparar la diferencia entre expectativa y resultado.

---

## `/root/predictions/new`

### Captura de Hipótesis Pre-Perturbación

Permite registrar una hipótesis antes de que ocurra un cambio observable.

Esto preserva una condición fundamental para cualquier sistema de aprendizaje:

la existencia de una línea base.

Sin estado inicial no existe comparación.

Sin comparación no existe aprendizaje.

---

## `/terminal`

### Núcleo Operacional

El Terminal concentra las herramientas de lectura:

- auditoría,
- AMV,
- detección de patrones,
- hard stop,
- memoria operacional.

Es la superficie donde convergen las diferentes capas del sistema.

No busca producir una narrativa automática.

Busca mantener trazabilidad.

---

## `/llms.txt`

### Protocolo Legible para Agentes

Documento de comunicación estructural para sistemas externos.

Define cómo agentes de lenguaje pueden interpretar:

- identidad,
- límites,
- capacidades,
- restricciones operativas.

Representa una interfaz entre arquitectura humana y sistemas artificiales.

---

# APIs Operacionales

## `/api/audit`

Motor de auditoría operacional.

Permite revisar estado interno, integridad y condiciones de ejecución.

---

## `/api/link/generate`

Generación de enlaces temporales mediante tokens operacionales.

---

## `/api/link/verify`

Validación de identidad temporal del enlace generado.

---

## `/api/whatsapp/webhook`

Punto de entrada para flujo MOP-H mediante WhatsApp.

Conecta captura conversacional con procesos estructurados de evaluación.

---

# Ejecución Local

```bash
npm install
npm run dev
````

Para entornos con infraestructura institucional que intercepta certificados TLS:

```bash
npm run dev:local-insecure
npm run build:local-insecure
```

Estas instrucciones existen únicamente para pruebas locales.

No representan una configuración de producción.

---

# Estado de Dependencias

El sistema puede iniciar sin variables externas utilizando memoria local de runtime.

Cuando existe:

```
GEMINI_API_KEY
```

el módulo auditor puede incorporar una capa adicional de diagnóstico cualitativo mediante Gemini.

La integración con Supabase permanece preparada mediante migraciones y clientes lazy-loading.

La ausencia de infraestructura externa no bloquea la construcción local.

---

# Phase 01 · Límite Operacional

Phase 01 establece una arquitectura de agentes pasivos.

Cada componente tiene una función específica:

```
Cron respira.
Field captura.
Library formaliza.
World Vector contextualiza.
Prediction Registry conserva evidencia.
Atlas acumula memoria longitudinal.
Agents comparan y proponen.
ROOT decide.
```

Esta separación es una condición de diseño.

La inteligencia distribuida requiere límites claros.

Los agentes pueden:

* exponer salud,
* verificar integridad,
* identificar bloqueadores,
* estructurar propuestas,
* clasificar estados de evidencia.

Los agentes no pueden:

* publicar externamente,
* cerrar ciclos,
* modificar estados gobernados por ROOT,
* reescribir protocolos,
* redefinir fenotipos,
* promover entradas al Atlas,
* exponer evidencia privada.

La autonomía sin frontera produce ruido.

La inteligencia con límites produce trazabilidad.

---

# Phase 02 · Prediction Registry Privado

Phase 02 introduce un registro privado de hipótesis longitudinales.

ROOT puede registrar predicciones antes de una perturbación y observar retornos en ventanas:

* 72 horas,
* 7 días,
* 30 días,
* 90 días.

Los agentes participan únicamente como clasificadores:

* estado de evidencia,
* ventana temporal,
* comparación estructurada.

La promoción hacia Atlas y cualquier publicación externa permanecen fuera de alcance.

---

# Principio Fundamental

System Friction no busca automatizar la realidad.

Busca construir una superficie donde la realidad pueda dejar evidencia suficiente para ser observada.

El sistema no reemplaza interpretación humana.

Reduce pérdida de información.

No elimina incertidumbre.

La vuelve medible.

No busca controlar sistemas complejos.

Busca aumentar la resolución con la que pueden ser observados.

```

Esta versión cambia el README de “lista de endpoints” a **documento de identidad operacional**. Mantiene todos los detalles técnicos, pero los coloca dentro del marco conceptual de SFI.
```