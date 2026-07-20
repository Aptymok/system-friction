-- Phenomenon Identity Layer — Evidence Graph (aditivo, no destructivo)
--
-- Esta migración NO modifica ppoi_evidence, ppoi_phenomena ni ppoi_hypotheses.
-- El vínculo original evidence -> phenomenon_id (obligatorio, 1:1) sigue
-- siendo el "dueño primario" de la evidencia, exactamente como hoy.
--
-- Lo único que agrega es una tabla puente para vínculos ADICIONALES:
-- una evidencia puede, además de su fenómeno dueño, quedar relacionada
-- con otros fenómenos (ej. un Medium de REM618 sirve como evidencia
-- tanto del fenómeno musical como del cultural). Estos vínculos son
-- puramente de lectura/contexto: NO participan en el cálculo de
-- calibration.ts (PT/PM/IE/RC/CG/ES/LT/IO), que sigue leyendo
-- exclusivamente por phenomenon_id como hasta ahora. Si más adelante
-- se decide que la calibración también debe considerar evidencia
-- vinculada, es una decisión aparte y explícita, no un efecto lateral
-- de esta migración.

create table if not exists public.ppoi_evidence_links (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.ppoi_evidence(id) on delete cascade,
  phenomenon_id uuid not null references public.ppoi_phenomena(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  relation_type text not null default 'RELATED' check (relation_type in ('RELATED', 'SHARED_ORIGIN', 'CROSS_DOMAIN')),
  note text,
  created_at timestamptz not null default now(),
  unique (evidence_id, phenomenon_id)
);

create index if not exists ppoi_evidence_links_evidence_idx on public.ppoi_evidence_links(evidence_id);
create index if not exists ppoi_evidence_links_phenomenon_idx on public.ppoi_evidence_links(phenomenon_id, created_at desc);
create index if not exists ppoi_evidence_links_owner_idx on public.ppoi_evidence_links(owner_id, created_at desc);

alter table public.ppoi_evidence_links enable row level security;

drop policy if exists ppoi_evidence_links_owner_select on public.ppoi_evidence_links;
create policy ppoi_evidence_links_owner_select on public.ppoi_evidence_links for select to authenticated using (owner_id = auth.uid());

drop policy if exists ppoi_evidence_links_owner_insert on public.ppoi_evidence_links;
create policy ppoi_evidence_links_owner_insert on public.ppoi_evidence_links for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists ppoi_evidence_links_owner_delete on public.ppoi_evidence_links;
create policy ppoi_evidence_links_owner_delete on public.ppoi_evidence_links for delete to authenticated using (owner_id = auth.uid());
