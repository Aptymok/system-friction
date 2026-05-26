# Supabase Deduplication Notes

Estas consultas son de auditoria. No ejecutan borrado automatico.

## `social_posts`

Detectar publicaciones manuales duplicadas por proveedor y `external_post_id`:

```sql
select
  provider,
  external_post_id,
  count(*) as total,
  array_agg(id order by created_at asc) as ids
from social_posts
where external_post_id is not null
group by provider, external_post_id
having count(*) > 1;
```

Detectar publicaciones manuales duplicadas por URL capturada:

```sql
select
  provider,
  engagement_metrics -> '_metadata' ->> 'postUrl' as post_url,
  count(*) as total,
  array_agg(id order by created_at asc) as ids
from social_posts
where engagement_metrics -> '_metadata' ->> 'postUrl' is not null
group by provider, engagement_metrics -> '_metadata' ->> 'postUrl'
having count(*) > 1;
```

## `social_resonance_events`

Detectar retornos duplicados por plataforma, post y `capturedAt`:

```sql
select
  platform,
  post_id,
  raw_payload ->> 'capturedAt' as captured_at,
  count(*) as total,
  array_agg(id order by created_at asc) as ids
from social_resonance_events
where raw_payload ->> 'capturedAt' is not null
group by platform, post_id, raw_payload ->> 'capturedAt'
having count(*) > 1;
```

## `cognitive_event_stream`

Revisar repeticion de eventos por nombre y payload:

```sql
select
  event_name,
  md5(payload::text) as payload_hash,
  count(*) as total,
  min(created_at) as first_seen,
  max(created_at) as last_seen
from cognitive_event_stream
where created_at > now() - interval '1 day'
group by event_name, md5(payload::text)
having count(*) > 1
order by total desc, last_seen desc;
```

## Politica de limpieza

Si se decide limpiar duplicados historicos, conservar el registro mas antiguo y mover cualquier evidencia asociada antes de borrar.

No borrar automaticamente desde la aplicacion.
