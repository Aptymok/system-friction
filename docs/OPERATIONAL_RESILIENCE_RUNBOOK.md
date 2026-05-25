# OPERATIONAL RESILIENCE RUNBOOK

Fecha: 2026-05-21  
Fase: FASE 3A - runbook documental de resiliencia operacional

## Objetivo

Definir lenguaje operativo minimo para detectar, contener, degradar y retornar a operacion sin fingir salud del sistema.

Este documento no implementa monitoreo. Define criterios para fases posteriores.

## Metricas operativas

### MTTD - Mean Time To Detect

Objetivo inicial: detectar incidentes criticos en menos de 15 minutos una vez exista observabilidad.

Fuentes futuras:

- health checks;
- API error rates;
- Supabase connectivity;
- webhook failures;
- cron job drift;
- source freshness;
- audit anomalies.

### MTTR - Mean Time To Recovery

Objetivo inicial: recuperar servicio parcial en menos de 60 minutos para incidentes de severidad alta.

La recuperacion parcial es aceptable si se declara degradacion.

### RTO - Recovery Time Objective

Objetivo inicial:

- dashboard read-only: 30 minutos;
- API principal: 60 minutos;
- ingestion externa: 4 horas;
- agent experimental: sin RTO productivo hasta salir de cuarentena.

### RPO - Recovery Point Objective

Objetivo inicial:

- event/log data: maximo 15 minutos de perdida tolerada;
- assets SFI/logbook: maximo 5 minutos de perdida tolerada;
- demo/fixtures: recreable;
- CognitiveTwin experimental: no productivo.

### BEO - Bare Essential Operation

Modo minimo aceptable del Observatorio SFI:

- usuario autenticado puede cargar NodeState basico;
- UI muestra estado `degraded` o `missing` sin inventar dato;
- logs existentes son legibles si DB responde;
- escrituras no esenciales se pausan;
- agent experimental queda deshabilitado;
- ingestion externa queda en cola o suspendida.

## Degradacion parcial

### Supabase degradado

Acciones:

1. Mostrar `SourceHealth: degraded/unavailable`.
2. Pasar UI a read-only si no hay escritura segura.
3. No aceptar eventos que no puedan auditarse.
4. Registrar incidente fuera de banda si audit DB no responde.

### Webhooks degradados

Acciones:

1. Detener procesamiento si falla verificacion.
2. Retener payload solo si hay almacenamiento seguro.
3. No reintentar sin idempotency.
4. Marcar fuente como degraded.

### Cron degradado

Acciones:

1. Pausar jobs no criticos.
2. Evitar doble ejecucion.
3. Registrar ultimo job exitoso.
4. Exponer drift como SourceHealth.

### UI degradada

Acciones:

1. Mostrar estado degradado.
2. No calcular verdad local para reemplazar API.
3. Permitir lectura de cache solo marcada como cache.
4. Deshabilitar comandos de escritura si no hay policy/API.

### Agent degradado

Acciones:

1. Deshabilitar propuestas automaticas.
2. Mantener inferencias fuera del campo.
3. No ejecutar self-healing.
4. No publicar simulaciones como estado.

## Retorno a operacion

Checklist:

1. Fuente primaria vuelve a responder.
2. AuthN/AuthZ operan por request.
3. No hay backlog duplicado sin idempotency.
4. Audit logs vuelven a escribirse.
5. SourceHealth pasa de `degraded` a `healthy` con timestamp.
6. Se reconcilian eventos pendientes.
7. Se documenta causa, impacto, MTTR y gaps.

## Severidades

| Severidad | Descripcion | Respuesta |
|---|---|---|
| SEV-1 | Riesgo de datos, secretos, cross-tenant o service role. | Contencion inmediata, rotacion si aplica, read-only. |
| SEV-2 | API principal o DB degradada. | BEO, incident owner, update cada 30 min. |
| SEV-3 | Fuente externa/webhook/cron degradado. | Pausar ingestion, marcar SourceHealth. |
| SEV-4 | UI/demo/experimental afectado. | Comunicar degradacion, no afectar core. |

## Regla de resiliencia

Si el sistema no puede verificar, debe declarar `missing` o `degraded`. Nunca debe inventar continuidad operacional.

