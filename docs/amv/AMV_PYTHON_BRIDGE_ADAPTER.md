# AMV Python Bridge Adapter

El adapter TypeScript vive en `src/lib/amv/core/pythonBridgeAdapter.ts`.

Estados permitidos:

- `available_not_invoked`
- `degraded`
- `timeout`
- `contract_error`
- `sandbox_only`

Limites:

- no importa `services/python`;
- no ejecuta Python por default;
- no escribe DB;
- no convierte simulacion en evidencia viva.
