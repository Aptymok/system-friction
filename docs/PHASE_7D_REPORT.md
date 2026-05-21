# PHASE 7D REPORT

Fecha: 2026-05-21  
Agente: SFI Command Split Agent  
Fase: FASE 7D - Field persist split parte 1

## Command elegido

`field-events`

## Nuevo handler paralelo

- `src/app/api/field/events/route.ts`

## Archivos creados

- `src/app/api/field/events/route.ts`
- `docs/PHASE_7D_REPORT.md`

## Archivos modificados

- Ninguno.

## Alcance

Se agrego un handler paralelo para `field-events.create` sin eliminar ni modificar `/api/field/persist`.

El handler incluye:

- schema manual mediante `parseFieldEventCommand`;
- auth guard existente mediante `ensureOwnedNode`;
- `idempotencyKey` obligatorio;
- deduplicacion por `payload->>idempotencyKey`;
- respuesta `ApiResult`;
- evento trazable en `cognitive_event_stream`;
- `payloadHash`;
- `correlationId` opcional.

## Request esperado

```json
{
  "command": "field-events.create",
  "contractVersion": "field-events.v1",
  "idempotencyKey": "field-node-event-payload",
  "node_id": "node-id",
  "event_type": "FIELD_EVENT_RECORDED",
  "message": "optional message",
  "trace_payload": {},
  "correlationId": "optional-correlation-id"
}
```

## Response esperado

Exito:

```json
{
  "ok": true,
  "data": {
    "event": {},
    "duplicate": false
  },
  "traceId": "field-node-event-payload"
}
```

Error:

```json
{
  "ok": false,
  "error": "invalid_field_event_command",
  "details": {}
}
```

## Validacion

Comandos ejecutados:

```bash
npm run typecheck
npm run check:boundaries
npm run build
```

Resultados:

- `npm run typecheck`: exitoso. `tsc --noEmit --pretty false --incremental false` finalizo con exit code 0.
- `npm run check:boundaries`: exitoso. `Domain boundary check passed.`
- `npm run build`: exitoso. Next.js compilo y registro `/api/field/events` junto a `/api/field/persist`.

Manual route check:

```bash
curl -i -X POST http://127.0.0.1:3022/api/field/events \
  -H "Content-Type: application/json" \
  --data "{}"
```

Resultado: `400 Bad Request` con `ApiResult`:

```json
{
  "ok": false,
  "error": "invalid_field_event_command",
  "details": {
    "expectedCommand": "field-events.create",
    "expectedContractVersion": "field-events.v1"
  }
}
```

Nota: el check manual uso payload invalido para verificar schema y respuesta sin requerir sesion ni escribir DB.

## Confirmaciones

- No se elimino `field/persist`.
- No se modifico `field/persist`.
- No se cambiaron clientes existentes.
- No se modifico `/terminal`.
- No se modifico `SfiFieldShell`.
- No se modifico `nodeStore`.
- No se modifico `createKernelRoute`.
- No se modifico CognitiveTwin.
- No se modifico Supabase runtime.
