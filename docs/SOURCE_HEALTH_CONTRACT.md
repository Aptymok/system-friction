# SOURCE HEALTH CONTRACT

Fecha: 2026-05-21  
Fase: FASE 3C - SourceHealth + Integration contracts

## Objetivo

Definir contratos de fuentes, eventos de integracion y salud de fuente sin conectar fuentes reales.

Este documento no implementa webhooks, cron ni ingestion externa.

## SourceKind

Tipos declarados:

- `webhook`: evento entrante firmado o verificable.
- `oauth`: fuente conectada por autorizacion de usuario.
- `manual`: captura manual declarada.
- `cron`: ejecucion de scheduler.
- `fixture`: dato de prueba o demo.
- `public-api`: API publica leida por integracion.

## SourceStatus

- `healthy`: fuente disponible y fresca segun contrato.
- `degraded`: fuente responde pero falta firma, freshness o calidad suficiente.
- `unavailable`: fuente no disponible.
- `unknown`: no hay suficiente informacion para clasificar.

## SourceDescriptor

Describe la fuente sin conectarla:

- `sourceId`
- `kind`
- `displayName`
- `readOnly`
- `requiresSignature`
- `owner`
- `expectedFreshnessSeconds`

## SourceHealth

Estado operacional de una fuente:

- `sourceId`
- `status`
- `checkedAt`
- `lastObservedAt`
- `confidence`
- `reason`

La salud de fuente no equivale a verdad del campo. Solo describe disponibilidad/calidad de la fuente.

## SourceEventEnvelope

Envelope de evento externo antes de convertirse en evento SFI:

- `envelopeId`
- `source`
- `receivedAt`
- `occurredAt`
- `payloadHash`
- `payload`
- `signatureVerified`
- `idempotencyKey`

## classifySourceHealth

Funcion pura que clasifica salud de fuente segun:

- disponibilidad (`reachable`);
- firma requerida/verificada;
- timestamp de observacion;
- ventana de freshness.

No llama red. No lee DB. No persiste.

## IntegrationEventDTO

Contrato para exponer eventos de integracion desde API:

- version de contrato;
- id de evento;
- fuente;
- tipo de fuente;
- nombre de evento;
- timestamps;
- hash de payload;
- estado de firma;
- idempotency key opcional.

## Reglas

- Una fuente `unknown` o `degraded` no debe presentarse como dato vivo.
- Una firma faltante degrada la fuente si era requerida.
- Una fuente no reachable es `unavailable`.
- Fixtures siempre deben ser visibles como fixtures.
- Los datos de integration no escriben FieldState directamente.

