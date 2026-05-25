# services/api

API principal del Observatorio SFI.

Responsabilidad declarada:
- exponer contratos controlados para apps y futuros aplicativos independientes;
- aplicar autorizacion antes de cualquier comando;
- servir `FieldState`, `NodeState`, `Logs` y `SourceHealth`;
- ser la unica puerta hacia repositorios de datos productivos.

Limites:
- no migra APIs existentes durante FASE 2A;
- no accede a UI;
- no acepta eventos externos sin pasar por `packages/security`;
- no implementa Evaluator en esta fase.

## FASE 5A scaffold

Este servicio queda preparado como gateway futuro, sin reemplazar APIs Next existentes.

Incluye:

- categorias de rutas;
- command envelope;
- query envelope;
- error shape;
- marcadores de auth;
- marcadores de metadata epistemica;
- guards puros de forma.

No incluye:

- servidor HTTP;
- handlers productivos;
- DB;
- Supabase;
- migracion de endpoints;
- cambios en `/terminal`.
