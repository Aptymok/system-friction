Sí. Te lo doy como artefacto operativo, no como teoría. Esto está diseñado para que cada fase tenga: **prompt**, **matriz de verificación**, **archivos probables a modificar** y **límites operativos**.

No lo conviertas todavía en “haz todo de golpe”. Esto debe ejecutarse fase por fase. La primera ejecución real debería ser Fase 0–2 únicamente.

# MATRIZ EJECUTABLE DE ROOT

## Fase 0 → Fase 13

### Aptymok / System Friction Institute

---

# FASE 0 — Congelamiento de criterio

## PROMPT

```txt
Actúa sobre el repositorio Aptymok/system-friction únicamente para diagnosticar y alinear ROOT con la Constitución Operativa de ROOT y sus Anexos I–XXIX.

No implementes nuevas funciones visuales.
No rediseñes ROOT.
No agregues tarjetas, dashboards, componentes nuevos ni rutas nuevas.
No modifiques lógica de negocio.

Objetivo de esta fase:
congelar criterio y generar un reporte de alineación.

Debes revisar los componentes ROOT existentes y producir un archivo de diagnóstico que indique:
1. Qué componentes existen.
2. Qué sección de ROOT alimenta cada uno.
3. Qué capa toca: Archivo SFI, Observatorio Vivo, Atractor, Sandbox, Auditoría Técnica.
4. Qué fase futura debe modificarlos.
5. Qué lenguaje técnico aparece hoy en UI principal.
6. Qué elementos no pueden traducirse todavía.

Usa la Constitución Operativa como ley rectora:
ROOT traduce antes de mostrar.
ROOT es sólo para Aptymok.
ROOT no mezcla Archivo, Vivo, Atractor, Sandbox ni Auditoría.
ROOT no muestra lenguaje técnico en la vista principal.

Entrega:
- Un reporte markdown en docs/root/ROOT_PHASE_0_ALIGNMENT.md
- No hagas cambios visuales.
- No cambies datos.
- No cambies schema.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                                            |
| ------------------- | --------------------------------------------------------------------------------------- |
| Objetivo            | Congelar criterio. ROOT queda gobernado por Constitución + Anexos I–XXIX.               |
| Qué debe pasar      | Se genera un reporte de alineación.                                                     |
| Qué no debe pasar   | No se rediseña, no se agregan componentes, no se cambia UI.                             |
| Verificación humana | Aptymok puede leer el reporte y entender qué existe, qué fase lo toca y qué capa ocupa. |
| Cierre              | Existe `docs/root/ROOT_PHASE_0_ALIGNMENT.md`.                                           |
| Falla si            | Codex cambia componentes visuales, crea pantallas, edita UI o implementa fases futuras. |

## ARCHIVOS QUE DEBEN MODIFICARSE

```txt
docs/root/ROOT_PHASE_0_ALIGNMENT.md
```

Si no existe la carpeta:

```txt
docs/root/
```

## ARCHIVOS QUE PUEDEN LEERSE, NO MODIFICARSE

```txt
src/observatory/components/root/RootDashboardClient.tsx
src/observatory/components/root/RootOperationsConsole.tsx
src/observatory/components/root/AcpProposalConsole.tsx
src/observatory/components/root/AcpFieldRegimeView.tsx
src/observatory/components/root/AcpAttractorFieldView.tsx
src/observatory/components/root/GlobalMetricsView.tsx
src/observatory/components/root/NodeClusterSurface.tsx
src/observatory/components/root/SystemOverridePanel.tsx
src/observatory/components/root/LiturgiaDiagnosticPanel.tsx

src/observatory/components/visor/VisorMode.tsx
src/observatory/components/visor/VisorChat.tsx
src/observatory/components/visor/VisorSidebar.tsx
src/observatory/components/visor/VisorGoldenNode.tsx
src/observatory/components/visor/visorHooks.ts
src/observatory/components/visor/visorTypes.ts

src/lib/root/governanceRuntime.ts
src/lib/root/twinState.ts
src/lib/root/aiProviderRouter.ts
src/lib/root/fieldMatrixBuilder.ts

src/app/root/page.tsx
src/app/root/layout.tsx

src/app/api/root/me/route.ts
src/app/api/root/state/route.ts
src/app/api/root/evidence/route.ts

data/sfi/sf_static_dataset.compact.json
data/sfi/sf_docs_frontmatter.json
src/observatory/field/catalog/sfStaticDataset.ts
src/observatory/field/catalog/sfDocumentCatalog.ts
```

## LÍMITES OPERATIVOS

```txt
No implementar.
No corregir UI.
No tocar Supabase.
No tocar migraciones.
No crear endpoints.
No cambiar prompts del Visor.
No modificar lógica del Twin.
Sólo diagnosticar y mapear.
```

---

# FASE 1 — Inventario traducido

## PROMPT

```txt
Implementa Fase 1 de ROOT: Inventario traducido.

Objetivo:
crear una capa documental y opcionalmente una constante interna que traduzca cada componente existente de ROOT a lenguaje operativo.

No cambies todavía la UI principal.
No rediseñes.
No crees nuevas pantallas.
No cambies lógica de datos.

Debes producir un inventario traducido con este formato por elemento:

Elemento existente:
Nombre operativo:
Para qué sirve:
Dónde debe verse:
Sección ROOT:
Capa:
Estado actual:
Problema:
Decisión: permanecer / editar / ocultar / aislar / archivar
Fase que lo modifica:

Incluye como mínimo:
RootDashboardClient
VisorMode
VisorChat
VisorSidebar
VisorGoldenNode
RootOperationsConsole
AcpProposalConsole
AcpFieldRegimeView
AcpAttractorFieldView
GlobalMetricsView
NodeClusterSurface
SystemOverridePanel
LiturgiaDiagnosticPanel
ThresholdAccess
RoleGate
governanceRuntime
aiProviderRouter
twinState
fieldMatrixBuilder
ontology / Atlas
WorldSpect
MIHM
Archivo SFI
Bitácora
Atlas
Sandbox
Auditoría Técnica
Carpeta Negra
Calendario
Acciones de Realidad
Conversión de Realidad
Agentes

Entrega:
- docs/root/ROOT_PHASE_1_TRANSLATED_INVENTORY.md
- Opcional: src/lib/root/rootOperationalInventory.ts si ya existe patrón similar.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                                           |
| ------------------- | -------------------------------------------------------------------------------------- |
| Objetivo            | Traducir todo lo existente a función humana.                                           |
| Qué debe pasar      | Cada pieza tiene nombre operativo, función, sección, capa y decisión.                  |
| Qué no debe pasar   | No se implementan cambios visuales todavía.                                            |
| Verificación humana | Aptymok entiende para qué sirve cada cosa sin saber programación.                      |
| Cierre              | Inventario completo en markdown.                                                       |
| Falla si            | Quedan componentes sin traducir o se usan nombres técnicos como explicación principal. |

## ARCHIVOS QUE DEBEN MODIFICARSE

```txt
docs/root/ROOT_PHASE_1_TRANSLATED_INVENTORY.md
```

Opcional sólo si ayuda a fases posteriores:

```txt
src/lib/root/rootOperationalInventory.ts
```

## ARCHIVOS QUE PUEDEN LEERSE

Los mismos de Fase 0, más:

```txt
docs/ROOT-OPS-001.md
docs/FIELD_PERSIST_DECOMPOSITION.md
docs/THREAT_MODEL.md
docs/RISK_REGISTER.md
docs/PROCESS_MAP.md
docs/API_ROUTE_INVENTORY.md
docs/REPO_FORENSIC_AUDIT.md
```

## LÍMITES OPERATIVOS

```txt
No tocar UI.
No tocar base de datos.
No crear nuevas rutas.
No hardcodear métricas.
No borrar pruebas.
No mover datos todavía.
Sólo inventariar y traducir.
```

---

# FASE 2 — Separación de capas

## PROMPT

```txt
Implementa Fase 2 de ROOT: Separación de capas.

Objetivo:
crear una capa de clasificación operativa que separe Archivo SFI, Observatorio Vivo, Atractor, Sandbox y Auditoría Técnica.

No rediseñes ROOT completo.
No agregues dashboards nuevos.
No borres datos.
No modifiques Supabase todavía.

Debes crear funciones puras de clasificación para que cualquier elemento visible pueda responder:
- Esto es Archivo.
- Esto está Vivo.
- Esto afecta Atractor.
- Esto es Sandbox.
- Esto es Auditoría.

La clasificación debe aplicar a:
nodos, evidencias, propuestas, mutaciones, patrones, documentos, eventos, métricas, WSV, MIHM, auditoría y pruebas.

Reglas:
- Archivo SFI: catálogo, documentos fundacionales, patrones históricos, datasets estáticos.
- Observatorio Vivo: evidencias activas, señales recientes, mutaciones abiertas, WSV reciente, MIHM reciente.
- Atractor: sólo elementos con peso direccional.
- Sandbox: pruebas, simulaciones, test, elementos sin origen verificable.
- Auditoría: logs técnicos, eventos de lectura, trazabilidad.

Entrega:
- src/lib/root/rootLayers.ts
- src/lib/root/rootLayerLabels.ts
- tests o archivo de ejemplos si el repo usa tests
- docs/root/ROOT_PHASE_2_LAYER_SEPARATION.md

No modifiques visualmente componentes salvo para preparar imports o comentarios si es necesario.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                             |
| ------------------- | -------------------------------------------------------- |
| Objetivo            | Separar Archivo / Vivo / Atractor / Sandbox / Auditoría. |
| Qué debe pasar      | Existe una función central de clasificación.             |
| Qué no debe pasar   | No se borra nada. No se mueve data real todavía.         |
| Verificación humana | Se puede explicar por qué cada elemento cae en una capa. |
| Cierre              | Los clasificadores existen y están documentados.         |
| Falla si            | Archivo se confunde con Vivo o pruebas afectan Atractor. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/lib/root/rootLayers.ts
src/lib/root/rootLayerLabels.ts
docs/root/ROOT_PHASE_2_LAYER_SEPARATION.md
```

Si existe carpeta de tests:

```txt
src/lib/root/rootLayers.test.ts
```

## ARCHIVOS QUE PUEDEN SER TOCADOS SÓLO PARA IMPORT PREPARATORIO

```txt
src/observatory/components/root/GlobalMetricsView.tsx
src/observatory/components/root/RootDashboardClient.tsx
src/observatory/components/visor/VisorChat.tsx
```

## LÍMITES OPERATIVOS

```txt
No modificar diseño global.
No cambiar base de datos.
No ejecutar limpieza.
No cambiar números.
No hardcodear “156/120/127” como vivo.
No crear capa visual nueva si aún no es necesaria.
```

---

# FASE 3 — Traducción de estados

## PROMPT

```txt
Implementa Fase 3 de ROOT: Traducción de estados.

Objetivo:
crear una capa única que traduzca estados internos a lenguaje operativo de usuario.

Estados a traducir:
observed, partial, simulated, queued, degraded, active, stable, critical, vigente, caducado, sandbox, blocked, accepted, proposed, rejected, failed, verified, pending.

Cada traducción debe devolver:
- label operativo
- explicación humana
- implicación
- acción recomendada
- gravedad opcional

Ejemplos:
queued → Pendiente sin cierre. Empieza a perder fuerza si permanece abierto. Acción: cerrar, ejecutar o archivar.
simulated → Simulación. No usar como evidencia real. Acción: mover a Sandbox o reobservar.
blocked → Bloqueado por regla visible. Acción: revisar evidencia, fase o aprobación raíz.

Aplica esta traducción donde hoy se muestren estados crudos en ROOT, especialmente:
propuestas, mutaciones, WSV, evidencias, nodos, gobernanza y auditoría visible.

Entrega:
- src/lib/root/rootStateTranslator.ts
- src/lib/root/rootStateTranslator.test.ts si aplica
- docs/root/ROOT_PHASE_3_STATE_TRANSLATION.md
- Cambios mínimos en componentes para usar traducción.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| Objetivo            | Ningún estado técnico aparece sin traducción.                          |
| Qué debe pasar      | Estados internos tienen lectura humana.                                |
| Qué no debe pasar   | No cambiar valores reales ni ocultar linaje.                           |
| Verificación humana | Aptymok entiende estado, implicación y acción.                         |
| Cierre              | Componentes ROOT principales usan traductor de estados.                |
| Falla si            | Aparece `queued`, `simulated`, `blocked_by_governance` sin traducción. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/lib/root/rootStateTranslator.ts
docs/root/ROOT_PHASE_3_STATE_TRANSLATION.md
```

Posibles componentes:

```txt
src/observatory/components/root/AcpProposalConsole.tsx
src/observatory/components/root/RootOperationsConsole.tsx
src/observatory/components/root/GlobalMetricsView.tsx
src/observatory/components/root/AcpFieldRegimeView.tsx
src/observatory/components/root/NodeClusterSurface.tsx
src/observatory/components/visor/VisorChat.tsx
```

## LÍMITES OPERATIVOS

```txt
No inventar estados.
No ocultar estados técnicos de auditoría secundaria.
No convertir simulación en evidencia.
No modificar reglas de negocio.
Sólo traducir y mostrar implicación.
```

---

# FASE 4 — Estado del Campo

## PROMPT

```txt
Implementa Fase 4 de ROOT: Estado del Campo.

Objetivo:
reconstruir la pantalla inicial de ROOT para responder ocho preguntas:

1. ¿Cómo está mi sistema hoy?
2. ¿Qué está vivo?
3. ¿Qué está degradado?
4. ¿Qué está contaminando?
5. ¿Qué debo observar?
6. ¿Qué debo cerrar?
7. ¿Qué propone el Twin / AMV?
8. ¿Qué cambió desde la última vez?

Debe incluir:
- Régimen actual traducido.
- WSV traducido con timestamp real.
- MIHM traducido sólo si declara objeto observado.
- Alertas priorizadas.
- Mutaciones abiertas.
- Eyectores activos.
- Delta de sesión.
- Propuesta principal del Twin.
- Conversión de Realidad / RCE si ya hay datos suficientes; si no, mostrar “sin lectura suficiente”.
- Deuda de Realidad si existe; si no, mostrar “sin deuda registrada”.
- Riesgo de circuito cerrado si aplica.

No hardcodear valores.
No mostrar datos simulados como reales.
No mezclar Archivo con Observatorio Vivo.

Entrega:
- Adaptar RootDashboardClient o GlobalMetricsView.
- Crear helpers si hace falta: rootFieldState.ts
- docs/root/ROOT_PHASE_4_FIELD_STATE.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                              |
| ------------------- | --------------------------------------------------------- |
| Objetivo            | La entrada de ROOT responde qué pasa hoy.                 |
| Qué debe pasar      | Pantalla inicial contesta ocho preguntas.                 |
| Qué no debe pasar   | No mostrar conteos sin interpretación.                    |
| Verificación humana | En menos de un minuto se entiende qué mirar/cerrar.       |
| Cierre              | Estado del Campo usable sin Supabase/GitHub.              |
| Falla si            | La pantalla obliga a interpretar tablas o conteos crudos. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/root/RootDashboardClient.tsx
src/observatory/components/root/GlobalMetricsView.tsx
src/lib/root/rootFieldState.ts
docs/root/ROOT_PHASE_4_FIELD_STATE.md
```

Posibles lecturas:

```txt
src/lib/root/rootLayers.ts
src/lib/root/rootStateTranslator.ts
src/lib/root/twinState.ts
src/lib/root/governanceRuntime.ts
```

## LÍMITES OPERATIVOS

```txt
No rediseñar toda la UI.
No agregar otra página.
No hardcodear WSV/MIHM.
No mostrar MIHM sin objeto observado.
No mostrar WSV como OK.
No saturar pantalla con más de 1 crítica, 2 altas, 3 medias.
```

---

# FASE 5 — Campo de Nodos vivo

## PROMPT

```txt
Implementa Fase 5 de ROOT: Campo de Nodos vivo.

Objetivo:
convertir el campo visual de nodos en instrumento de observación.

Cada nodo visible debe poder mostrar:
- Nombre operativo.
- Función.
- Cluster.
- Estado traducido.
- Peso general.
- Peso direccional si aplica.
- Dependencias.
- Consecuencia si se degrada.
- Acción recomendada.
- Capa: Archivo / Vivo / Atractor / Sandbox / Auditoría.

El campo debe distinguir:
- Nodo base.
- Nodo evidencia.
- Nodo prueba.
- Nodo de catálogo.
- Nodo activo.
- Nodo con validación externa requerida.
- Nodo que afecta atractor.

El nodo dorado no pertenece al campo.
Debe moverse o tratarse como puerta fija del Visor, no como nodo observable.

No rediseñar el universo visual.
Aumentar resolución operativa, no estética.

Entrega:
- Ajustar NodeClusterSurface.
- Ajustar o crear rootNodeTranslator.ts.
- Ajustar VisorGoldenNode sólo para que no compita semánticamente con el campo.
- docs/root/ROOT_PHASE_5_LIVE_NODE_FIELD.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                        |
| ------------------- | ------------------------------------------------------------------- |
| Objetivo            | Los nodos explican función, peso, consecuencia y acción.            |
| Qué debe pasar      | Cada nodo visible tiene lectura operativa.                          |
| Qué no debe pasar   | No rediseñar todo el campo ni crear universo nuevo.                 |
| Verificación humana | Al abrir un nodo, Aptymok entiende para qué sirve.                  |
| Cierre              | Campo deja de ser decoración.                                       |
| Falla si            | Los nodos siguen siendo puntos conectados sin función comprensible. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/root/NodeClusterSurface.tsx
src/observatory/components/visor/VisorGoldenNode.tsx
src/lib/root/rootNodeTranslator.ts
docs/root/ROOT_PHASE_5_LIVE_NODE_FIELD.md
```

Posibles:

```txt
src/lib/root/fieldMatrixBuilder.ts
src/lib/root/rootLayers.ts
src/lib/root/rootStateTranslator.ts
```

## LÍMITES OPERATIVOS

```txt
No crear otro grafo paralelo.
No mezclar nodo dorado con nodos observables.
No usar pruebas como nodos vivos.
No inventar pesos si no hay datos; marcar “sin asignar”.
No hacer rediseño estético mayor.
```

---

# FASE 6 — Bitácora / Índice / Visor como un solo componente

## PROMPT

```txt
Implementa Fase 6 de ROOT: Bitácora, Índice y Visor como un solo componente navegable.

Objetivo:
unificar Bitácora e Índice en un panel acordeón que el Visor pueda referenciar.

Cada entrada debe mostrar:
Fecha
Origen
Por qué importa
Capa
Nodo afectado
Patrón que alimenta
Objetivo que toca
Evidencia adjunta
Peso general
Peso direccional si aplica
Qué falta
Acción abierta

Eliminar dependencia del botón “preguntar por esto”.
El usuario puede preguntar libremente.
Pero cada entrada debe poder abrirse y referenciarse desde el chat:
Abrir entrada relacionada
Ver evidencia
Ir al nodo afectado
Ver en Atlas

No limitar el chat por la sección seleccionada.
El índice orienta; no restringe.

Entrega:
- Ajustar VisorSidebar / VisorMode.
- Crear componente RootLogbookAccordion si no existe equivalente.
- Adaptar VisorChat para referencias navegables si existe estructura.
- docs/root/ROOT_PHASE_6_LOGBOOK_VISOR_INDEX.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                    |
| ------------------- | --------------------------------------------------------------- |
| Objetivo            | Bitácora, Índice y Visor funcionan como una experiencia.        |
| Qué debe pasar      | Bitácora es acordeón con entradas útiles.                       |
| Qué no debe pasar   | No obligar a usar botón “preguntar por esto”.                   |
| Verificación humana | Una entrada se entiende sin pedir explicación.                  |
| Cierre              | Panel único navegable operativo.                                |
| Falla si            | Bitácora sigue mostrando “runtime / sólo lectura” sin utilidad. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/visor/VisorSidebar.tsx
src/observatory/components/visor/VisorMode.tsx
src/observatory/components/visor/VisorChat.tsx
src/observatory/components/visor/RootLogbookAccordion.tsx
docs/root/ROOT_PHASE_6_LOGBOOK_VISOR_INDEX.md
```

Posibles:

```txt
src/observatory/components/visor/visorTypes.ts
src/observatory/components/visor/visorHooks.ts
src/lib/root/rootStateTranslator.ts
src/lib/root/rootLayers.ts
```

## LÍMITES OPERATIVOS

```txt
No crear dos bitácoras.
No limitar chat por índice.
No borrar entradas.
No transformar auditoría técnica en bitácora sustantiva sin filtro.
No mostrar datos crudos como entrada principal.
```

---

# FASE 7 — Chat libre del Visor

## PROMPT

```txt
Implementa Fase 7 de ROOT: Chat libre del Visor.

Objetivo:
el Visor debe responder libremente desde la memoria visible de ROOT, separando:
- registrado
- no registrado
- conocimiento general
- inferencia
- señal nueva
- evidencia posible
- patrón candidato
- señal corporal/personal

Reglas:
No inventar evidencia.
No repetir en cada respuesta que no ejecuta.
No depender del índice seleccionado.
No tratar conocimiento general como bitácora.
No tratar señal nueva como patrón.
No tratar intención como evidencia externa.

Cuando algo está registrado:
responder con fecha, origen, capa, estado, qué sostiene y qué falta.

Cuando no está registrado:
decir que no hay registro y preguntar si se explora o se deja fuera.

Cuando es conocimiento general:
responder como conocimiento general y aclarar que no entra al sistema salvo decisión raíz.

Cuando parece registrable:
ofrecer registrarlo como señal nueva, no como evidencia real.

Entrega:
- Ajustar prompt/conducta de VisorChat.
- Ajustar aiProviderRouter si ahí se define contexto.
- Añadir reglas en visorTypes si aplica.
- docs/root/ROOT_PHASE_7_FREE_VISOR_CHAT.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| Objetivo            | Visor responde libremente y separa registro/conocimiento/inferencia.        |
| Qué debe pasar      | Preguntas fuera de índice reciben respuesta útil.                           |
| Qué no debe pasar   | No inventa evidencia ni repite modo.                                        |
| Verificación humana | Pregunta “dolor de muela” responde como señal nueva + conocimiento general. |
| Cierre              | Visor opera como interlocutor, no buscador limitado.                        |
| Falla si            | Responde siempre lo mismo o sólo sobre la sección activa.                   |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/visor/VisorChat.tsx
src/lib/root/aiProviderRouter.ts
src/observatory/components/visor/visorTypes.ts
docs/root/ROOT_PHASE_7_FREE_VISOR_CHAT.md
```

Posibles:

```txt
src/observatory/components/visor/visorHooks.ts
src/lib/root/rootVisorPrompt.ts
src/lib/root/rootConversationClassifier.ts
```

## LÍMITES OPERATIVOS

```txt
No permitir que Visor ejecute acciones si está en modo sólo lectura.
No inventar memoria.
No registrar automáticamente sin confirmación.
No diagnosticar médicamente.
No convertir señales corporales en atractor.
```

---

# FASE 8 — Twin / AMV como agente activo

## PROMPT

```txt
Implementa Fase 8 de ROOT: Twin / AMV como agente activo.

Objetivo:
hacer que el Twin deje de mostrar propuestas sueltas y pase a mostrar propuestas con razón, evidencia, consecuencia, aprendizaje y estado ejecutable.

Cada propuesta debe mostrar:
Título operativo
Motivo
Evidencia que la sostiene
Nodo afectado
Atractor afectado
Acción de Realidad asociada si aplica
Consecuencia si se acepta
Consecuencia si se rechaza
Estado traducido
Fecha
Caducidad
Resultado
Aprendizaje derivado
Deuda de realidad si no se ejecuta

El Twin debe distinguir:
propuesta aceptada ≠ acción ejecutada
acción ejecutada ≠ evidencia externa
intención ≠ decisión
decisión ≠ realidad modificada

Debe detectar contradicciones internas del operador raíz según Anexo XVI.
Debe manejar señales personales según Anexo XXI.
Debe proponer acciones verificables según Anexo XIX.
Debe conocer roles de agentes según Anexo XX.

Entrega:
- Ajustar AcpProposalConsole.
- Ajustar twinState.
- Crear rootTwinProposalTranslator.ts.
- docs/root/ROOT_PHASE_8_TWIN_AGENT.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                             |
| ------------------- | ------------------------------------------------------------------------ |
| Objetivo            | Twin propone, cuestiona y aprende operativamente.                        |
| Qué debe pasar      | Cada propuesta tiene consecuencia, evidencia, acción y caducidad.        |
| Qué no debe pasar   | No bloquear decisión raíz. No proponer sobre vacío.                      |
| Verificación humana | Aptymok entiende qué cambia si acepta o rechaza.                         |
| Cierre              | Ninguna propuesta queda en cola sin explicación.                         |
| Falla si            | Propuestas siguen como `accepted/proposed/low` sin traducción ni efecto. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/root/AcpProposalConsole.tsx
src/lib/root/twinState.ts
src/lib/root/rootTwinProposalTranslator.ts
docs/root/ROOT_PHASE_8_TWIN_AGENT.md
```

Posibles:

```txt
src/observatory/components/root/AcpFieldRegimeView.tsx
src/observatory/components/root/AcpAttractorFieldView.tsx
src/lib/root/rootStateTranslator.ts
src/lib/root/rootLayers.ts
```

## LÍMITES OPERATIVOS

```txt
Twin no ejecuta.
Twin no bloquea decisión raíz.
Twin no repite propuesta rechazada sin nueva evidencia.
Twin no trata aceptado como ejecutado.
Twin no usa intención como evidencia externa.
```

---

# FASE 9 — WSV y MIHM como lecturas interpretables

## PROMPT

```txt
Implementa Fase 9 de ROOT: WSV y MIHM como lecturas interpretables.

Objetivo:
mostrar WSV y MIHM como lecturas operativas, no como números ni estados crudos.

WSV debe mostrar:
Estado general
Fuentes activas
Fuente degradada
Campo dominante
Última lectura real
Integridad
Implicación operativa para Aptymok

MIHM debe mostrar:
Objeto observado
IHG con lectura
NTI con lectura
LDI con lectura
PHI con lectura
Régimen resultante
Dirección
Nivel de confianza
Qué falta

Reglas:
WSV nunca dice sólo OK.
MIHM nunca muestra indicadores sin objeto observado.
No hardcodear valores.
No usar simulación como evidencia real.
Si WSV no tiene lectura del día, decir “lectura pendiente” o “última lectura disponible”.
Si MIHM no declara objeto, decir “no puede interpretarse”.

Entrega:
- Ajustar componentes WSV/MIHM en RootDashboardClient o GlobalMetricsView.
- Crear rootWsvTranslator.ts y rootMihmTranslator.ts.
- docs/root/ROOT_PHASE_9_WSV_MIHM.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                            |
| ------------------- | ------------------------------------------------------- |
| Objetivo            | WSV y MIHM sirven para decidir.                         |
| Qué debe pasar      | Toda lectura tiene objeto/timestamp/estado/implicación. |
| Qué no debe pasar   | No números sueltos, no OK, no hardcode.                 |
| Verificación humana | Aptymok entiende cómo está el mundo y qué mide MIHM.    |
| Cierre              | WSV/MIHM traducidos.                                    |
| Falla si            | MIHM aparece sin objeto o WSV aparece como OK.          |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/lib/root/rootWsvTranslator.ts
src/lib/root/rootMihmTranslator.ts
src/observatory/components/root/GlobalMetricsView.tsx
src/observatory/components/root/RootDashboardClient.tsx
docs/root/ROOT_PHASE_9_WSV_MIHM.md
```

Posibles:

```txt
src/lib/worldspect/*
src/app/api/worldspect/*
src/app/api/mihm/*
```

Sólo leer o adaptar consumo si ya existe.

## LÍMITES OPERATIVOS

```txt
No crear datos falsos.
No simular lectura diaria.
No hardcodear timestamp.
No tratar fuente degradada como limpia.
No mostrar MIHM si no hay objeto observado.
```

---

# FASE 10 — Atractor, eyectores y degradación

## PROMPT

```txt
Implementa Fase 10 de ROOT: Atractor, eyectores y degradación.

Objetivo:
hacer visible la dirección real del sistema y lo que la desvía.

Atractor debe mostrar:
Atractor activo
Dirección actual
Fuerza de estabilización
Peso direccional de evidencias
Evidencias que lo sostienen
Patrones que lo refuerzan
Eyectores que lo desvían
RCE si aplica
Validación externa
Riesgo de circuito cerrado
Acción verificable recomendada

Eyectores deben mostrar:
Nombre
Qué hacen
Origen
Gravedad
Capa afectada
Acción recomendada

Debe aplicar:
Anexo II peso direccional
Anexo XIV negación sostenida
Anexo XV densidad de observación
Anexo XVII fuerza del atractor
Anexo XIX conversión de realidad
Anexo XXII verificación externa
Anexo XXV circuito cerrado

Entrega:
- Ajustar AcpAttractorFieldView.
- Crear rootAttractorState.ts.
- Crear rootEjectorDetector.ts.
- docs/root/ROOT_PHASE_10_ATTRACTOR_EJECTORS.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                       |
| ------------------- | ------------------------------------------------------------------ |
| Objetivo            | Dirección, fuerza y desviaciones visibles.                         |
| Qué debe pasar      | Atractor distingue provisional/activo/latente/circuito cerrado.    |
| Qué no debe pasar   | No meter pruebas ni evidencia administrativa sin peso direccional. |
| Verificación humana | Aptymok entiende hacia dónde va y qué lo desvía.                   |
| Cierre              | Todo elemento del atractor tiene peso direccional y validación.    |
| Falla si            | Atractor sigue como etiqueta o campo visual sin consecuencia.      |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/observatory/components/root/AcpAttractorFieldView.tsx
src/lib/root/rootAttractorState.ts
src/lib/root/rootEjectorDetector.ts
docs/root/ROOT_PHASE_10_ATTRACTOR_EJECTORS.md
```

Posibles:

```txt
src/lib/root/twinState.ts
src/lib/root/rootLayers.ts
src/lib/root/rootStateTranslator.ts
src/observatory/components/root/GlobalMetricsView.tsx
```

## LÍMITES OPERATIVOS

```txt
No fortalecer atractor sin Acción de Realidad verificada.
No usar prueba como evidencia direccional.
No ocultar circuito cerrado.
No permitir que aceptado cuente como ejecutado.
No eliminar evidencias negadas; mover a Archivo Cuestionado.
```

---

# FASE 11 — Gobernanza, acceso y operaciones

## PROMPT

```txt
Implementa Fase 11 de ROOT: Gobernanza, acceso y operaciones.

Objetivo:
cerrar capa de control: acceso sólo Aptymok, bloqueos traducidos, operaciones reconciliables, override manual con justificación.

Debe integrar:
Acceso ROOT sólo operador raíz.
ThresholdAccess / RoleGate traducidos como Umbral ROOT.
Bloqueos de gobernanza traducidos.
Centro de operaciones.
Reconciliación propuesta → ejecución → evidencia → cierre.
Override manual con justificación obligatoria.
Registro de riesgo del Twin antes de override.
Límites de override.
Fallo de agentes y recuperación si ya está modelado.

No mostrar blocked_by_governance.
Mostrar:
Bloqueado porque falta evidencia.
Bloqueado porque es simulación.
Bloqueado porque afecta el atractor.
Bloqueado porque requiere aprobación raíz.

Cada operación abierta debe mostrar:
Estado
Razón
Consecuencia
Acción siguiente
Fecha
Fase relacionada
Capa afectada

Entrega:
- Ajustar governanceRuntime.
- Ajustar SystemOverridePanel.
- Ajustar RootOperationsConsole.
- Ajustar ThresholdAccess / RoleGate si aplica.
- Crear rootGovernanceTranslator.ts.
- docs/root/ROOT_PHASE_11_GOVERNANCE_OPERATIONS.md
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                  |
| ------------------- | ------------------------------------------------------------- |
| Objetivo            | Control, acceso, bloqueos, operaciones y override traducidos. |
| Qué debe pasar      | Todo bloqueo tiene razón, consecuencia y acción.              |
| Qué no debe pasar   | No convertir ROOT en multiusuario. No override sin evidencia. |
| Verificación humana | Aptymok entiende por qué algo está bloqueado y qué hacer.     |
| Cierre              | Operaciones abiertas tienen estado, razón y siguiente acción. |
| Falla si            | Aparece `blocked_by_governance` sin traducción.               |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
src/lib/root/governanceRuntime.ts
src/lib/root/rootGovernanceTranslator.ts
src/observatory/components/root/SystemOverridePanel.tsx
src/observatory/components/root/RootOperationsConsole.tsx
src/observatory/components/root/ThresholdAccess.tsx
src/observatory/components/root/RoleGate.tsx
docs/root/ROOT_PHASE_11_GOVERNANCE_OPERATIONS.md
```

Posibles:

```txt
supabase/migrations/20260601093000_root_operations_reconcile.sql
src/app/api/root/me/route.ts
src/app/api/root/state/route.ts
```

Sólo tocar migración si explícitamente se autoriza.

## LÍMITES OPERATIVOS

```txt
No cambiar acceso a multiusuario.
No crear override sin justificación.
No borrar auditoría.
No ocultar bloqueos.
No permitir que agentes externos modifiquen Constitución.
No tocar Supabase sin autorización explícita.
```

---

# FASE 12 — Limpieza y estabilización

## PROMPT

```txt
Implementa Fase 12 de ROOT: Limpieza y estabilización.

Objetivo:
limpiar contaminación sin perder memoria.

No borrar información real.
No borrar evidencia sin respaldo.
No limpiar por estética.

Debe reclasificar:
Pruebas técnicas → Sandbox.
Evidencias de test → Sandbox.
Simulaciones → Sandbox.
Registros sin origen → Sandbox.
Nodos de prueba → Sandbox.
Propuestas experimentales → Sandbox.
Patrones no vivos → Archivo.
Evidencias cerradas → Archivo.
Documentos técnicos → Archivo / Auditoría.
Registros fundacionales → Archivo.
Evidencias negadas tres veces → Archivo Cuestionado.
Patrones sin densidad suficiente → Archivo.
Acciones fallidas/rechazos → Observatorio Vivo como señales, no como fracaso.

Debe permanecer en Observatorio Vivo:
señales activas
evidencias vigentes
mutaciones abiertas
WSV reciente
MIHM reciente con objeto
patrones candidatos actuales
acciones de realidad pendientes
deuda de realidad
alertas activas

Entrega:
- Crear rootCleanupPlan.ts o reporte si no se autoriza tocar datos.
- docs/root/ROOT_PHASE_12_CLEANUP_PLAN.md
- Si se autoriza, preparar migración o script idempotente; NO ejecutarlo automáticamente.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                                 |
| ------------------- | ------------------------------------------------------------ |
| Objetivo            | Campo limpio sin perder trazabilidad.                        |
| Qué debe pasar      | Pruebas aisladas, archivo separado, vivo preservado.         |
| Qué no debe pasar   | No borrar memoria real ni evidencia sustantiva.              |
| Verificación humana | Se entiende qué fue aislado y por qué.                       |
| Cierre              | Campo activo ya no contiene basura técnica.                  |
| Falla si            | Pruebas siguen afectando atractor o se borra evidencia real. |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
docs/root/ROOT_PHASE_12_CLEANUP_PLAN.md
src/lib/root/rootCleanupPlan.ts
```

Sólo si se autoriza:

```txt
supabase/migrations/[timestamp]_root_cleanup_layers.sql
scripts/root-cleanup-plan.ts
```

## LÍMITES OPERATIVOS

```txt
No ejecutar limpieza destructiva.
No borrar datos.
No mover datos en producción sin revisión.
No aislar evidencia cultural real como prueba.
No mezclar Archivo Cuestionado con Sandbox.
```

---

# FASE 13 — Verificación final

## PROMPT

```txt
Implementa Fase 13 de ROOT: Verificación final.

Objetivo:
crear un protocolo de prueba humana para confirmar que ROOT sirve para decidir sin saber programación.

No agregar funciones nuevas.
No rediseñar.
No abrir fases nuevas.

Debe crear un documento de verificación con preguntas humanas:

¿Qué está pasando hoy?
¿Qué está vivo?
¿Qué está degradado?
¿Qué contamina el sistema?
¿Qué debo cerrar?
¿Qué debo observar?
¿Qué propone el Twin?
¿Cómo está el mundo observado?
¿Qué lectura homeostática existe?
¿Hacia dónde va mi atractor?
¿Qué eyectores están activos?
¿Qué es prueba?
¿Qué es archivo?
¿Qué es evidencia real?
¿Qué acción verificable convierte dirección en realidad externa?
¿Qué RCE tengo?
¿Qué deuda de realidad existe?
¿Hay circuito cerrado?
¿Qué agente falló o está degradado?
¿Qué vence próximamente?
¿Qué no sabe el sistema?

También debe incluir pruebas de casos:
- Pregunta libre fuera de índice.
- Señal corporal aislada.
- Propuesta aceptada sin ejecución.
- WSV degradado.
- MIHM sin objeto.
- Evidencia de prueba en campo.
- Override manual.
- Atractor con baja validación externa.
- Acción de Realidad verificada.

Entrega:
- docs/root/ROOT_PHASE_13_HUMAN_VERIFICATION.md
- Checklist final.
```

## MATRIZ DE VERIFICACIÓN

| Campo               | Verificación                                    |
| ------------------- | ----------------------------------------------- |
| Objetivo            | Confirmar que ROOT sirve para decidir.          |
| Qué debe pasar      | Se prueba con preguntas humanas.                |
| Qué no debe pasar   | No crear nuevas funciones durante verificación. |
| Verificación humana | Aptymok puede usar ROOT sin GitHub/Supabase.    |
| Cierre              | Checklist aprobado.                             |
| Falla si            | Necesita nombres técnicos para entender ROOT.   |

## ARCHIVOS QUE DEBEN MODIFICARSE / CREARSE

```txt
docs/root/ROOT_PHASE_13_HUMAN_VERIFICATION.md
```

Opcional si hay sistema de tests/e2e:

```txt
tests/root/root-human-verification.spec.ts
```

## LÍMITES OPERATIVOS

```txt
No implementar nuevas funciones.
No rediseñar UI.
No corregir fases previas dentro de Fase 13 sin documentar regresión.
No declarar terminado si falla una pregunta humana central.
```

---

# ORDEN REAL DE EJECUCIÓN

No ejecutes 0–13 completo.

La primera instrucción real a Codex debe ser:

```txt
Ejecuta Fase 0, Fase 1 y Fase 2 únicamente.
```

Porque esas tres fases cierran la raíz:

```txt
criterio
inventario
separación de capas
```

Después se revisa.

Luego:

```txt
Fase 3–4
```

Después:

```txt
Fase 5–7
```

Después:

```txt
Fase 8–11
```

Después:

```txt
Fase 12–13
```

# LÍMITE GLOBAL PARA TODAS LAS FASES

```txt
ROOT es para Aptymok.
ROOT traduce antes de mostrar.
ROOT no habla como backend.
ROOT no muestra nombres técnicos en vista principal.
ROOT no mezcla Archivo, Vivo, Atractor, Sandbox ni Auditoría.
ROOT no trata intención como evidencia externa.
ROOT no trata propuesta aceptada como acción ejecutada.
ROOT no fortalece atractor sin Acción de Realidad verificable.
ROOT no usa pruebas para sostener régimen.
ROOT no hardcodea WSV, MIHM, RCE, deuda ni métricas.
ROOT no crea pantallas duplicadas si existe componente equivalente.
ROOT no avanza por parches.
ROOT no borra memoria real.
ROOT no toca Supabase productivo sin autorización explícita.
ROOT no permite que Codex modifique Constitución, Anexos o Fases sin permiso raíz.
```

# DICTAMEN

Esto ya es ejecutable.

No como “construye todo”.

Como control de implementación faseada.

La primera pieza que te recomiendo usar ahora es:

```txt
FASE 0–2
Congelamiento de criterio
Inventario traducido
Separación de capas
```

Eso prepara el sistema para todo lo demás sin romperlo.
