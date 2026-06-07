# ROOT Phase 11 - Gobernanza, acceso y operaciones

## Cierre de fase

Fase 11 queda cerrada como capa de traduccion operativa. ROOT evita mostrar primero lenguaje tecnico y traduce acceso, bloqueos, operaciones abiertas, override, agentes internos, continuidad de sesion y auditoria secundaria.

## Acceso ROOT / Umbral

Se tradujo la experiencia principal a:

`Umbral ROOT`

La lectura visible distingue:

- acceso permitido
- acceso bloqueado
- falta de sesion
- falta de rol raiz
- sesion expirada o cambiada
- accion siguiente

La pantalla de acceso y el rechazo de permisos ya no dependen de mensajes como `Unauthorized`, `root_required` o errores crudos como lectura principal.

## Bloqueos de gobernanza

Se agrego `src/lib/root/rootGovernanceTranslator.ts`.

Traducciones cubiertas:

- `blocked_by_governance` -> Bloqueado por regla de gobernanza.
- `missing_evidence` -> Bloqueado porque falta evidencia.
- `simulation_detected` -> Bloqueado porque es simulacion.
- `attractor_risk` -> Bloqueado porque puede afectar el atractor.
- `root_approval_required` -> Bloqueado porque requiere aprobacion raiz.
- `phase_not_authorized` -> Bloqueado porque esta fase no autoriza esta operacion.
- `unknown_block` -> Bloqueado, pero falta razon visible. Revisar auditoria.

Cada traduccion devuelve estado, razon, consecuencia, accion siguiente, capa afectada y fase relacionada cuando existe.

## Centro de operaciones

`RootOperationsConsole` ahora lee operaciones abiertas como operaciones, no como tablas.

Cada grupo visible expone:

- nombre operativo
- estado traducido
- razon
- consecuencia
- accion siguiente
- fecha
- fase relacionada
- capa afectada
- si requiere cierre
- si requiere evidencia
- si requiere aprobacion raiz
- si debe ir a Sandbox

Tablas, conteos internos, warnings crudos e IDs quedan en linaje tecnico secundario.

## Reconciliacion

La lectura preparada distingue:

- propuesta sin ejecucion
- propuesta aceptada
- ejecucion preparada
- evidencia registrada
- cierre pendiente
- cierre completado
- cierre bloqueado

No se crearon Acciones de Realidad. La reconciliacion queda como traduccion de estados visibles, no como ejecucion.

## Override manual

`SystemOverridePanel` fue ajustado para que el override sea una excepcion controlada.

Ahora exige:

- tipo de override
- justificacion
- elemento afectado
- consecuencia
- duracion si aplica
- confirmacion raiz

Tambien muestra riesgo cualitativo antes de ejecutar:

- bajo
- medio
- alto
- sin lectura suficiente

Si no hay lectura suficiente, ROOT no lo presenta como seguro. No se creo backend nuevo ni autoridad autonoma.

## Agentes internos

Se agrego `src/lib/root/rootAgentRoleTranslator.ts`.

`AcpAgentRegistryPanel` ahora se presenta como:

`Agentes internos de ROOT`

La lectura declara que ningun agente:

- tiene autoridad externa
- ejecuta fuera de ROOT sin decision raiz
- modifica Constitucion
- sustituye a Aptymok

Cada agente se limita a observar, proponer, traducir, verificar o preparar.

## Continuidad de sesion

ROOT conserva estado visual no sensible en `sessionStorage`:

- modo VISOR activo
- lente seleccionada
- panel abierto
- aviso de continuidad

No se guardan datos sensibles. No se tocaron permisos ni autenticacion productiva.

Lecturas visibles:

- `Continuidad de observacion: activa.`
- `Continuidad de observacion: interrumpida por recarga. ROOT recargo porque la sesion cambio, expiro o el navegador recargo la pagina.`

La conversacion visible del Visor no se persiste en almacenamiento local en esta fase para evitar guardar contenido potencialmente sensible.

## Auditoria tecnica

La auditoria tecnica puede seguir existiendo, pero no gobierna la vista principal.

Quedan como lectura secundaria:

- nombres de tabla
- hashes
- payloads
- endpoints
- eventos crudos
- estado tecnico de runtime

La vista principal responde primero que significa, que afecta y que hacer.

## Limites respetados

No se modificaron permisos productivos.
No se convirtio ROOT en multiusuario.
No se crearon overrides sin justificacion visible.
No se dio autoridad externa a agentes.
No se tocaron Supabase, migraciones ni datos reales.
No se ejecuto Fase 12 ni Fase 13.
