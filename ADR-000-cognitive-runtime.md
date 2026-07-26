# ADR-000 — SFI Cognitive Runtime: Foundational Architecture
Status: congelado como referencia estable
Ámbito: decisiones permanentes únicamente. Sin rutas de archivo, sin números de
línea, sin resultados de build — eso vive en `IMPLEMENTATION-NOTES.md` y
`VALIDATION-REPORT.md`. Este documento no cambia si mañana una línea se mueve, ni si
mañana cambia la infraestructura de persistencia.

## 0. Qué es esto

Charter de arquitectura del Cognitive Runtime de SFI. Un ADR aquí es una decisión que
no se reabre salvo que cambie el modelo completo del sistema. Decisiones más chicas y
atómicas van en ADRs numerados aparte (agenda abierta al final).

## Principio 0 — Singularidad Funcional

Cada responsabilidad institucional crítica —autoridad, memoria, decisión, emisión,
contrato— tiene exactamente un propietario explícito. La coordinación entre
propietarios ocurre mediante eventos, nunca mediante acoplamiento directo.

Todo lo demás en este documento es una instancia de este principio, no una regla
nueva:

- Un único registro (`registry.ts`) es el propietario de qué agentes existen.
- Un único punto institucional de decisión (`meta_orchestrator`) es el propietario
  de decidir.
- Existe una única memoria institucional autorizada, con un único escritor
  autorizado — ningún otro componente persiste directamente en ella.
- Todo ciclo cognitivo nace con un identificador único (`logbookId`) que sus
  propietarios comparten, en vez de coordinarse por llamada directa.
- Ningún agente invoca funciones de otro agente — la coordinación es siempre vía
  eventos.
- Todo contrato de agente se valida contra la infraestructura de persistencia real
  antes de declararse operacional — nunca se asume el esquema, se prueba en vivo.
  (Hoy esa infraestructura es Supabase; el principio no depende de que siga
  siéndolo — ver `IMPLEMENTATION-NOTES.md` para el mapeo vigente.)

Corolario de evaluación: si una pieza nueva introduce un segundo propietario para
una responsabilidad ya asignada, viola la arquitectura antes de escribir una línea
de código — no hace falta llegar a la implementación para rechazarla.

## ADR-001 — AMV: split funcional, no físico

**Estado: resuelta.**

AMV deja de ser candidato a "agente único del layer `understand`" y pasa a ser un
dominio con tres capas propias, sin mover ni duplicar su código fuente:

```
AMV
├── Understanding Layer   (lee y relaciona: evidencia, clusters, patrones, atlas)
├── Decision Layer        (calcula riesgo/ruta — pierde autoridad, ver ADR-002)
└── Intervention Layer    (recomendación únicamente, nunca ejecución)
```

Solo la Understanding Layer se registra en `registry.ts` bajo el layer `understand`.
Su salida es un tipo único, `AMVReading` — no decisión, no plan.

Flujo institucional, declarado explícitamente para que no se reinterprete:

```
AMV
  ↓
PhenomenonRelay
  ↓
Event Graph
  ↓
Cognitive Runtime
  ↓
Human
```

No existe, y no debe existir, una flecha directa de AMV al Cognitive Runtime que
salte `PhenomenonRelay` y el Event Graph. `PhenomenonRelay` (ver ADR-003 — no es un
agente, no tiene `emits` propio ni autoridad) traduce `AMVReading → CognitiveEvent`
y lo entrega a `risk_agent` → `opportunity_agent` → `meta_orchestrator`. AMV
recomienda; el Runtime autoriza.

El componente de gobernanza de AMV se retira del dominio AMV y pasa al Runtime —
pertenece ahí conceptualmente, no analiza, gobierna.

## ADR-002 — Escritor único de memoria institucional

**Estado: resuelta. Enmienda a ADR-001.**

Regla general, no solo sobre AMV: **toda memoria institucional posee exactamente un
escritor autorizado.** AMV es la primera aplicación de esta regla, no la única —
cualquier componente futuro que quiera persistir en memoria institucional pasa por
el mismo propietario único (hoy, el Cognitive Runtime), sin excepción caso por caso.

AMV pierde la escritura directa a memoria institucional. AMV termina en `AMVReading`
(valor de retorno); toda persistencia pasa por el Runtime a través de
`PhenomenonRelay`.

Decisiones asociadas, evaluadas y no todas aceptadas en bloque:

- **Naming interno de AMV no se renombra en la fuente.** Tensiona con el principio
  de no tocar archivos de AMV. Se resuelve en el borde: `PhenomenonRelay` degrada
  cualquier salida de la Decision Layer de AMV a "candidato" antes de que cruce al
  lado del Runtime, sin importar cómo AMV la llame internamente.
- **El layer `understand` no cambia de nombre.** Se evaluó una re-taxonomía completa
  de layers y se rechazó — no se reabre sin evidencia nueva de que los ocho layers
  actuales dejaron de ser suficientes.
- **"El Runtime nunca ejecuta, solo autoriza" no requirió una regla nueva.** Ya es
  cierto en el contrato existente: el único agente del layer `act` requiere
  aprobación humana explícita antes de cualquier ejecución.

## ADR-003 — Definición formal de "agente" en SFI

**Estado: resuelta.**

Un agente en SFI se define por cuatro propiedades conjuntas — faltar una sola
descalifica:

1. **Contrato** — tipado en `registry.ts` (`purpose`, `domain`, `layer`).
2. **Autoridad** — `authorityLevel` explícito; nunca ejecuta efectos externos salvo
   `humanApprovalRequired: true` y aprobación registrada.
3. **Emisión única** — produce exactamente un tipo de evento principal en `emits`.
   No es aspiracional: es el estado real de los 17 agentes existentes hoy, sin
   excepción — se codifica como regla ahora para que el agente 18 no la rompa.
4. **Responsabilidad declarada** — `readsMemory`/`writesMemory` explícitos; no
   accede a persistencia fuera de esas tablas.

**Corolario aplicado:** `PhenomenonRelay` no es un agente — no tiene `emits` propio
ni autoridad de decisión, es una función de traducción, no una unidad cognitiva. Los
módulos de la Understanding Layer de AMV tampoco son agentes de SFI hasta que se
registren individualmente en `registry.ts` con contrato propio.

## Agenda abierta — ADRs atómicos pendientes

Orden de dependencia real, no orden de numeración original:

1. **ADR-004 — Contrato `AMVReading`.** Prerrequisito de todo lo demás: sin su forma
   no se puede escribir `PhenomenonRelay`.
2. **ADR-007 — Convención de `logbookId`.** Prerrequisito paralelo: la
   implementación que genera el UUID por ciclo y lo propaga entre
   `meta_orchestrator` y `PhenomenonRelay`.
3. **ADR-005 — Contrato `CognitiveEvent`.** Verificado: `SFIEvent<TPayload = unknown>`
   ya es genérico sobre el payload en `packages/events/src/schema.ts`. La envolvente
   no depende de la forma de `AMVReading` — solo la instanciación específica
   (`SFIEvent<AMVReading>`) sí. En la práctica, ADR-005 casi no requiere diseño
   nuevo: confirmar que `CognitiveEvent = SFIEvent` y documentarlo. No bloquea a
   ADR-004; puede cerrarse en paralelo o antes.
4. **ADR-006 — Política de persistencia (MemoryBroker).** No parte de cero:
   `eventStore.ts` ya cubre append/stream de eventos; `tableProbe.ts` ya aísla el
   segundo punto de acceso a Supabase (extraído de `runtime.ts` — ver
   `IMPLEMENTATION-NOTES.md`). Falta formalizar ambos bajo un contrato único.
5. **ADR-008 — Política de autorización y ejecución.** Sustantivamente ya resuelta
   (invariante de facto vía `humanApprovalRequired`); falta documentarla como regla
   explícita.
