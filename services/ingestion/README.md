# services/ingestion

Servicio de ingesta de fuentes externas.

Responsabilidad declarada:
- recibir datos externos como `SourceEvent`;
- normalizar fuente, firma, timestamp, hash e idempotencia;
- publicar eventos hacia `services/api` o cola futura.

Limites:
- no conecta fuentes externas durante FASE 2A;
- no escribe directo en base de datos;
- no declara datos vivos sin medicion;
- no comparte handlers con comandos internos.

