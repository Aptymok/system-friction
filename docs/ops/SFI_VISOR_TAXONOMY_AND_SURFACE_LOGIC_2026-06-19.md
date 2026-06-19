# SFI Visor Taxonomy and Surface Logic

Fecha: 2026-06-19

## Regla general

Cada visor debe existir solo si permite una decision operativa.

Todo visor debe responder:

1. Que observa.
2. Que evidencia usa.
3. Que decision habilita.
4. Que accion minima propone.
5. Que pasa si no se actua.
6. Que parte tecnica queda oculta en detalle secundario.

Si un visor no responde eso, no debe ser vista principal.

## Estados de visor

- VIVO: se usa y habilita decision.
- PARCIAL: se usa, pero requiere traduccion, fusion o simplificacion.
- INFRAESTRUCTURA: sostiene el sistema, pero no debe estar frente al operador.
- DUPLICADO: repite funcion de otro visor y debe fusionarse.
- MUERTO: no tiene imports, ruta viva ni decision asociada; puede eliminarse despues de confirmar dependencia.

## Visores definidos

### 1. ROOT

Archivo principal:

- `src/observatory/components/root/RootDashboardClient.tsx`

Proposito:

Centro de decision del sistema.

Debe responder:

- Que esta pasando ahora.
- Que requiere atencion.
- Que decision minima corresponde.
- Que evidencia sostiene la lectura.
- Que queda pendiente.

Estado:

VIVO, pero aun sobrecargado.

Accion siguiente:

Simplificar superficie. ROOT debe quedar en cinco zonas:

1. Estado actual.
2. Atencion requerida.
3. Decision minima.
4. Evidencia.
5. Archivo / memoria.

No debe seguir creciendo por acumulacion de paneles.

### 2. Visor de Mundo / WorldSpect

Archivos principales:

- `src/observatory/components/field/WorldSpectPanel.tsx`
- `src/lib/worldspect/source-adapter-contract.ts`
- `src/lib/worldspect/adapters/publicAdapters.ts`
- `src/lib/worldspect/vector-aggregator.ts`

Proposito:

Leer el campo externo e interno para saber si una senal existe fuera del sistema o solo dentro de SFI.

Debe responder:

- La observacion global es confiable, parcial, interna o detenida.
- Que fuentes respondieron.
- Que fuentes no respondieron.
- Que fuentes respondieron sin encontrar senal.
- Si la lectura sirve para observar o para decidir.

Estado:

VIVO.

Cambios ya hechos:

- `PARTIAL_EXTERNAL_FAILURE`.
- `EMPTY_RESULT`.
- Diferencia entre fuente rota y fuente sin resultado.
- Lenguaje visible traducido a Lectura del mundo / que esta pasando / que hacer.

Accion siguiente:

Verificar si el endpoint de estado operativo ya expone `EMPTY_RESULT` de forma legible para el operador.

### 3. Visor ScoreFriction / Campo Cultural

Archivo principal:

- `src/scorefriction/components/panels/PanelWorldSpectrum.tsx`

Proposito:

Observar presion cultural, persistencia, evidencia musical/memetica y su relacion con WorldSpect.

Debe responder:

- Que senal cultural existe.
- Que evidencia la sostiene.
- Si es observacion aislada o persistente.
- Si puede alimentar decision o solo seguimiento.

Estado:

PARCIAL.

Cambios ya hechos:

- WORLD SPECTRUM / CAMPO Y FUENTES paso a LECTURA DEL MUNDO / CAMPO Y FUENTES.
- coverage, real, public, internal, scope, activation, degradation pasaron a cobertura, entradas reales, externas, internas, origen, presion, costo operativo.

Accion siguiente:

Auditar el resto de paneles ScoreFriction para que no sigan mostrando variables sin accion.

### 4. Visor de Observatorios

Archivo principal:

- `src/observatory/components/root/RootObservatoryIndex.tsx`

Proposito:

Decir que observatorios pueden orientar una decision y cuales aun no tienen evidencia suficiente.

Debe responder:

- Observatorio usable ahora.
- Observatorio en prueba.
- Observatorio sin evidencia suficiente.
- Si puede orientar decision.
- Si sostiene el futuro declarado.

Estado:

PARCIAL.

Cambio ya hecho:

- Scope degradado fue traducido a sin evidencia suficiente / no debe orientar decision.

Accion siguiente:

Agregar accion minima por observatorio:

- conectar fuente;
- pedir evidencia;
- observar;
- cerrar;
- fusionar;
- ocultar.

### 5. Visor de Registro / Operaciones ROOT

Archivo principal:

- `src/observatory/components/root/RootOperationsConsole.tsx`

Proposito:

Registrar evidencia, revisar pendientes y ver estado operativo de registro/evidencia/cuentas.

Debe responder:

- Que esta pendiente.
- Que puede cerrarse.
- Que evidencia existe.
- Que no debe tomarse como decision.

Estado:

PARCIAL.

Cambio ya hecho:

- Se tradujo a Registro / Evidencia / Cuentas.
- Se agrego detalle tecnico secundario.

Accion siguiente:

Fusionar o separar de `RootLogbookConsole.tsx` segun duplicidad.

### 6. Visor de Bitacora / Memoria

Archivos probables:

- `src/observatory/components/root/RootLogbookConsole.tsx`
- `src/observatory/components/root/LogbookSelectorPanel.tsx`

Proposito:

Mostrar memoria operativa, cambios, eventos y continuidad.

Debe responder:

- Que se registro.
- Que cambio.
- Que sigue abierto.
- Que evidencia sostiene cada evento.

Estado:

PARCIAL / posible DUPLICADO.

Accion siguiente:

Revisar si duplica `RootOperationsConsole.tsx`.

Si duplica:

- fusionar en Registro / Memoria.

Si aporta lectura independiente:

- conservar como Archivo / Memoria.

No borrar aun.

### 7. Visor de Autoobservabilidad

Archivo probable:

- `src/observatory/components/root/SelfObservabilityPanel.tsx`

Proposito:

Decir si el sistema se entiende a si mismo: salud, continuidad, fallas, deuda operativa.

Debe responder:

- Que parte del sistema esta sana.
- Que parte esta incompleta.
- Que parte acumula deuda operativa.
- Que accion minima reduce friccion.

Estado:

PARCIAL.

Accion siguiente:

Traducir de diagnostico tecnico a salud operativa.

No debe mostrar variables sin interpretacion.

### 8. Visor Mode

Archivos probables:

- `src/observatory/components/root/VisorMode.tsx`
- `src/observatory/components/root/visorHooks.ts`

Proposito:

Modo de observacion libre. Sirve para pausar animaciones, observar campo y navegar sin alterar decision.

Debe responder:

- Que se esta observando.
- Que esta pausado.
- Que no debe ejecutarse desde ahi.

Estado:

VIVO.

Accion siguiente:

Mantener, pero aclarar que VISOR no es modo ejecucion. Es modo observacion.

### 9. Visor de Grafo Vivo

Archivo probable:

- `src/observatory/components/root/RootLiveGraphPanel.tsx`

Proposito:

Mostrar relaciones entre elementos del campo.

Debe responder:

- Que elementos estan conectados.
- Que relacion importa.
- Que nodo o relacion requiere accion.

Estado:

PARCIAL.

Accion siguiente:

Si solo decora, mover a detalle secundario.

Si habilita decision, agregar lectura operativa encima del grafo.

### 10. Visor de Senal Persistente

Archivo probable:

- `src/observatory/components/root/PersistentSignalFieldPanel.tsx`

Proposito:

Mostrar senales que se sostienen a traves del tiempo.

Debe responder:

- Que senal persiste.
- Desde cuando.
- En que fuentes aparece.
- Que accion habilita.

Estado:

PARCIAL.

Accion siguiente:

Conectarlo claramente con WorldSpect, ScoreFriction y evidencia interna.

### 11. Visor de Propuestas / Decision

Archivo probable:

- `src/observatory/components/root/AcpProposalConsole.tsx`

Proposito:

Mostrar propuestas accionables.

Debe responder:

- Que propuesta existe.
- A que futuro sirve.
- Que evidencia tiene.
- Que riesgo tiene.
- Si se ejecuta, observa, pide evidencia, reemplaza o cierra.

Estado:

PARCIAL.

Accion siguiente:

Integrar con atractor activo y cola de alineacion.

No ejecutar propuestas restauradas sin revisar alineacion.

### 12. Visor de Agentes

Archivo probable:

- `src/observatory/components/root/AcpAgentRegistryPanel.tsx`

Proposito:

Mostrar agentes disponibles, capacidades y estado.

Debe responder:

- Que agente existe.
- Que puede hacer.
- Que no debe hacer.
- Que requiere autorizacion.

Estado:

INFRAESTRUCTURA.

Accion siguiente:

Ocultar por defecto. Debe existir como control avanzado, no como vista principal.

### 13. Visor de Artefactos / Archivo

Archivo probable:

- `src/observatory/components/root/ArtifactRoutingPanel.tsx`

Proposito:

Rutar materiales a Atlas, Cuadernillo, Sobre Negro, Evidencia o Archivo.

Debe responder:

- Que artefacto existe.
- A donde pertenece.
- Si esta pendiente de absorcion.
- Si ya fue integrado.

Estado:

PARCIAL.

Accion siguiente:

Mantener si enruta; fusionar con Archivo si solo lista.

### 14. Visores ACP de campo

Archivos probables:

- `src/observatory/components/root/AcpFieldRegimeView.tsx`
- `src/observatory/components/root/AcpFreeNodesView.tsx`
- `src/observatory/components/root/AcpAttractorFieldView.tsx`

Proposito:

Mostrar campo, nodos libres y futuro declarado.

Debe responder:

- Que elementos estan ubicados.
- Que elementos estan sin anclaje.
- Que tension existe con el futuro declarado.
- Que debe observarse o reubicar.

Estado:

PARCIAL.

Accion siguiente:

Traducir nodos a elementos del campo. Traducir atractor a futuro declarado.

No usar `nodo` como palabra principal sin explicar que significa.

## Orden de ejecucion

### PR 1: ROOT Control Surface Simplification

Objetivo:

Reducir ruido visible en ROOT.

Acciones:

1. Crear tarjeta superior Atencion requerida.
2. Mover Agentes y Override a Control avanzado.
3. Revisar Logbook vs Operations.
4. Traducir SelfObservabilityPanel.
5. Agregar estado VIVO / PARCIAL / INFRAESTRUCTURA por panel.

No borrar archivos.

### PR 2: ScoreFriction Surface Audit

Objetivo:

Traducir todos los paneles culturales a lenguaje de decision.

Acciones:

1. Revisar paneles de observacion.
2. Separar evidencia cultural de variables tecnicas.
3. Conectar lectura con accion minima.

### PR 3: Dead Surface Verification

Objetivo:

Determinar que archivos se pueden borrar.

Acciones:

1. Buscar imports activos.
2. Confirmar rutas vivas.
3. Confirmar dependencia API.
4. Fusionar duplicados.
5. Borrar solo muertos confirmados.

## Criterio de borrado

No se borra nada por parecer feo, viejo o raro.

Se borra solo si:

1. No tiene imports activos.
2. No tiene ruta viva.
3. No alimenta API.
4. No alimenta evidencia.
5. Existe reemplazo funcional.

## Decision

La logica continua es esta:

Primero traducir.
Segundo clasificar.
Tercero fusionar.
Cuarto ocultar infraestructura.
Quinto borrar solo muertos confirmados.
