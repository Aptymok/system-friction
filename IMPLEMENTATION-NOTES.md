# Cognitive Runtime — Implementation Notes
Ámbito: archivos, líneas, correcciones concretas. Este documento sí cambia cuando el
código se mueve — por diseño, para que `ADR-000-cognitive-runtime.md` no tenga que
hacerlo.

## Commit base

`Aptymok/system-friction@aa0339f` (main, 2026-07-21T23:38:45-06:00). Trae:
`src/agents/runtime/agentContract.ts` extendido sobre `SFIEvent`,
`src/lib/sfi/cognitive-runtime/{registry,runtime,types}.ts` nuevos,
`src/app/api/root/cognitive-runtime/route.ts` nuevo (gated por `requireRootActor`),
vista `RootCognitiveRuntimeView` montada en la consola soberana.

## Mapeo: invariantes de ADR-000 → implementación vigente hoy

ADR-000 está escrito en términos agnósticos de infraestructura a propósito. Esta
tabla es la que sí ata cada invariante a su implementación actual — y la que cambia
si algún día la infraestructura cambia, no el ADR:

| Invariante (ADR-000) | Implementación hoy |
|---|---|
| Registro único de agentes | `src/lib/sfi/cognitive-runtime/registry.ts` |
| Punto único de decisión | `meta_orchestrator` en `registry.ts` / `runtime.ts` |
| Memoria institucional única | tabla `epistemic_events` (Supabase) |
| Validación contra infraestructura real | `tableProbe.ts` → Supabase (`createServiceSupabaseClient`) |
| `logbookId` compartido | campo `string` libre en `SFIEvent`, `packages/events/src/schema.ts` |

## Corrección 1 — `field_events` (tabla inexistente)

`temporal_resolver` declaraba `field_events` como `sourceTable` en `registry.ts`.
Esa tabla no existe en ninguna de las 43 migraciones de `supabase/migrations/`.

- `SFI_FIELD_TABLES` (línea 8 de `registry.ts` en el commit base): `'field_events'` →
  `'field_moph_runs'`.
- `sourceTables`/`readsMemory` propios de `temporal_resolver`: `'field_events'` →
  `'field_returns'` (tabla real con `verification_window`, `expected_at`,
  `returned_at` — coincide con el propósito declarado del agente).

Aplicado vía `apply-sfi-operation-0.sh`, validado contra clon limpio.

## Corrección 2 — segundo `field_events` en `runtime.ts`

No capturado por la corrección 1 porque vivía en la lógica del modo
`passive_field_observation`, no en la declaración del registro. `probes.get
('field_events')` → `probes.get('field_moph_runs')`. No rompía nada en producción
(el `||` con `field_cases` lo enmascaraba), misma clase de defecto.

Aplicado vía `apply-sfi-runtime-fix-2.sh`, validado contra clon limpio.

Tras ambas correcciones: `grep -rn "field_events" src/` no devuelve ninguna
referencia a la tabla (solo una etiqueta de warning no relacionada,
`no_field_events_found`, en `src/app/api/field/state/route.ts`).

## Corrección 3 — extracción de `probeTable()` fuera de `runtime.ts`

Señalado dos veces por revisión externa: `runtime.ts` mezclaba orquestación
cognitiva con acceso directo a Supabase (`createServiceSupabaseClient` +
`probeTable()` inline, ~20 líneas). Es el mismo tipo de acoplamiento que ADR-000
prohíbe para agentes, aplicado sin querer al propio Runtime.

Extraído a `src/lib/sfi/cognitive-runtime/tableProbe.ts` (nuevo archivo, exporta
`TableProbe` y `probeTable`). `runtime.ts` ya no importa
`createServiceSupabaseClient`; solo importa `probeTable` desde el nuevo módulo.
Comportamiento idéntico, cero cambios de lógica — pure refactor.

Verificado: `check:boundaries` pasa, `typecheck` limpio, `build` completo, validado
contra clon limpio. Aplicado vía `apply-sfi-probe-extraction.sh`.

Con esto, el segundo punto de conocimiento directo de Supabase que tenía el Runtime
(además de `eventStore.ts`) queda aislado — insumo directo para ADR-006.

## Archivos AMV auditados para ADR-001/002

- `src/lib/amv/core/amvGraphTypes.ts` — declara `decision`/`accion` como tipos de
  nodo de primera clase.
- `src/lib/amv/core/amvDecisionPolicy.ts` — `riskFromScore`, `enforceDecisionPolicy`.
- `src/lib/amv/core/interventionMode.ts` — `allowedOutputs: ['intervention_plan',
  'risk_register', 'decision_record']`, `executesExternal: false`. Campo real en
  código, no descripción — por eso ADR-002 no lo renombra en la fuente.
- `src/lib/amv/agents/interventionAgent.ts` — `canExecuteExternal: false` explícito.
- `src/lib/amv/agents/governance-realityAgent.ts` — 8 líneas, envuelve
  `buildEcosystemDashboardSpec`, cero llamadores en todo el repo. La migración a
  Runtime (ADR-001) no mueve lógica de gobernanza en vivo, es un stub sin uso.
- `src/lib/amv/core/saveAmvReadingToLogbook.ts` — llama `appendEpistemicEvent`
  directamente con `logbookId: AMV:<scope>`. Es el acceso que ADR-002 cierra.

## Pendiente — colisión de nombre: `sfi_amv_memory`

Confirmado que son dos cosas distintas con el mismo nombre:

- `src/lib/amv/amv-memory.ts` — store en memoria del proceso
  (`globalThis['__sfi_amv_memory_store__']`), efímero, se pierde en cada reinicio,
  capado a 500 entradas.
- El `sfi_amv_memory` que aparece como `sourceTable`/`readsMemory` en varios
  agentes del registro (`meta_orchestrator`, `cultural_simulator`,
  `psychological_simulator`, `opportunity_agent`) — ese sí es una tabla real de
  Supabase, confirmado `operational` en la medición en vivo de
  `VALIDATION-REPORT.md`.

Nombres distintos propuestos, no aplicados todavía (requiere decidir si el store en
memoria de `amv-memory.ts` sigue teniendo un rol después de ADR-002, dado que AMV ya
no persiste directamente):

- Tabla real → `AMVMemoryLedger` (o dejar `sfi_amv_memory` si renombrar la tabla
  implica migración — a confirmar antes de tocarla).
- Store en memoria del proceso → `AMVRuntimeMemory` (rename de archivo, sin
  migración, bajo riesgo).

No aplicado en esta pasada porque falta la decisión previa: si `PhenomenonRelay`
absorbe la función de `amv-memory.ts` o si ese store queda deprecado directamente
una vez que AMV no escribe institucionalmente por su cuenta.

## Convención de `logbookId` — estado del código

`logbookId` es un campo `string` libre en `SFIEvent`, sin restricción de formato —
no requiere migración para implementar ADR-001/002/007.

- `readSfiCognitiveRuntime()`: `streamEpistemicEvents('default', 40)` — hardcodeado.
- `createSfiCognitiveTaskGraph`: `appendEpistemicEvent({..., logbookId: 'default',
  ...})` — hardcodeado, consistente con la lectura.
- `saveAmvReadingToLogbook.ts` (AMV): `logbookId: AMV:${scope}`.

Los tres puntos son independientes hoy — ninguno lee lo que escribe el otro. Fijar
esto es el contenido pendiente de ADR-007.
