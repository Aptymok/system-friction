# Supabase Persistence Mapping

Esta capa conecta el Campo Operativo con tablas existentes. No crea tablas nuevas.

## cognitive_event_stream

Uso: eventos del campo.

Eventos origen:

- PATTERN_RANKED
- PATTERN_DETECTED
- GRAPH_VECTOR_STATE_UPDATED
- MIHM_ACTIVATED
- WORLD_SPECT_TRIGGER_DETECTED
- WORLD_SPECT_READING_TRIGGERED
- OBSERVATION_WINDOW_SUGGESTED
- ROUTE_SUGGESTED
- SOCIAL_DRAFT_CREATED
- SOCIAL_DRAFT_MIHM_REVIEWED
- SOCIAL_DRAFT_WORLDSPECT_REVIEWED
- SOCIAL_DRAFT_CONTENT_APPROVED
- SOCIAL_DRAFT_CONFIRMATION_REQUIRED
- SOCIAL_DRAFT_ARCHIVED

Mapeo:

- `stream_type = field`
- `event_name = event_type`
- `payload = trace_payload + visible message`
- `emitted_by = SFI_FIELD`
- `node_id = node_id si existe`
- `created_at = now()`

## sfi_logbook

Uso: bitacora por asset activo.

Mapeo:

- `asset_id = activeAsset.asset_id`
- `event_type = event_type`
- `payload = trace_payload + visible message`
- `created_by = auth.uid()`
- `hash = hash opcional del adaptador`

Si no hay asset activo, queda solo como evento local/campo.

## world_spectrum_snapshots

Uso: lecturas WorldSpect reales medidas.

Mapeo:

- `node_id = active node`
- `user_id = auth.uid()`
- `ihg = wsi`
- `nti = nti`
- `ldi = ldi || 0`
- `payload = WorldSpect completo`
- `observed_at = payload.ts`

En la fase actual WorldSpect es `WORLDSPECT_LOCAL`; si no hay `wsi/nti/sources`, no se guarda snapshot medido. Solo se registra evento en `cognitive_event_stream`.

## media_drafts

Uso: SocialDraft.

Mapeo:

- `node_id = active node`
- `source_type = field`
- `source_id = draft id si es UUID`
- `platform_target = draft.network`
- `content = draft.text`
- `status`:
  - DRAFT / MIHM_REVIEWED / WORLDSPECT_REVIEWED / POST_CONFIRMATION_REQUIRED -> `pending_human_validation`
  - CONTENT_APPROVED -> `approved`
  - ARCHIVED -> `rejected`
- `metadata`:
  - draftId
  - objective
  - fieldMode
  - primaryPatternId
  - secondaryPatternIds
  - sourceDescriptor
  - mihmReview
  - worldSpectReview
  - contentHash
  - approvals

## social_posts

Uso: publicacion futura o post manual registrado.

En esta fase no se crea publicacion automatica.

Post manual:

- `status = published`
- `published_at = postedAt`
- `provider = network`
- `content = text`
- `external_post_id = si existe`
- `engagement_metrics = {}`

Si no existe columna `metadata`, la metadata se anida dentro de `engagement_metrics._metadata`.

## social_resonance_events

Uso: retorno real de plataforma.

No se usa en este checkpoint salvo que existan metricas reales. No se simula retorno.

## Pendiente

- Persistir snapshots WorldSpect externos cuando exista fuente/API externa real.
- Registrar `SOCIAL_RETURN` solo al capturar metricas reales.
