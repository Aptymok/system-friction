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

