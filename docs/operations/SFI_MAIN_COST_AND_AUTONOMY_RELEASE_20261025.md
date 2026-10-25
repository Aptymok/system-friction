# SFI — alcance de integración a main (25 octubre 2026)

Este documento acompaña PR #843; la autorización recibida se limita a integrar en main el trabajo ya efectuado en SFI. No autoriza gasto externo, migraciones irreversibles, cambios de permisos, borrado de Neon ni despliegue forzado.

## Componentes incluidos
- ROOT: Passport legible, navegación sin carril horizontal forzoso, selección de casos con títulos visibles, lectura autorizada de misiones y recibos.
- C07: cola gobernada, ejecución con fencing, lease, idempotencia, verificación contra `epistemic_events`, distinción de ejecución y resultado científico.
- C08: un paso programable por el heartbeat existente, con autoridad, emergencia y coste. No afirma autonomía científica completa.
- Coste: cuota inicial de 6 misiones C07/día y 60/mes, lectura manual de telemetría observada, costes facturados externos = no conectados, rechazo conservador de ejecución cuando el dato no está disponible.
- Supabase primario: lectura/escritura autorizada del plano principal sin redirección implícita a Neon.
- Neon: contingencia pasiva conservada, sin sincronizaciones automáticas; no borrado ni modificación física.
- GitHub: programador reducido a un wakeup por hora, con disparadores manuales y condicionados conservados.

## Prohibiciones y alcance
No se integran los demás ~647 commits acumulados en la rama extensa, ni migraciones ajenas, cambios no revisados de Reality Chain, cambios de autoridad, ni el código de Discovery 800. Se conserva el script SQL C07 como artefacto candidato; la integración no lo ejecuta.

## Validación
Pruebas del PR: SFI Verify (C07, Passport, cuota de coste, boundaries, TypeScript, build), controles transversales y verificación de ausencia de replicación. No equiparar CI verde con aceptación autenticada en producción. Los recibos históricos siguen inmutados.

## Reversión
Revertir el commit de integración en main, conservar tablas y recibos Supabase y base Neon. No ejecutar restauraciones SQL, ni migraciones de réplica para revertir la interfaz.
