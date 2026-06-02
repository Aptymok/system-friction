# ROOT-OPS-001 · Operational Root Evidence Loop

## Estado

Activo en producción con circuito mínimo verificado.

## Fenómeno

`/root` dejó de operar únicamente como superficie visual y quedó habilitado como consola raíz para identidad, estado, evidencia, auditoría, bitácora y anclaje al grafo.

## Cadena verificada

```txt
root identity → root state → root evidence → epistemic event → audit event → graph node → graph edge → mutation/proposal governance
```

## Evidencia operacional observada

- `/api/root/me` valida identidad root desde servidor.
- `/api/root/state` devuelve estado vivo con permisos root.
- `root_evidence_entries` contiene evidencia `system_check` generada desde root.
- `epistemic_events` acepta `logbook_id = ROOT` y registra acciones root.
- `root_audit_events` registra acciones de consola root.
- `graph_nodes` contiene nodos `root_evidence:*`.
- `graph_edges` contiene relación `root_evidence:* → INF` con `relation_type = structural_inferred`.

## Ajustes ya requeridos por operación real

- `SYSTEM_ROOT_EMAIL` debe seguir siendo autoridad server-side para root.
- `RoleGate` no debe expulsar `/root` antes de consultar `/api/root/me`.
- `createServiceSupabaseClient()` debe usar `createClient` puro con `SUPABASE_SERVICE_ROLE_KEY`, no `createServerClient` SSR.
- `epistemic_events_logbook_id_check` debe permitir `ROOT`.
- Escrituras de grafo desde evidencia root deben respetar contrato mixto: columnas antiguas (`node_key`, `node_type`, `source_node_key`, `relation_type`) y columnas nuevas (`node_id`, `ontology_type`, `edge_id`, `attributes`).

## Pendientes de cierre

1. Retirar endpoint temporal `src/app/api/root/env-check` si todavía existe.
2. Reducir ruido de auditoría generado por lecturas repetidas de `/api/root/me`.
3. Crear cierre operacional de mutaciones root: `POST /api/root/mutations/:id/close`.
4. Normalizar `action_proposals.proposal_type` histórico desde `outcome->>'proposalType'`.
5. Separar métricas de lectura root de eventos constitucionales críticos.
6. Formalizar `ROOT-OPS-002` como etapa de gobernanza, cuentas y cierre.

## Criterio de cierre ROOT-OPS-001

ROOT-OPS-001 se considera cerrado cuando:

- root puede entrar a `/root` sin redirección indebida;
- `/api/root/state` responde `ok: true`;
- `/api/root/evidence` crea evidencia idempotente;
- la evidencia genera evento epistemológico `ROOT`;
- la evidencia genera nodo de grafo;
- si se provee `targetNodeId` válido, genera edge estructural;
- la acción queda auditada;
- el endpoint temporal de diagnóstico se retira.

## Límite

ROOT-OPS-001 no cierra toda la gobernanza ACP. Cierra únicamente el circuito mínimo de evidencia raíz.

La siguiente etapa debe enfocarse en cierre de mutaciones, cuentas, reducción de ruido y decisión operativa gobernada.
