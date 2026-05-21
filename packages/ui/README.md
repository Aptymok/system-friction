# packages/ui

Componentes visuales compartidos.

Responsabilidad declarada:
- alojar componentes presentacionales reutilizables;
- recibir datos ya calculados;
- evitar acoplamiento a DB, auth o fuentes externas.

Limites:
- no calcula `FieldState`;
- no persiste logs;
- no accede a Supabase;
- no toca `/terminal` actual durante FASE 2A.

