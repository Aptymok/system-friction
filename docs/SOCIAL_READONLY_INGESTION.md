# Social Read-Only Ingestion

Objetivo: leer metricas reales de redes conectadas sin publicar.

No se activa OAuth write. No se publican posts. No se simulan metricas.

## Proveedores por fase

### Fase 1

- X read-only si existen credenciales/token de usuario con scopes de lectura.
- LinkedIn read-only si existen credenciales/token de usuario con scopes de lectura.

No se promete disponibilidad si el usuario no conecto token o el proveedor no entrega permisos.

### Fase 2

- Instagram / Facebook via Meta Graph.
- YouTube si aplica.

## Tablas existentes

- `social_tokens`: token OAuth por usuario/proveedor.
- `telemetry_sources`: estado de fuente conectada.
- `external_signals`: posts o elementos leidos.
- `social_resonance_events`: retorno con metricas reales.
- `cognitive_event_stream`: evento `SOCIAL_RETURN_CAPTURED`.
- `sfi_logbook`: bitacora por asset si hay asset activo.

## Regla de fuente

`SOCIAL_RETURN` solo existe si viene de:

- API real read-only; o
- captura manual explicita del usuario.

Todo fallo de token devuelve `missing_token`.
Todo fallo del proveedor devuelve `provider_error`.

## Escritura social

`assertSocialWriteDisabled()` bloquea cualquier intento de publicar:

```txt
canPublish: false
reason: "OAuth write no habilitado."
```
