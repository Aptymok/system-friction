# packages/sources

Adaptadores de fuentes externas.

Responsabilidad declarada:
- describir fuentes externas sin conectarlas en FASE 2A;
- normalizar metadata de fuente;
- producir descriptors para `services/ingestion`.

Limites:
- no conecta APIs publicas;
- no hace scraping;
- no escribe DB;
- no declara fuente viva sin health check.

