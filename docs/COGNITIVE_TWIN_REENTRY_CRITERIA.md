# COGNITIVE TWIN REENTRY CRITERIA

Fecha: 2026-05-21  
Fase: FASE 7C - Cuarentena formal de experimental

## Objetivo

Definir las condiciones minimas para que CognitiveTwin pueda solicitar reentrada al Observatorio SFI en una fase futura.

Este documento no autoriza implementacion ni ejecucion productiva.

## Estado actual

CognitiveTwin queda en cuarentena experimental.

Rutas actuales relacionadas:

- `services/python/cognitive_twin`
- `src/app/api/cognitive-twin/route.ts`
- `src/agents/cognitive-twin.ts`
- `experimental/cognitive-twin/README.md`

## Condiciones de reentrada

CognitiveTwin solo puede reentrar si cumple todas las condiciones:

| Condicion | Requisito |
| --- | --- |
| Contrato IO | Entrada y salida versionadas, sin payload arbitrario. |
| Lineage | Toda salida referencia fuentes, transformaciones, eventos padre y checksum. |
| Confidence | Toda inferencia declara `confidence` en rango `0..1`. |
| Clase epistemica | Toda salida usa `observed`, `declared`, `derived`, `inferred`, `simulated`, `fixture` o `missing`. |
| No DB directa | `directDatabaseAccess: false`; publica solo mediante API controlada. |
| No service role | No usa credenciales privilegiadas. |
| No primera persona subjetiva | No simula conciencia, deseo, memoria viva ni identidad autonoma. |
| Human review | Inferencias de impacto alto requieren revision humana. |
| Fixtures | Tiene fixtures declarados y resultados esperados. |
| Security | Pasa validacion de schema, authz, idempotency y audit. |
| Rollback | Puede desactivarse sin romper FieldState ni UI. |

## IO contract requerido

Forma conceptual:

```ts
type CognitiveTwinInput = {
  contractVersion: string;
  requestId: string;
  nodeId: string;
  assetId?: string;
  sourceDescriptor: {
    sourceId: string;
    sourceType: 'fixture' | 'declared' | 'observed' | 'document' | 'system';
    observedAt?: string;
  };
  payloadHash: string;
  payloadRef: string;
  requestedBy: string;
  correlationId: string;
};
```

```ts
type CognitiveTwinOutput = {
  contractVersion: string;
  eventId: string;
  nodeId: string;
  epistemicClass: 'derived' | 'inferred' | 'simulated' | 'fixture' | 'missing';
  evidenceLevel: 'direct' | 'behavioral' | 'statistical' | 'semantic' | 'speculative' | 'none';
  confidence: number;
  summary: string;
  lineage: string[];
  checksum: string;
  uncertainty: string;
  requiresHumanReview: boolean;
  occurredAt: string;
};
```

## Lineage requerido

Cada salida debe incluir:

- id de request;
- id de asset o fuente;
- checksum de input;
- modulos ejecutados;
- reglas o modelos usados;
- eventos padre;
- timestamp;
- transformaciones realizadas;
- incertidumbre.

Si alguna pieza falta, la salida queda `missing` o `inferred` con confidence reducida.

## Confidence requerido

`confidence` debe cumplir:

- numero finito;
- minimo `0`;
- maximo `1`;
- nunca inferido por defecto como `1`;
- reducido si falta fuente, checksum, lineage o revision humana.

## Prohibiciones

CognitiveTwin no puede:

- escribir DB directamente;
- leer DB directamente;
- usar Supabase service role;
- tocar `FieldState` canonico;
- tocar `NodeState` canonico;
- modificar `/terminal`;
- modificar APIs existentes;
- ejecutar upload productivo sin quarantine;
- publicar eventos sin idempotency key;
- producir texto en primera persona subjetiva;
- fingir conciencia o memoria viva;
- mezclar fixtures con datos vivos;
- clasificar simulaciones como observaciones.

## No primera persona subjetiva

Lenguaje prohibido:

- "yo siento";
- "yo recuerdo";
- "yo decidi";
- "mi conciencia";
- "mi deseo";
- "estoy vivo";
- "quiero intervenir".

Lenguaje permitido:

- "el modulo clasifico";
- "la salida inferida indica";
- "confidence baja";
- "lineage incompleto";
- "requiere revision humana".

## No escritura DB directa

Si reentra, CognitiveTwin debe publicar mediante un comando o evento del Observatorio:

- autenticado;
- autorizado;
- validado por schema;
- auditado;
- idempotente;
- con source descriptor;
- con payload hash.

## Criterio de rechazo automatico

La reentrada se rechaza si:

- hay import directo a DB;
- hay import a Supabase runtime;
- hay dependencia de UI;
- no hay fixtures;
- falta confidence;
- falta lineage;
- se usa primera persona subjetiva;
- no hay rollback;
- el modulo intenta operar como Evaluator antes de Fase 8.

## Decision

CognitiveTwin no reentra en FASE 7C. Queda contenido como experimental hasta cumplir estos criterios en una fase posterior.
