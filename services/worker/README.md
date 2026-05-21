# services/worker

Servicio de jobs, recompute, degradacion y health checks.

Responsabilidad declarada:
- ejecutar trabajos internos autorizados;
- recalcular estados derivados cuando exista contrato;
- reportar `SourceHealth` y degradacion operacional.

Limites:
- no crea cron productivo durante FASE 2A;
- no ejecuta mutaciones sin idempotencia;
- no reemplaza rutas cron actuales;
- no implementa self-healing.

