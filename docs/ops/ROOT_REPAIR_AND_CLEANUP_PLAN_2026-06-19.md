# ROOT Repair and Cleanup Plan

Fecha: 2026-06-19

## Estado actual

ROOT ya recibio una primera correccion de lenguaje visible.

Cambios ya presentes:

- `src/observatory/components/root/RootDashboardClient.tsx`
  - `SFI / ACP ROOT` paso a `SFI / ROOT`.
  - `Sistema`, `WSV`, `MIHM`, `Atractor`, `Eyectores`, `Cerrar`, `Sandbox` se tradujeron a `Estado`, `Mundo`, `Matriz`, `Futuro`, `Riesgos`, `Pendiente`, `Prueba`.
  - Las herramientas laterales se tradujeron a Observacion, Sin anclaje, Friccion, Presion, Pendiente, Tiempo, Decision, Archivo y Futuro.

- `src/observatory/components/root/RootObservatoryIndex.tsx`
  - El lenguaje de observatorios se tradujo a estado operativo: usable ahora, en prueba, sin evidencia suficiente.

- `src/observatory/components/root/RootOperationsConsole.tsx`
  - El panel fue traducido a Registro / Evidencia / Cuentas.
  - Se agrego lectura de control y detalle tecnico secundario.

Esto no significa que ROOT este terminado. Significa que la primera capa de comprension ya fue corregida.

## Problema que queda

ROOT todavia mezcla tres cosas en una sola superficie:

1. Conversacion con el sistema.
2. Control operativo.
3. Infraestructura interna.

El operador no debe ver infraestructura como si fuera decision.

## Regla de saneamiento

No borrar archivos hasta clasificarlos en una de estas categorias:

- VIVO: se usa y ayuda a decidir.
- PARCIAL: se usa, pero requiere traduccion o simplificacion.
- INFRAESTRUCTURA: se conserva, pero debe ocultarse del operador.
- DUPLICADO: se fusiona con otra vista.
- MUERTO: no se usa; puede eliminarse despues de confirmar que no tiene imports activos.

## Archivos ROOT a revisar

### Mantener y seguir corrigiendo

- `src/observatory/components/root/RootDashboardClient.tsx`
  - Estado: VIVO.
  - Accion: debe convertirse en centro de decision, no tablero de variables.
  - Pendiente: reducir paneles visibles por defecto y mostrar solo accion prioritaria.

- `src/observatory/components/root/TwinInteractionPanel.tsx`
  - Estado: VIVO.
  - Accion: debe ser la entrada conversacional principal de ROOT.
  - Pendiente: validar que el chat responda con lenguaje operativo y no con variables internas.

- `src/observatory/components/root/RootOperationsConsole.tsx`
  - Estado: PARCIAL.
  - Accion: conservar, pero mover detalle tecnico a secciones expandibles.
  - Pendiente: impedir que parezca centro principal si solo registra evidencia.

- `src/observatory/components/root/RootObservatoryIndex.tsx`
  - Estado: PARCIAL.
  - Accion: conservar como mapa de observatorios.
  - Pendiente: cada observatorio debe decir que decision habilita.

- `src/observatory/components/root/RootLogbookConsole.tsx`
  - Estado: PARCIAL.
  - Accion: revisar si duplica operaciones o si aporta memoria independiente.
  - Pendiente: si duplica RootOperationsConsole, fusionar.

- `src/observatory/components/root/SelfObservabilityPanel.tsx`
  - Estado: PARCIAL.
  - Accion: revisar si aporta lectura de sistema o solo diagnostico tecnico.
  - Pendiente: traducir a salud operativa.

- `src/observatory/components/root/VisorMode.tsx`
  - Estado: VIVO.
  - Accion: conservar como modo de observacion.
  - Pendiente: revisar que no oculte decisiones necesarias.

- `src/observatory/components/root/RootLiveGraphPanel.tsx`
  - Estado: PARCIAL.
  - Accion: conservar solo si muestra relaciones utiles.
  - Pendiente: si solo decora, mover a vista secundaria.

- `src/observatory/components/root/PersistentSignalFieldPanel.tsx`
  - Estado: PARCIAL.
  - Accion: revisar integracion con WorldSpect y ScoreFriction.
  - Pendiente: debe mostrar senales persistentes con accion sugerida.

### Posibles fusiones

- `LogbookSelectorPanel.tsx` + `RootLogbookConsole.tsx`
  - Posible fusion en un solo modulo de Memoria / Registro.

- `RootOperationsConsole.tsx` + partes de `RootLogbookConsole.tsx`
  - Posible fusion si ambos registran, cierran o muestran eventos operativos.

- `SelfObservabilityPanel.tsx` + estado superior de `RootDashboardClient.tsx`
  - Posible fusion si solo muestra salud de sistema.

### No borrar todavia

No borrar todavia:

- `AcpProposalConsole.tsx`
- `AcpAgentRegistryPanel.tsx`
- `ArtifactRoutingPanel.tsx`
- `AcpFieldRegimeView.tsx`
- `AcpFreeNodesView.tsx`
- `AcpAttractorFieldView.tsx`
- `SystemOverridePanel.tsx`

Razon: estan importados por ROOT y pueden ser funcionales aunque su lenguaje aun sea críptico. Primero deben auditarse por uso e imports.

## Archivos que podrian terminar ocultos, no borrados

- `SystemOverridePanel.tsx`
  - Debe quedar como control avanzado, no visible por defecto.

- `AcpAgentRegistryPanel.tsx`
  - Debe quedar como infraestructura de agentes, no como panel principal del operador.

- `ArtifactRoutingPanel.tsx`
  - Debe permanecer si realmente enruta Atlas / Cuadernillo / Sobre Negro.
  - Si solo lista artefactos, debe fusionarse con Archivo.

## Criterio para borrar archivos

Un archivo solo puede borrarse si cumple todo:

1. No tiene imports activos.
2. No tiene ruta viva.
3. No aparece en busqueda de componentes.
4. No alimenta API, bitacora, evidencia o consola.
5. Existe reemplazo funcional claro.

Si no cumple los cinco puntos, no se borra. Se oculta o se fusiona.

## ROOT debe quedar asi

ROOT debe reducirse a cinco zonas:

1. Estado actual
   - Que esta pasando.
   - Que tan confiable es.

2. Atencion requerida
   - Que necesita accion.
   - Que pasa si no se actua.

3. Decision minima
   - Ejecutar.
   - Observar.
   - Pedir evidencia.
   - Cerrar.
   - Reemplazar.

4. Evidencia
   - Que sostiene la lectura.
   - Que falta.

5. Archivo / memoria
   - Que se registro.
   - Que cambio.
   - Que queda pendiente.

## Siguiente ejecucion recomendada

### PR siguiente: ROOT Control Surface Simplification

Cambios propuestos:

1. Revisar `RootLogbookConsole.tsx`.
2. Revisar `SelfObservabilityPanel.tsx`.
3. Revisar `PersistentSignalFieldPanel.tsx`.
4. Marcar cada panel como VIVO / PARCIAL / INFRAESTRUCTURA / DUPLICADO / MUERTO.
5. Ocultar infraestructura avanzada dentro de `Control`.
6. Crear una tarjeta superior nueva: `Atencion requerida`.
7. No borrar archivos en ese PR, solo clasificar y simplificar.

### PR posterior: ROOT Dead Surface Removal

Solo despues de confirmar imports:

1. Fusionar duplicados.
2. Eliminar archivos muertos.
3. Crear redirecciones o reemplazos si hay rutas conectadas.

## Decision

ROOT no debe seguir creciendo por acumulacion de paneles. Debe convertirse en una consola de decision clara.

El trabajo no es borrar por limpiar. El trabajo es quitar del operador todo lo que no le permite decidir.
