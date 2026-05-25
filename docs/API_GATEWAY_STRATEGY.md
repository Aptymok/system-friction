# API GATEWAY STRATEGY

Fecha: 2026-05-21  
Fase: FASE 5A - API Gateway scaffold

## Objetivo

Preparar `services/api` como gateway futuro sin reemplazar APIs Next existentes.

FASE 5A no mueve endpoints, no cambia rutas actuales y no toca `/terminal`.

## Route categories

- `command`: mutaciones autorizadas.
- `query`: lecturas autorizadas.
- `webhook`: eventos externos firmados.
- `cron`: ejecuciones de scheduler.
- `admin`: operaciones root/system.
- `health`: salud de sistema/fuentes.

## Command envelope

Todo comando futuro debe declarar:

- `kind: 'command'`;
- categoria;
- nombre de comando;
- version de contrato;
- actor/nodo cuando aplique;
- idempotency key;
- correlation id opcional;
- auth requirement;
- metadata epistemica opcional;
- payload.

## Query envelope

Toda query futura debe declarar:

- `kind: 'query'`;
- categoria;
- nombre de query;
- version de contrato;
- actor/nodo cuando aplique;
- auth requirement;
- metadata epistemica opcional;
- params.

## Error shape

Errores del gateway futuro deben usar:

- `ok: false`;
- `code`;
- `message`;
- `status`;
- `correlationId`;
- `details` opcional.

## Auth requirement marker

Los contratos distinguen:

- `none`;
- `user`;
- `service`;
- `signed-source`.

Esto no implementa auth. Solo declara el marcador requerido para fases posteriores.

## Epistemic metadata marker

Los comandos y queries pueden adjuntar:

- clase epistemica;
- confidence;
- source id;
- lineage;
- checksum;
- uncertainty.

## Estrategia de adopcion futura

1. Mantener APIs Next existentes.
2. Definir route definitions por dominio.
3. Crear handlers paralelos no productivos.
4. Validar compatibilidad con consumidores.
5. Migrar endpoints uno por uno con fallback.
6. Deprecar rutas legacy solo tras pruebas.

## No objetivos FASE 5A

- No servidor HTTP.
- No runtime productivo.
- No DB.
- No Supabase.
- No reemplazo de `/api/*`.
- No cambios en `/terminal`.

