# apps/admin

Consola de administracion, seguridad, usuarios, roles y auditoria.

Responsabilidad declarada:
- operar funciones administrativas separadas del observatorio principal;
- consumir controles de `packages/security`;
- mostrar audit logs y estado de policies;
- coordinar acciones root/system con trazabilidad.

Limites:
- no comparte superficie con el dashboard constitutivo;
- no escribe sin autorizacion de `services/api`;
- no contiene secretos;
- no modifica auth existente durante FASE 2A.

