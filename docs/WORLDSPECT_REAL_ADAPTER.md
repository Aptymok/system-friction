# WORLDSPECT REAL ADAPTER

Fecha: 2026-05-21  
Fase: FASE 14A - WorldSpect real adapter

## Objetivo

Conectar `services/python/world_cli.py` como fuente real medida para WorldSpect sin tocar `/terminal`, sin escribir DB y sin modificar `field/persist`.

## Componentes

Adapter:

- `src/lib/worldspect/runWorldSpectrum.ts`

Endpoint:

- `GET /api/worldspect/real`
- `src/app/api/worldspect/real/route.ts`

Fuentes Python:

- `services/python/world_spectrum.py`
- `services/python/world_cli.py`

## Flujo

1. `GET /api/worldspect/real` invoca `runWorldSpectrum()`.
2. `runWorldSpectrum()` ejecuta Python con `child_process.spawn`.
3. El proceso llama `services/python/world_cli.py`.
4. El adapter parsea JSON.
5. El endpoint devuelve `ApiResult`.
6. Si Python falla, hay timeout o JSON invalido, la respuesta queda degradada.

## Timeout

El adapter usa timeout de 15 segundos.

Si expira:

- mata el proceso;
- no devuelve error crudo;
- retorna payload degradado;
- no inventa fuentes;
- no inventa `wsi` ni `nti`.

## Datos conservados

El adapter conserva:

- `sources`;
- `wsi`;
- `nti`;
- `ts`;
- `degraded_sources`.

## Source state

`sourceState` puede ser:

- `observed`: Python respondio con fuentes reales, no simuladas y sin degradacion.
- `degraded`: Python fallo, respondio parcialmente, incluyo fuentes simuladas/degradadas o no produjo metricas suficientes.

## Evidence level

`evidenceLevel` es `direct` porque el adapter consume directamente una medicion externa ejecutada en el momento del request.

## Confidence

La confidence se calcula desde:

- cobertura de fuentes reales no simuladas;
- presencia de `wsi` y `nti`;
- penalizacion por `degraded_sources`.

Si no hay fuentes reales, confidence es `0`.

## SourceHealthDTO

Cada fuente se mapea a `SourceHealthDTO`:

- fuente real con valor: `healthy`;
- fuente simulada o con error: `degraded`;
- fuente sin valor: `unavailable`;
- `kind: public-api`;
- `message: source_unavailable` si hay error.

Los errores originales de Python o de fuentes externas no se exponen.

## FieldState

FASE 14A no escribe `FieldState` canonico.

El endpoint devuelve `fieldStateSignal` como input observable para un futuro Field Core:

- `sourceState`;
- `evidenceLevel`;
- `confidence`;
- `metrics.wsi`;
- `metrics.nti`;
- `observedAt`;
- `sourceIds`.

Si faltan `wsi` o `nti`, `fieldStateSignal` es `null`.

## Prohibiciones respetadas

- No usa `createKernelRoute`.
- No toca `/terminal`.
- No toca `field/persist`.
- No toca Supabase runtime.
- No escribe DB.
- No cambia schema DB.
- No presenta dato vivo si Python falla.
