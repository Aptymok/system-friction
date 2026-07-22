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

## 6bis. Límite de esta verificación

Todo lo anterior es verificación **estructural**: código, tipos, build, y esquema de
migraciones. No es verificación de **producción**. Este entorno no tiene
`SUPABASE_SERVICE_ROLE_KEY` ni `DATABASE_URL` (`.env.local`/`.env.production` están en
`.gitignore`, no llegan al clon), y el acceso de red de este entorno no incluye el host
de Supabase — no hay forma de que `probeTable()` corra contra la base real desde aquí.

Por eso no se reporta un cuadro `ROOT Cognitive Runtime Health` con números de
`Operational/Gated/Warnings/Missing` en vivo — sería inventar exactamente el tipo de
dato que este documento existe para no inventar. Lo que sí se puede afirmar: si las
tablas responden en producción igual que en el esquema de migraciones, los 7 agentes
`EXISTE` deberían leer `operational`, no `degraded` — el fix eliminó la única causa
estructural conocida de un `warning`.

Para obtener el health real:
```
npm run build && npm run start
# en otra terminal, autenticado como ACP:
curl -s http://localhost:3000/api/root/cognitive-runtime | jq .runtime
```
o apuntar `QA_HOST` del script existente (`npm run qa:sfi-runtime`) a un despliegue
con credenciales reales.

## 7. Próxima fase autorizada

1. Corregir `field_events` en `registry.ts` (una línea, antes de que se acumule como
   deuda silenciosa detrás de un estado "degraded" que nadie investigará después).
2. De los 10 agentes `GATED`, priorizar **Historical Reconstruction**
   (`historical_scout`, `phenotype_resolver`, `context_builder`) — es la única fila sin
   ninguna pieza real subyacente, ya confirmado en dos auditorías independientes
   (manual y por registro).
3. Los cinco simuladores de campo no se implementan como bloque: cada uno depende de
   qué variables (`bounded_variable_coverage`, `governance_constraint_coverage`, etc.)
   tengan evidencia real disponible hoy en `field_cases`/`world_vector_observations`.
   Implementar el que tenga más cobertura de evidencia primero, no por orden de la spec.

