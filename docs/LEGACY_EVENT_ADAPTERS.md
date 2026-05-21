# LEGACY EVENT ADAPTERS

Fecha: 2026-05-21  
Fase: FASE 4B - adaptador de eventos existente

## Objetivo

Definir adaptadores puros para mapear filas legacy hacia contratos canonicos sin modificar DB, sin escribir tablas y sin tocar APIs existentes.

## Alcance

Se crean adaptadores para:

- `cognitive_event_stream` -> `SFIEvent`
- `sfi_logbook` -> `LogRecord`

## Reglas

- Los adaptadores aceptan `unknown`.
- Validan forma minima antes de mapear.
- No conectan DB.
- No importan Supabase.
- No modifican migraciones.
- No escriben eventos.

## Forma minima legacy

Una fila legacy valida debe tener:

- `id` string;
- `created_at` string;
- `event_name` string para `cognitive_event_stream`, o
- `event_type` string para `sfi_logbook`.

## Mapeo cognitive_event_stream

Campos usados:

- `id` -> `eventId`
- `event_name` -> `eventName`
- `payload` -> `payload`
- `created_at` -> `occurredAt`
- `emitted_by` -> `source.sourceId`
- `stream_type` -> `source.sourceType`
- `payload.sourceState` o `payload.epistemicClass` -> `epistemicClass`
- `payload.confidence` -> `confidence`
- `payload.checksum` o `payload.hash` -> `checksum`
- `payload.lineage` o `payload.inference_chain` -> `lineage`

## Mapeo sfi_logbook

Campos usados:

- `id` -> `id`
- `node_id` o `payload.node_id` -> `nodeId`
- `asset_id` -> `logbookId`
- `event_type` -> `eventName`
- `hash` o `payload.hash` -> `payloadHash`
- `created_at` -> `createdAt`
- `updated_at` o `created_at` -> `updatedAt`
- `payload.sourceState` -> `sourceState`
- `payload.evidenceLevel` -> `evidenceLevel`
- `payload.confidence` -> `confidence`

## Defaults conservadores

- Si no hay `sourceState`, se usa `declared`.
- Si no hay `evidenceLevel`, se usa `none`.
- Si no hay `confidence`, se usa un valor conservador segun clase epistemica.
- Si `sfi_logbook` no incluye `node_id`, el adaptador usa `unknown`.
- Si no hay hash, `payloadHash` queda como `missing`.

Estos defaults son de compatibilidad, no sustituyen una migracion real.

