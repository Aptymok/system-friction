# Supabase Coverage Report

## Alcance
Verificación de la cobertura Supabase para las siguientes tablas:
- `sfi_evidence_ledger`
- `sfi_moph_sessions`
- `sfi_phenomena`
- `scorefriction_observations`
- `scorefriction_vectors`
- `scorefriction_proto_attractors`
- `scorefriction_proposal_verifications`
- `worldspect_snapshots`

Se revisaron las migraciones en `supabase/migrations/`, las referencias de código en `src/`, y las políticas/RLS presentes en los scripts disponibles.

## Resumen
- Todas las tablas solicitadas están definidas en migraciones existentes.
- Las tablas `scorefriction_observations` y `scorefriction_vectors` tienen un único archivo de creación de esquema común y `scorefriction_observations` recibe una migración de índice/columna adicional.
- `worldspect_snapshots` es la única tabla del conjunto con RLS explícito y política de lectura de usuarios autenticados en las migraciones revisadas.
- Las demás tablas no presentan habilitación de RLS ni políticas explícitas en los archivos `supabase/migrations/*.sql` actuales.

## Tabla por tabla

### `sfi_evidence_ledger`
- Migración: `supabase/migrations/20260610000100_sfi_final_convergence_core.sql`
- Definición: tabla creada con campos de evidencia, `module`, `case_id`, `evidence_hash` y timestamps.
- Índices
  - `sfi_evidence_ledger_module_idx` sobre `module`
  - `sfi_evidence_ledger_case_idx` sobre `case_id`
  - `sfi_evidence_ledger_hash_idx` sobre `evidence_hash`
- Políticas/RLS: no se encontró `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` ni `CREATE POLICY` para esta tabla en las migraciones revisadas.
- Uso de lectura/escritura
  - Escritura: `src/app/api/sfi/evidence/route.ts` inserta en `sfi_evidence_ledger`.
  - Lectura: flujo de ingestión ScoreFriction y otros componentes pueden consultar la tabla indirectamente, pero no se encontró lectura explícita en el alcance de esta auditoría.

### `sfi_moph_sessions`
- Migración: `supabase/migrations/20260610000100_sfi_final_convergence_core.sql`
- Definición: tabla creada con `session_key`, `consent_state`, trazas, métricas y resumen público.
- Índices: ningún índice adicional específico definido en esa migración.
- Políticas/RLS: no se encontró RLS ni políticas explícitas.
- Uso de lectura/escritura
  - Escritura: `src/lib/moph/session-store.ts` usa `service.from('sfi_moph_sessions').upsert(...)`.
  - Lectura: `src/lib/moph/session-store.ts` usa `service.from('sfi_moph_sessions').select('*').eq('session_key', sessionKey)`.
  - Fallback: si Supabase falla, la implementación recurre a almacenamiento en memoria.

### `sfi_phenomena`
- Migración: `supabase/migrations/20260610000100_sfi_final_convergence_core.sql`
- Definición: tabla creada con `phenomenon_key`, `module`, `regime`, métricas y vectores.
- Índices
  - `sfi_phenomena_module_idx` sobre `module`
  - `sfi_phenomena_regime_idx` sobre `regime`
  - `sfi_phenomena_density_idx` sobre `density desc`
- Políticas/RLS: no se encontró RLS ni políticas explícitas.
- Uso de lectura/escritura
  - Escritura: `src/lib/phenomena/phenomenon-engine.ts` realiza `upsert(...)` en `sfi_phenomena`.
  - Lectura: `src/lib/phenomena/phenomenon-engine.ts` consulta `sfi_phenomena` para listar fenómenos.
  - Fallback: si Supabase falla, se usa almacenamiento en memoria.

### `scorefriction_observations`
- Migración: `supabase/migrations/20260602120000_create_scorefriction_cultural_wave.sql`
- Upgrade: `supabase/migrations/20260602153000_scorefriction_evidence_ingestion_upgrade.sql`
- Definición: tabla creada con `case_id`, `source_name`, `territory`, `raw_payload`, `normalized_payload`, `evidence_hash`, `created_at`.
- Índices agregados en upgrade
  - `scorefriction_observations_evidence_type_idx` sobre `evidence_type`
  - `scorefriction_observations_case_type_created_idx` sobre `(case_id, evidence_type, created_at desc)`
- Políticas/RLS: no se encontró RLS ni políticas explícitas.
- Uso de lectura/escritura
  - Escritura: `src/lib/scorefriction/intake.ts` inserta registros de observación.
  - Lectura: `src/lib/scorefriction/proto-attractors.ts` y `src/lib/scorefriction/store.ts` consultan observaciones.

### `scorefriction_vectors`
- Migración: `supabase/migrations/20260602120000_create_scorefriction_cultural_wave.sql`
- Definición: tabla creada con `observation_id` FK a `scorefriction_observations(id)` y vectores JSON.
- Índices: no se definieron índices adicionales específicos en la migración.
- Políticas/RLS: no se encontró RLS ni políticas explícitas.
- Uso de lectura/escritura
  - Escritura: `src/lib/scorefriction/intake.ts` inserta vectores.
  - Lectura: `src/lib/scorefriction/proto-attractors.ts` consulta vectores asociados a observaciones.

### `scorefriction_proto_attractors`
- Migración: `supabase/migrations/20260609090000_create_scorefriction_proto_attractors.sql`
- Definición: tabla creada con `case_id`, `name`, métricas de confianza/densidad/persistencia, estado, vectores de soporte y snapshots.
- Índices
  - `scorefriction_proto_attractors_case_idx` sobre `(case_id, updated_at desc)`
  - `scorefriction_proto_attractors_status_idx` sobre `(status, updated_at desc)`
- Políticas/RLS: no se encontró RLS ni políticas explícitas.
- Uso de lectura/escritura
  - Escritura: `src/lib/scorefriction/proto-attractors.ts` hace `upsert(...)` en la tabla.
  - Lectura: `src/lib/scorefriction/proto-attractors.ts` y `src/lib/scorefriction/cultural-twin.ts` consultan proto-atractores.

### `scorefriction_proposal_verifications`
- Migración: `supabase/migrations/20260609093000_create_scorefriction_proposal_verifications.sql`
- Definición: tabla creada con `proposal_id`, `case_id`, `actual_result`, `delta`, `verified`, `confidence`, `verified_at`.
- Índices
  - `scorefriction_proposal_verifications_case_idx` sobre `(case_id, verified_at desc)`
  - `scorefriction_proposal_verifications_proposal_idx` sobre `(proposal_id, verified_at desc)`
- Políticas/RLS: no se encontró RLS ni políticas explícitas.
- Uso de lectura/escritura
  - Escritura/Lectura: `src/lib/scorefriction/verification-engine.ts` consulta y maneja verificaciones.

### `worldspect_snapshots`
- Migración: `supabase/migrations/20260525073000_create_worldspect_snapshots.sql`
- Definición: tabla creada con `observed_at`, `source_state`, `confidence`, `degraded_sources`, `sources`, `source_health`, `raw_payload`, `adapter_status`, `ingest_mode`, `snapshot_hash`, y `unique_date`.
- Índices
  - `worldspect_snapshots_unique_daily` sobre `(unique_date, ingest_mode)`
  - `worldspect_snapshots_observed_at_idx` sobre `(observed_at desc)`
  - `worldspect_snapshots_source_state_idx` sobre `(source_state)`
  - `worldspect_snapshots_degraded_sources_idx` usando GIN en `degraded_sources`
- Políticas/RLS
  - `ALTER TABLE public.worldspect_snapshots ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY "worldspect snapshots are readable by authenticated users" ON public.worldspect_snapshots FOR SELECT TO authenticated USING (true);`
- Uso de lectura/escritura
  - Escritura: `src/lib/worldspect/snapshotStore.ts` upserta snapshots con `service.from('worldspect_snapshots').upsert(...)`.
  - Lectura: `src/lib/worldspect/snapshotStore.ts` y `src/lib/scorefriction/proto-attractors.ts` seleccionan la fila más reciente.

## Conclusión
- Todas las tablas existen físicamente en el conjunto de migraciones revisado.
- `worldspect_snapshots` es la única tabla con RLS y política declarada en los scripts revisados.
- Las otras tablas no muestran evidencia de políticas de acceso en `supabase/migrations/*.sql`; si el sistema depende de acceso autenticado directo o RLS para ellas, deberán agregarse explícitamente.
- En el repositorio, las operaciones de lectura y escritura están implementadas en `src/` para todas las tablas, y varios servicios ya dependen de ellas.
