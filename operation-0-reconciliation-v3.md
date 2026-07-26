# SFI — Operation 0: Topology Reconciliation
Status: capa de reconciliación — se lee antes de crear cualquier agente nuevo
Anclado a: `Aptymok/system-friction@aa0339f` (main, 2026-07-21T23:38:45-06:00)
Fuente de verdad: `src/lib/sfi/cognitive-runtime/registry.ts` (17 agentes declarados)
Este documento no reemplaza el registro. Lo explica. Si el registro cambia, este
documento queda desactualizado por definición — no se mantiene a mano, se regenera.

## 1. Propósito

Determinar qué existe realmente antes de expandir. Evitar duplicación funcional.
Ningún agente se declara sin que su contrato (`purpose`, `domain`, `listensTo`,
`emits`, `readsMemory`, `writesMemory`, `authorityLevel`, `sourceTables`) exista
primero como dato tipado en `registry.ts`.

## 2. Estado actual del sistema (capas verificadas)

- **ROOT** — `src/app/root`, consola soberana (`RootSovereignConsole`), gating por
  `requireRootActor`.
- **Cognitive Runtime** — nuevo desde `aa0339f`: registro de contratos + runtime que
  prueba tablas en vivo contra Supabase (no confía en lo declarado) + vista ROOT
  (`/root?view=cognitive-runtime`).
- **Event Graph** — `packages/events/src/schema.ts`, clases epistémicas
  (`observed/declared/derived/inferred/simulated/fixture/missing`), tabla
  `epistemic_events`.
- **Evidence Graph** — `root_evidence_entries`, `sfi_evidence_ledger`,
  `sfi_phenomenon_evidence`.
- **Prediction Registry** — `sfi_predictive_runs`, `sfi_predictive_learning_events`,
  motor de calibración con estados `ACTIVE/SHADOW/FROZEN/RETIRED`
  (`src/lib/predictive-engine/calibration.ts`).
- **Governance** — `action_proposals`, `logbook_mutations`, `root_audit_events`, reglas
  R12-mod/R16/R17/R18/R19.
- **Studio** — `src/lib/studio/cultural-lab/agents/` (8 agentes reales, pipeline propio).
- **MIHM / AMV** — `packages/mihm-core`, `src/lib/amv/agents/`.
- **FIELD** — ciclo operacional cerrado end-to-end ya en producción
  (`docs/field/FIELD_OPERATIONAL_CYCLE_V1.md`): T0 → MOP-H → hipótesis → intervención →
  retorno → MIHM parcial → lección, con sellado SHA-256.

## 3. Mapeo arquitectura → implementación

| Concepto de la especificación | Implementación real |
|---|---|
| "Phenomenon Memory" | Evidence Graph + Event Graph (`epistemic_events`, `sfi_evidence_ledger`) |
| "Agent Runtime" | Cognitive Runtime (`registry.ts` + `runtime.ts`) |
| "Ciclo científico permanente" | `/field` — ya operativo, no pendiente |
| "Calibración de realidad" | `predictive-engine/calibration.ts` — más riguroso que lo descrito en la spec original |
| "Observatorios UI" | `/root`, `/studio`, `/observatory`, `/field`, `/world-vector` |

## 4. Capacidades existentes (derivado de `registry.ts`, 17 agentes)

**EXISTE** — `missingCapability: false`, contrato respaldado por tablas reales y, en
7 casos, ruta API activa:

| Agente | Layer | Ruta API | Estado estructural |
|---|---|---|---|
| `meta_orchestrator` | decide | `/api/root/cognitive-runtime` | OPERACIONAL |
| `evidence_hunter` | observe | `/api/root/evidence` | OPERACIONAL |
| `temporal_resolver` | reconstruct | — | OPERACIONAL (corregido, ver abajo) |
| `trajectory_agent` | project | — | OPERACIONAL |
| `reality_calibration` | learn | `/api/predictive-engine/runs/[id]/outcome` | OPERACIONAL |
| `risk_agent` | decide | — | OPERACIONAL |
| `opportunity_agent` | decide | — | OPERACIONAL |

**Corrección aplicada y verificada** (commit local, pendiente de push):
`temporal_resolver` declaraba `field_events` como `sourceTable` — tabla inexistente en
las 43 migraciones. Se reemplazó por `field_returns` (tabla real:
`verification_window`, `expected_at`, `returned_at` — coincide con "return window and
observable outcome horizon", el propósito declarado del agente). También se corrigió la
constante compartida `SFI_FIELD_TABLES` (`'field_events'` → `'field_moph_runs'`, usada
por el modo `passive_field_observation`). Archivo completo corregido:
`src/lib/sfi/cognitive-runtime/registry.ts`.

Verificación ejecutada sobre el repo con el fix aplicado:
- `npm run check:boundaries` → pasa, `cognitive-runtime` no cruza dominios.
- `npm run typecheck` (`tsc --noEmit`) → 0 errores.
- `npm run build` (Next.js 16 / Turbopack) → compila, typecheck interno y
  page-data collection completos sin errores; `/api/root/cognitive-runtime` queda
  registrada como ruta dinámica (`ƒ`), confirmando que no se evalúa contra Supabase
  en build-time.
- `npm run audit:routes` → la ruta y los tres archivos de `cognitive-runtime/` quedan
  indexados correctamente.
- Cross-check estructural de las 17 declaraciones contra `supabase/migrations/`:
  **0 referencias a tablas inexistentes** (antes del fix: 1).

**GATED** — `missingCapability: true`. Contrato declarado, sin persistencia ni lógica
que lo respalde todavía. No son "por hacer" genéricos: cada uno tiene su propio contrato
tipado esperando implementación, lo que evita que se construyan como piezas sueltas:

`historical_scout` · `phenotype_resolver` · `context_builder` ·
`social_field_simulator` · `economic_field_simulator` · `policy_simulator` ·
`cultural_simulator` · `psychological_simulator` · `multi_stakeholder_bootstrap` ·
`project_execution_manager`

**AUSENTE** — sin contrato declarado ni en el registro ni en el código:
`ContradictionAgent` (de la spec original) no tiene entrada propia; su función parcial
vive dentro de `MissingEvidence` (11 archivos, sin agente dedicado). No se agrega al
registro en esta pasada — es candidato para la siguiente fase, no para esta.

## 5. Duplicaciones detectadas

Confirmado en la pasada anterior: `interventionAgent.ts` en `lib/amv/agents/` vs
`lib/studio/cultural-lab/agents/` **no es duplicado real** — dominios distintos
(gate de gobernanza vs generador de candidatos narrativos). Coincidencia de nombre,
no de función. Recomendación pendiente: renombrar, no fusionar.
Sin duplicaciones nuevas introducidas por el commit `aa0339f` — no crea persistencia
paralela ni una segunda definición de agente ya existente en otro dominio.

## 6. Superficies que no deben crearse

- Otra página de "agentes" fuera de `/root?view=cognitive-runtime`. Esa vista ya es la
  superficie canónica del Cognitive Runtime.
- Un grafo de evidencia nuevo. Ya existe: `epistemic_events` + `sfi_evidence_ledger` +
  `root_evidence_entries`.
- Tablas `field_*` nuevas para los simuladores de campo `GATED`. Cuando se implementen,
  deben leer de `field_cases`/`field_moph_runs` existentes, no crear un esquema paralelo.
- Un segundo orquestador. `meta_orchestrator` ya está declarado y conectado a
  `SFI_TASK_CREATED`; no emitir agentes que se llamen entre sí directamente (regla del
  documento de arquitectura original, §16: el evento es el lenguaje común, no la llamada
  directa).

## 6bis. Verificación en vivo — confirmada

Ejecutada por el usuario contra su instancia real de Supabase, commit `aa0339f` + fix
de `field_events`. `generatedAt: 2026-07-24T14:06:11Z`. `status` global: `degraded`.

Por agente — coincide exactamente, uno a uno, con la predicción estructural de §4:

- **7 `operational`**: `meta_orchestrator`, `temporal_resolver`, `evidence_hunter`,
  `trajectory_agent`, `reality_calibration`, `risk_agent`, `opportunity_agent`.
- **10 `gated`**: `historical_scout`, `phenotype_resolver`, `context_builder`,
  `social_field_simulator`, `economic_field_simulator`, `policy_simulator`,
  `cultural_simulator`, `psychological_simulator`, `multi_stakeholder_bootstrap`,
  `project_execution_manager`.
- **0** agentes con `missingTables` o `warnings` en su bloque `evidence` — el fix de
  `field_events` se sostiene en producción, no solo contra el esquema de migraciones.

`degraded` no es un error de código. Es el estado correcto: 10 de 17 agentes
declarados no tienen lógica de ejecución detrás todavía. Reportar otra cosa sería
falso.

Dos hallazgos que solo aparecen con datos reales, invisibles en el análisis estático:

1. **`eventGraph.status: "missing"`, `recentEvents: []`.** La tabla `epistemic_events`
   existe y responde — por eso cada agente la reporta `operational` en su
   `readsMemory` — pero no hay un solo evento del vocabulario propio del Cognitive
   Runtime (`SFI_TASK_CREATED`, `SFI_TEMPORAL_COORDINATE_RESOLVED`, etc.) registrado
   todavía. El sistema está cableado; nadie lo ha usado. Esperable — nadie hizo una
   pregunta a través de `meta_orchestrator` todavía — pero es la diferencia real entre
   "la tubería existe" y "la tubería transportó algo".
2. **El layer `understand`** (`¿Qué conexiones existen?`, la pregunta del AMV Console
   en la spec original) tiene `agents: []` — cero agentes asignados, ni siquiera
   `gated`. No tiene contrato declarado, a diferencia de los 10 `gated` que sí lo
   tienen. El AMV ya existe como código real (`src/lib/amv/agents/`, confirmado en la
   auditoría de duplicados de §5). Lo que no está resuelto es si ese código debería
   registrarse en este `registry.ts` como agente del Cognitive Runtime, o si
   `understand` queda fuera a propósito porque AMV opera con su propio ciclo. No se
   asume ninguna de las dos — queda como pregunta abierta de diseño, no como código
   pendiente.

Con esto la Operación 0 queda cerrada con evidencia real, no con inferencia
estructural.

## 6ter. Investigación de Operación 1 — AMV vs layer `understand`

Auditado el código real de AMV (`src/lib/amv/`, ~95 archivos) antes de responder la
pregunta de diseño planteada en §7.0.

**Hallazgo 1 — AMV no es puramente "understand".** `amvGraphTypes.ts` declara
`decision` y `accion` como tipos de nodo de primera clase en su propio grafo, junto a
`patron`, `atractor`, `fenomeno`. `amvDecisionPolicy.ts` calcula nivel de riesgo y
ruta (`riskFromScore`, `enforceDecisionPolicy`). `interventionMode.ts` /
`interventionAgent.ts` producen `intervention_plan`, `risk_register`,
`decision_record` — contenido de decisión real, no solo descriptivo. La única
invariante que se sostiene en todo el módulo es `canExecuteExternal: false` /
`executesExternal: false`: AMV nunca ejecuta fuera de sí mismo, pero sí decide y
recomienda internamente. Tratar "AMV = understand" como bloque atómico (Opción A)
describiría mal aproximadamente la mitad de lo que el código hace.

Lectura más ajustada a la evidencia: dentro de AMV hay dos familias de módulos, no
una. `amvGraphBuilder`, `evidenceAgent`, `cluster-atlasAgent`, `signal-vaneAgent` son
estructuralmente `understand` (leen y relacionan, no deciden). `amvDecisionPolicy`,
`interventionMode`/`interventionAgent`, `governance-realityAgent` ya son `decide` —
y ese `decide` interno de AMV corre en paralelo al `decide` del Cognitive Runtime
(`meta_orchestrator`, `risk_agent`, `opportunity_agent`, `multi_stakeholder_bootstrap`),
sin que hoy exista ninguna regla que diga cuál gana o cómo se concilian. Es la misma
categoría de riesgo que la colisión de nombre de `interventionAgent.ts` en §5 — ahí
era coincidencia de nombre entre dos funciones distintas; acá sería una función
genuinamente duplicada (decidir) en dos sistemas distintos si se registra AMV entero
sin partirlo.

**Hallazgo 2 — Operación 1 y Operación 2 están acopladas, no son secuenciales.**
`saveAmvReadingToLogbook.ts` (AMV) escribe a `epistemic_events` con
`logbookId: AMV:<scope>` (ej. `AMV:ROOT`). `readSfiCognitiveRuntime()` (Cognitive
Runtime) lee con `streamEpistemicEvents('default', 40)` — hardcodeado a
`logbook_id = 'default'`. `createSfiCognitiveTaskGraph` escribe también con
`logbookId: 'default'`. El lazo de lectura/escritura del Cognitive Runtime es
internamente consistente — por eso Operación 2 tal como la planteás (emitir un
evento y ver `recentEvents` dejar de estar vacío) funciona con solo invocar
`meta_orchestrator` una vez. Pero ese evento cae en un logbook `'default'` sin
alcance ni separación por tarea, estructuralmente aislado del namespace `AMV:<scope>`
que ya existe y ya tiene datos potenciales. Emitir el primer evento no conecta con
AMV — son dos flujos que hoy no se ven entre sí pase lo que pase en Operación 1.
Cualquier decisión sobre AMV en Operación 1 debería fijar también la convención de
`logbookId` (¿namespaces por tarea? ¿el Runtime lee across-namespace? ¿quedan
separados a propósito?), o Operación 2 resuelve el síntoma (`recentEvents: []`) sin
resolver la causa (no hay memoria compartida entre AMV y el Runtime).

**Corrección de housekeeping aplicada:** `runtime.ts` línea 276 tenía un segundo
`'field_events'` hardcodeado (no capturado por el fix de `registry.ts`, porque vivía
en la lógica del modo `passive_field_observation`, no en la declaración). No rompía
nada hoy — el `||` con `field_cases` lo enmascaraba — pero es la misma clase de
defecto. Corregido a `field_moph_runs`. `typecheck` limpio después del cambio.



0. Resolver la pregunta de diseño del layer `understand`: ¿AMV se registra en
   `registry.ts` o queda deliberadamente fuera del Cognitive Runtime? No es solo esa
   pregunta — incluye fijar la convención de `logbookId` compartida (ver §6ter,
   Hallazgo 2), porque sin eso Operación 2 no conecta con AMV pase lo que se decida
   acá. Es una decisión de arquitectura, no una tarea de código.
1. ~~Corregir `field_events`~~ — hecho en `registry.ts` (confirmado en producción,
   §6bis) y en `runtime.ts` (housekeeping, §6ter). Cero referencias restantes en `src/`.
2. De los 10 agentes `GATED`, priorizar **Historical Reconstruction**
   (`historical_scout`, `phenotype_resolver`, `context_builder`) — es la única fila sin
   ninguna pieza real subyacente, ya confirmado en dos auditorías independientes
   (manual y por registro).
3. Los cinco simuladores de campo no se implementan como bloque: cada uno depende de
   qué variables (`bounded_variable_coverage`, `governance_constraint_coverage`, etc.)
   tengan evidencia real disponible hoy en `field_cases`/`world_vector_observations`.
   Implementar el que tenga más cobertura de evidencia primero, no por orden de la spec.
