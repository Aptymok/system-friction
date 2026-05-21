# packages/events

Eventos epistémicos puros del Observatorio SFI.

Responsabilidad declarada:
- validar forma mínima de eventos epistémicos;
- declarar clases epistémicas compartidas;
- permanecer sin dependencias externas;
- no conectar persistencia en FASE 2D.

Límites:
- no importa DB;
- no importa UI;
- no importa Supabase;
- no implementa runtime;
- no migra `cognitive_event_stream`.

