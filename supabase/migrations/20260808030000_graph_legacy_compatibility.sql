-- Preserve compatibility between the legacy graph schema and newer evidence graph writers.
-- This migration does not fabricate epistemic measurements. It only fills structural identifiers/type fields
-- that are already implied by node_id/source_node_id/target_node_id when legacy NOT NULL columns are absent.

create or replace function public.sfi_graph_nodes_compat_before_write()
returns trigger
language plpgsql
as $$
begin
  if new.node_key is null or btrim(new.node_key) = '' then
    new.node_key := coalesce(nullif(btrim(new.node_id), ''), 'graph:' || new.id::text);
  end if;
  if new.node_id is null or btrim(new.node_id) = '' then
    new.node_id := new.node_key;
  end if;
  if new.node_type is null or btrim(new.node_type) = '' then
    new.node_type := 'INF';
  end if;
  if new.ontology_type is null or btrim(new.ontology_type) = '' then
    new.ontology_type := 'evidence';
  end if;
  return new;
end;
$$;

drop trigger if exists sfi_graph_nodes_compat_before_write on public.graph_nodes;
create trigger sfi_graph_nodes_compat_before_write
before insert or update on public.graph_nodes
for each row execute function public.sfi_graph_nodes_compat_before_write();

create or replace function public.sfi_graph_edges_compat_before_write()
returns trigger
language plpgsql
as $$
begin
  if new.source_node_key is null or btrim(new.source_node_key) = '' then
    new.source_node_key := new.source_node_id;
  end if;
  if new.target_node_key is null or btrim(new.target_node_key) = '' then
    new.target_node_key := new.target_node_id;
  end if;
  if new.source_node_id is null or btrim(new.source_node_id) = '' then
    new.source_node_id := new.source_node_key;
  end if;
  if new.target_node_id is null or btrim(new.target_node_id) = '' then
    new.target_node_id := new.target_node_key;
  end if;
  if new.relation_type is null or btrim(new.relation_type) = '' then
    new.relation_type := 'structural_inferred';
  end if;
  if new.relation is null or btrim(new.relation) = '' then
    new.relation := new.relation_type;
  end if;
  return new;
end;
$$;

drop trigger if exists sfi_graph_edges_compat_before_write on public.graph_edges;
create trigger sfi_graph_edges_compat_before_write
before insert or update on public.graph_edges
for each row execute function public.sfi_graph_edges_compat_before_write();
