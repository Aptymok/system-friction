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

