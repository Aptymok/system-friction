# AMV Python Cognitive Twin Contract

## Objetivo

Definir la frontera entre TypeScript AMV y Python Cognitive Twin / Cognitive Orchestrator.

Este bloque no ejecuta Python, no importa `services/python` y no toca Supabase schema ni migraciones.

## Estado actual observado

- `services/python/cognitive_twin/config.py` define DB local por defecto y rutas de logs.
- `services/python/cognitive_twin/models.py` declara modelos SQLAlchemy locales.
- `services/python/cognitive_twin/epistemic_event_store.py` es la pieza mas util: eventos con `signal_type`, `evidence_level`, `confidence`, lineage y checksum.
- `services/python/cognitive_orchestrator/orchestrator.py` coordina modulos cognitivos, pero mezcla persistencia, bus e imports Python internos.
- `src/app/api/cognitive-twin/route.ts` no invoca Python; declara `cognitiveTwinService: available_not_invoked`.

## Contrato TypeScript

El contrato vive en:

```txt
src/lib/amv/core/pythonBridgeContract.ts
src/lib/amv/agents/cognitiveTwinBridgeAgent.ts
```

Tipos definidos:

- `CognitiveTwinRequest`
- `CognitiveTwinResponse`
- `EpistemicEventPayload`
- `CognitiveGraphPayload`
- `PythonBridgeStatus`
- `DegradedPythonResult`

## Estados del puente

| Estado | Significado |
| --- | --- |
| `not_configured` | No hay puente configurado. |
| `available_not_invoked` | Existe frontera declarada, pero Python no se ejecuta. |
| `contract_ready` | El contrato TS existe y puede validarse sin runtime Python. |
| `degraded` | El resultado debe tratarse como degradado. |
| `blocked_by_quarantine` | Cuarentena impide ejecucion o publicacion. |

## Regla de integracion

TypeScript solo puede hablar con Python mediante payloads versionados.

Prohibido:

- import directo desde `services/python`;
- escritura DB directa desde Python hacia runtime productivo;
- service role en modulo experimental;
- inferencias sin confidence;
- outputs sin lineage;
- simulaciones presentadas como observaciones;
- primera persona subjetiva.

## Resultado degradado por defecto

`buildCognitiveTwinBridgeResponse(request)` devuelve `available_not_invoked` y `no_python_execution`.

Esto conserva el contrato sin activar runtime experimental.
