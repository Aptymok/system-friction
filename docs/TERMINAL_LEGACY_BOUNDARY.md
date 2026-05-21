# TERMINAL LEGACY BOUNDARY

Fecha: 2026-05-21  
Fase: FASE 5C - Terminal legacy boundary

## Objetivo

Gobernar `/terminal` actual como interfaz legacy en transicion, sin modificar su UI, rutas, runtime ni componentes.

`/terminal` sigue siendo una superficie viva de campo, pero debe entenderse como consumidor de estados canonicos, no como productor de verdad del campo.

## Estado actual

Ruta:

- `src/app/(terminal)/terminal/page.tsx`

Componentes y estado relacionados:

- `src/observatory/components/field/SfiFieldShell.tsx`
- `src/observatory/store/nodeStore.ts`
- `src/observatory/store/pulseEngine.ts`
- `src/observatory/hooks/useTelemetryPulse.ts`

## Que puede hacer `/terminal`

`/terminal` puede:

- renderizar la experiencia de campo actual;
- consumir `node/bootstrap` mientras no exista reemplazo compatible;
- mostrar estado local como `local_only` cuando no hay persistencia remota;
- enviar comandos existentes a APIs actuales durante la transicion;
- mostrar bitacoras, assets, drafts, lecturas y salud operacional;
- actuar como consola de interaccion mientras se construye `apps/observatory`.

## Que debe dejar de hacer

`/terminal` debe dejar de:

- calcular verdad canonica del campo desde cliente;
- tratar localStorage como memoria longitudinal confiable;
- mezclar UI con persistencia directa;
- depender de un multiplexor unico como `/api/field/persist`;
- presentar simulaciones, pulsos locales o estimaciones como observaciones reales;
- emitir eventos sin idempotency key y contrato versionado;
- mezclar command dispatch, field calculations y rendering en el mismo componente.

## Estados que no puede calcular

`/terminal` no puede calcular de forma canonica:

- `FieldState`;
- `NodeState`;
- `FieldRegime`;
- `FieldMetricSet`;
- `operationalCapacity`;
- `degradation`;
- `SourceHealth`;
- `LogRecord` canonico;
- clase epistemica (`observed`, `declared`, `derived`, `inferred`, `simulated`, `fixture`, `missing`) como verdad final;
- confidence canonica.

Puede mostrar aproximaciones locales solo si se etiquetan como:

- `local_only`;
- `visual_estimate`;
- `cache`;
- `simulated`;
- `missing`.

## Migracion hacia FieldState consumer

### Fase 1 - Frontera documental

Estado actual: FASE 5C.

- Documentar `/terminal` como legacy/interface consumer.
- No modificar UI.
- No mover ruta.

### Fase 2 - Adapter read-only

Crear un adapter que traduzca la respuesta legacy de `node/bootstrap` hacia:

- `FieldStateDTO`;
- `NodeStateDTO`;
- `LogEntryDTO`;
- `SourceHealthDTO`.

Este adapter debe vivir fuera de componentes visuales.

### Fase 3 - Desacoplar metricas locales

Mover o degradar:

- `pulseEngine`;
- `useTelemetryPulse`;
- `nodeStore.metrics`.

Resultado esperado:

- la UI puede animar o mostrar estado visual;
- la verdad canonica viene de API/contracts.

### Fase 4 - Separar persistencia

Reemplazar llamadas a `/api/field/persist` por comandos pequenos definidos en:

- `field-events`;
- `logbook-events`;
- `worldspect-snapshots`;
- `media-drafts`;
- `social-returns`;
- `runtime-status`;
- `source-health`;
- `command-audit`.

### Fase 5 - Consumidor puro

`/terminal` queda como consumidor de:

- `FieldState`;
- `NodeState`;
- `Logs`;
- `SourceHealth`.

En ese punto, puede convivir con `apps/observatory` o ser absorbido como vista interna.

## Componentes que deben aislarse

### `pulseEngine`

Ruta:

- `src/observatory/store/pulseEngine.ts`

Problema:

- calcula efectos sobre metricas en cliente.

Destino:

- mover formulas autorizadas a Field Core, o
- degradar a animacion/estimacion visual no canonica.

### `useTelemetryPulse`

Ruta:

- `src/observatory/hooks/useTelemetryPulse.ts`

Problema:

- genera pulsos periodicos y altera estado local.

Destino:

- reemplazar por polling/read-only refresh, o
- marcar como heartbeat visual.

### `nodeStore metrics`

Ruta:

- `src/observatory/store/nodeStore.ts`

Problema:

- mezcla bootstrap remoto, logs locales, snapshots localStorage y metricas.

Destino:

- separar view model de cache;
- consumir `FieldStateDTO` y `NodeStateDTO`;
- impedir que localStorage sea fuente canonica.

### `SfiFieldShell persistence calls`

Ruta:

- `src/observatory/components/field/SfiFieldShell.tsx`

Problema:

- componente visual dispara persistencias y comandos de multiples dominios.

Destino:

- extraer command client;
- usar comandos pequenos;
- mantener componente como renderizador/controlador de UI.

## Adapter spec

Nombre propuesto:

```ts
TerminalLegacyAdapter
```

Entrada:

```ts
type TerminalLegacyBootstrapInput = unknown;
```

Salida:

```ts
type TerminalCanonicalReadModel = {
  fieldState: FieldStateDTO | null;
  nodeState: NodeStateDTO | null;
  logs: LogEntryDTO[];
  sourceHealth: SourceHealthDTO[];
  warnings: string[];
};
```

Reglas:

- no escribe DB;
- no llama APIs;
- no lee localStorage;
- no calcula regimen;
- no inventa source health;
- si falta dato, retorna `null`, `[]` o warning.

## Regla de frontera

`/terminal` puede seguir existiendo como experiencia. No puede seguir siendo autoridad de verdad.
