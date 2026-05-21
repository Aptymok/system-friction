# EXPERIMENTAL QUARANTINE

Fecha: 2026-05-21  
Fase: FASE 7C - Cuarentena formal de experimental

## Objetivo

Aislar formalmente runtime kernel, agents y CognitiveTwin como experimental sin romper el repo ni mover codigo productivo.

Esta cuarentena es documental y operativa: define que componentes no pueden entrar al core hasta cumplir condiciones de reentrada.

## Alcance en cuarentena

| Familia | Ruta actual | Estado | Motivo |
| --- | --- | --- | --- |
| Runtime kernel | `src/runtime/kernel`, `src/runtime/layers` | Experimental | Mezcla planificacion, simulacion, gate y ejecucion. |
| Experimental kernel | `src/experimental/kernel`, `src/experimental/store`, `src/experimental/tools` | Experimental clausurable | Incluye self-healing/self-repair y herramientas no aptas para core. |
| Agents TS | `src/agents` | Experimental | Agentes sin contratos uniformes de IO, lineage y permisos. |
| CognitiveTwin Python | `services/python/cognitive_twin` | Experimental en cuarentena | Inferencias no probadas, uploads/archivos, simulador y DB local/Supabase opcional. |
| CognitiveTwin API shim | `src/app/api/cognitive-twin/route.ts` | Experimental | Nombre productivo, pero no invoca servicio Python y usa memoria operacional. |

## Prohibiciones generales

Los componentes en cuarentena no pueden:

- escribir DB directamente;
- importar `packages/db`;
- usar Supabase service role;
- modificar `FieldState`, `NodeState`, `LogRecord` o `SourceHealth`;
- operar como fuente de verdad del campo;
- procesar uploads productivos;
- conectarse a fuentes externas productivas;
- ejecutar self-repair o autoparcheo;
- emitir eventos sin schema versionado;
- emitir inferencias sin lineage y confidence;
- producir primera persona subjetiva;
- declarar conciencia, voluntad, deseo o identidad viva;
- presentar simulaciones como observaciones.

## Imports permitidos

Durante la cuarentena, un modulo experimental solo puede consumir contratos estables de forma read-only:

- `packages/api-contracts` para DTOs y contratos;
- `packages/events` para shape validation;
- `packages/campo-ob` para tipos canonicos si no introduce DB/UI/auth;
- fixtures declarados de testing o demo.

## Imports prohibidos

Durante la cuarentena, un modulo experimental no puede importar:

- `packages/db`;
- Supabase runtime;
- auth productivo;
- rutas Next productivas;
- componentes UI;
- endpoints API existentes;
- service role helpers.

## IO contract requerido

Todo componente que aspire a salir de cuarentena debe declarar:

```ts
type ExperimentalModuleContract = {
  moduleId: string;
  version: string;
  inputSchemaId: string;
  outputSchemaId: string;
  allowedEpistemicClasses: string[];
  readCapabilities: string[];
  writeCapabilities: string[];
  directDatabaseAccess: false;
  requiresHumanReview: boolean;
};
```

Debe tener ademas:

- schema de entrada versionado;
- schema de salida versionado;
- error shape;
- idempotency key si emite comandos;
- correlation id;
- audit event;
- fixture suite.

## Lineage requerido

Toda salida experimental debe incluir:

- fuente original;
- payload hash o checksum;
- transformaciones aplicadas;
- eventos padre;
- reglas/modelos utilizados;
- timestamp de procesamiento;
- incertidumbre declarada.

Sin lineage, la salida no puede entrar al campo.

## Confidence requerido

Toda inferencia debe incluir `confidence` numerico en rango `0..1`.

Reglas:

- `observed` requiere fuente directa verificable;
- `declared` requiere actor o sistema declarante;
- `derived` requiere formula deterministica;
- `inferred` requiere evidencia, lineage y confidence;
- `simulated` nunca puede alimentar verdad canonica;
- `missing` debe preservarse como ausencia, no completarse por narrativa.

## No primera persona subjetiva

Los modulos experimentales no pueden producir lenguaje como:

- "yo siento";
- "yo quiero";
- "recuerdo como conciencia";
- "estoy vivo";
- "decidi por mi cuenta";
- "mi intuicion".

Pueden producir lenguaje operacional:

- "el modulo detecto";
- "la inferencia sugiere";
- "confidence insuficiente";
- "requiere revision humana";
- "dato faltante".

## No escritura DB directa

Ningun modulo experimental puede escribir DB de forma directa.

Si en una fase futura se permite publicar resultados, debe hacerlo mediante:

1. API controlada del Observatorio;
2. contrato de evento;
3. authN/authZ por request;
4. idempotency key;
5. audit log;
6. source descriptor;
7. validacion de schema.

## Condiciones de reentrada

Un modulo experimental puede solicitar reentrada solo si:

- tiene contrato IO versionado;
- tiene fixtures y casos esperados;
- pasa boundary check;
- no importa DB;
- no usa service role;
- no toca UI productiva;
- no toca rutas existentes;
- produce lineage y confidence;
- etiqueta clase epistemica;
- documenta rollback;
- tiene owner domain;
- tiene revision humana cuando aplica.

## Estado de cierre

Experimental queda contenido. No queda autorizado para runtime productivo por esta fase.
