# SFI Database Schema Contract

Este documento es el contrato canónico mínimo del schema real de Supabase usado por System Friction Institute.

Regla operativa:

- Codex y agentes NO deben inferir columnas.
- Antes de crear migraciones nuevas, deben revisar este contrato.
- Si una tabla existe, NO usar `CREATE TABLE IF NOT EXISTS` para redefinirla.
- Si una columna falta y es estrictamente necesaria, usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- Si una capacidad puede mapearse al schema existente, adaptar código al schema real.

## Tablas canónicas actuales

```txt
action_proposals
delta_decisions
epistemic_events
graph_edges
graph_nodes
kernel_cycles
logbook_degradation
logbook_frictions
logbook_knowledge
logbook_links
logbook_mutations
logbook_nodes
logbook_regime
logbook_signals
mihm_analyses
nodes
policy_decisions
profiles
worldspect_snapshots
```

## epistemic_events

```txt
id uuid
sequence bigint
event_id text
event_name text
logbook_id text
epistemic_class text
schema_version text
source jsonb
actor_id text
node_id uuid
confidence numeric
payload jsonb
checksum text
lineage text[]
uncertainty text
occurred_at timestamptz
created_at timestamptz
hash_prev text
hash_self text
```

Uso:
- Event store constitucional.
- Todo evento operativo relevante debe entrar aquí.
- `hash_self` es obligatorio.
- `hash_prev` debe apuntar al último hash disponible cuando aplique.

## graph_nodes

```txt
id uuid
node_key text
label text
node_type text
profile text
q_n numeric
d_n numeric
co_n numeric
u_n numeric
origin text
epistemic_class text
confidence numeric
payload jsonb
created_at timestamptz
updated_at timestamptz
```

Uso:
- Grafo canónico observado.
- No mutar desde Twin o Sandbox sin aprobación humana explícita.

## graph_edges

```txt
id uuid
source_node_key text
target_node_key text
relation_type text
w_ij numeric
confidence numeric
evidence_ids uuid[]
payload jsonb
created_at timestamptz
```

Restricción conocida:

```txt
relation_type IN (
  'causal_verified',
  'correlational_observed',
  'structural_inferred'
)
```

## logbook_mutations

Schema real observado:

```txt
id uuid
event_id uuid
mutation_key text
target text
current_state jsonb
proposed_state jsonb
coherence_delta numeric
status text
created_at timestamptz
```

Uso:
- Registro de mutaciones propuestas/revisadas.
- No asumir columnas `proposal_id`, `actor_id`, `mutation_type`, `payload`, `updated_at` salvo que una migración ALTER las agregue explícitamente.

## logbook_regime

```txt
id uuid
event_id uuid
regime_key text
previous_state text
next_state text
phi_campo numeric
causal_factor text
payload jsonb
created_at timestamptz
```

Uso:
- Cambios de régimen operativo/constitucional.

## policy_decisions

Schema real observado:

```txt
id uuid
delta_decision_id uuid
event_id uuid
allow_llm boolean
allow_proposal boolean
allow_execution boolean
requires_approval boolean
max_tokens integer
reason text
payload jsonb
created_at timestamptz
```

Uso:
- Decisiones de política y bloqueos de gobernanza.

## action_proposals

Existe en schema final.

Antes de usar columnas específicas, auditar con:

```sql
select column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name='action_proposals'
order by ordinal_position;
```

Regla:
- Si el código requiere columnas nuevas para proposals operativas (`proposal_type`, `spec_hash`, `content_hash`, etc.), agregarlas con `ALTER TABLE ADD COLUMN IF NOT EXISTS`.
- No redefinir la tabla completa.

## mihm_analyses

Existe en schema final.

Antes de usar columnas específicas, auditar con:

```sql
select column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name='mihm_analyses'
order by ordinal_position;
```

Regla:
- Si el código requiere columnas nuevas, usar `ALTER TABLE ADD COLUMN IF NOT EXISTS`.
- No redefinir la tabla completa.

## Patrón correcto de migración

Incorrecto:

```sql
create table if not exists public.action_proposals (...);
```

Correcto:

```sql
alter table public.action_proposals
  add column if not exists proposal_type text,
  add column if not exists spec_hash text,
  add column if not exists content_hash text;
```

## Reglas de cierre

1. El código debe adaptarse al schema real.
2. Las migraciones deben ser idempotentes.
3. No se crean tablas paralelas para capacidades ya representadas.
4. Toda propuesta/mutación debe ser trazable vía `epistemic_events`.
5. Todo bloqueo de governance debe registrar `policy_decisions`.
