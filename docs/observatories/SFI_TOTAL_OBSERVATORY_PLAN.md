# SFI Total Observatory Plan

El observatorio total no reemplaza ROOT. Observa scopes AMV y declara si estan vivos, degradados, en sandbox o incompletos.

Ruta: `/observatories`.

Reglas:

- No declarar vivo un scope sin evidencia.
- No permitir regimen si no hay fuente y coverage suficiente.
- No fortalecer atractor sin evidencia verificada.
- Mostrar deuda como warning operativo.
- Dejar scopes sin conector como degradados.

Pruebas manuales:

1. Abrir `/api/amv/state`.
2. Confirmar que devuelve todos los scopes.
3. Abrir `/api/amv/state?scope=scorefriction`.
4. Confirmar que ScoreFriction muestra `live` solo si hay observacion real.
5. Abrir `/observatories`.
6. Confirmar que los scopes degradados no dicen "Observatorio activo".
7. Abrir `/api/twin/state`.
8. Confirmar `data.amvScopes`.

Siguiente fase recomendada:

- Crear conectores vivos para Governance Reality y Signal Vane antes de promover mas dashboards.
