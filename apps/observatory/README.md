# apps/observatory

Dashboard principal del Observatorio SFI.

Responsabilidad declarada:
- consumir `FieldState`, `NodeState`, `Logs` y `SourceHealth`;
- operar como consola constitucional del agente;
- renderizar estado, bitacoras y salud de fuentes;
- enviar comandos a `services/api` sin acceder directo a base de datos.

Limites:
- no calcula verdad del campo;
- no contiene reglas MIHM canonicas;
- no accede a Supabase/Postgres directamente;
- no reemplaza `/terminal` actual durante FASE 2A.

## FASE 5B read-only scaffold

`apps/observatory` queda definido como dashboard independiente y read-only.

Vistas declaradas:

- `FieldStateView`
- `NodeRegistryView`
- `EventStreamView`
- `SourceHealthView`
- `RiskResilienceView`
- `AgentProposalsView`

Reglas:

- no calcula verdad;
- no importa `mihm-core`;
- no importa `campo-ob`;
- no importa `db`;
- no reemplaza `/terminal`;
- no usa `SfiFieldShell`;
- no conecta datos reales todavia.
