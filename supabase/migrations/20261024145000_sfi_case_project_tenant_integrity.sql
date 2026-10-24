-- SFI Case Platform: project and case MUST belong to the same tenant.
-- Safe additive release candidate; NOT applied to production by CI.
-- Composite FK uses MATCH SIMPLE: project_id=NULL remains an unlinked case.
-- NOT VALID permits pre-existing legacy rows to be reviewed before VALIDATE.
create unique index if not exists sfi_projects_tenant_id_id_unique
  on public.sfi_projects(tenant_id,id);

do $sfi_project_tenant_integrity$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.sfi_cases'::regclass
      and conname='sfi_cases_project_tenant_fk'
  ) then
    alter table public.sfi_cases
      add constraint sfi_cases_project_tenant_fk
      foreign key (tenant_id,project_id)
      references public.sfi_projects(tenant_id,id)
      on update restrict on delete restrict
      not valid;
  end if;
end;
$sfi_project_tenant_integrity$;
-- Separate human-reviewed step AFTER checking existing rows:
-- ALTER TABLE public.sfi_cases VALIDATE CONSTRAINT sfi_cases_project_tenant_fk;
