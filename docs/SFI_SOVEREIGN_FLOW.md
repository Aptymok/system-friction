# SFI Sovereign Flow Diagram

Estado: Constitucional · Operacional
Fecha: 2026-05-21

Este documento define el flujo soberano del Observatorio SFI.

No representa UI.
No representa intención aspiracional.
Representa:
- fronteras de verdad
- clases epistemológicas
- rutas permitidas
- aislamiento entre dominios
- flujo de eventos
- soberanía computacional
- separación entre observación e inferencia

---

## Leyes rectoras

1. La UI no calcula verdad. La UI observa.
2. Ningún aplicativo accede directo a DB.
3. Toda inferencia declara evidencia, confianza y lineage.
4. Toda simulación se etiqueta como simulación.
5. Todo evento externo entra por SECURITY + INTEGRATION.
6. El Observatorio conserva soberanía del FieldState.
7. El AGENT CORE propone; no declara realidad.
8. El FIELD CORE conserva la verdad operacional trazable.

---

## Flujo soberano del Observatorio

```mermaid
flowchart TD

    %% EXTERNAL SOURCES
    subgraph EXT[EXTERNAL SOURCES]
        U[Usuario]
        APIs[APIs externas]
        WH[Webhooks]
        CRON[Cron Jobs]
        FILES[Archivos / Media]
        WORLD[WorldSpect Sources]
    end

    %% SECURITY
    subgraph SEC[SECURITY CORE]
        AUTH[AuthN / AuthZ]
        RL[Rate Limit]
        POLICY[Policy Engine]
        VERIFY[Schema + Signature Verification]
        AUDIT[Audit Controls]
    end

    %% INTEGRATION
    subgraph INT[INTEGRATION CORE]
        INGEST[Source Ingestion]
        ADAPTERS[Adapters]
        SOURCEHEALTH[SourceHealth]
        EVENTSRC[SourceEvent]
    end

    %% EVENT LAYER
    subgraph EVT[EVENT + LEDGER LAYER]
        CLASSIFY[Epistemic Classification]
        EVENTSTORE[(Event Store)]
        LOGBOOK[(SFI Logbooks)]
        SNAPSHOT[(Snapshots)]
    end

    %% FIELD CORE
    subgraph FIELD[FIELD CORE]
        NODESTATE[NodeState]
        FIELDSTATE[FieldState]
        PATTERNS[Pattern Activation]
        VECTOR[Vector Scoring]
        REGIME[Regime Derivation]
        DEGRADE[Degradation Engine]
    end

    %% AGENT CORE
    subgraph AGENT[AGENT CORE]
        MEMORY[Memory]
        PROPOSALS[Proposal Engine]
        INFERENCE[Inference Layer]
        SIM[Simulation Layer]
        TWIN[CognitiveTwin Experimental]
    end

    %% API
    subgraph API[API CONTRACTS]
        FIELDAPI[/api/field]
        NODEAPI[/api/nodes]
        LOGAPI[/api/logbooks]
        EVENTAPI[/api/events]
        RISKAPI[/api/risk]
        AGENTAPI[/api/agent/proposals]
    end

    %% INTERFACE
    subgraph UI[INTERFACE CORE]
        DASH[Observatory Dashboard]
        TERM[/terminal]
        EVAL[SFI Evaluator]
        LAB[Laboratory]
        DEMO[Demo/Public Interfaces]
    end

    %% FLOWS
    U --> AUTH
    APIs --> VERIFY
    WH --> VERIFY
    CRON --> VERIFY
    FILES --> VERIFY
    WORLD --> VERIFY

    AUTH --> INGEST
    RL --> INGEST
    POLICY --> INGEST
    VERIFY --> INGEST
    AUDIT --> INGEST

    INGEST --> EVENTSRC
    ADAPTERS --> EVENTSRC
    EVENTSRC --> SOURCEHEALTH

    EVENTSRC --> CLASSIFY

    CLASSIFY -->|observed| EVENTSTORE
    CLASSIFY -->|declared| EVENTSTORE
    CLASSIFY -->|derived| EVENTSTORE
    CLASSIFY -->|inferred| EVENTSTORE
    CLASSIFY -->|simulated| EVENTSTORE

    EVENTSTORE --> LOGBOOK
    EVENTSTORE --> SNAPSHOT

    EVENTSTORE --> VECTOR
    EVENTSTORE --> PATTERNS
    VECTOR --> REGIME
    PATTERNS --> REGIME
    REGIME --> DEGRADE

    VECTOR --> NODESTATE
    DEGRADE --> FIELDSTATE
    REGIME --> FIELDSTATE
    SOURCEHEALTH --> FIELDSTATE

    EVENTSTORE --> MEMORY

    MEMORY --> PROPOSALS
    EVENTSTORE --> INFERENCE
    INFERENCE --> PROPOSALS
    SIM --> PROPOSALS
    TWIN --> PROPOSALS

    PROPOSALS -->|Proposal / Inference| EVENTAPI

    FIELDSTATE --> FIELDAPI
    NODESTATE --> NODEAPI
    LOGBOOK --> LOGAPI
    EVENTSTORE --> EVENTAPI

    FIELDAPI --> DASH
    NODEAPI --> DASH
    LOGAPI --> DASH
    RISKAPI --> DASH

    FIELDAPI --> TERM
    NODEAPI --> TERM
    LOGAPI --> TERM

    FIELDAPI --> EVAL
    NODEAPI --> EVAL
    LOGAPI --> EVAL
    AGENTAPI --> EVAL

    FIELDAPI --> LAB
    EVENTAPI --> LAB

    FIELDAPI --> DEMO

    %% HARD BOUNDARIES
    DASH -. NO DB ACCESS .-> EVENTSTORE
    TERM -. NO DB ACCESS .-> EVENTSTORE
    EVAL -. NO DB ACCESS .-> EVENTSTORE
    LAB -. NO DB ACCESS .-> EVENTSTORE

    %% AGENT LIMITS
    PROPOSALS -. cannot mutate directly .-> FIELDSTATE
    SIM -. simulated only .-> EVENTSTORE
    TWIN -. experimental quarantine .-> EVENTSTORE
```

---

## Clasificación epistemológica

Todo dato que entra al Observatorio debe declararse explícitamente como:

| Clase | Descripción |
|---|---|
| observed | Medido directamente desde fuente declarada. |
| declared | Declarado por usuario o sistema identificado. |
| derived | Calculado deterministicamente desde datos trazables. |
| inferred | Inferencia probabilística con evidencia y confianza. |
| simulated | Resultado de simulación; nunca verdad del campo. |

La interfaz debe mostrar esta clasificación cuando el dato afecte:
- decisiones
- riesgo
- evaluación
- degradación
- diagnóstico
- intervención

---

## Fronteras constitucionales

### FIELD CORE

Único dominio autorizado para:
- producir FieldState
- producir NodeState
- derivar régimen
- persistir verdad operacional
- calcular degradación canónica

### AGENT CORE

Puede:
- proponer
- inferir
- simular
- recomendar perturbaciones
- generar hipótesis

No puede:
- declarar realidad
- mutar FieldState directamente
- escribir NodeState sin comandos autorizados

### INTERFACE CORE

Puede:
- observar
- renderizar
- solicitar comandos
- mostrar estados degradados
- conservar cache local etiquetado

No puede:
- calcular métricas canónicas
- persistir bitácora oficial
- inferir conciencia
- convertir simulación en observación

### INTEGRATION CORE

Todo evento externo entra por:
- schema validation
- authz
- verification
- rate limit
- source descriptor
- idempotency

### SECURITY CORE

Controla:
- identidad
- scopes
- autorización
- políticas
- auditabilidad
- replay protection
- zero trust

---

## Regla de resiliencia

El objetivo del sistema no es evitar todo fallo.

El objetivo es:

reducir la brecha entre evento adverso y retorno a operatividad.

El Observatorio debe poder:
- degradar parcialmente
- conservar trazabilidad
- registrar el evento
- activar recuperación
- mantener soberanía del campo
- volver a operación sin corrupción epistemológica

---

## Estado actual

Este diagrama describe:
- la arquitectura objetivo inmediata
- las fronteras correctas de dominio
- el flujo soberano del observatorio

No implica que todas las fases estén implementadas.

Las zonas experimentales permanecen en cuarentena hasta:
- pruebas
- lineage
- contratos IO
- trazabilidad
- límites operativos
- clasificación epistemológica explícita
