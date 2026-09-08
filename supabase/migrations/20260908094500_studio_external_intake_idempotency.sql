-- SFI-CHATGPT-STUDIO-ATTACHMENT-IDEMPOTENCY-1.0
-- Reuses studio_objects as the canonical owner. No second intake table is created.
-- One ChatGPT file id may materialize at most once per Studio owner.

create unique index if not exists studio_objects_owner_external_intake_file_uidx
on public.studio_objects (
  owner_id,
  (metadata #>> '{externalIntake,openaiFileId}')
)
where metadata #>> '{externalIntake,openaiFileId}' is not null;

comment on index public.studio_objects_owner_external_intake_file_uidx is
  'Owner-scoped idempotency key for ChatGPT Studio attachment intake; prevents retry/concurrency duplicate materialization.';
