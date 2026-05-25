# packages/security

Zero Trust, RBAC/ABAC, policy engine y audit helpers.

Responsabilidad declarada:
- definir tipos y fronteras de autorizacion;
- validar acciones antes de tocar Field Core o DB;
- describir audit logs obligatorios.

Limites:
- no modifica auth existente durante FASE 2A;
- no accede a secretos;
- no implementa providers;
- no reemplaza policies actuales todavia.

