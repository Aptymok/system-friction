# packages/config

Configuracion compartida.

Responsabilidad declarada:
- definir nombres de entorno y limites de configuracion;
- centralizar lectura futura de configuracion.

Limites:
- no lee `.env` durante FASE 2A;
- no toca secretos;
- no modifica configuracion productiva;
- no agrega dependencias.

