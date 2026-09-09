insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sfi-case-assets',
  'sfi-case-assets',
  false,
  20971520,
  array['application/pdf','image/png','image/jpeg']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Intentionally no authenticated storage.objects policy is created for this bucket.
-- Private case assets are read/written through ROOT-gated server/service-role paths only.
